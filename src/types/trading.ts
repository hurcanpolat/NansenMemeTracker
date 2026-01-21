import { Chain, SmartMoneyLabel } from './nansen';

export interface Token {
  id?: number;
  chain: Chain;
  address: string;
  symbol: string;
  discovered_at: string;
  token_age_days: number;
  market_cap_usd: number;
  liquidity_usd: number;
  first_seen_price_usd: number;
}

export interface SmartMoneyEntry {
  id?: number;
  token_id: number;
  chain: Chain;
  token_address: string;
  trader_address: string;
  trader_label: string;
  entry_timestamp: string;
  entry_price_usd: number;
  trade_value_usd: number;
  transaction_hash: string;
  is_first_entry: number;
}

export interface FlowAnalysis {
  id?: number;
  token_id: number;
  chain: Chain;
  token_address: string;
  analyzed_at: string;
  timeframe: string;
  smart_money_net_flow_usd: number;
  smart_money_wallet_count: number;
  whale_net_flow_usd: number;
  whale_wallet_count: number;
  public_figure_net_flow_usd: number;
  public_figure_wallet_count: number;
  flow_score: number;
}

export interface Signal {
  id?: number;
  token_id: number;
  chain: Chain;
  token_address: string;
  symbol: string;
  signal_type: 'BUY' | 'SELL';
  generated_at: string;
  entry_price_usd: number;
  current_price_usd?: number;

  // Entry analysis
  first_smart_money_entry_price: number;
  first_smart_money_entry_time: string;
  smart_money_count: number;
  total_smart_money_volume_usd: number;

  // Flow analysis
  flow_score: number;
  smart_money_flow_usd: number;
  whale_flow_usd: number;
  public_figure_flow_usd: number;

  // Take profit levels
  tp1_price: number; // 2x
  tp1_percent: number; // 50%
  tp2_price: number; // 5x
  tp2_percent: number; // 30%
  tp3_price: number; // 10x
  tp3_percent: number; // 100%

  // Fibonacci levels
  fib_236?: number;
  fib_382?: number;
  fib_500?: number;
  fib_618?: number;
  fib_786?: number;
  fib_1618?: number;

  // Status tracking
  status: 'active' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'closed';
  closed_at?: string;
  final_return_percent?: number;
}

export interface BacktestResult {
  id?: number;
  strategy_name: string;
  chain: Chain;
  backtest_start_date: string;
  backtest_end_date: string;
  total_signals: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  avg_return_percent: number;
  max_return_percent: number;
  min_return_percent: number;
  total_return_percent: number;
  max_drawdown_percent: number;
  sharpe_ratio?: number;
  avg_hold_time_hours: number;
  metadata: string; // JSON string with strategy parameters
  created_at: string;
}

export interface BacktestTrade {
  id?: number;
  backtest_result_id: number;
  token_address: string;
  symbol: string;
  entry_date: string;
  entry_price: number;
  exit_date: string;
  exit_price: number;
  return_percent: number;
  hold_time_hours: number;
  exit_reason: 'tp1' | 'tp2' | 'tp3' | 'stop_loss' | 'time_limit';
}

export interface TokenAnalysis {
  token: Token;
  smartMoneyEntries: SmartMoneyEntry[];
  flowAnalysis: FlowAnalysis;
  signal?: Signal;
  priceHistory?: {
    timestamp: string;
    price_usd: number;
  }[];
}

export interface DashboardData {
  activeSignals: Signal[];
  recentTokens: TokenAnalysis[];
  statistics: {
    total_signals_today: number;
    active_signals: number;
    avg_return_today: number;
    best_performer: {
      symbol: string;
      return_percent: number;
    } | null;
  };
}
