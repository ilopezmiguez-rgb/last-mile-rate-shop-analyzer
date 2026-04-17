/**
 * apply_distance_logic — "Price is Right" mapping: return the closest lower
 * bucket label without going over. Upper bounds are INCLUSIVE.
 *
 *   50.0      → "1. 0-50 miles"
 *   50.00001  → "2. 50-150 miles"
 *   2600.0    → "9. 2200-2600 miles"
 *   2600.01   → "10. Over 2600 miles"
 */

export type Zone = {
  /** 1-indexed zone rank, stable sort key */
  rank: number;
  /** Inclusive upper bound. null = open (the "Over 2600" bucket). */
  upper: number | null;
  /** Human-readable label kept identical to the Python output. */
  label: string;
};

export const ZONES: readonly Zone[] = Object.freeze([
  { rank: 1, upper: 50, label: "1. 0-50 miles" },
  { rank: 2, upper: 150, label: "2. 50-150 miles" },
  { rank: 3, upper: 300, label: "3. 150-300 miles" },
  { rank: 4, upper: 600, label: "4. 300-600 miles" },
  { rank: 5, upper: 1000, label: "5. 600-1000 miles" },
  { rank: 6, upper: 1400, label: "6. 1000-1400 miles" },
  { rank: 7, upper: 1800, label: "7. 1400-1800 miles" },
  { rank: 8, upper: 2200, label: "8. 1800-2200 miles" },
  { rank: 9, upper: 2600, label: "9. 2200-2600 miles" },
  { rank: 10, upper: null, label: "10. Over 2600 miles" },
]);

export function applyDistanceLogic(distance: number): string {
  if (!Number.isFinite(distance) || distance < 0) return ZONES[0].label;
  for (const z of ZONES) {
    if (z.upper === null) return z.label;
    if (distance <= z.upper) return z.label;
  }
  return ZONES[ZONES.length - 1].label;
}

export function distanceToRank(distance: number): number {
  for (const z of ZONES) {
    if (z.upper === null) return z.rank;
    if (distance <= z.upper) return z.rank;
  }
  return ZONES[ZONES.length - 1].rank;
}

/**
 * DuckDB CASE WHEN that reproduces applyDistanceLogic on column `col`.
 */
export function buildZoneNameSql(col: string): string {
  const cases = ZONES.filter((z) => z.upper !== null)
    .map((z) => `WHEN ${col} <= ${z.upper} THEN '${z.label}'`)
    .join(" ");
  return `CASE ${cases} ELSE '${ZONES[ZONES.length - 1].label}' END`;
}
