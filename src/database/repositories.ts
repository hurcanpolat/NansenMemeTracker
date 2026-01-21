import type BetterSqlite3 from 'better-sqlite3';
import { db } from './schema';
import {
  Token,
  SmartMoneyEntry,
  FlowAnalysis,
  Signal,
  BacktestResult,
  BacktestTrade,
} from '../types/trading';
import { Chain } from '../types/nansen';

export class TokenRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(token: Token): number {
    const stmt = this.db.prepare(`
      INSERT INTO tokens (chain, address, symbol, discovered_at, token_age_days, market_cap_usd, liquidity_usd, first_seen_price_usd)
      VALUES (@chain, @address, @symbol, @discovered_at, @token_age_days, @market_cap_usd, @liquidity_usd, @first_seen_price_usd)
    `);
    const result = stmt.run(token);
    return result.lastInsertRowid as number;
  }

  findByAddress(chain: Chain, address: string): Token | null {
    const stmt = this.db.prepare(`
      SELECT * FROM tokens WHERE chain = ? AND address = ?
    `);
    return stmt.get(chain, address) as Token | null;
  }

  findOrCreate(token: Token): Token {
    const existing = this.findByAddress(token.chain, token.address);
    if (existing) {
      return existing;
    }
    const id = this.create(token);
    return { ...token, id };
  }

  getRecentTokens(limit: number = 50): Token[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tokens ORDER BY discovered_at DESC LIMIT ?
    `);
    return stmt.all(limit) as Token[];
  }
}

export class SmartMoneyEntryRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(entry: SmartMoneyEntry): number {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO smart_money_entries
      (token_id, chain, token_address, trader_address, trader_label, entry_timestamp,
       entry_price_usd, trade_value_usd, transaction_hash, is_first_entry)
      VALUES (@token_id, @chain, @token_address, @trader_address, @trader_label, @entry_timestamp,
              @entry_price_usd, @trade_value_usd, @transaction_hash, @is_first_entry)
    `);
    const result = stmt.run(entry);
    return result.lastInsertRowid as number;
  }

  findByTokenId(tokenId: number): SmartMoneyEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM smart_money_entries WHERE token_id = ? ORDER BY entry_timestamp ASC
    `);
    return stmt.all(tokenId) as SmartMoneyEntry[];
  }

  findFirstEntry(tokenId: number): SmartMoneyEntry | null {
    const stmt = this.db.prepare(`
      SELECT * FROM smart_money_entries WHERE token_id = ? ORDER BY entry_timestamp ASC LIMIT 1
    `);
    return stmt.get(tokenId) as SmartMoneyEntry | null;
  }

  getEntryCount(tokenId: number): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(DISTINCT trader_address) as count FROM smart_money_entries WHERE token_id = ?
    `);
    const result = stmt.get(tokenId) as { count: number };
    return result.count;
  }

  getTotalVolume(tokenId: number): number {
    const stmt = this.db.prepare(`
      SELECT SUM(trade_value_usd) as total FROM smart_money_entries WHERE token_id = ?
    `);
    const result = stmt.get(tokenId) as { total: number | null };
    return result.total || 0;
  }
}

export class FlowAnalysisRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(flow: FlowAnalysis): number {
    const stmt = this.db.prepare(`
      INSERT INTO flow_analysis
      (token_id, chain, token_address, analyzed_at, timeframe, smart_money_net_flow_usd,
       smart_money_wallet_count, whale_net_flow_usd, whale_wallet_count,
       public_figure_net_flow_usd, public_figure_wallet_count, flow_score)
      VALUES (@token_id, @chain, @token_address, @analyzed_at, @timeframe,
              @smart_money_net_flow_usd, @smart_money_wallet_count, @whale_net_flow_usd,
              @whale_wallet_count, @public_figure_net_flow_usd, @public_figure_wallet_count, @flow_score)
    `);
    const result = stmt.run(flow);
    return result.lastInsertRowid as number;
  }

  findLatestByTokenId(tokenId: number): FlowAnalysis | null {
    const stmt = this.db.prepare(`
      SELECT * FROM flow_analysis WHERE token_id = ? ORDER BY analyzed_at DESC LIMIT 1
    `);
    return stmt.get(tokenId) as FlowAnalysis | null;
  }
}

export class SignalRepository {
  constructor(private db: BetterSqlite3.Database) {}

