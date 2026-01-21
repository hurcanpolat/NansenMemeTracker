import Database from 'better-sqlite3';
import type BetterSqlite3 from 'better-sqlite3';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

export function initializeDatabase(): BetterSqlite3.Database {
  const db = new Database(config.database.path);

  logger.info(`Initializing database at ${config.database.path}`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT NOT NULL,
      address TEXT NOT NULL,
      symbol TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      token_age_days REAL NOT NULL,
      market_cap_usd REAL NOT NULL,
      liquidity_usd REAL NOT NULL,
      first_seen_price_usd REAL NOT NULL,
      UNIQUE(chain, address)
    );

    CREATE INDEX IF NOT EXISTS idx_tokens_chain_address ON tokens(chain, address);
    CREATE INDEX IF NOT EXISTS idx_tokens_discovered_at ON tokens(discovered_at);

    CREATE TABLE IF NOT EXISTS smart_money_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id INTEGER NOT NULL,
      chain TEXT NOT NULL,
      token_address TEXT NOT NULL,
      trader_address TEXT NOT NULL,
      trader_label TEXT NOT NULL,
      entry_timestamp TEXT NOT NULL,
      entry_price_usd REAL NOT NULL,
      trade_value_usd REAL NOT NULL,
      transaction_hash TEXT NOT NULL UNIQUE,
      is_first_entry INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (token_id) REFERENCES tokens(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sm_entries_token_id ON smart_money_entries(token_id);
    CREATE INDEX IF NOT EXISTS idx_sm_entries_timestamp ON smart_money_entries(entry_timestamp);
    CREATE INDEX IF NOT EXISTS idx_sm_entries_first ON smart_money_entries(is_first_entry);

    CREATE TABLE IF NOT EXISTS flow_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id INTEGER NOT NULL,
      chain TEXT NOT NULL,
      token_address TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      smart_money_net_flow_usd REAL NOT NULL,
      smart_money_wallet_count INTEGER NOT NULL,
      whale_net_flow_usd REAL NOT NULL,
      whale_wallet_count INTEGER NOT NULL,
      public_figure_net_flow_usd REAL NOT NULL,
      public_figure_wallet_count INTEGER NOT NULL,
      flow_score REAL NOT NULL,
      FOREIGN KEY (token_id) REFERENCES tokens(id)
    );

    CREATE INDEX IF NOT EXISTS idx_flow_token_id ON flow_analysis(token_id);
    CREATE INDEX IF NOT EXISTS idx_flow_analyzed_at ON flow_analysis(analyzed_at);

    CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_id INTEGER NOT NULL,
      chain TEXT NOT NULL,
      token_address TEXT NOT NULL,
      symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      entry_price_usd REAL NOT NULL,
      current_price_usd REAL,
      first_smart_money_entry_price REAL NOT NULL,
      first_smart_money_entry_time TEXT NOT NULL,
      smart_money_count INTEGER NOT NULL,
      total_smart_money_volume_usd REAL NOT NULL,
      flow_score REAL NOT NULL,
      smart_money_flow_usd REAL NOT NULL,
      whale_flow_usd REAL NOT NULL,
      public_figure_flow_usd REAL NOT NULL,
      tp1_price REAL NOT NULL,
      tp1_percent REAL NOT NULL,
      tp2_price REAL NOT NULL,
      tp2_percent REAL NOT NULL,
      tp3_price REAL NOT NULL,
      tp3_percent REAL NOT NULL,
      fib_236 REAL,
      fib_382 REAL,
      fib_500 REAL,
      fib_618 REAL,
      fib_786 REAL,
      fib_1618 REAL,
      status TEXT NOT NULL DEFAULT 'active',
      closed_at TEXT,
      final_return_percent REAL,
      FOREIGN KEY (token_id) REFERENCES tokens(id)
    );

    CREATE INDEX IF NOT EXISTS idx_signals_token_id ON signals(token_id);
    CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
    CREATE INDEX IF NOT EXISTS idx_signals_generated_at ON signals(generated_at);

    CREATE TABLE IF NOT EXISTS backtest_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      strategy_name TEXT NOT NULL,
      chain TEXT NOT NULL,
      backtest_start_date TEXT NOT NULL,
      backtest_end_date TEXT NOT NULL,
      total_signals INTEGER NOT NULL,
      winning_trades INTEGER NOT NULL,
      losing_trades INTEGER NOT NULL,
      win_rate REAL NOT NULL,
      avg_return_percent REAL NOT NULL,
      max_return_percent REAL NOT NULL,
      min_return_percent REAL NOT NULL,
      total_return_percent REAL NOT NULL,
      max_drawdown_percent REAL NOT NULL,
      sharpe_ratio REAL,
      avg_hold_time_hours REAL NOT NULL,
      metadata TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_backtest_chain ON backtest_results(chain);
    CREATE INDEX IF NOT EXISTS idx_backtest_created_at ON backtest_results(created_at);

    CREATE TABLE IF NOT EXISTS backtest_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backtest_result_id INTEGER NOT NULL,
      token_address TEXT NOT NULL,
      symbol TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      entry_price REAL NOT NULL,
      exit_date TEXT NOT NULL,
      exit_price REAL NOT NULL,
      return_percent REAL NOT NULL,
      hold_time_hours REAL NOT NULL,
      exit_reason TEXT NOT NULL,
      FOREIGN KEY (backtest_result_id) REFERENCES backtest_results(id)
    );

    CREATE INDEX IF NOT EXISTS idx_bt_trades_result_id ON backtest_trades(backtest_result_id);
  `);

  logger.success('Database initialized successfully');

  return db;
}

export const db: BetterSqlite3.Database = initializeDatabase();
