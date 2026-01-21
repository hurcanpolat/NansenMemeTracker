// Nansen API Types

export type Chain = 'ethereum' | 'solana' | 'base' | 'bnb' | 'polygon' | 'arbitrum' | 'optimism' | 'avalanche';

export type Timeframe = '5m' | '10m' | '1h' | '6h' | '12h' | '24h' | '7d' | '30d';

export type SmartMoneyLabel =
  | 'Fund'
  | 'Smart Trader'
  | '30D Smart Trader'
  | 'Whale'
  | 'Public Figure'
  | 'Smart NFT Trader'
  | 'Smart NFT Holder';

export type TradeAction = 'BUY' | 'SELL';

// Token Screener Types
export interface TokenScreenerRequest {
  chains: Chain[];
  timeframe?: Timeframe;
  date?: {
    from: string;
    to: string;
  };
  pagination?: {
    page: number;
    per_page: number;
  };
  filters?: TokenScreenerFilters;
  order_by?: OrderBy[];
}

export interface TokenScreenerFilters {
  only_smart_money?: boolean;
  token_age_days?: {
    min?: number;
    max?: number;
  };
  market_cap_usd?: {
    min?: number;
    max?: number;
  };
  liquidity_usd?: {
    min?: number;
    max?: number;
  };
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TokenScreenerResponse {
  data: TokenScreenerData[];
  pagination: PaginationMeta;
}

export interface TokenScreenerData {
  chain: Chain;
  token_address: string;
  symbol: string;
  token_age_days: number;
  market_cap_usd: number;
  liquidity_usd: number;
  price_usd: number;
  price_change_percent: number;
  buy_volume_usd: number;
  sell_volume_usd: number;
  net_flow_usd: number;
  fdv_to_market_cap_ratio: number;
}

// Smart Money DEX Trades Types
export interface SmartMoneyDexTradesRequest {
  chains: Chain[] | ['all'];
  filters?: {
    include_smart_money_labels?: SmartMoneyLabel[];
    exclude_smart_money_labels?: SmartMoneyLabel[];
    token_bought_age_days?: {
      min?: number;
      max?: number;
    };
    trade_value_usd?: {
      min?: number;
      max?: number;
    };
  };
  pagination?: {
    page: number;
    per_page: number;
  };
}

export interface SmartMoneyDexTradesResponse {
  data: SmartMoneyDexTrade[];
  pagination: PaginationMeta;
}

export interface SmartMoneyDexTrade {
  chain: Chain;
  block_timestamp: string;
  transaction_hash: string;
  trader_address: string;
  trader_address_label: SmartMoneyLabel;
  token_bought_address: string;
  token_bought_symbol: string;
  token_bought_amount: number;
  token_sold_address: string;
  token_sold_symbol: string;
  token_sold_amount: number;
  token_bought_age_days: number;
  token_bought_market_cap_usd: number;
  trade_value_usd: number;
}

// Flow Intelligence Types
export interface FlowIntelligenceRequest {
  chain: Chain;
  token_address: string;
  timeframe?: Timeframe;
  filters?: {
    whale_wallet_count?: {
      min?: number;
    };
  };
}

export interface FlowIntelligenceResponse {
  data: FlowIntelligenceData[];
}

export interface FlowIntelligenceData {
  whale_net_flow_usd: number;
  whale_avg_flow_usd: number;
  whale_wallet_count: number;
  exchange_net_flow_usd: number;
  exchange_avg_flow_usd: number;
  exchange_wallet_count: number;
  smart_money_net_flow_usd: number;
  smart_money_avg_flow_usd: number;
  smart_money_wallet_count: number;
  public_figure_net_flow_usd: number;
  public_figure_avg_flow_usd: number;
  public_figure_wallet_count: number;
  fresh_wallet_net_flow_usd: number;
  fresh_wallet_avg_flow_usd: number;
  fresh_wallet_wallet_count: number;
}

// TGM DEX Trades Types
export interface TGMDexTradesRequest {
  chain: Chain;
  token_address: string;
  date: {
    from: string;
    to: string;
  };
  only_smart_money?: boolean;
  pagination?: {
    page: number;
    per_page: number;
  };
  filters?: {
    action?: TradeAction;
    estimated_value_usd?: {
      min?: number;
      max?: number;
    };
    include_smart_money_labels?: SmartMoneyLabel[];
    token_amount?: {
      min?: number;
      max?: number;
    };
  };
  order_by?: OrderBy[];
}

export interface TGMDexTradesResponse {
  data: TGMDexTrade[];
  pagination: PaginationMeta;
}

export interface TGMDexTrade {
  block_timestamp: string;
  transaction_hash: string;
  trader_address: string;
  trader_address_label: string | null;
  action: TradeAction;
  token_address: string;
  token_symbol: string;
  token_amount: number;
  traded_token_address: string;
  traded_token_symbol: string;
  traded_token_amount: number;
  estimated_swap_price_usd: number;
  estimated_value_usd: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  last_page: boolean;
}
