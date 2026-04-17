"use client";

import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { AxisBottom } from "@visx/axis";
import { Bar } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { useMemo } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { formatCount, formatPct } from "@/lib/format";
import { winRateColor } from "@/lib/charts/palette";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

type Row = {
  destination_metro_code: string;
  quotes: number;
  wins: number;
  lost: number;
  win_rate: number;
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

export function RegionalBleed() {
  const { filter } = useFilter();
  const where = buildWhere(filter);
  const { data, status } = useSqlQuery<Row>(
    `SELECT destination_metro_code,
            COUNT(*)                              AS quotes,
            COUNT(*) FILTER (WHERE is_won)        AS wins,
            GREATEST(
              COUNT(*) - COUNT(*) FILTER (WHERE is_won),
              0
            )                                     AS lost,
            LEAST(1.0, GREATEST(0.0,
              CAST(COUNT(*) FILTER (WHERE is_won) AS DOUBLE)
              / GREATEST(COUNT(*), 1)
            ))                                    AS win_rate
     FROM records_normalized
     WHERE record_type = 'Rate Shop' AND ${where.sql}
     GROUP BY 1
     ORDER BY lost DESC
     LIMIT 15`,
    where.params
  );

  const rows = data ?? [];

  return (
    <ChartFrame
      title="Regional Bleed"
      howToRead="Top 15 metros ranked by lost volume. Bar length = lost quotes; color = win rate (blue low, gold high). Wide gold bars are your best opportunities — high demand you're already competitive on but still missing."
      code="ANL-07"
      loading={status === "loading"}
      tableFallback={<BleedTable rows={rows} />}
    >
      {rows.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-[color:var(--color-on-surface-dim)]">
          No matching records.
        </div>
      ) : (
        <div style={{ height: Math.max(280, rows.length * 26 + 60) }}>
          <ParentSize>
            {({ width, height }) =>
              width > 0 ? (
                <BleedInner width={width} height={height} rows={rows} />
              ) : null
            }
          </ParentSize>
        </div>
      )}
    </ChartFrame>
  );
}

function BleedInner({ width, height, rows }: { width: number; height: number; rows: Row[] }) {
  const margin = { top: 12, right: 80, bottom: 32, left: 56 };
  const innerW = Math.max(10, width - margin.left - margin.right);
  const innerH = Math.max(10, height - margin.top - margin.bottom);

  const yScale = useMemo(
    () =>
      scaleBand({
        domain: rows.map((r) => r.destination_metro_code),
        range: [0, innerH],
        padding: 0.2,
      }),
    [rows, innerH]
  );
  const maxLost = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.lost))),
    [rows]
  );
  const xScale = useMemo(
    () => scaleLinear({ domain: [0, maxLost], range: [0, innerW], nice: true }),
    [innerW, maxLost]
  );

  return (
    <TooltipProvider delayDuration={0}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {rows.map((r, i) => {
            const y = yScale(r.destination_metro_code) ?? 0;
            const h = yScale.bandwidth();
            const w = xScale(Number(r.lost));
            return (
              <Tooltip key={`bleed-${i}`}>
                <TooltipTrigger asChild>
                  <g style={{ cursor: "pointer" }}>
                    <Bar
                      x={0}
                      y={y}
                      width={innerW}
                      height={h}
                      fill="var(--color-surface-container)"
                      fillOpacity={0.3}
                      rx={2}
                    />
                    <Bar
                      x={0}
                      y={y}
                      width={w}
                      height={h}
                      fill={winRateColor(Number(r.win_rate), false)}
                      rx={2}
                    />
                    <text
                      x={-10}
                      y={y + h / 2}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontFamily="var(--font-jetbrains)"
                      fontSize={11}
                      fill="var(--color-on-surface)"
                    >
                      {r.destination_metro_code}
                    </text>
                    <text
                      x={w + 6}
                      y={y + h / 2}
                      textAnchor="start"
                      dominantBaseline="middle"
                      fontFamily="var(--font-jetbrains)"
                      fontSize={10}
                      fill="var(--color-on-surface-muted)"
                    >
                      {formatCount(Number(r.lost))} · {formatPct(Number(r.win_rate))}
                    </text>
                  </g>
                </TooltipTrigger>
                <TooltipContent>
                  <BleedTooltip row={r} />
                </TooltipContent>
              </Tooltip>
            );
          })}
          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={5}
            tickFormat={(v) => formatCount(Number(v))}
            stroke="transparent"
            tickStroke="transparent"
            label="LOST VOLUME"
            labelProps={{ ...AXIS_LABEL_STYLE, y: 26 }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              textAnchor: "middle",
              dy: "0.8em",
            })}
          />
        </Group>
      </svg>
    </TooltipProvider>
  );
}

function BleedTooltip({ row }: { row: Row }) {
  return (
    <div className="space-y-1 min-w-[180px]">
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Metro</span>
        <span className="font-mono text-xs">{row.destination_metro_code}</span>
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
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Win rate</span>
        <span className="font-mono text-xs">{formatPct(Number(row.win_rate))}</span>
      </div>
    </div>
  );
}

function BleedTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
            <th className="py-2 px-2">Metro</th>
            <th className="py-2 px-2 text-right">Quotes</th>
            <th className="py-2 px-2 text-right">Wins</th>
            <th className="py-2 px-2 text-right">Lost</th>
            <th className="py-2 px-2 text-right">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-[color:var(--color-surface-container)]/40">
              <td className="py-1.5 px-2 font-mono">{r.destination_metro_code}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.quotes))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.wins))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatCount(Number(r.lost))}</td>
              <td className="py-1.5 px-2 text-right font-mono">{formatPct(Number(r.win_rate))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
