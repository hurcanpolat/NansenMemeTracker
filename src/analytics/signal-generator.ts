import { repositories } from '../database/repositories';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { calculateFibonacciExtensions } from '../utils/fibonacci';
import { Token, FlowAnalysis, Signal } from '../types/trading';
import { historicalAnalyzer } from './historical-analyzer';
import { flowAnalyzer } from './flow-analyzer';

export class SignalGenerator {
  async generateSignal(token: Token, flowAnalysis: FlowAnalysis): Promise<Signal | null> {
    try {
      logger.debug(`Generating signal for ${token.symbol}`);

      const shouldGenerate = await this.shouldGenerateSignal(token, flowAnalysis);

      if (!shouldGenerate.generate) {
        logger.debug(`Signal not generated for ${token.symbol}: ${shouldGenerate.reason}`);
        return null;
      }

      const smStats = await historicalAnalyzer.getSmartMoneyStatistics(token.id!);

      if (!smStats.firstEntry) {
        logger.warn(`No first entry found for ${token.symbol}`);
        return null;
      }

      const entryPrice = token.first_seen_price_usd || smStats.averageEntryPrice;

      const signal: Signal = {
        token_id: token.id!,
        chain: token.chain,
        token_address: token.address,
        symbol: token.symbol,
        signal_type: 'BUY',
        generated_at: new Date().toISOString(),
        entry_price_usd: entryPrice,
        current_price_usd: entryPrice,

        first_smart_money_entry_price: smStats.firstEntry.entry_price_usd,
        first_smart_money_entry_time: smStats.firstEntry.entry_timestamp,
        smart_money_count: smStats.count,
        total_smart_money_volume_usd: smStats.totalVolume,

        flow_score: flowAnalysis.flow_score,
        smart_money_flow_usd: flowAnalysis.smart_money_net_flow_usd,
        whale_flow_usd: flowAnalysis.whale_net_flow_usd,
        public_figure_flow_usd: flowAnalysis.public_figure_net_flow_usd,

        tp1_price: entryPrice * config.takeProfitLevels.tp1.multiplier,
        tp1_percent: config.takeProfitLevels.tp1.percent,
        tp2_price: entryPrice * config.takeProfitLevels.tp2.multiplier,
        tp2_percent: config.takeProfitLevels.tp2.percent,
        tp3_price: entryPrice * config.takeProfitLevels.tp3.multiplier,
        tp3_percent: config.takeProfitLevels.tp3.percent,

        status: 'active',
      };

      const fibLevels = calculateFibonacciExtensions(entryPrice);
      signal.fib_236 = fibLevels.fib_236;
      signal.fib_382 = fibLevels.fib_382;
      signal.fib_500 = fibLevels.fib_500;
      signal.fib_618 = fibLevels.fib_618;
      signal.fib_786 = fibLevels.fib_786;
      signal.fib_1618 = fibLevels.fib_1618;

      const id = repositories.signals.create(signal);
      logger.success(
        `BUY signal generated for ${token.symbol} @ $${entryPrice.toFixed(6)} | ` +
          `TP1: $${signal.tp1_price.toFixed(6)} | ` +
          `TP2: $${signal.tp2_price.toFixed(6)} | ` +
          `TP3: $${signal.tp3_price.toFixed(6)}`
      );

      return { ...signal, id };
    } catch (error) {
      logger.error(`Failed to generate signal for ${token.symbol}`, error);
      return null;
    }
  }

  private async shouldGenerateSignal(
    token: Token,
    flowAnalysis: FlowAnalysis
  ): Promise<{ generate: boolean; reason: string }> {
    if (flowAnalysis.flow_score < 50) {
      return { generate: false, reason: `Flow score too low: ${flowAnalysis.flow_score}` };
    }

    if (!flowAnalyzer.isFlowPositive(flowAnalysis)) {
      return { generate: false, reason: 'Flow is not positive' };
    }

    const smStats = await historicalAnalyzer.getSmartMoneyStatistics(token.id!);

    if (smStats.count < 2) {
      return { generate: false, reason: `Not enough smart money traders: ${smStats.count}` };
    }

    if (smStats.totalVolume < 10000) {
      return {
        generate: false,
        reason: `Total volume too low: $${smStats.totalVolume.toFixed(0)}`,
      };
    }

    if (token.liquidity_usd < config.filtering.minLiquidityUsd) {
      return {
        generate: false,
        reason: `Liquidity too low: $${token.liquidity_usd.toFixed(0)}`,
      };
    }

    return { generate: true, reason: 'All criteria met' };
  }

  async batchGenerateSignals(
    tokens: Token[],
    flowMap: Map<number, FlowAnalysis>
  ): Promise<Signal[]> {
    logger.info(`Generating signals for ${tokens.length} tokens`);

    const signals: Signal[] = [];

    for (const token of tokens) {
      if (!token.id) continue;

      const flowAnalysis = flowMap.get(token.id);
      if (!flowAnalysis) {
        logger.debug(`No flow analysis for ${token.symbol}`);
        continue;
      }

      const signal = await this.generateSignal(token, flowAnalysis);
      if (signal) {
        signals.push(signal);
      }
    }

    logger.success(`Generated ${signals.length} signals`);
    return signals;
  }

  getActiveSignals(): Signal[] {
    return repositories.signals.findActive();
  }

  getAllSignals(limit: number = 100): Signal[] {
    return repositories.signals.findAll(limit);
  }
}

export const signalGenerator = new SignalGenerator();
