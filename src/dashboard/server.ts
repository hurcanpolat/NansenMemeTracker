import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { config, validateConfig } from '../utils/config';
import { logger } from '../utils/logger';
import { repositories } from '../database/repositories';
import { tokenDiscovery } from '../analytics/token-discovery';
import { flowAnalyzer } from '../analytics/flow-analyzer';
import { historicalAnalyzer } from '../analytics/historical-analyzer';
import { signalGenerator } from '../analytics/signal-generator';

validateConfig();

const app = express();
const port = config.server.port;

app.use(cors());
app.use(express.json());
app.use(express.static('src/dashboard/public'));

const wss = new WebSocketServer({ port: config.server.wsPort });

const clients = new Set<any>();

wss.on('connection', (ws) => {
  logger.info('WebSocket client connected');
  clients.add(ws);

  ws.on('close', () => {
    logger.info('WebSocket client disconnected');
    clients.delete(ws);
  });
});

function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

app.get('/api/signals/active', (req, res) => {
  try {
    const signals = repositories.signals.findActive();
    res.json({ success: true, data: signals });
  } catch (error) {
    logger.error('Failed to get active signals', error);
    res.status(500).json({ success: false, error: 'Failed to get active signals' });
  }
});

app.get('/api/signals/all', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const signals = repositories.signals.findAll(limit);
    res.json({ success: true, data: signals });
  } catch (error) {
    logger.error('Failed to get all signals', error);
    res.status(500).json({ success: false, error: 'Failed to get all signals' });
  }
});

app.get('/api/tokens/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const tokens = repositories.tokens.getRecentTokens(limit);
    res.json({ success: true, data: tokens });
  } catch (error) {
    logger.error('Failed to get recent tokens', error);
    res.status(500).json({ success: false, error: 'Failed to get recent tokens' });
  }
});

app.get('/api/backtest/results', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const results = repositories.backtests.findResults(limit);
    res.json({ success: true, data: results });
  } catch (error) {
    logger.error('Failed to get backtest results', error);
    res.status(500).json({ success: false, error: 'Failed to get backtest results' });
  }
});

app.get('/api/backtest/results/:id/trades', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const trades = repositories.backtests.findTradesByResultId(id);
    res.json({ success: true, data: trades });
  } catch (error) {
    logger.error('Failed to get backtest trades', error);
    res.status(500).json({ success: false, error: 'Failed to get backtest trades' });
  }
});

app.post('/api/analysis/discover', async (req, res) => {
  try {
    const { chains, maxAgeDays } = req.body;
    logger.info(`Manual discovery requested for chains: ${chains?.join(', ')}`);

    const tokens = await tokenDiscovery.discoverNewTokens(
      chains || config.trading.chains,
      maxAgeDays || config.filtering.maxTokenAgeLiveDays
    );

    broadcast({ type: 'tokens_discovered', data: tokens });

    res.json({ success: true, data: tokens });
  } catch (error) {
    logger.error('Discovery failed', error);
    res.status(500).json({ success: false, error: 'Discovery failed' });
  }
});

app.post('/api/analysis/analyze', async (req, res) => {
  try {
    const { tokenIds } = req.body;

    if (!tokenIds || !Array.isArray(tokenIds)) {
      return res.status(400).json({ success: false, error: 'tokenIds array required' });
    }

    logger.info(`Analyzing ${tokenIds.length} tokens`);

    const tokens = tokenIds
      .map((id) => repositories.tokens.getRecentTokens(1000).find((t) => t.id === id))
      .filter((t) => t !== undefined);

    for (const token of tokens) {
      await historicalAnalyzer.analyzeSmartMoneyEntries(token, 7);
    }

    const flowMap = await flowAnalyzer.batchAnalyzeFlow(tokens, '24h');
    const signals = await signalGenerator.batchGenerateSignals(tokens, flowMap);

    broadcast({ type: 'signals_generated', data: signals });

    res.json({ success: true, data: { tokens, signals } });
  } catch (error) {
    logger.error('Analysis failed', error);
    res.status(500).json({ success: false, error: 'Analysis failed' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const allSignals = repositories.signals.findAll(1000);
    const activeSignals = repositories.signals.findActive();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const signalsToday = allSignals.filter(
      (s) => new Date(s.generated_at) >= today
    );

    const returnsToday = signalsToday
      .filter((s) => s.final_return_percent !== null && s.final_return_percent !== undefined)
      .map((s) => s.final_return_percent!);

    const avgReturnToday =
      returnsToday.length > 0
        ? returnsToday.reduce((a, b) => a + b, 0) / returnsToday.length
        : 0;

    const bestPerformer = allSignals
      .filter((s) => s.final_return_percent !== null)
      .sort((a, b) => (b.final_return_percent || 0) - (a.final_return_percent || 0))[0];

    res.json({
      success: true,
      data: {
        total_signals_today: signalsToday.length,
        active_signals: activeSignals.length,
        avg_return_today: avgReturnToday,
        best_performer: bestPerformer
          ? {
              symbol: bestPerformer.symbol,
              return_percent: bestPerformer.final_return_percent,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error('Failed to get stats', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

app.listen(port, () => {
  logger.success(`Dashboard server running on http://localhost:${port}`);
  logger.info(`WebSocket server running on ws://localhost:${config.server.wsPort}`);
  logger.info('\nAPI Endpoints:');
  logger.info(`  GET  /api/signals/active`);
  logger.info(`  GET  /api/signals/all?limit=50`);
  logger.info(`  GET  /api/tokens/recent?limit=20`);
  logger.info(`  GET  /api/backtest/results?limit=10`);
  logger.info(`  GET  /api/backtest/results/:id/trades`);
  logger.info(`  POST /api/analysis/discover`);
  logger.info(`  POST /api/analysis/analyze`);
  logger.info(`  GET  /api/stats`);
});