  create(signal: Signal): number {
    const stmt = this.db.prepare(`
      INSERT INTO signals
      (token_id, chain, token_address, symbol, signal_type, generated_at, entry_price_usd,
       current_price_usd, first_smart_money_entry_price, first_smart_money_entry_time,
       smart_money_count, total_smart_money_volume_usd, flow_score, smart_money_flow_usd,
       whale_flow_usd, public_figure_flow_usd, tp1_price, tp1_percent, tp2_price, tp2_percent,
       tp3_price, tp3_percent, fib_236, fib_382, fib_500, fib_618, fib_786, fib_1618, status)
      VALUES (@token_id, @chain, @token_address, @symbol, @signal_type, @generated_at, @entry_price_usd,
              @current_price_usd, @first_smart_money_entry_price, @first_smart_money_entry_time,
              @smart_money_count, @total_smart_money_volume_usd, @flow_score, @smart_money_flow_usd,
              @whale_flow_usd, @public_figure_flow_usd, @tp1_price, @tp1_percent, @tp2_price, @tp2_percent,
              @tp3_price, @tp3_percent, @fib_236, @fib_382, @fib_500, @fib_618, @fib_786, @fib_1618, @status)
    `);
    const result = stmt.run(signal);
    return result.lastInsertRowid as number;
  }

  findActive(): Signal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM signals WHERE status = 'active' ORDER BY generated_at DESC
    `);
    return stmt.all() as Signal[];
  }

  findAll(limit: number = 100): Signal[] {
    const stmt = this.db.prepare(`
      SELECT * FROM signals ORDER BY generated_at DESC LIMIT ?
    `);
    return stmt.all(limit) as Signal[];
  }

  updateStatus(id: number, status: string, finalReturn?: number): void {
    const stmt = this.db.prepare(`
      UPDATE signals
      SET status = ?, closed_at = datetime('now'), final_return_percent = ?
      WHERE id = ?
    `);
    stmt.run(status, finalReturn, id);
  }

  updatePrice(id: number, currentPrice: number): void {
    const stmt = this.db.prepare(`
      UPDATE signals SET current_price_usd = ? WHERE id = ?
    `);
    stmt.run(currentPrice, id);
  }
}

export class BacktestRepository {
  constructor(private db: BetterSqlite3.Database) {}

  createResult(result: BacktestResult): number {
    const stmt = this.db.prepare(`
      INSERT INTO backtest_results
      (strategy_name, chain, backtest_start_date, backtest_end_date, total_signals,
       winning_trades, losing_trades, win_rate, avg_return_percent, max_return_percent,
       min_return_percent, total_return_percent, max_drawdown_percent, sharpe_ratio,
       avg_hold_time_hours, metadata, created_at)
      VALUES (@strategy_name, @chain, @backtest_start_date, @backtest_end_date, @total_signals,
              @winning_trades, @losing_trades, @win_rate, @avg_return_percent, @max_return_percent,
              @min_return_percent, @total_return_percent, @max_drawdown_percent, @sharpe_ratio,
              @avg_hold_time_hours, @metadata, @created_at)
    `);
    const res = stmt.run(result);
    return res.lastInsertRowid as number;
  }

  createTrade(trade: BacktestTrade): number {
    const stmt = this.db.prepare(`
      INSERT INTO backtest_trades
      (backtest_result_id, token_address, symbol, entry_date, entry_price,
       exit_date, exit_price, return_percent, hold_time_hours, exit_reason)
      VALUES (@backtest_result_id, @token_address, @symbol, @entry_date, @entry_price,
              @exit_date, @exit_price, @return_percent, @hold_time_hours, @exit_reason)
    `);
    const res = stmt.run(trade);
    return res.lastInsertRowid as number;
  }

  findResults(limit: number = 10): BacktestResult[] {
    const stmt = this.db.prepare(`
      SELECT * FROM backtest_results ORDER BY created_at DESC LIMIT ?
    `);
    return stmt.all(limit) as BacktestResult[];
  }

  findTradesByResultId(resultId: number): BacktestTrade[] {
    const stmt = this.db.prepare(`
      SELECT * FROM backtest_trades WHERE backtest_result_id = ? ORDER BY entry_date ASC
    `);
    return stmt.all(resultId) as BacktestTrade[];
  }
}

export const repositories = {
  tokens: new TokenRepository(db),
  smartMoneyEntries: new SmartMoneyEntryRepository(db),
  flowAnalysis: new FlowAnalysisRepository(db),
  signals: new SignalRepository(db),
  backtests: new BacktestRepository(db),
};
