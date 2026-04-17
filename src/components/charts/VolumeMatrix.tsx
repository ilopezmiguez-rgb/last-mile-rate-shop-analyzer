"use client";

import { useMemo } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HeatmapGrid, type HeatCell } from "@/components/charts/HeatmapGrid";
import { formatCount, formatWeight } from "@/lib/format";
import { makeVolumeNormalizer, volumeColor, volumeTextColor } from "@/lib/charts/palette";

type Row = {
  normalized_weight: number;
  zone_name: string;
  zone_rank: number;
  quotes: number;
};

export function VolumeMatrix() {
  const { filter } = useFilter();
  const where = buildWhere(filter);

  const { data, status } = useSqlQuery<Row>(
    `SELECT r.normalized_weight,
            r.zone_name,
            z.rank AS zone_rank,
            COUNT(*) AS quotes
     FROM records_normalized r
     JOIN zone_order z ON z.zone_name = r.zone_name
     WHERE record_type = 'Rate Shop' AND ${where.sql}
     GROUP BY 1, 2, 3
     ORDER BY 1, 3`,
    where.params
  );

  const rows = data ?? [];
  const maxVol = useMemo(
    () => rows.reduce((m, r) => Math.max(m, Number(r.quotes)), 0),
    [rows]
  );
  const norm = useMemo(() => makeVolumeNormalizer(maxVol), [maxVol]);

  const orderedWeights = useMemo(() => {
    const s = new Set<number>(rows.map((r) => Number(r.normalized_weight)));
    return Array.from(s).sort((a, b) => a - b);
  }, [rows]);
  const orderedZones = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach((r) => seen.set(r.zone_name, Number(r.zone_rank)));
    return Array.from(seen.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([z]) => z);
  }, [rows]);

  const cells = useMemo(() => {
    const m = new Map<string, HeatCell>();
    for (const r of rows) {
      const q = Number(r.quotes);
      m.set(`${r.normalized_weight}|${r.zone_name}`, {
        value: norm(q),
        volume: q,
        label: formatCount(q),
      });
    }
    return m;
  }, [rows, norm]);

  return (
    <ChartFrame
      title="Volume Matrix"
      howToRead="Total rate-shop count per segment. Deeper blue = more demand. Pairs with the Conversion Matrix to separate the high-WR-low-vol cells from the real opportunities."
      code="ANL-02"
      loading={status === "loading"}
      tableFallback={
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
                <th className="py-2 px-2">Weight</th>
                <th className="py-2 px-2">Zone</th>
                <th className="py-2 px-2 text-right">Quotes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="odd:bg-[color:var(--color-surface-container)]/40">
                  <td className="py-1.5 px-2 font-mono">{formatWeight(Number(r.normalized_weight))}</td>
                  <td className="py-1.5 px-2">{r.zone_name}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.quotes))}</td>
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
          cols={orderedZones}
          rowLabel={(w) => formatWeight(Number(w))}
          colLabel={(z) => z.replace(/^\d+\.\s*/, "")}
          cells={cells}
          fill={(cell) => volumeColor(cell.value)}
          textFill={(cell) => volumeTextColor(cell.value)}
          maskThreshold={0}
          cellHeight={30}
          axisLabelRow="Weight"
          axisLabelCol="Distance zone →"
          animateKey={rows.length}
          renderTooltip={(w, z, cell) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">Weight</span>
                <span className="font-mono text-xs">{formatWeight(Number(w))}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">Zone</span>
                <span className="font-mono text-xs">{String(z)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">Quotes</span>
                <span className="font-mono text-xs">{formatCount(cell?.volume ?? 0)}</span>
              </div>
            </div>
          )}
        />
      )}
    </ChartFrame>
  );
}
