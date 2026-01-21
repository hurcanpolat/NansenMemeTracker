import { nansenClient } from '../api/nansen-client';
import { repositories } from '../database/repositories';
import { logger } from '../utils/logger';
import { Chain, Timeframe, FlowIntelligenceData } from '../types/nansen';
import { Token, FlowAnalysis } from '../types/trading';

export class FlowAnalyzer {
  async analyzeTokenFlow(
    token: Token,
    timeframe: Timeframe = '24h'
  ): Promise<FlowAnalysis | null> {
    try {
      logger.debug(`Analyzing flow for ${token.symbol} on ${token.chain}`);

      const response = await nansenClient.flowIntelligence({
        chain: token.chain,
        token_address: token.address,
        timeframe,
      });

      if (!response.data || response.data.length === 0) {
        logger.warn(`No flow data for ${token.symbol}`);
        return null;
      }

      const flowData = response.data[0];
      const flowScore = this.calculateFlowScore(flowData);

      const analysis: FlowAnalysis = {
        token_id: token.id!,
        chain: token.chain,
        token_address: token.address,
        analyzed_at: new Date().toISOString(),
        timeframe,
        smart_money_net_flow_usd: flowData.smart_money_net_flow_usd || 0,
        smart_money_wallet_count: flowData.smart_money_wallet_count || 0,
        whale_net_flow_usd: flowData.whale_net_flow_usd || 0,
        whale_wallet_count: flowData.whale_wallet_count || 0,
        public_figure_net_flow_usd: flowData.public_figure_net_flow_usd || 0,
        public_figure_wallet_count: flowData.public_figure_wallet_count || 0,
        flow_score: flowScore,
      };

      const id = repositories.flowAnalysis.create(analysis);
      logger.success(`Flow analysis saved for ${token.symbol} (score: ${flowScore.toFixed(2)})`);

      return { ...analysis, id };
    } catch (error) {
      logger.error(`Failed to analyze flow for ${token.symbol}`, error);
      return null;
    }
  }

  async batchAnalyzeFlow(
    tokens: Token[],
    timeframe: Timeframe = '24h'
  ): Promise<Map<number, FlowAnalysis>> {
    logger.info(`Analyzing flow for ${tokens.length} tokens`);

    const results = new Map<number, FlowAnalysis>();

    for (const token of tokens) {
      try {
        const analysis = await this.analyzeTokenFlow(token, timeframe);
        if (analysis && token.id) {
          results.set(token.id, analysis);
        }

        await this.delay(300);
      } catch (error) {
        logger.error(`Flow analysis failed for ${token.symbol}`, error);
      }
    }

    logger.success(`Completed flow analysis for ${results.size}/${tokens.length} tokens`);
    return results;
  }

  private calculateFlowScore(flow: FlowIntelligenceData): number {
    let score = 0;

    const smFlow = flow.smart_money_net_flow_usd || 0;
    const smCount = flow.smart_money_wallet_count || 0;
    const whaleFlow = flow.whale_net_flow_usd || 0;
    const whaleCount = flow.whale_wallet_count || 0;
    const pfFlow = flow.public_figure_net_flow_usd || 0;
    const pfCount = flow.public_figure_wallet_count || 0;

    if (smFlow > 0) score += 30;
    if (smCount >= 3) score += 20;
    if (smCount >= 5) score += 10;

    if (whaleFlow > 0) score += 20;
    if (whaleCount >= 2) score += 10;
    if (whaleCount >= 5) score += 10;

    if (pfFlow > 0) score += 10;
    if (pfCount >= 1) score += 5;

    if (smFlow > 100000) score += 15;
    if (whaleFlow > 100000) score += 10;

    const totalPositiveFlow = (smFlow > 0 ? smFlow : 0) + (whaleFlow > 0 ? whaleFlow : 0) + (pfFlow > 0 ? pfFlow : 0);
    const totalNegativeFlow = Math.abs(smFlow < 0 ? smFlow : 0) + Math.abs(whaleFlow < 0 ? whaleFlow : 0) + Math.abs(pfFlow < 0 ? pfFlow : 0);

    if (totalPositiveFlow > totalNegativeFlow * 2) {
      score += 20;
    }

    return Math.min(100, Math.max(0, score));
  }

  isFlowPositive(analysis: FlowAnalysis): boolean {
    return (
      analysis.smart_money_net_flow_usd > 0 &&
      analysis.whale_net_flow_usd >= 0 &&
      analysis.flow_score >= 50
    );
  }

  hasStrongFlow(analysis: FlowAnalysis): boolean {
    return (
      analysis.flow_score >= 70 &&
      analysis.smart_money_wallet_count >= 3 &&
      analysis.smart_money_net_flow_usd > 50000
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const flowAnalyzer = new FlowAnalyzer();
