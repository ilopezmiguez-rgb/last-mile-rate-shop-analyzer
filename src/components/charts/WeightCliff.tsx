"use client";

import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft, AxisRight } from "@visx/axis";
import { Bar, LinePath, Circle } from "@visx/shape";
import { scaleBand, scaleLinear } from "@visx/scale";
import { useMemo } from "react";
import { curveMonotoneX } from "@visx/curve";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { formatCount, formatPct } from "@/lib/format";
import { COARSE_WEIGHT_BINS } from "@/lib/formulas/physics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";

type Row = {
  coarse_weight_bin: string;
  quotes: number;
  wins: number;
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

export function WeightCliff() {
  const { filter } = useFilter();
  const where = buildWhere(filter);
  const { data, status } = useSqlQuery<Row>(
    `SELECT coarse_weight_bin,
            COUNT(*)                                AS quotes,
            COUNT(*) FILTER (WHERE is_won)          AS wins,
            LEAST(1.0, GREATEST(0.0,
              CAST(COUNT(*) FILTER (WHERE is_won) AS DOUBLE)
              / GREATEST(COUNT(*), 1)
            ))                                      AS win_rate
     FROM records_normalized
     WHERE record_type = 'Rate Shop' AND ${where.sql}
     GROUP BY 1`,
    where.params
  );

  const sorted = useMemo(() => {
    const order: Record<string, number> = {};
    COARSE_WEIGHT_BINS.forEach((b, i) => {
      order[b] = i;
    });
    return (data ?? [])
      .slice()
      .sort(
        (a, b) =>
          (order[a.coarse_weight_bin] ?? 0) - (order[b.coarse_weight_bin] ?? 0)
      );
  }, [data]);

  return (
    <ChartFrame
      title="Weight Cliff"
      howToRead="Bars show quote volume per coarse weight bin; the gold line shows win rate on the right axis. Watch for the bin where the line collapses — that's your pricing cliff."
      code="ANL-05"
      loading={status === "loading"}
      tableFallback={
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
                <th className="py-2 px-2">Weight</th>
                <th className="py-2 px-2 text-right">Quotes</th>
                <th className="py-2 px-2 text-right">Wins</th>
                <th className="py-2 px-2 text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} className="odd:bg-[color:var(--color-surface-container)]/40">
                  <td className="py-1.5 px-2 font-mono">{r.coarse_weight_bin} lb</td>
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
      {sorted.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-[color:var(--color-on-surface-dim)]">
          No matching records.
        </div>
      ) : (
        <div style={{ height: 340 }}>
          <ParentSize>
            {({ width, height }) =>
              width > 0 ? (
                <CliffInner width={width} height={height} rows={sorted} />
              ) : null
            }
          </ParentSize>
        </div>
      )}
    </ChartFrame>
  );
}

function CliffInner({ width, height, rows }: { width: number; height: number; rows: Row[] }) {
  const margin = { top: 20, right: 60, bottom: 40, left: 64 };
  const innerW = Math.max(10, width - margin.left - margin.right);
  const innerH = Math.max(10, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () =>
      scaleBand({
        domain: rows.map((r) => r.coarse_weight_bin),
        range: [0, innerW],
        padding: 0.35,
      }),
    [rows, innerW]
  );

  const maxQ = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.quotes))),
    [rows]
  );
  const yLeft = useMemo(
    () => scaleLinear({ domain: [0, maxQ], range: [innerH, 0], nice: true }),
    [innerH, maxQ]
  );
  const yRight = useMemo(
    () => scaleLinear({ domain: [0, 1], range: [innerH, 0] }),
    [innerH]
  );

  return (
    <TooltipProvider delayDuration={0}>
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          {rows.map((r, i) => {
            const x = xScale(r.coarse_weight_bin) ?? 0;
            const w = xScale.bandwidth();
            const h = innerH - yLeft(Number(r.quotes));
            return (
              <Tooltip key={`bar-${i}`}>
                <TooltipTrigger asChild>
                  <Bar
                    x={x}
                    y={yLeft(Number(r.quotes))}
                    width={w}
                    height={h}
                    fill="var(--color-primary-fixed)"
                    fillOpacity={0.45}
                    rx={2}
                    style={{
                      cursor: "pointer",
                      transition: "fill-opacity 120ms var(--ease-precision)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.fillOpacity = "0.8")}
                    onMouseLeave={(e) => (e.currentTarget.style.fillOpacity = "0.45")}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <CliffTooltip row={r} />
                </TooltipContent>
              </Tooltip>
            );
          })}

          <LinePath
            data={rows}
            x={(d) => (xScale(d.coarse_weight_bin) ?? 0) + xScale.bandwidth() / 2}
            y={(d) => yRight(Number(d.win_rate))}
            stroke="var(--color-secondary)"
            strokeWidth={1.5}
            curve={curveMonotoneX}
          />
          {rows.map((r, i) => (
            <Circle
              key={`pt-${i}`}
              cx={(xScale(r.coarse_weight_bin) ?? 0) + xScale.bandwidth() / 2}
              cy={yRight(Number(r.win_rate))}
              r={4}
              fill="var(--color-secondary)"
              stroke="var(--color-surface)"
              strokeWidth={1.5}
            />
          ))}

          <AxisBottom
            top={innerH}
            scale={xScale}
            stroke="transparent"
            tickStroke="transparent"
            label="WEIGHT BIN (LB)"
            labelProps={{ ...AXIS_LABEL_STYLE, y: 34 }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              textAnchor: "middle",
              dy: "0.8em",
            })}
          />
          <AxisLeft
            scale={yLeft}
            numTicks={5}
            tickFormat={(v) => formatCount(Number(v))}
            stroke="transparent"
            tickStroke="transparent"
            label="VOLUME"
            labelProps={{
              ...AXIS_LABEL_STYLE,
              angle: -90,
              x: -46,
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
          <AxisRight
            left={innerW}
            scale={yRight}
            numTicks={5}
            tickFormat={(v) => `${Math.round(Number(v) * 100)}%`}
            stroke="transparent"
            tickStroke="transparent"
            label="WIN RATE"
            labelProps={{
              ...AXIS_LABEL_STYLE,
              angle: 90,
              x: 46,
              y: innerH / 2,
              textAnchor: "middle",
            }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              textAnchor: "start",
              dx: "0.3em",
              dy: "0.3em",
              fill: "var(--color-secondary)",
            })}
          />
        </Group>
      </svg>
    </TooltipProvider>
  );
}

function CliffTooltip({ row }: { row: Row }) {
  return (
    <div className="space-y-1 min-w-[160px]">
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Weight</span>
        <span className="font-mono text-xs">{row.coarse_weight_bin} lb</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Quotes</span>
        <span className="font-mono text-xs">{formatCount(Number(row.quotes))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Wins</span>
        <span className="font-mono text-xs">{formatCount(Number(row.wins))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Win rate</span>
        <span className="font-mono text-xs">{formatPct(Number(row.win_rate))}</span>
      </div>
    </div>
  );
}
