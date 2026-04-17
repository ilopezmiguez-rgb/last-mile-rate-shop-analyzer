"use client";

import { Compass, Gauge, Layers } from "lucide-react";
import { useMemo, useState } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useData } from "@/components/data/DataProvider";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { FilterBar } from "@/components/filters/FilterBar";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Slider } from "@/components/ui/Slider";
import { BootingState, ErrorState } from "@/components/data/LoadingStates";
import { MultiSelect } from "@/components/filters/MultiSelect";
import { MapPin } from "lucide-react";
import {
  formatCount,
  formatMoney,
  formatPct,
  formatSigned,
  formatWeight,
} from "@/lib/format";

type Row = {
  destination_metro_code: string;
  origin_zipcode: string;
  zone_name: string;
  zone_rank: number;
  normalized_weight: number;
  total_volume: number;
  wins: number;
  win_rate: number;
  lost_volume: number;
  avg_price_won: number | null;
  avg_price_lost: number | null;
  price_gap: number | null;
};

type MetroRow = { v: string };

export function OpportunitiesView() {
  const { status, error } = useData();
  const { filter } = useFilter();
  const where = buildWhere(filter);

  const [minVol, setMinVol] = useState(30);
  const [wrMin, setWrMin] = useState(20);
  const [wrMax, setWrMax] = useState(80);
  const [postMetros, setPostMetros] = useState<string[]>([]);

  const sql = `
    WITH seg AS (
      SELECT
        destination_metro_code,
        origin_zipcode,
        zone_name,
        normalized_weight,
        COUNT(*) FILTER (WHERE record_type = 'Rate Shop')                    AS total_volume,
        COUNT(*) FILTER (WHERE record_type = 'Transaction')                  AS wins,
        AVG(total_charge) FILTER (WHERE record_type = 'Transaction')         AS avg_price_won,
        AVG(total_charge) FILTER (WHERE record_type = 'Rate Shop'
                                  AND NOT is_won)                            AS avg_price_lost
      FROM records_normalized
      WHERE ${where.sql}
      GROUP BY 1, 2, 3, 4
    )
    SELECT
      seg.destination_metro_code,
      seg.origin_zipcode,
      seg.zone_name,
      z.rank                                                                  AS zone_rank,
      seg.normalized_weight,
      seg.total_volume,
      seg.wins,
      LEAST(1.0, GREATEST(0.0,
        CAST(seg.wins AS DOUBLE) / GREATEST(seg.total_volume, 1)
      ))                                                                      AS win_rate,
      GREATEST(seg.total_volume - seg.wins, 0)                                AS lost_volume,
      seg.avg_price_won,
      seg.avg_price_lost,
      CASE WHEN seg.avg_price_won IS NULL OR seg.avg_price_lost IS NULL
           THEN NULL ELSE seg.avg_price_won - seg.avg_price_lost END          AS price_gap
    FROM seg
    JOIN zone_order z ON z.zone_name = seg.zone_name
    WHERE seg.total_volume >= ?
      AND LEAST(1.0, GREATEST(0.0, CAST(seg.wins AS DOUBLE) / GREATEST(seg.total_volume, 1))) >= ?
      AND LEAST(1.0, GREATEST(0.0, CAST(seg.wins AS DOUBLE) / GREATEST(seg.total_volume, 1))) <= ?
    ORDER BY lost_volume DESC
    LIMIT 500`;
  const params = [...where.params, minVol, wrMin / 100, wrMax / 100];

  const { data, status: qStatus, error: qError } = useSqlQuery<Row>(
    sql,
    params,
    [minVol, wrMin, wrMax]
  );

  const metros = useSqlQuery<MetroRow>(
    `SELECT DISTINCT destination_metro_code AS v FROM records ORDER BY 1`
  );

  const rows = useMemo(() => {
    const all = data ?? [];
    if (postMetros.length === 0) return all;
    const set = new Set(postMetros);
    return all.filter((r) => set.has(r.destination_metro_code));
  }, [data, postMetros]);

  const kpis = useMemo(() => {
    const count = rows.length;
    const totalLost = rows.reduce((s, r) => s + Number(r.lost_volume), 0);
    const wSum = rows.reduce(
      (s, r) => s + Number(r.win_rate) * Number(r.total_volume),
      0
    );
    const volSum = rows.reduce((s, r) => s + Number(r.total_volume), 0);
    const avgWr = volSum > 0 ? wSum / volSum : 0;
    return { count, totalLost, avgWr };
  }, [rows]);

  const maxLost = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.lost_volume))),
    [rows]
  );

  if (status === "idle" || status === "booting") return <BootingState />;
  if (status === "error") return <ErrorState message={error ?? "Unknown error"} />;

  return (
    <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
      <header>
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl md:text-4xl">Opportunity Finder</h1>
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Recoverable lanes · ranked by lost volume
          </span>
        </div>
        <p className="mt-1 text-sm text-[color:var(--color-on-surface-muted)] max-w-2xl">
          Segments where you have real volume but a mediocre win rate. The top rows are
          usually worth a pricing review.
        </p>
      </header>

      <FilterBar />

      <div className="rounded-md bg-[color:var(--color-surface-container-low)] ghost-border px-4 py-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 min-w-[220px]">
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Min volume
          </span>
          <Slider
            value={[minVol]}
            onValueChange={([v]) => setMinVol(v)}
            min={10}
            max={200}
            step={5}
            className="w-36"
            aria-label="Minimum volume"
          />
          <span className="font-mono text-xs w-10 text-right">{minVol}</span>
        </div>

        <div className="h-5 w-px bg-[color:var(--color-outline-variant)]/30" />

        <div className="flex items-center gap-3 min-w-[280px]">
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Win-rate band
          </span>
          <Slider
            value={[wrMin, wrMax]}
            onValueChange={([lo, hi]) => {
              setWrMin(lo);
              setWrMax(hi);
            }}
            min={0}
            max={100}
            step={5}
            className="w-48"
            aria-label="Win rate band"
          />
          <span className="font-mono text-xs w-20 text-right">
            {wrMin}%–{wrMax}%
          </span>
        </div>

        <div className="h-5 w-px bg-[color:var(--color-outline-variant)]/30" />

        <MultiSelect
          label="Focus metro"
          icon={MapPin}
          options={(metros.data ?? []).map((r) => ({ value: r.v, label: r.v }))}
          values={postMetros}
          onChange={setPostMetros}
          placeholder="Narrow result set…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KpiCard
          code="OPP-K1"
          label="Opportunities"
          value={formatCount(kpis.count)}
          hint="Segments matching current filters"
          icon={Compass}
          accent="primary"
        />
        <KpiCard
          code="OPP-K2"
          label="Recoverable volume"
          value={formatCount(kpis.totalLost)}
          hint="Sum of lost volume in view"
          icon={Layers}
          accent="gold"
        />
        <KpiCard
          code="OPP-K3"
          label="Avg win rate"
          value={formatPct(kpis.avgWr)}
          hint="Volume-weighted"
          icon={Gauge}
          accent="neutral"
        />
      </div>

      <OpportunityTable
        rows={rows}
        maxLost={maxLost}
        loading={qStatus === "loading"}
        error={qError}
      />
    </div>
  );
}

