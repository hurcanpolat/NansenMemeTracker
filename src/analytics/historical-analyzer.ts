import { nansenClient } from '../api/nansen-client';
import { repositories } from '../database/repositories';
import { logger } from '../utils/logger';
import { Token, SmartMoneyEntry } from '../types/trading';
import { TGMDexTrade } from '../types/nansen';

export class HistoricalAnalyzer {
  async analyzeSmartMoneyEntries(
    token: Token,
    lookbackDays: number = 7
  ): Promise<SmartMoneyEntry[]> {
    try {
      logger.debug(`Analyzing smart money entries for ${token.symbol}`);

      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - lookbackDays);

      const response = await nansenClient.getAllTGMDexTrades(
        {
          chain: token.chain,
          token_address: token.address,
          date: {
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
          },
          only_smart_money: true,
          filters: {
            action: 'BUY',
            estimated_value_usd: {
              min: 100,
            },
          },
          order_by: [
            {
              field: 'block_timestamp',
              direction: 'asc',
            },
          ],
        },
        20
      );

      const trades = response.data;

      if (trades.length === 0) {
        logger.info(`No smart money buys found for ${token.symbol}`);
        return [];
      }

      const entries = this.processTrades(token, trades);
      const savedEntries: SmartMoneyEntry[] = [];

      for (const entry of entries) {
        try {
          const id = repositories.smartMoneyEntries.create(entry);
          savedEntries.push({ ...entry, id });
        } catch (error) {
          logger.debug(`Entry already exists: ${entry.transaction_hash}`);
        }
      }

      logger.success(
        `Saved ${savedEntries.length} smart money entries for ${token.symbol} (first: ${entries[0]?.entry_timestamp})`
      );

      return savedEntries;
    } catch (error) {
      logger.error(`Failed to analyze smart money entries for ${token.symbol}`, error);
      return [];
    }
  }

  private processTrades(token: Token, trades: TGMDexTrade[]): SmartMoneyEntry[] {
    const entries: SmartMoneyEntry[] = [];
    const seenTraders = new Set<string>();
    let isFirstEntry = true;

    for (const trade of trades) {
      if (trade.action !== 'BUY') continue;

      const entry: SmartMoneyEntry = {
        token_id: token.id!,
        chain: token.chain,
        token_address: token.address,
        trader_address: trade.trader_address,
        trader_label: trade.trader_address_label || 'Unknown',
        entry_timestamp: trade.block_timestamp,
        entry_price_usd: trade.estimated_swap_price_usd,
        trade_value_usd: trade.estimated_value_usd,
        transaction_hash: trade.transaction_hash,
        is_first_entry: isFirstEntry ? 1 : 0,
      };

      entries.push(entry);
      seenTraders.add(trade.trader_address);

      if (isFirstEntry) {
        isFirstEntry = false;
      }
    }

    return entries;
  }

  async getFirstSmartMoneyEntry(tokenId: number): Promise<SmartMoneyEntry | null> {
    return repositories.smartMoneyEntries.findFirstEntry(tokenId);
  }

  async getSmartMoneyStatistics(tokenId: number): Promise<{
    count: number;
    totalVolume: number;
    averageEntryPrice: number;
    firstEntry: SmartMoneyEntry | null;
  }> {
    const entries = repositories.smartMoneyEntries.findByTokenId(tokenId);
    const count = repositories.smartMoneyEntries.getEntryCount(tokenId);
    const totalVolume = repositories.smartMoneyEntries.getTotalVolume(tokenId);
    const firstEntry = repositories.smartMoneyEntries.findFirstEntry(tokenId);

    const averageEntryPrice =
      entries.length > 0
        ? entries.reduce((sum, e) => sum + e.entry_price_usd, 0) / entries.length
        : 0;

    return {
      count,
      totalVolume,
      averageEntryPrice,
      firstEntry,
    };
  }

  async findAccumulationPattern(tokenId: number, windowMinutes: number = 60): Promise<{
    hasAccumulation: boolean;
    accumulationStart?: string;
    traderCount: number;
    totalVolume: number;
  }> {
    const entries = repositories.smartMoneyEntries.findByTokenId(tokenId);

    if (entries.length < 3) {
      return {
        hasAccumulation: false,
        traderCount: 0,
        totalVolume: 0,
      };
    }

    const windowMs = windowMinutes * 60 * 1000;
    let maxTraders = 0;
    let maxVolume = 0;
    let accumulationStart: string | undefined;

    for (let i = 0; i < entries.length; i++) {
      const windowStart = new Date(entries[i].entry_timestamp).getTime();
      const windowEnd = windowStart + windowMs;

      const windowEntries = entries.filter((e) => {
        const time = new Date(e.entry_timestamp).getTime();
        return time >= windowStart && time <= windowEnd;
      });

      const uniqueTraders = new Set(windowEntries.map((e) => e.trader_address)).size;
      const volume = windowEntries.reduce((sum, e) => sum + e.trade_value_usd, 0);

      if (uniqueTraders >= 3 && uniqueTraders > maxTraders) {
        maxTraders = uniqueTraders;
        maxVolume = volume;
        accumulationStart = entries[i].entry_timestamp;
      }
    }

    return {
      hasAccumulation: maxTraders >= 3,
      accumulationStart,
      traderCount: maxTraders,
      totalVolume: maxVolume,
    };
  }
}

export const historicalAnalyzer = new HistoricalAnalyzer();
