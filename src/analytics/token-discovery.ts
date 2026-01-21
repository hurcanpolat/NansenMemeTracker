import { nansenClient } from '../api/nansen-client';
import { repositories } from '../database/repositories';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { Chain, SmartMoneyDexTrade, TokenScreenerData } from '../types/nansen';
import { Token } from '../types/trading';

export class TokenDiscovery {
  async discoverNewTokens(chains: Chain[], maxAgeDays: number = 7): Promise<Token[]> {
    logger.info(`Discovering tokens on chains: ${chains.join(', ')}`);

    const discoveredTokens: Token[] = [];

    for (const chain of chains) {
      try {
        const tokens = await this.discoverTokensOnChain(chain, maxAgeDays);
        discoveredTokens.push(...tokens);
      } catch (error) {
        logger.error(`Failed to discover tokens on ${chain}`, error);
      }
    }

    logger.success(`Discovered ${discoveredTokens.length} new tokens across all chains`);
    return discoveredTokens;
  }

  private async discoverTokensOnChain(chain: Chain, maxAgeDays: number): Promise<Token[]> {
    logger.info(`Discovering tokens on ${chain} with Smart Money DEX Trades (max_age=${maxAgeDays}d, max_mcap=$15M)`);

    // Use Smart Money DEX Trades endpoint (Token Screener endpoint appears unavailable)
    const response = await nansenClient.smartMoneyDexTrades({
      chains: [chain],
      filters: {
        token_bought_age_days: {
          min: 0,
          max: maxAgeDays,
        },
      },
      pagination: {
        page: 1,
        per_page: 100,
      },
    });

    logger.info(`Retrieved ${response.data.length} smart money trades`);

    // Extract unique tokens and filter by market cap
    const tokenMap = new Map<string, {
      address: string;
      symbol: string;
      age_days: number;
      market_cap_usd: number;
      price_usd: number;
      trade_count: number;
      total_volume: number;
    }>();

    for (const trade of response.data) {
      const address = trade.token_bought_address;
      const marketCap = trade.token_bought_market_cap_usd || 0;

      // Apply max market cap filter ($15M)
      if (marketCap > 15000000) {
        continue;
      }

      if (!tokenMap.has(address)) {
        tokenMap.set(address, {
          address,
          symbol: trade.token_bought_symbol,
          age_days: trade.token_bought_age_days,
          market_cap_usd: marketCap,
          price_usd: trade.trade_value_usd / (trade.token_bought_amount || 1),
          trade_count: 1,
          total_volume: trade.trade_value_usd,
        });
      } else {
        const existing = tokenMap.get(address)!;
        existing.trade_count++;
        existing.total_volume += trade.trade_value_usd;
      }
    }

    // Convert to array and sort by trade count (more smart money activity = better)
    const tokens = Array.from(tokenMap.values())
      .sort((a, b) => b.trade_count - a.trade_count);

    logger.info(`Found ${tokens.length} unique tokens with smart money activity`);

    // Save tokens to database
    const savedTokens: Token[] = [];

    for (const tokenData of tokens) {
      const token: Token = {
        chain,
        address: tokenData.address,
        symbol: tokenData.symbol,
        discovered_at: new Date().toISOString(),
        token_age_days: tokenData.age_days,
        market_cap_usd: tokenData.market_cap_usd,
        liquidity_usd: tokenData.total_volume * 10, // Estimate liquidity
        first_seen_price_usd: tokenData.price_usd,
      };

      try {
        const saved = repositories.tokens.findOrCreate(token);
        savedTokens.push(saved);
        logger.info(`✓ ${saved.symbol} - Age: ${saved.token_age_days.toFixed(1)}d, MCap: $${(saved.market_cap_usd / 1000000).toFixed(2)}M, SM Trades: ${tokenData.trade_count}`);
      } catch (error) {
        logger.error(`Failed to save token ${token.symbol}`, error);
      }
    }

    return savedTokens;
  }

  async monitorSmartMoneyTrades(chains: Chain[]): Promise<SmartMoneyDexTrade[]> {
    logger.info('Monitoring smart money trades...');

    const allTrades: SmartMoneyDexTrade[] = [];

    for (const chain of chains) {
      try {
        const response = await nansenClient.smartMoneyDexTrades({
          chains: [chain],
          pagination: {
            page: 1,
            per_page: 50,
          },
        });

        allTrades.push(...response.data);
        logger.info(`Found ${response.data.length} smart money trades on ${chain}`);
      } catch (error) {
        logger.error(`Failed to get smart money trades on ${chain}`, error);
      }
    }

    return allTrades;
  }
}

export const tokenDiscovery = new TokenDiscovery();