function OpportunityTable({
  rows,
  maxLost,
  loading,
  error,
}: {
  rows: Row[];
  maxLost: number;
  loading: boolean;
  error: Error | null;
}) {
  if (error) {
    return (
      <div className="rounded-sm bg-[color:var(--color-danger)]/10 px-3 py-2 text-xs font-mono text-[color:var(--color-danger)]">
        {error.message}
      </div>
    );
  }
  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-md bg-[color:var(--color-surface-container-low)] ghost-border px-6 py-12 text-center text-sm text-[color:var(--color-on-surface-dim)]">
        No segments in the current band. Loosen the volume or win-rate filters.
      </div>
    );
  }
  return (
    <div className="rounded-md bg-[color:var(--color-surface-container-low)] ghost-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-label text-[color:var(--color-on-surface-dim)] bg-[color:var(--color-surface-container)]">
              <th className="py-2 px-3">Metro</th>
              <th className="py-2 px-3">Origin</th>
              <th className="py-2 px-3">Zone</th>
              <th className="py-2 px-3">Weight</th>
              <th className="py-2 px-3 text-right">Volume</th>
              <th className="py-2 px-3 text-right">Wins</th>
              <th className="py-2 px-3 text-right">Win Rate</th>
              <th className="py-2 px-3">Lost Volume</th>
              <th className="py-2 px-3 text-right">Avg Won</th>
              <th className="py-2 px-3 text-right">Avg Lost</th>
              <th className="py-2 px-3 text-right">Price Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const lost = Number(r.lost_volume);
              const pct = Math.max(0, Math.min(1, lost / maxLost));
              const gap = r.price_gap == null ? null : Number(r.price_gap);
              return (
                <tr
                  key={`${r.destination_metro_code}-${r.origin_zipcode}-${r.zone_name}-${r.normalized_weight}-${i}`}
                  className="border-t border-[color:var(--color-outline-variant)]/15 hover:bg-[color:var(--color-surface-container)]/50"
                >
                  <td className="py-1.5 px-3 font-mono">{r.destination_metro_code}</td>
                  <td className="py-1.5 px-3 font-mono">{r.origin_zipcode}</td>
                  <td className="py-1.5 px-3">{r.zone_name}</td>
                  <td className="py-1.5 px-3 font-mono">
                    {formatWeight(Number(r.normalized_weight))}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatCount(Number(r.total_volume))}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatCount(Number(r.wins))}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatPct(Number(r.win_rate))}
                  </td>
                  <td className="py-1.5 px-3 relative">
                    <div className="relative h-5 rounded-xs bg-[color:var(--color-surface-container)]/60 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-[color:var(--color-danger)]/45"
                        style={{ width: `${pct * 100}%` }}
                        aria-hidden
                      />
                      <div className="relative h-full flex items-center pl-2 font-mono text-[0.75rem]">
                        {formatCount(lost)}
                      </div>
                    </div>
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {r.avg_price_won == null ? "—" : formatMoney(Number(r.avg_price_won))}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {r.avg_price_lost == null ? "—" : formatMoney(Number(r.avg_price_lost))}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono ${
                      gap == null
                        ? "text-[color:var(--color-on-surface-dim)]"
                        : gap < 0
                        ? "text-[color:var(--color-danger)]"
                        : "text-[color:var(--color-success)]"
                    }`}
                  >
                    {gap == null ? "—" : formatSigned(gap)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="px-3 py-2 text-[0.6875rem] font-mono text-[color:var(--color-on-surface-dim)] border-t border-[color:var(--color-outline-variant)]/15">
          Refreshing…
        </div>
      )}
    </div>
  );
}
