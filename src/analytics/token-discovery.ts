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
    logger.info(`Discovering tokens on ${chain} via Token Screener (max_age=${maxAgeDays}d, max_mcap=$15M)`);

    // Use Token Screener endpoint which includes netflow data
    const response = await nansenClient.tokenScreener({
      chains: [chain],
      timeframe: '24h',
      filters: {
        only_smart_money: true,
        token_age_days: {
          min: 0,
          max: maxAgeDays,
        },
        market_cap_usd: {
          max: 15000000,
        },
      },
      pagination: {
        page: 1,
        per_page: 100,
      },
    });

    logger.info(`Retrieved ${response.data.length} tokens from Token Screener`);

    // Sort by netflow (already included in response)
    const sortedTokens = response.data.sort((a, b) => b.netflow - a.netflow);

    logger.info(`Sorted ${sortedTokens.length} tokens by netflow`);

    // Save tokens to database
    const savedTokens: Token[] = [];

    for (const tokenData of sortedTokens) {
      const token: Token = {
        chain,
        address: tokenData.token_address,
        symbol: tokenData.token_symbol,
        discovered_at: new Date().toISOString(),
        token_age_days: tokenData.token_age_days,
        market_cap_usd: tokenData.market_cap_usd,
        liquidity_usd: tokenData.liquidity,
        first_seen_price_usd: tokenData.price_usd,
      };

      try {
        const saved = repositories.tokens.findOrCreate(token);
        savedTokens.push(saved);
        const netflowFormatted = tokenData.netflow >= 0
          ? `+$${(tokenData.netflow / 1000).toFixed(1)}K`
          : `-$${(Math.abs(tokenData.netflow) / 1000).toFixed(1)}K`;
        logger.info(`✓ ${saved.symbol} - Age: ${saved.token_age_days.toFixed(1)}d, MCap: $${(saved.market_cap_usd / 1000000).toFixed(2)}M, Netflow: ${netflowFormatted}`);
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
