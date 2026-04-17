/**
 * Price Recommendator decision table (per spec §5.3).
 */

export type Action = "INCREASE" | "DECREASE" | "HOLD";

export interface RecommendInput {
  volume: number;
  winRate: number;
  currentPrice: number;
}

export interface RecommendParams {
  step: number;
  lower: number;
  upper: number;
}

export interface Recommendation {
  action: Action;
  suggestedAdjustment: number; // signed
  proposedPrice: number;
  impactScore: number;
}

export function recommend(
  { volume, winRate, currentPrice }: RecommendInput,
  { step, lower, upper }: RecommendParams
): Recommendation {
  if (winRate > upper) {
    return {
      action: "INCREASE",
      suggestedAdjustment: +step,
      proposedPrice: Number((currentPrice + step).toFixed(2)),
      impactScore: Number((volume * (winRate - upper)).toFixed(4)),
    };
  }
  if (winRate < lower) {
    return {
      action: "DECREASE",
      suggestedAdjustment: -step,
      proposedPrice: Number((currentPrice - step).toFixed(2)),
      impactScore: Number((volume * (lower - winRate)).toFixed(4)),
    };
  }
  return {
    action: "HOLD",
    suggestedAdjustment: 0,
    proposedPrice: currentPrice,
    impactScore: 0,
  };
}
