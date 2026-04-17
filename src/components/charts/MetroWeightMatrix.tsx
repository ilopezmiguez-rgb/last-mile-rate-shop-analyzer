"use client";

import { useMemo, useState } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HeatmapGrid, type HeatCell } from "@/components/charts/HeatmapGrid";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/ToggleGroup";
import { Slider } from "@/components/ui/Slider";
import { formatCount, formatPct, formatWeight } from "@/lib/format";
import {
  makeVolumeNormalizer,
  volumeColor,
  volumeTextColor,
  winRateColor,
  winRateTextColor,
} from "@/lib/charts/palette";

type Row = {
  normalized_weight: number;
  destination_metro_code: string;
  quotes: number;
  wins: number;
  win_rate: number;
};

export function MetroWeightMatrix() {
  const { filter } = useFilter();
  const where = buildWhere(filter);
  const [mode, setMode] = useState<"wr" | "vol">("wr");
  const [mask, setMask] = useState(20);

  const { data, status } = useSqlQuery<Row>(
    `SELECT r.normalized_weight,
            r.destination_metro_code,
            COUNT(*)                            AS quotes,
            COUNT(*) FILTER (WHERE is_won)      AS wins,
            LEAST(1.0, GREATEST(0.0,
              CAST(COUNT(*) FILTER (WHERE is_won) AS DOUBLE)
              / GREATEST(COUNT(*), 1)
            ))                                  AS win_rate
     FROM records_normalized r
     WHERE record_type = 'Rate Shop' AND ${where.sql}
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    where.params
  );

  const rows = data ?? [];

  const orderedWeights = useMemo(() => {
    const s = new Set<number>(rows.map((r) => Number(r.normalized_weight)));
    return Array.from(s).sort((a, b) => a - b);
  }, [rows]);

  const orderedMetros = useMemo(() => {
    const agg = new Map<string, number>();
    for (const r of rows) {
      agg.set(
        r.destination_metro_code,
        (agg.get(r.destination_metro_code) ?? 0) + Number(r.quotes)
      );
    }
    return Array.from(agg.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m]) => m);
  }, [rows]);

  const maxVol = useMemo(
    () => rows.reduce((m, r) => Math.max(m, Number(r.quotes)), 0),
    [rows]
  );
  const norm = useMemo(() => makeVolumeNormalizer(maxVol), [maxVol]);

  const cells = useMemo(() => {
    const m = new Map<string, HeatCell>();
    for (const r of rows) {
      const q = Number(r.quotes);
      const wr = Number(r.win_rate);
      m.set(`${r.normalized_weight}|${r.destination_metro_code}`, {
        value: mode === "wr" ? wr : norm(q),
        volume: q,
        label: mode === "wr" ? formatPct(wr) : formatCount(q),
      });
    }
    return m;
  }, [rows, norm, mode]);

  return (
    <ChartFrame
      title="Metro × Weight Matrix"
      howToRead="Same weight rows, but columns are destination metros ranked by volume. Toggle to swap between win rate and quote count."
      code="ANL-03"
      loading={status === "loading"}
      actions={
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as "wr" | "vol")}
            aria-label="Metric"
          >
            <ToggleGroupItem value="wr">Win rate</ToggleGroupItem>
            <ToggleGroupItem value="vol">Volume</ToggleGroupItem>
          </ToggleGroup>
          {mode === "wr" && (
            <div className="flex items-center gap-2 h-8 px-2 rounded-sm bg-[color:var(--color-surface-container-low)] ghost-border min-w-[160px]">
              <span className="font-label text-[color:var(--color-on-surface-dim)]">
                Mask &lt;
              </span>
              <Slider
                value={[mask]}
                onValueChange={([v]) => setMask(v)}
                min={0}
                max={100}
                step={5}
                className="flex-1"
                aria-label="Mask threshold"
              />
              <span className="font-mono text-[0.75rem] w-7 text-right">
                {mask}
              </span>
            </div>
          )}
        </div>
      }
      tableFallback={
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
                <th className="py-2 px-2">Weight</th>
                <th className="py-2 px-2">Metro</th>
                <th className="py-2 px-2 text-right">Quotes</th>
                <th className="py-2 px-2 text-right">Wins</th>
                <th className="py-2 px-2 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-[color:var(--color-surface-container)]/40">
                  <td className="py-1.5 px-2 font-mono">{formatWeight(Number(r.normalized_weight))}</td>
                  <td className="py-1.5 px-2 font-mono">{r.destination_metro_code}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.quotes))}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.wins))}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatPct(Number(r.win_rate))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-[color:var(--color-on-surface-dim)]">
          No matching records.
        </div>
      ) : (
        <HeatmapGrid
          rows={orderedWeights}
          cols={orderedMetros}
          rowLabel={(w) => formatWeight(Number(w))}
          colLabel={(m) => String(m)}
          cells={cells}
          fill={(cell, masked) =>
            mode === "wr" ? winRateColor(cell.value, masked) : volumeColor(cell.value)
          }
          textFill={(cell, masked) =>
            mode === "wr" ? winRateTextColor(cell.value, masked) : volumeTextColor(cell.value)
          }
          maskThreshold={mode === "wr" ? mask : 0}
          cellHeight={30}
          axisLabelRow="Weight"
          axisLabelCol="Metro →"
          animateKey={mode + rows.length}
          renderTooltip={(w, metro, cell, masked) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">Weight</span>
                <span className="font-mono text-xs">{formatWeight(Number(w))}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">Metro</span>
                <span className="font-mono text-xs">{String(metro)}</span>
              </div>
              <div className="h-px bg-[color:var(--color-outline-variant)]/20 my-1" />
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">Quotes</span>
                <span className="font-mono text-xs">{formatCount(cell?.volume ?? 0)}</span>
              </div>
              {mode === "wr" && (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-label text-[color:var(--color-on-surface-dim)]">Win rate</span>
                  <span className={`font-mono text-xs ${masked ? "text-[color:var(--color-on-surface-dim)]" : ""}`}>
                    {cell ? formatPct(cell.value) : "—"}
                    {masked && <span className="ml-2 font-label">LOW VOL</span>}
                  </span>
                </div>
              )}
            </div>
          )}
        />
      )}
    </ChartFrame>
  );
}
