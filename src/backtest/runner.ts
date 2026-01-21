import { backtestEngine, BacktestConfig } from './engine';
import { config, validateConfig } from '../utils/config';
import { logger } from '../utils/logger';
import { repositories } from '../database/repositories';

async function main() {
  try {
    validateConfig();

    logger.info('='.repeat(60));
    logger.info('NANSEN TRADING TERMINAL - BACKTEST');
    logger.info('='.repeat(60));

    const backtestConfigs: BacktestConfig[] = [
      {
        strategyName: 'First Smart Money Entry',
        chain: 'solana',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        entryStrategy: 'first_smart_money',
        minSmartMoneyCount: 2,
        minLiquidity: config.filtering.minLiquidityUsd,
        takeProfitLevels: config.takeProfitLevels,
        maxHoldDays: 7,
      },
      {
        strategyName: 'Accumulation Pattern',
        chain: 'solana',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        entryStrategy: 'accumulation',
        minSmartMoneyCount: 3,
        minLiquidity: config.filtering.minLiquidityUsd,
        takeProfitLevels: config.takeProfitLevels,
        maxHoldDays: 7,
      },
      {
        strategyName: 'Flow Confirmation',
        chain: 'solana',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-14'),
        entryStrategy: 'flow_confirmation',
        minFlowScore: 60,
        minSmartMoneyCount: 2,
        minLiquidity: config.filtering.minLiquidityUsd,
        takeProfitLevels: config.takeProfitLevels,
        maxHoldDays: 7,
      },
    ];

    for (const btConfig of backtestConfigs) {
      logger.info('\n' + '-'.repeat(60));
      const result = await backtestEngine.runBacktest(btConfig);

      logger.info('\n📊 BACKTEST RESULTS');
      logger.info(`Strategy: ${result.strategy_name}`);
      logger.info(`Chain: ${result.chain}`);
      logger.info(`Period: ${result.backtest_start_date} to ${result.backtest_end_date}`);
      logger.info(`\nPerformance:`);
      logger.info(`  Total Signals: ${result.total_signals}`);
      logger.info(`  Winning Trades: ${result.winning_trades}`);
      logger.info(`  Losing Trades: ${result.losing_trades}`);
      logger.info(`  Win Rate: ${result.win_rate.toFixed(2)}%`);
      logger.info(`  Avg Return: ${result.avg_return_percent.toFixed(2)}%`);
      logger.info(`  Max Return: ${result.max_return_percent.toFixed(2)}%`);
      logger.info(`  Min Return: ${result.min_return_percent.toFixed(2)}%`);
      logger.info(`  Total Return: ${result.total_return_percent.toFixed(2)}%`);
      logger.info(`  Max Drawdown: ${result.max_drawdown_percent.toFixed(2)}%`);
      logger.info(`  Avg Hold Time: ${result.avg_hold_time_hours.toFixed(1)} hours`);
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('All backtests completed!');
    logger.info('='.repeat(60));

    const allResults = repositories.backtests.findResults(10);
    logger.info(`\n📈 Top ${allResults.length} Backtest Results:`);

    allResults.forEach((result, index) => {
      logger.info(
        `${index + 1}. ${result.strategy_name} (${result.chain}): ` +
          `${result.win_rate.toFixed(1)}% WR, ` +
          `${result.avg_return_percent.toFixed(2)}% Avg Return`
      );
    });
  } catch (error) {
    logger.error('Backtest failed', error);
    process.exit(1);
  }
}

main();
