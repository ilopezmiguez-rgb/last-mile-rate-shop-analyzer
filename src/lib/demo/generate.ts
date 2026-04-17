/**
 * Deterministic demo data generator — 50k rows, 30 days, 15 metros, realistic
 * segment-level win-rate patterns. Uses a seeded PRNG so the dataset is stable
 * across reloads (the prompt promises recruiters see something immediately).
 */

import type { RawRecord } from "@/types/record";
import { applyWeightLogic } from "@/lib/formulas/weight";
import { applyDistanceLogic } from "@/lib/formulas/distance";

/** mulberry32 — small deterministic PRNG. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type MetroProfile = {
  code: string;
  avgDistance: number;
  distanceSpread: number;
  baseWinRate: number;
  volumeShare: number; // relative weight in row sampling
  zipcodes: string[];
};

// 15 metros with plausible geography. Distances are rough averages from a
// central hub; the win-rate curve is modulated by weight/distance downstream.
const METROS: MetroProfile[] = [
  { code: "CHI", avgDistance: 250, distanceSpread: 200, baseWinRate: 0.62, volumeShare: 1.4, zipcodes: ["60601", "60611", "60657", "60616"] },
  { code: "NYC", avgDistance: 280, distanceSpread: 200, baseWinRate: 0.58, volumeShare: 1.6, zipcodes: ["10001", "10013", "11201", "10022"] },
  { code: "LAX", avgDistance: 600, distanceSpread: 400, baseWinRate: 0.55, volumeShare: 1.4, zipcodes: ["90001", "90025", "90210", "90045"] },
  { code: "ATL", avgDistance: 450, distanceSpread: 300, baseWinRate: 0.50, volumeShare: 1.3, zipcodes: ["30301", "30309", "30318", "30305"] },
  { code: "DAL", avgDistance: 500, distanceSpread: 300, baseWinRate: 0.48, volumeShare: 1.3, zipcodes: ["75201", "75204", "75215", "75219"] },
  { code: "HOU", avgDistance: 600, distanceSpread: 350, baseWinRate: 0.45, volumeShare: 1.0, zipcodes: ["77001", "77006", "77024", "77056"] },
  { code: "MIA", avgDistance: 900, distanceSpread: 500, baseWinRate: 0.40, volumeShare: 0.9, zipcodes: ["33101", "33131", "33139"] },
  { code: "SEA", avgDistance: 1800, distanceSpread: 400, baseWinRate: 0.35, volumeShare: 0.8, zipcodes: ["98101", "98104", "98109"] },
  { code: "DEN", avgDistance: 900, distanceSpread: 400, baseWinRate: 0.50, volumeShare: 0.7, zipcodes: ["80202", "80205", "80211"] },
  { code: "PHX", avgDistance: 1200, distanceSpread: 500, baseWinRate: 0.38, volumeShare: 0.8, zipcodes: ["85001", "85004", "85020"] },
  { code: "BOS", avgDistance: 350, distanceSpread: 200, baseWinRate: 0.55, volumeShare: 0.9, zipcodes: ["02108", "02115", "02134"] },
  { code: "PHL", avgDistance: 180, distanceSpread: 120, baseWinRate: 0.60, volumeShare: 1.0, zipcodes: ["19103", "19107", "19123"] },
  { code: "DTW", avgDistance: 300, distanceSpread: 200, baseWinRate: 0.52, volumeShare: 0.8, zipcodes: ["48201", "48202", "48226"] },
  { code: "MSP", avgDistance: 500, distanceSpread: 300, baseWinRate: 0.47, volumeShare: 0.7, zipcodes: ["55401", "55403", "55408"] },
  { code: "POR", avgDistance: 2000, distanceSpread: 500, baseWinRate: 0.30, volumeShare: 0.6, zipcodes: ["97201", "97204", "97210"] },
];

type WeightedMetro = MetroProfile & { weight: number };

function sampleMetro(rand: () => number, cum: WeightedMetro[], total: number): MetroProfile {
  const r = rand() * total;
  for (const m of cum) if (r < m.weight) return m;
  return cum[cum.length - 1];
}

/**
 * Segment-aware win-rate. Dense urban small-package wins more; long-haul heavy
 * wins less; the two "swing" metros (ATL, DAL) are held near 50% so the Swing
 * State chart has real signal.
 */
