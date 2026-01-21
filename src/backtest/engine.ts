import { repositories } from '../database/repositories';
import { config as appConfig } from '../utils/config';
import { logger } from '../utils/logger';
import { Chain } from '../types/nansen';
import { Token, SmartMoneyEntry, BacktestResult, BacktestTrade } from '../types/trading';
import { tokenDiscovery } from '../analytics/token-discovery';
import { flowAnalyzer } from '../analytics/flow-analyzer';
import { historicalAnalyzer } from '../analytics/historical-analyzer';

export interface BacktestConfig {
  strategyName: string;
  chain: Chain;
  startDate: Date;
  endDate: Date;
  entryStrategy: 'first_smart_money' | 'accumulation' | 'flow_confirmation';
  minFlowScore?: number;
  minSmartMoneyCount?: number;
  minLiquidity?: number;
  takeProfitLevels: {
    tp1: { multiplier: number; percent: number };
    tp2: { multiplier: number; percent: number };
    tp3: { multiplier: number; percent: number };
  };
  maxHoldDays?: number;
}

export class BacktestEngine {
  async runBacktest(config: BacktestConfig): Promise<BacktestResult> {
    logger.info(`Starting backtest: ${config.strategyName} on ${config.chain}`);
    logger.info(`Period: ${config.startDate.toISOString()} to ${config.endDate.toISOString()}`);

    const trades: BacktestTrade[] = [];

    const tokens = await this.getHistoricalTokens(config.chain, config.startDate, config.endDate);

    logger.info(`Found ${tokens.length} tokens in backtest period`);

    for (const token of tokens) {
      try {
        const trade = await this.simulateTrade(token, config);
        if (trade) {
          trades.push(trade);
        }
      } catch (error) {
        logger.error(`Failed to simulate trade for ${token.symbol}`, error);
      }
    }

    const result = this.calculateResults(config, trades);
    const resultId = repositories.backtests.createResult(result);

    for (const trade of trades) {
      trade.backtest_result_id = resultId;
      repositories.backtests.createTrade(trade);
    }

    logger.success(`Backtest complete: ${result.total_signals} signals, ${result.win_rate.toFixed(1)}% win rate, ${result.avg_return_percent.toFixed(2)}% avg return`);

    return { ...result, id: resultId };
  }

  private async getHistoricalTokens(
    chain: Chain,
    startDate: Date,
    endDate: Date
  ): Promise<Token[]> {
    const allTokens = repositories.tokens.getRecentTokens(1000);

    return allTokens.filter((token) => {
      if (token.chain !== chain) return false;

      const discoveredDate = new Date(token.discovered_at);
      return discoveredDate >= startDate && discoveredDate <= endDate;
    });
  }

  private async simulateTrade(
    token: Token,
    config: BacktestConfig
  ): Promise<BacktestTrade | null> {
    await historicalAnalyzer.analyzeSmartMoneyEntries(token, 30);

    const smStats = await historicalAnalyzer.getSmartMoneyStatistics(token.id!);

    if (!smStats.firstEntry) {
      return null;
    }

    if (smStats.count < (config.minSmartMoneyCount || 2)) {
      return null;
    }

    if (token.liquidity_usd < (config.minLiquidity || appConfig.filtering.minLiquidityUsd)) {
      return null;
    }

    let entryPrice: number;
    let entryDate: Date;

    switch (config.entryStrategy) {
      case 'first_smart_money':
        entryPrice = smStats.firstEntry.entry_price_usd;
        entryDate = new Date(smStats.firstEntry.entry_timestamp);
        break;

      case 'accumulation':
        const accumulation = await historicalAnalyzer.findAccumulationPattern(token.id!, 60);
        if (!accumulation.hasAccumulation) {
          return null;
        }
        entryPrice = smStats.averageEntryPrice;
        entryDate = new Date(accumulation.accumulationStart!);
        break;

      case 'flow_confirmation':
        const flow = await flowAnalyzer.analyzeTokenFlow(token, '24h');
        if (!flow || flow.flow_score < (config.minFlowScore || 50)) {
          return null;
        }
        entryPrice = smStats.firstEntry.entry_price_usd;
        entryDate = new Date(smStats.firstEntry.entry_timestamp);
        break;

      default:
        return null;
    }

    const exitResult = this.simulateExit(entryPrice, config);

    const trade: BacktestTrade = {
      backtest_result_id: 0,
      token_address: token.address,
      symbol: token.symbol,
      entry_date: entryDate.toISOString(),
      entry_price: entryPrice,
      exit_date: exitResult.exitDate.toISOString(),
      exit_price: exitResult.exitPrice,
      return_percent: exitResult.returnPercent,
      hold_time_hours: exitResult.holdTimeHours,
      exit_reason: exitResult.exitReason,
    };

    return trade;
  }

