import { nansenClient } from '../api/nansen-client';
import { repositories } from '../database/repositories';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { Chain, SmartMoneyDexTrade } from '../types/nansen';
import { Token } from '../types/trading';

export class TokenDiscovery {
  async discoverNewTokens(chains: Chain[], maxAgeDays: number): Promise<Token[]> {
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
    const trades = await nansenClient.smartMoneyDexTrades({
      chains: [chain],
      filters: {
        token_bought_age_days: {
          min: 0,
          max: maxAgeDays,
        },
        trade_value_usd: {
          min: config.filtering.minLiquidityUsd / 100,
        },
      },
      pagination: {
        page: 1,
        per_page: 100,
      },
    });

    const uniqueTokens = this.extractUniqueTokens(chain, trades.data);
    const savedTokens: Token[] = [];

    for (const tokenData of uniqueTokens) {
      const token: Token = {
        chain,
        address: tokenData.token_address,
        symbol: tokenData.symbol,
        discovered_at: new Date().toISOString(),
        token_age_days: tokenData.age_days,
        market_cap_usd: tokenData.market_cap_usd,
        liquidity_usd: tokenData.liquidity_estimate,
        first_seen_price_usd: tokenData.price_estimate,
      };

      try {
        const saved = repositories.tokens.findOrCreate(token);
        savedTokens.push(saved);
        logger.debug(`Token saved: ${saved.symbol} (${saved.address}) on ${chain}`);
      } catch (error) {
        logger.error(`Failed to save token ${token.symbol}`, error);
      }
    }

    logger.info(`Found ${savedTokens.length} unique tokens on ${chain}`);
    return savedTokens;
  }

  private extractUniqueTokens(
    chain: Chain,
    trades: SmartMoneyDexTrade[]
  ): Array<{
    token_address: string;
    symbol: string;
    age_days: number;
    market_cap_usd: number;
    liquidity_estimate: number;
    price_estimate: number;
  }> {
    const tokenMap = new Map<
      string,
      {
        token_address: string;
        symbol: string;
        age_days: number;
        market_cap_usd: number;
        liquidity_estimate: number;
        price_estimate: number;
        total_volume: number;
      }
    >();

    for (const trade of trades) {
      const address = trade.token_bought_address;

      if (!tokenMap.has(address)) {
        tokenMap.set(address, {
          token_address: address,
          symbol: trade.token_bought_symbol,
          age_days: trade.token_bought_age_days,
          market_cap_usd: trade.token_bought_market_cap_usd,
          liquidity_estimate: trade.trade_value_usd * 10,
          price_estimate: trade.trade_value_usd / trade.token_bought_amount,
          total_volume: trade.trade_value_usd,
        });
      } else {
        const existing = tokenMap.get(address)!;
        existing.total_volume += trade.trade_value_usd;
        existing.liquidity_estimate = Math.max(
          existing.liquidity_estimate,
          trade.trade_value_usd * 10
        );
      }
    }

    return Array.from(tokenMap.values())
      .filter((token) => token.liquidity_estimate >= config.filtering.minLiquidityUsd)
      .sort((a, b) => b.total_volume - a.total_volume);
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
