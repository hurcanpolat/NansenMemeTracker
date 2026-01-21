import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import {
  TokenScreenerRequest,
  TokenScreenerResponse,
  SmartMoneyDexTradesRequest,
  SmartMoneyDexTradesResponse,
  FlowIntelligenceRequest,
  FlowIntelligenceResponse,
  TGMDexTradesRequest,
  TGMDexTradesResponse,
} from '../types/nansen';

export class NansenClient {
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.client = axios.create({
      baseURL: config.nansen.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey || config.nansen.apiKey,
      },
      timeout: 30000,
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error('Nansen API Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
        throw error;
      }
    );
  }

  async tokenScreener(request: TokenScreenerRequest): Promise<TokenScreenerResponse> {
    try {
      logger.debug('Token Screener request', request);
      const response = await this.client.post<TokenScreenerResponse>(
        '/tgm/token-screener',
        request
      );
      logger.debug(`Token Screener found ${response.data.data.length} tokens`);
      return response.data;
    } catch (error) {
      logger.error('Token Screener failed', error);
      throw error;
    }
  }

  async smartMoneyDexTrades(
    request: SmartMoneyDexTradesRequest
  ): Promise<SmartMoneyDexTradesResponse> {
    try {
      logger.debug('Smart Money DEX Trades request', request);
      const response = await this.client.post<SmartMoneyDexTradesResponse>(
        '/smart-money/dex-trades',
        request
      );
      logger.debug(`Smart Money DEX Trades found ${response.data.data.length} trades`);
      return response.data;
    } catch (error) {
      logger.error('Smart Money DEX Trades failed', error);
      throw error;
    }
  }

  async flowIntelligence(
    request: FlowIntelligenceRequest
  ): Promise<FlowIntelligenceResponse> {
    try {
      logger.debug('Flow Intelligence request', request);
      const response = await this.client.post<FlowIntelligenceResponse>(
        '/tgm/flow-intelligence',
        request
      );
      logger.debug('Flow Intelligence data received');
      return response.data;
    } catch (error) {
      logger.error('Flow Intelligence failed', error);
      throw error;
    }
  }

  async tgmDexTrades(request: TGMDexTradesRequest): Promise<TGMDexTradesResponse> {
    try {
      logger.debug('TGM DEX Trades request', request);
      const response = await this.client.post<TGMDexTradesResponse>(
        '/tgm/dex-trades',
        request
      );
      logger.debug(`TGM DEX Trades found ${response.data.data.length} trades`);
      return response.data;
    } catch (error) {
      logger.error('TGM DEX Trades failed', error);
      throw error;
    }
  }

  async getAllTGMDexTrades(
    request: TGMDexTradesRequest,
    maxPages: number = 10
  ): Promise<TGMDexTradesResponse> {
    const allTrades: TGMDexTradesResponse = {
      data: [],
      pagination: { page: 1, per_page: 100, last_page: false },
    };

    let currentPage = 1;
    let hasMorePages = true;

    while (hasMorePages && currentPage <= maxPages) {
      const pageRequest = {
        ...request,
        pagination: { page: currentPage, per_page: 100 },
      };

      const response = await this.tgmDexTrades(pageRequest);
      allTrades.data.push(...response.data);

      hasMorePages = !response.pagination.last_page;
      currentPage++;

      if (hasMorePages) {
        await this.delay(200);
      }
    }

    logger.info(`Fetched ${allTrades.data.length} total trades across ${currentPage - 1} pages`);
    return allTrades;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const nansenClient = new NansenClient();
