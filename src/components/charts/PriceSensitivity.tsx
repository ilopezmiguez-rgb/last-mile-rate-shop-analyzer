"use client";

import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { useMemo } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { formatCount, formatMoney } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

type Row = {
  bucket: number;
  quotes: number;
  wins: number;
  lost: number;
};

const AXIS_LABEL_STYLE = {
  fill: "var(--color-on-surface-dim)",
  fontFamily: "var(--font-jetbrains)",
  fontSize: 10,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
} as const;

const TICK_LABEL_STYLE = {
  fill: "var(--color-on-surface-muted)",
  fontFamily: "var(--font-jetbrains)",
  fontSize: 10,
} as const;

export function PriceSensitivity() {
  const { filter } = useFilter();
  const where = buildWhere(filter);
  const { data, status } = useSqlQuery<Row>(
    `SELECT
       ROUND(total_charge / 0.25) * 0.25                   AS bucket,
       COUNT(*)                                            AS quotes,
       COUNT(*) FILTER (WHERE is_won)                      AS wins,
       GREATEST(
         COUNT(*) - COUNT(*) FILTER (WHERE is_won),
         0
       )                                                   AS lost
     FROM records_normalized
     WHERE record_type = 'Rate Shop' AND ${where.sql}
     GROUP BY 1
     HAVING COUNT(*) >= 10
     ORDER BY bucket`,
    where.params
  );

  const rows = data ?? [];

  return (
    <ChartFrame
      title="Price Sensitivity"
      howToRead="Stacked bars per $0.25 price bucket. Green = wins, red = lost. The ratio tells you where price is hurting conversion."
      code="ANL-06"
      loading={status === "loading"}
      tableFallback={<PriceTable rows={rows} />}
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-[color:var(--color-on-surface-dim)]">
          No matching records.
        </div>
      ) : (
        <div style={{ height: 340 }}>
          <ParentSize>
            {({ width, height }) =>
              width > 0 ? (
                <PriceInner width={width} height={height} rows={rows} />
              ) : null
            }
          </ParentSize>
        </div>
      )}
    </ChartFrame>
  );
}

function PriceInner({ width, height, rows }: { width: number; height: number; rows: Row[] }) {
  const margin = { top: 24, right: 24, bottom: 44, left: 64 };
  const innerW = Math.max(10, width - margin.left - margin.right);
  const innerH = Math.max(10, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () =>
      scaleBand({
        domain: rows.map((r) => Number(r.bucket)),
        range: [0, innerW],
        padding: 0.2,
      }),
    [rows, innerW]
  );

  const maxQ = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.quotes))),
    [rows]
  );
  const yScale = useMemo(
    () => scaleLinear({ domain: [0, maxQ], range: [innerH, 0], nice: true }),
    [innerH, maxQ]
  );

  // Tick density — every Nth bucket so labels don't overlap.
  const tickStep = useMemo(() => {
    const maxTicks = Math.max(4, Math.floor(innerW / 80));
    return Math.max(1, Math.ceil(rows.length / maxTicks));
  }, [rows.length, innerW]);

  return (
    <TooltipProvider delayDuration={0}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {rows.map((r, i) => {
            const x = xScale(Number(r.bucket)) ?? 0;
            const w = xScale.bandwidth();
            const wins = Number(r.wins);
            const lost = Number(r.lost);
            const yWinsTop = yScale(wins + lost);
            const yLostTop = yScale(lost);
            const winsH = innerH - yScale(wins);
            const lostH = innerH - yScale(lost);

            return (
              <Tooltip key={`pb-${i}`}>
                <TooltipTrigger asChild>
                  <g style={{ cursor: "pointer" }}>
                    <Bar
                      x={x}
                      y={yLostTop}
                      width={w}
                      height={lostH}
                      fill="var(--color-danger)"
                      fillOpacity={0.55}
                      rx={1}
                    />
                    <Bar
                      x={x}
                      y={yWinsTop}
                      width={w}
                      height={winsH}
                      fill="var(--color-success)"
                      fillOpacity={0.8}
                      rx={1}
                    />
                  </g>
                </TooltipTrigger>
                <TooltipContent>
                  <PriceTooltip row={r} />
                </TooltipContent>
              </Tooltip>
            );
          })}

          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke="transparent"
            tickStroke="transparent"
            tickValues={rows
              .map((r) => Number(r.bucket))
              .filter((_, i) => i % tickStep === 0)}
            tickFormat={(v) => formatMoney(Number(v))}
            label="PRICE BUCKET"
            labelProps={{ ...AXIS_LABEL_STYLE, y: 36 }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              textAnchor: "middle",
              dy: "0.8em",
            })}
          />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickFormat={(v) => formatCount(Number(v))}
            stroke="transparent"
            tickStroke="transparent"
            label="QUOTES"
            labelProps={{
              ...AXIS_LABEL_STYLE,
              angle: -90,
              x: -48,
              y: innerH / 2,
              textAnchor: "middle",
            }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              textAnchor: "end",
              dx: "-0.3em",
              dy: "0.3em",
            })}
          />
        </Group>
      </svg>
      <div className="flex gap-4 px-16 mt-1 text-[0.6875rem] font-mono text-[color:var(--color-on-surface-muted)]">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-xs"
            style={{ backgroundColor: "var(--color-success)" }}
          />
          Wins
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-xs"
            style={{ backgroundColor: "var(--color-danger)" }}
          />
          Lost
        </div>
      </div>
    </TooltipProvider>
  );
}

function PriceTooltip({ row }: { row: Row }) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Bucket</span>
        <span className="font-mono text-xs">{formatMoney(Number(row.bucket))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Quotes</span>
        <span className="font-mono text-xs">{formatCount(Number(row.quotes))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Wins</span>
        <span className="font-mono text-xs text-[color:var(--color-success)]">{formatCount(Number(row.wins))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Lost</span>
        <span className="font-mono text-xs text-[color:var(--color-danger)]">{formatCount(Number(row.lost))}</span>
      </div>
    </div>
  );
}

function PriceTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
            <th className="py-2 px-2">Bucket</th>
            <th className="py-2 px-2 text-right">Quotes</th>
            <th className="py-2 px-2 text-right">Wins</th>
            <th className="py-2 px-2 text-right">Lost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-[color:var(--color-surface-container)]/40">
              <td className="py-1.5 px-2 font-mono">{formatMoney(Number(r.bucket))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.quotes))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.wins))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.lost))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