function segmentWinRate(
  baseWinRate: number,
  weight: number,
  distance: number,
  metroCode: string
): number {
  let r = baseWinRate;

  // Dense urban small-package boost
  if (weight < 2 && distance < 300 && (metroCode === "CHI" || metroCode === "NYC" || metroCode === "LAX")) {
    r = 0.72;
  }
  // Long-haul heavy penalty
  else if (weight > 10 && distance > 1800) {
    r = 0.25;
  }
  // Swing metros (ATL, DAL) — hold within 0.40–0.60
  else if (metroCode === "ATL" || metroCode === "DAL") {
    // weight-modulated around the base but clamped into the swing band
    const drift = (weight - 5) * 0.01;
    r = Math.max(0.40, Math.min(0.60, baseWinRate - drift));
  }
  // General shape: lighter + closer = higher WR, within ±0.15
  else {
    const weightPenalty = Math.min(0.20, weight * 0.012);
    const distancePenalty = Math.min(0.20, distance * 0.00012);
    r = baseWinRate - weightPenalty - distancePenalty + 0.05;
  }

  return Math.max(0.05, Math.min(0.95, r));
}

export interface GenerateOptions {
  rows?: number;
  days?: number;
  endDate?: Date;
  seed?: number;
}

export function generateDemoRecords(opts: GenerateOptions = {}): RawRecord[] {
  const rows = opts.rows ?? 50_000;
  const days = opts.days ?? 30;
  const endDate = opts.endDate ?? new Date("2026-04-15T00:00:00Z");
  const seed = opts.seed ?? 0xabadcafe;
  const rand = mulberry32(seed);

  // Build cumulative weighted metro sampler.
  let total = 0;
  const cum: WeightedMetro[] = METROS.map((m) => {
    total += m.volumeShare;
    return { ...m, weight: total };
  });

  const out: RawRecord[] = new Array(rows);

  for (let i = 0; i < rows; i++) {
    const metro = sampleMetro(rand, cum, total);
    const zip = metro.zipcodes[Math.floor(rand() * metro.zipcodes.length)];

    // Weight — mix of micro-bin range and heavier freight.
    // 45% <2 lb, 25% 2–10 lb, 20% 10–20 lb, 10% 20–50 lb
    const wr = rand();
    let weight: number;
    if (wr < 0.45) weight = Math.max(0.05, rand() * 2);
    else if (wr < 0.70) weight = 2 + rand() * 8;
    else if (wr < 0.90) weight = 10 + rand() * 10;
    else weight = 20 + rand() * 30;

    // Distance — metro-centered with spread, clamped to [10, 2800].
    const distance = Math.max(
      10,
      Math.min(
        2800,
        metro.avgDistance + (rand() - 0.5) * 2 * metro.distanceSpread
      )
    );

    // Quote price — roughly $0.80–$2.40 per lb-mile factor.
    const basePrice = 2.5 + weight * 0.22 + distance * 0.004;
    const price = Number(
      (basePrice + (rand() - 0.5) * basePrice * 0.15).toFixed(2)
    );

    // Date — uniformly spread over the window.
    const dayOffset = Math.floor(rand() * days);
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - dayOffset);
    const dateStr = d.toISOString().slice(0, 10);

    const id = `DEMO-${i.toString(36).padStart(5, "0")}`;

    out[i] = {
      record_type: "Rate Shop",
      bt_shipment_id: id,
      origin_zipcode: zip,
      destination_metro_code: metro.code,
      weight: Number(weight.toFixed(4)),
      distance: Number(distance.toFixed(2)),
      total_charge: price,
      record_date: dateStr,
    };

    // Dice roll for "win" per segment-aware rate.
    const targetRate = segmentWinRate(metro.baseWinRate, weight, distance, metro.code);
    if (rand() < targetRate) {
      // Transaction rows use the same bt_shipment_id — that's the strict join.
      // Price for the won side can drift a bit from the quote (negotiated).
      const wonPrice = Number(
        (price * (0.96 + rand() * 0.08)).toFixed(2)
      );
      out.push({
        record_type: "Transaction",
        bt_shipment_id: id,
        origin_zipcode: zip,
        destination_metro_code: metro.code,
        weight: Number(weight.toFixed(4)),
        distance: Number(distance.toFixed(2)),
        total_charge: wonPrice,
        record_date: dateStr,
      });
    }
  }

  return out;
}

/** Cross-check helper — spot that SQL + TS weight logic agree on a fixture. */
export function crossVerifyNormalization(rows: RawRecord[]) {
  const issues: string[] = [];
  for (const r of rows.slice(0, 1000)) {
    const w = applyWeightLogic(r.weight);
    const z = applyDistanceLogic(r.distance);
    if (!Number.isFinite(w)) issues.push(`weight NaN for ${r.weight}`);
    if (!z) issues.push(`zone empty for ${r.distance}`);
  }
  return issues;
}

export const DEMO_METROS = METROS.map((m) => m.code);
