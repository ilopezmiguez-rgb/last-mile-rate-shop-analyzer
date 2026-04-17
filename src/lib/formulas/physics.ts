/**
 * Physics Engine — the two invariants applied after any aggregation.
 *
 * - win_rate  = clamp(wins / max(quotes, 1), 0, 1)
 * - lost_vol  = max(quotes - wins, 0)
 *
 * Both hold even for dirty inputs (messy upstream joins could otherwise give
 * wins > quotes).
 */

export interface PhysicsInput {
  wins: number;
  quotes: number;
}

export interface PhysicsOutput {
  winRate: number;
  lostVolume: number;
}

export function applyPhysics({ wins, quotes }: PhysicsInput): PhysicsOutput {
  const safeQuotes = Math.max(quotes, 1);
  const rawRate = wins / safeQuotes;
  const winRate = Math.max(0, Math.min(1, rawRate));
  const lostVolume = Math.max(quotes - wins, 0);
  return { winRate, lostVolume };
}

export function coarseWeightBin(weight: number): string {
  if (weight < 1) return "0-1";
  if (weight < 2) return "1-2";
  if (weight < 5) return "2-5";
  if (weight < 10) return "5-10";
  return "10+";
}

export const COARSE_WEIGHT_BINS = ["0-1", "1-2", "2-5", "5-10", "10+"] as const;

export function buildCoarseWeightBinSql(col: string): string {
  return `CASE
    WHEN ${col} < 1 THEN '0-1'
    WHEN ${col} < 2 THEN '1-2'
    WHEN ${col} < 5 THEN '2-5'
    WHEN ${col} < 10 THEN '5-10'
    ELSE '10+' END`;
}
