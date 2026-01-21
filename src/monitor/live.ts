import { config, validateConfig } from '../utils/config';
import { logger } from '../utils/logger';
import { tokenDiscovery } from '../analytics/token-discovery';
import { flowAnalyzer } from '../analytics/flow-analyzer';
import { historicalAnalyzer } from '../analytics/historical-analyzer';
import { signalGenerator } from '../analytics/signal-generator';

class LiveMonitor {
  private isRunning = false;
  private intervalMs = 5 * 60 * 1000;

  async start() {
    validateConfig();

    logger.info('='.repeat(60));
    logger.info('NANSEN TRADING TERMINAL - LIVE MONITOR');
    logger.info('='.repeat(60));
    logger.info(`Monitoring chains: ${config.trading.chains.join(', ')}`);
    logger.info(`Check interval: ${this.intervalMs / 1000} seconds`);
    logger.info(`Max token age: ${config.filtering.maxTokenAgeLiveDays} days`);
    logger.info(`Min liquidity: $${config.filtering.minLiquidityUsd.toLocaleString()}`);
    logger.info('='.repeat(60));

    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.runAnalysisCycle();
      } catch (error) {
        logger.error('Analysis cycle failed', error);
      }

      logger.info(`\nWaiting ${this.intervalMs / 1000} seconds until next check...`);
      await this.delay(this.intervalMs);
    }
  }

  async runAnalysisCycle() {
    logger.info('\n' + '-'.repeat(60));
    logger.info(`Starting analysis cycle at ${new Date().toISOString()}`);
    logger.info('-'.repeat(60));

    logger.info('\n🔍 Phase 1: Token Discovery');
    const tokens = await tokenDiscovery.discoverNewTokens(
      config.trading.chains,
      config.filtering.maxTokenAgeLiveDays
    );

    if (tokens.length === 0) {
      logger.info('No new tokens found in this cycle');
      return;
    }

    logger.info(`\nDiscovered ${tokens.length} tokens:`);
    tokens.forEach((token, i) => {
      logger.info(
        `  ${i + 1}. ${token.symbol} (${token.chain}) - ` +
          `Age: ${token.token_age_days.toFixed(1)}d, ` +
          `Liquidity: $${token.liquidity_usd.toLocaleString()}`
      );
    });

    logger.info('\n📊 Phase 2: Historical Analysis (Smart Money Entries)');
    for (const token of tokens) {
      await historicalAnalyzer.analyzeSmartMoneyEntries(token, 7);
    }

    logger.info('\n💧 Phase 3: Flow Analysis');
    const flowMap = await flowAnalyzer.batchAnalyzeFlow(tokens, '24h');

    logger.info('\n🎯 Phase 4: Signal Generation');
    const signals = await signalGenerator.batchGenerateSignals(tokens, flowMap);

    if (signals.length > 0) {
      logger.success(`\n✓ Generated ${signals.length} BUY signals!`);
      signals.forEach((signal, i) => {
        logger.info(`\nSignal ${i + 1}:`);
        logger.info(`  Token: ${signal.symbol} (${signal.chain})`);
        logger.info(`  Entry Price: $${signal.entry_price_usd.toFixed(6)}`);
        logger.info(`  First SM Entry: $${signal.first_smart_money_entry_price.toFixed(6)}`);
        logger.info(`  SM Count: ${signal.smart_money_count}`);
        logger.info(`  Flow Score: ${signal.flow_score.toFixed(1)}/100`);
        logger.info(`  Take Profit Levels:`);
        logger.info(`    TP1 (${signal.tp1_percent}% exit): $${signal.tp1_price.toFixed(6)} (${config.takeProfitLevels.tp1.multiplier}x)`);
        logger.info(`    TP2 (${signal.tp2_percent}% exit): $${signal.tp2_price.toFixed(6)} (${config.takeProfitLevels.tp2.multiplier}x)`);
        logger.info(`    TP3 (${signal.tp3_percent}% exit): $${signal.tp3_price.toFixed(6)} (${config.takeProfitLevels.tp3.multiplier}x)`);
        logger.info(`  Fibonacci Levels:`);
        logger.info(`    0.618: $${signal.fib_618?.toFixed(6)}`);
        logger.info(`    1.618: $${signal.fib_1618?.toFixed(6)}`);
      });
    } else {
      logger.info('No signals generated in this cycle');
    }

    logger.info('\n' + '-'.repeat(60));
    logger.info('Analysis cycle completed');
    logger.info('-'.repeat(60));
  }

  stop() {
    logger.info('Stopping live monitor...');
    this.isRunning = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const monitor = new LiveMonitor();

process.on('SIGINT', () => {
  logger.info('\nReceived SIGINT, shutting down...');
  monitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\nReceived SIGTERM, shutting down...');
  monitor.stop();
  process.exit(0);
});

monitor.start().catch((error) => {
  logger.error('Live monitor crashed', error);
  process.exit(1);
});
