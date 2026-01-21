import dotenv from 'dotenv';
import { Chain } from '../types/nansen';

dotenv.config();

export const config = {
  nansen: {
    apiKey: process.env.NANSEN_API_KEY || '',
    baseUrl: 'https://api.nansen.ai/api/v1',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/trading.db',
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    wsPort: parseInt(process.env.WS_PORT || '3001'),
  },
  trading: {
    positionSizePercent: parseFloat(process.env.POSITION_SIZE_PERCENT || '1'),
    chains: (process.env.CHAINS || 'solana,base,bnb').split(',') as Chain[],
  },
  takeProfitLevels: {
    tp1: {
      multiplier: parseFloat(process.env.TP1_MULTIPLIER || '2'),
      percent: parseFloat(process.env.TP1_PERCENT || '50'),
    },
    tp2: {
      multiplier: parseFloat(process.env.TP2_MULTIPLIER || '5'),
      percent: parseFloat(process.env.TP2_PERCENT || '30'),
    },
    tp3: {
      multiplier: parseFloat(process.env.TP3_MULTIPLIER || '10'),
      percent: parseFloat(process.env.TP3_PERCENT || '100'),
    },
  },
  filtering: {
    maxTokenAgeBacktestDays: parseInt(process.env.MAX_TOKEN_AGE_BACKTEST_DAYS || '7'),
    maxTokenAgeLiveDays: parseInt(process.env.MAX_TOKEN_AGE_LIVE_DAYS || '1'),
    minLiquidityUsd: parseFloat(process.env.MIN_LIQUIDITY_USD || '100000'),
  },
};

export function validateConfig(): void {
  if (!config.nansen.apiKey) {
    throw new Error('NANSEN_API_KEY is required in .env file');
  }
}
