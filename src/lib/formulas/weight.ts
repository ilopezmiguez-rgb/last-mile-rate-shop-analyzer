/**
 * apply_weight_logic — hybrid binning.
 * - ≤ 1.0 lb: snap to nearest micro-bin from MICRO_BINS using ceiling semantics.
 *   i.e. the smallest bin that is ≥ the input value.
 * - > 1.0 lb: Math.ceil.
 *
 * Boundary behavior:
 *   0.10   → 0.125   (next bin up from the micro list)
 *   0.50   → 0.5     (exact match)
 *   0.9994 → 1.0
 *   1.0    → 1.0
 *   2.3    → 3
 *   10.0   → 10
 *   10.01  → 11
 */

export const MICRO_BINS: readonly number[] = Object.freeze([
  0.0625, 0.125, 0.1875, 0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625,
  0.6875, 0.75, 0.8125, 0.875, 0.9375, 0.9993, 1.0,
]);

const EPS = 1e-9;

export function applyWeightLogic(weight: number): number {
  if (!Number.isFinite(weight) || weight <= 0) return MICRO_BINS[0];
  if (weight <= 1 + EPS) {
    for (const b of MICRO_BINS) {
      if (weight <= b + EPS) return b;
    }
    return 1.0;
  }
  return Math.ceil(weight);
}

/**
 * Build an inline DuckDB CASE WHEN expression that matches the MICRO_BINS logic
 * for values <= 1, and uses CEIL otherwise. Produces the same mapping as the TS
 * function above.
 *
 * @param col — column reference (e.g. `weight`)
 */
export function buildNormalizedWeightSql(col: string): string {
  const micro = MICRO_BINS.map(
    (b) => `WHEN ${col} <= ${b.toFixed(6)} + 1e-9 THEN ${b}`
  ).join(" ");
  return `CASE WHEN ${col} <= 1.0 + 1e-9 THEN CASE ${micro} ELSE 1.0 END ELSE CAST(CEIL(${col}) AS DOUBLE) END`;
}
