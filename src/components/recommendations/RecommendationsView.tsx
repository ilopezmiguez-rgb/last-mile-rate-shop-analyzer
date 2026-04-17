"use client";

import { ArrowDown, ArrowUp, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useData } from "@/components/data/DataProvider";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { FilterBar } from "@/components/filters/FilterBar";
import { KpiCard } from "@/components/kpi/KpiCard";
import { Slider } from "@/components/ui/Slider";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { BootingState, ErrorState } from "@/components/data/LoadingStates";
import { recommend, type Recommendation } from "@/lib/recommender";
import {
  formatCount,
  formatMoney,
  formatPct,
  formatSigned,
  formatWeight,
} from "@/lib/format";

type Row = {
  normalized_weight: number;
  zone_name: string;
  zone_rank: number;
  volume: number;
  wins: number;
  current_price: number;
  win_rate: number;
};

type Enriched = Row & Recommendation;

export function RecommendationsView() {
  const { status, error } = useData();
  const { filter } = useFilter();
  const where = buildWhere(filter);

  const [step, setStep] = useState(0.05);
  const [minVol, setMinVol] = useState(30);
  const [wrMin, setWrMin] = useState(60);
  const [wrMax, setWrMax] = useState(85);

  const { data, status: qStatus, error: qError } = useSqlQuery<Row>(
    `SELECT r.normalized_weight,
            r.zone_name,
            z.rank                                                   AS zone_rank,
            COUNT(*)                                                 AS volume,
            COUNT(*) FILTER (WHERE is_won)                           AS wins,
            COALESCE(AVG(total_charge), 0)                           AS current_price,
            LEAST(1.0, GREATEST(0.0,
              CAST(COUNT(*) FILTER (WHERE is_won) AS DOUBLE)
              / GREATEST(COUNT(*), 1)
            ))                                                       AS win_rate
     FROM records_normalized r
     JOIN zone_order z ON z.zone_name = r.zone_name
     WHERE record_type = 'Rate Shop' AND ${where.sql}
     GROUP BY 1, 2, 3
     HAVING COUNT(*) >= ?
     ORDER BY 1, 3`,
    [...where.params, minVol],
    [minVol]
  );

  const enriched: Enriched[] = useMemo(() => {
    if (!data) return [];
    const lower = wrMin / 100;
    const upper = wrMax / 100;
    const out: Enriched[] = [];
    for (const r of data) {
      const rec = recommend(
        {
          volume: Number(r.volume),
          winRate: Number(r.win_rate),
          currentPrice: Number(r.current_price),
        },
        { step, lower, upper }
      );
      if (rec.action === "HOLD") continue;
      out.push({ ...r, ...rec });
    }
    out.sort((a, b) => b.impactScore - a.impactScore);
    return out;
  }, [data, step, wrMin, wrMax]);

  const kpis = useMemo(() => {
    const increases = enriched.filter((r) => r.action === "INCREASE").length;
    const decreases = enriched.filter((r) => r.action === "DECREASE").length;
    const totalImpact = enriched.reduce((s, r) => s + r.impactScore, 0);
    return {
      total: enriched.length,
      increases,
      decreases,
      impact: totalImpact,
    };
  }, [enriched]);

  if (status === "idle" || status === "booting") return <BootingState />;
  if (status === "error") return <ErrorState message={error ?? "Unknown error"} />;

  return (
    <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full">
      <header>
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl md:text-4xl">Price Recommendator</h1>
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Per-segment moves · ranked by impact
          </span>
        </div>
        <p className="mt-1 text-sm text-[color:var(--color-on-surface-muted)] max-w-2xl">
          Raise price where you're winning too much; lower it where you're priced out.
          Impact score is how far the win rate is off your band, multiplied by segment
          volume.
        </p>
      </header>

      <FilterBar />

      <div className="rounded-md bg-[color:var(--color-surface-container-low)] ghost-border px-4 py-3 flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-3">
          <span className="font-label text-[color:var(--color-on-surface-dim)]">Step</span>
          <Input
            type="number"
            min={0.01}
            max={1}
            step={0.01}
            value={step}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setStep(Math.max(0.01, Math.min(1, v)));
            }}
            className="w-24 font-mono text-right"
            aria-label="Adjustment step"
          />
        </div>
        <div className="h-5 w-px bg-[color:var(--color-outline-variant)]/30" />
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
        <div className="flex items-center gap-3 min-w-[320px]">
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <KpiCard
          code="REC-K1"
          label="Recommendations"
          value={formatCount(kpis.total)}
          hint="Segments above your impact threshold"
          icon={Gauge}
          accent="primary"
        />
        <KpiCard
          code="REC-K2"
          label="Increase"
          value={formatCount(kpis.increases)}
          hint="Winning above the band"
          icon={TrendingUp}
          accent="success"
        />
        <KpiCard
          code="REC-K3"
          label="Decrease"
          value={formatCount(kpis.decreases)}
          hint="Priced out of the band"
          icon={TrendingDown}
          accent="danger"
        />
        <KpiCard
          code="REC-K4"
          label="Total impact"
          value={kpis.impact.toFixed(2)}
          hint="Sum of segment-level impact scores"
          icon={Gauge}
          accent="gold"
        />
      </div>

      <RecommendationsTable
        rows={enriched}
        loading={qStatus === "loading"}
        error={qError}
      />
    </div>
  );
}

function RecommendationsTable({
  rows,
  loading,
  error,
}: {
  rows: Enriched[];
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
        Nothing outside the band. Every segment is priced within your target win-rate
        window.
      </div>
    );
  }

  return (
    <div className="rounded-md bg-[color:var(--color-surface-container-low)] ghost-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-label text-[color:var(--color-on-surface-dim)] bg-[color:var(--color-surface-container)]">
              <th className="py-2 px-3">Action</th>
              <th className="py-2 px-3">Weight</th>
              <th className="py-2 px-3">Zone</th>
              <th className="py-2 px-3 text-right">Volume</th>
              <th className="py-2 px-3 text-right">Win Rate</th>
              <th className="py-2 px-3 text-right">Current</th>
              <th className="py-2 px-3 text-right">Adj</th>
              <th className="py-2 px-3 text-right">Proposed</th>
              <th className="py-2 px-3 text-right">Impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isUp = r.action === "INCREASE";
              return (
                <tr
                  key={`${r.normalized_weight}-${r.zone_name}-${i}`}
                  className="border-t border-[color:var(--color-outline-variant)]/15 hover:bg-[color:var(--color-surface-container)]/50"
                >
                  <td className="py-1.5 px-3">
                    <Badge tone={isUp ? "success" : "danger"}>
                      {isUp ? (
                        <ArrowUp className="size-3" aria-hidden />
                      ) : (
                        <ArrowDown className="size-3" aria-hidden />
                      )}
                      {r.action}
                    </Badge>
                  </td>
                  <td className="py-1.5 px-3 font-mono">
                    {formatWeight(Number(r.normalized_weight))}
                  </td>
                  <td className="py-1.5 px-3">{r.zone_name}</td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatCount(Number(r.volume))}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatPct(Number(r.win_rate))}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatMoney(Number(r.current_price))}
                  </td>
                  <td
                    className={`py-1.5 px-3 text-right font-mono ${
                      isUp
                        ? "text-[color:var(--color-success)]"
                        : "text-[color:var(--color-danger)]"
                    }`}
                  >
                    {formatSigned(r.suggestedAdjustment)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {formatMoney(r.proposedPrice)}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono">
                    {r.impactScore.toFixed(2)}
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
