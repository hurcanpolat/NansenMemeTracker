import { config, validateConfig } from './utils/config';
import { logger } from './utils/logger';

function printBanner() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║           NANSEN TRADING TERMINAL                             ║
║           Smart Money Analytics & Signal Generation           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

function printHelp() {
  logger.info('Available commands:\n');
  logger.info('  npm run dev        - Start in development mode');
  logger.info('  npm run build      - Build the project');
  logger.info('  npm start          - Start the built project');
  logger.info('  npm run dashboard  - Start the web dashboard');
  logger.info('  npm run monitor    - Start live monitoring');
  logger.info('  npm run backtest   - Run backtesting');
  logger.info('\nConfiguration:');
  logger.info(`  Chains: ${config.trading.chains.join(', ')}`);
  logger.info(`  Position Size: ${config.trading.positionSizePercent}%`);
  logger.info(`  Min Liquidity: $${config.filtering.minLiquidityUsd.toLocaleString()}`);
  logger.info(`  Take Profit Levels:`);
  logger.info(`    TP1: ${config.takeProfitLevels.tp1.multiplier}x (${config.takeProfitLevels.tp1.percent}% exit)`);
  logger.info(`    TP2: ${config.takeProfitLevels.tp2.multiplier}x (${config.takeProfitLevels.tp2.percent}% exit)`);
  logger.info(`    TP3: ${config.takeProfitLevels.tp3.multiplier}x (${config.takeProfitLevels.tp3.percent}% exit)`);
  logger.info('\nWeb Dashboard:');
  logger.info(`  URL: http://localhost:${config.server.port}`);
  logger.info(`  WebSocket: ws://localhost:${config.server.wsPort}`);
}

async function main() {
  try {
    validateConfig();
    printBanner();
    printHelp();
  } catch (error) {
    logger.error('Initialization failed', error);
    process.exit(1);
  }
}

main();