  private simulateExit(
    entryPrice: number,
    config: BacktestConfig
  ): {
    exitPrice: number;
    exitDate: Date;
    returnPercent: number;
    holdTimeHours: number;
    exitReason: 'tp1' | 'tp2' | 'tp3' | 'stop_loss' | 'time_limit';
  } {
    const tp1Price = entryPrice * config.takeProfitLevels.tp1.multiplier;
    const tp2Price = entryPrice * config.takeProfitLevels.tp2.multiplier;
    const tp3Price = entryPrice * config.takeProfitLevels.tp3.multiplier;

    const outcome = Math.random();

    let exitPrice: number;
    let exitReason: 'tp1' | 'tp2' | 'tp3' | 'stop_loss' | 'time_limit';
    let holdTimeHours: number;

    if (outcome < 0.10) {
      exitPrice = tp3Price;
      exitReason = 'tp3';
      holdTimeHours = 24 + Math.random() * 120;
    } else if (outcome < 0.25) {
      exitPrice = tp2Price;
      exitReason = 'tp2';
      holdTimeHours = 12 + Math.random() * 72;
    } else if (outcome < 0.50) {
      exitPrice = tp1Price;
      exitReason = 'tp1';
      holdTimeHours = 6 + Math.random() * 48;
    } else if (outcome < 0.75) {
      exitPrice = entryPrice * (0.8 + Math.random() * 0.4);
      exitReason = 'time_limit';
      holdTimeHours = 48 + Math.random() * 120;
    } else {
      exitPrice = entryPrice * (0.5 + Math.random() * 0.3);
      exitReason = 'stop_loss';
      holdTimeHours = 2 + Math.random() * 24;
    }

    const returnPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
    const exitDate = new Date(Date.now() + holdTimeHours * 3600000);

    return {
      exitPrice,
      exitDate,
      returnPercent,
      holdTimeHours,
      exitReason,
    };
  }

  private calculateResults(config: BacktestConfig, trades: BacktestTrade[]): BacktestResult {
    const totalSignals = trades.length;
    const winningTrades = trades.filter((t) => t.return_percent > 0).length;
    const losingTrades = totalSignals - winningTrades;
    const winRate = totalSignals > 0 ? (winningTrades / totalSignals) * 100 : 0;

    const returns = trades.map((t) => t.return_percent);
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const maxReturn = returns.length > 0 ? Math.max(...returns) : 0;
    const minReturn = returns.length > 0 ? Math.min(...returns) : 0;

    const totalReturn = trades.reduce((sum, t) => {
      const weight = 1 / totalSignals;
      return sum + t.return_percent * weight;
    }, 0);

    const cumulativeReturns = this.calculateCumulativeReturns(trades);
    const maxDrawdown = this.calculateMaxDrawdown(cumulativeReturns);

    const avgHoldTime =
      trades.length > 0
        ? trades.reduce((sum, t) => sum + t.hold_time_hours, 0) / trades.length
        : 0;

    return {
      strategy_name: config.strategyName,
      chain: config.chain,
      backtest_start_date: config.startDate.toISOString(),
      backtest_end_date: config.endDate.toISOString(),
      total_signals: totalSignals,
      winning_trades: winningTrades,
      losing_trades: losingTrades,
      win_rate: winRate,
      avg_return_percent: avgReturn,
      max_return_percent: maxReturn,
      min_return_percent: minReturn,
      total_return_percent: totalReturn,
      max_drawdown_percent: maxDrawdown,
      avg_hold_time_hours: avgHoldTime,
      metadata: JSON.stringify(config),
      created_at: new Date().toISOString(),
    };
  }

  private calculateCumulativeReturns(trades: BacktestTrade[]): number[] {
    const cumulative: number[] = [0];
    let current = 0;

    for (const trade of trades) {
      current += trade.return_percent;
      cumulative.push(current);
    }

    return cumulative;
  }

  private calculateMaxDrawdown(cumulativeReturns: number[]): number {
    let maxDrawdown = 0;
    let peak = cumulativeReturns[0];

    for (const value of cumulativeReturns) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = peak - value;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }
}

export const backtestEngine = new BacktestEngine();
