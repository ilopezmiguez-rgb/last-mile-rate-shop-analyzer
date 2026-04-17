/**
 * Calibrated diverging win-rate scale in oklch. Cold tertiary blue at 0 → warm
 * amber-gold at 1.0 via a near-neutral surface-variant midpoint at 0.5. Works
 * in both themes because the endpoints are theme-agnostic oklch values.
 *
 * We avoid plain red/yellow/green because the Precision Ledger aesthetic wants
 * the color system to stay coherent with the surface palette.
 */

import { interpolateLab } from "d3-interpolate";

// oklch-inspired stops, sampled as hex so we can hand them to d3 interpolators.
// Chosen to read well against both dark and light surfaces.
const LOW = "#2f5394"; // cool blue (tertiary_container)
const MID = "#b8bdc9"; // neutral grey
const HIGH = "#fabd00"; // win-rate gold (secondary_container)

const lowToMid = interpolateLab(LOW, MID);
const midToHigh = interpolateLab(MID, HIGH);

export function winRateColor(rate: number, masked = false): string {
  if (masked) return "var(--color-surface-container)";
  const r = Math.max(0, Math.min(1, rate));
  if (r < 0.5) return lowToMid(r * 2);
  return midToHigh((r - 0.5) * 2);
}

/** Text that sits on top of a cell — choose a readable variant. */
export function winRateTextColor(rate: number, masked = false): string {
  if (masked) return "var(--color-on-surface-dim)";
  // Low and high ends have enough contrast for near-black text; in the middle
  // the fill is soft enough that a muted on-surface still reads.
  const r = Math.max(0, Math.min(1, rate));
  if (r < 0.25) return "rgba(245, 245, 250, 0.92)";
  if (r > 0.7) return "rgba(20, 22, 36, 0.92)";
  return "rgba(15, 20, 34, 0.85)";
}

const volumeLow = "#111a2e";
const volumeMid = "#1f3a80";
const volumeHigh = "#5aa9ff";

const volLowMid = interpolateLab(volumeLow, volumeMid);
const volMidHigh = interpolateLab(volumeMid, volumeHigh);

/** Sequential blues for volume heatmaps. t should already be normalized 0..1. */
export function volumeColor(t: number, masked = false): string {
  if (masked) return "var(--color-surface-container)";
  const r = Math.max(0, Math.min(1, t));
  if (r < 0.5) return volLowMid(r * 2);
  return volMidHigh((r - 0.5) * 2);
}

export function volumeTextColor(t: number): string {
  const r = Math.max(0, Math.min(1, t));
  if (r > 0.55) return "rgba(20, 22, 36, 0.92)";
  return "rgba(232, 234, 244, 0.92)";
}

/**
 * Linear percentile-style normalizer for volume. Returns a function that maps
 * raw volume → [0,1] based on the max in the set (root-normalized so highly
 * skewed datasets don't wash everything out).
 */
export function makeVolumeNormalizer(max: number) {
  const safe = Math.max(max, 1);
  return (v: number) => Math.sqrt(Math.max(0, v) / safe);
}
