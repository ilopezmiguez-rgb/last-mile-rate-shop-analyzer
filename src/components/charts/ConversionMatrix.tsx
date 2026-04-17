"use client";

import { EyeOff, Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { HeatmapGrid, type HeatCell } from "@/components/charts/HeatmapGrid";
import { Slider } from "@/components/ui/Slider";
import { Button } from "@/components/ui/Button";
import { formatCount, formatPct, formatWeight } from "@/lib/format";
import { winRateColor, winRateTextColor } from "@/lib/charts/palette";

type Row = {
  normalized_weight: number;
  zone_name: string;
  zone_rank: number;
  wins: number;
  quotes: number;
  win_rate: number;
};

export function ConversionMatrix() {
  const { filter } = useFilter();
  const [mask, setMask] = useState(30);
  const [maskEnabled, setMaskEnabled] = useState(true);
  const where = buildWhere(filter);
  const effectiveMask = maskEnabled ? mask : 0;

  const { data, status, error } = useSqlQuery<Row>(
    `WITH base AS (
       SELECT
         normalized_weight,
         zone_name,
         COUNT(*)                                           AS quotes,
         COUNT(*) FILTER (WHERE is_won)                     AS wins
       FROM records_normalized
       WHERE record_type = 'Rate Shop' AND ${where.sql}
       GROUP BY 1, 2
     )
     SELECT
       b.normalized_weight,
       b.zone_name,
       z.rank                                                  AS zone_rank,
       b.wins,
       b.quotes,
       LEAST(1.0, GREATEST(0.0,
         CAST(b.wins AS DOUBLE) / GREATEST(b.quotes, 1)
       ))                                                      AS win_rate
     FROM base b
     JOIN zone_order z ON z.zone_name = b.zone_name
     ORDER BY normalized_weight, zone_rank`,
    where.params
  );

  const rows = data ?? [];
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
      m.set(`${r.normalized_weight}|${r.zone_name}`, {
        value: Number(r.win_rate),
        volume: Number(r.quotes),
        label: Number(r.win_rate).toLocaleString("en-US", {
          style: "percent",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }),
      });
    }
    return m;
  }, [rows]);

  const loading = status === "loading";

  return (
    <ChartFrame
      title="Conversion Matrix"
      howToRead="Win rate across normalized weight × distance zone. Hot cells (gold) are lanes you dominate; cold cells (blue) are where you're priced out."
      code="ANL-01"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMaskEnabled((v) => !v)}
            aria-label={maskEnabled ? "Disable low-volume mask" : "Enable low-volume mask"}
            aria-pressed={!maskEnabled}
            title={maskEnabled ? "Low-volume mask on" : "Low-volume mask off"}
          >
            {maskEnabled ? <EyeOff /> : <Eye />}
          </Button>
          <div className="flex items-center gap-2 h-8 px-2 rounded-sm bg-[color:var(--color-surface-container-low)] ghost-border min-w-[180px]">
            <span className="font-label text-[color:var(--color-on-surface-dim)]">
              Mask &lt;
            </span>
            <Slider
              value={[mask]}
              onValueChange={([v]) => setMask(v)}
              min={0}
              max={200}
              step={5}
              className="flex-1"
              aria-label="Low-volume mask threshold"
            />
            <span className="font-mono text-[0.75rem] text-[color:var(--color-on-surface)] w-8 text-right">
              {mask}
            </span>
          </div>
        </div>
      }
      tableFallback={
        <ConversionTable rows={rows} />
      }
      loading={loading}
    >
      {status === "error" ? (
        <ErrorBox error={error} />
      ) : rows.length === 0 && status !== "loading" ? (
        <EmptyBox />
      ) : (
        <HeatmapGrid
          rows={orderedWeights}
          cols={orderedZones}
          rowLabel={(w) => formatWeight(Number(w))}
          colLabel={(z) => z.replace(/^\d+\.\s*/, "")}
          cells={cells}
          fill={(cell, masked) => winRateColor(cell.value, masked)}
          textFill={(cell, masked) => winRateTextColor(cell.value, masked)}
          maskThreshold={effectiveMask}
          cellHeight={30}
          axisLabelRow="Weight"
          axisLabelCol="Distance zone →"
          animateKey={rows.length}
          renderTooltip={(w, z, cell, masked) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">
                  Weight
                </span>
                <span className="font-mono text-xs">{formatWeight(Number(w))}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">
                  Zone
                </span>
                <span className="font-mono text-xs">{String(z)}</span>
              </div>
              <div className="h-px bg-[color:var(--color-outline-variant)]/20 my-1" />
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">
                  Win rate
                </span>
                <span className={`font-mono text-xs ${masked ? "text-[color:var(--color-on-surface-dim)]" : ""}`}>
                  {cell ? formatPct(cell.value) : "—"}
                  {masked && cell && (
                    <span className="font-label ml-2 text-[color:var(--color-on-surface-dim)]">
                      LOW VOL
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">
                  Wins / Quotes
                </span>
                <span className="font-mono text-xs">
                  {cell ? `${formatCount(Math.round((cell.value) * cell.volume))} / ${formatCount(cell.volume)}` : "—"}
                </span>
              </div>
            </div>
          )}
        />
      )}
    </ChartFrame>
  );
}

function ConversionTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
            <th className="py-2 px-2">Weight</th>
            <th className="py-2 px-2">Zone</th>
            <th className="py-2 px-2 text-right">Wins</th>
            <th className="py-2 px-2 text-right">Quotes</th>
            <th className="py-2 px-2 text-right">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="odd:bg-[color:var(--color-surface-container)]/40"
            >
              <td className="py-1.5 px-2 font-mono">{formatWeight(Number(r.normalized_weight))}</td>
              <td className="py-1.5 px-2">{r.zone_name}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.wins))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.quotes))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatPct(Number(r.win_rate))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyBox() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-[color:var(--color-on-surface-dim)]">
      No matching records for the current filters.
    </div>
  );
}

function ErrorBox({ error }: { error: Error | null }) {
  return (
    <div className="rounded-sm bg-[color:var(--color-danger)]/10 px-3 py-2 text-xs text-[color:var(--color-danger)] font-mono">
      Query failed: {error?.message ?? "unknown"}
    </div>
  );
}
