"use client";

import { Gauge, Target, TrendingDown, TrendingUp } from "lucide-react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { KpiCard } from "@/components/kpi/KpiCard";
import { formatCount, formatMoney, formatPct } from "@/lib/format";

type Row = {
  quotes: number;
  wins: number;
  lost: number;
  win_rate: number;
  avg_won: number | null;
  avg_lost: number | null;
};

export function AnalyzerKpis() {
  const { filter } = useFilter();
  const where = buildWhere(filter);
  const { data } = useSqlQuery<Row>(
    `SELECT
       COUNT(*) FILTER (WHERE record_type = 'Rate Shop')                    AS quotes,
       COUNT(*) FILTER (WHERE record_type = 'Transaction')                  AS wins,
       GREATEST(
         COUNT(*) FILTER (WHERE record_type = 'Rate Shop')
         - COUNT(*) FILTER (WHERE record_type = 'Transaction'),
         0
       )                                                                    AS lost,
       CASE
         WHEN COUNT(*) FILTER (WHERE record_type = 'Rate Shop') = 0 THEN 0
         ELSE LEAST(1.0,
           CAST(COUNT(*) FILTER (WHERE record_type = 'Transaction') AS DOUBLE)
           / COUNT(*) FILTER (WHERE record_type = 'Rate Shop'))
       END                                                                  AS win_rate,
       AVG(total_charge) FILTER (WHERE record_type = 'Transaction')         AS avg_won,
       AVG(total_charge) FILTER (WHERE record_type = 'Rate Shop'
                                 AND NOT is_won)                            AS avg_lost
     FROM records_normalized
     WHERE ${where.sql}`,
    where.params
  );

  const row = data?.[0];
  const quotes = Number(row?.quotes ?? 0);
  const wins = Number(row?.wins ?? 0);
  const lost = Number(row?.lost ?? 0);
  const winRate = Number(row?.win_rate ?? 0);
  const avgWon = row?.avg_won == null ? null : Number(row.avg_won);
  const avgLost = row?.avg_lost == null ? null : Number(row.avg_lost);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        code="K-01"
        label="Win rate"
        value={formatPct(winRate)}
        hint={`${formatCount(wins)} wins on ${formatCount(quotes)} quotes`}
        icon={Gauge}
        accent="primary"
      />
      <KpiCard
        code="K-02"
        label="Quotes"
        value={formatCount(quotes)}
        hint="Rate shops under current filters"
        icon={Target}
        accent="neutral"
      />
      <KpiCard
        code="K-03"
        label="Lost volume"
        value={formatCount(lost)}
        hint="Quotes that did not convert"
        icon={TrendingDown}
        accent="danger"
      />
      <KpiCard
        code="K-04"
        label="Avg price won vs lost"
        value={
          avgWon != null && avgLost != null
            ? `${formatMoney(avgWon)} · ${formatMoney(avgLost)}`
            : "—"
        }
        hint={
          avgWon != null && avgLost != null
            ? `${formatMoney(avgWon - avgLost)} gap`
            : "Not enough signal"
        }
        icon={TrendingUp}
        accent="gold"
      />
    </div>
  );
}
