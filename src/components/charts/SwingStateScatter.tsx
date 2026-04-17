"use client";

import { ParentSize } from "@visx/responsive";
import { Group } from "@visx/group";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Circle, Line } from "@visx/shape";
import { scaleLinear, scaleLog, scaleOrdinal } from "@visx/scale";
import { useMemo, useState } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { buildWhere } from "@/lib/filters/where";
import { ChartFrame } from "@/components/charts/ChartFrame";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { formatCount, formatPct } from "@/lib/format";

type Row = {
  zone_name: string;
  coarse_weight_bin: string;
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

const TICK_LABEL_NUMERIC_STYLE = { fontVariantNumeric: "tabular-nums" } as const;

const ZONE_COLORS = [
  "#b7c4ff",
  "#fabd00",
  "#7fd5ff",
  "#e5a0ff",
  "#8df5c3",
  "#ff9a8b",
  "#c7b9ff",
  "#ffd18c",
  "#6aa7ff",
  "#9ef2a0",
];

export function SwingStateScatter() {
  const { filter } = useFilter();
  const where = buildWhere(filter);
  const { data, status } = useSqlQuery<Row>(
    `SELECT zone_name,
            coarse_weight_bin,
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
     GROUP BY 1, 2
     HAVING COUNT(*) >= 5`,
    where.params
  );

  const rows = data ?? [];

  return (
    <ChartFrame
      title="Swing State Scatter"
      howToRead="Bubbles in the 40–60% band are lanes where a small price move swings big volume. X: win rate · Y: volume · size: lost volume · color: zone."
      code="ANL-04"
      loading={status === "loading"}
      tableFallback={<SwingTable rows={rows} />}
    >
      {rows.length === 0 ? (
        <EmptySwing />
      ) : (
        <div style={{ height: 420 }}>
          <ParentSize>
            {({ width, height }) =>
              width > 0 ? (
                <ScatterInner width={width} height={height} rows={rows} />
              ) : null
            }
          </ParentSize>
        </div>
      )}
    </ChartFrame>
  );
}

function ScatterInner({
  width,
  height,
  rows,
}: {
  width: number;
  height: number;
  rows: Row[];
}) {
  const margin = { top: 24, right: 24, bottom: 44, left: 72 };
  const innerW = Math.max(10, width - margin.left - margin.right);
  const innerH = Math.max(10, height - margin.top - margin.bottom);

  const xScale = useMemo(
    () => scaleLinear({ domain: [0, 1], range: [0, innerW], clamp: true }),
    [innerW]
  );

  const maxVol = useMemo(
    () => Math.max(10, ...rows.map((r) => Number(r.quotes))),
    [rows]
  );
  const yScale = useMemo(
    () =>
      scaleLog({
        domain: [1, maxVol],
        range: [innerH, 0],
        clamp: true,
      }),
    [innerH, maxVol]
  );

  const maxLost = useMemo(
    () => Math.max(1, ...rows.map((r) => Number(r.lost))),
    [rows]
  );
  const radiusScale = useMemo(
    () => scaleLinear({ domain: [0, Math.sqrt(maxLost)], range: [4, 22] }),
    [maxLost]
  );

  const zones = useMemo(() => {
    const s = Array.from(new Set(rows.map((r) => r.zone_name)));
    s.sort();
    return s;
  }, [rows]);

  const colorScale = useMemo(
    () => scaleOrdinal({ domain: zones, range: ZONE_COLORS }),
    [zones]
  );

  const [hover, setHover] = useState<Row | null>(null);

  return (
    <TooltipProvider delayDuration={0}>
      <svg width={width} height={height} role="img" aria-label="Swing state scatter">
        <Group left={margin.left} top={margin.top}>
          {/* Swing zone highlight */}
          <rect
            x={xScale(0.4)}
            y={0}
            width={xScale(0.6) - xScale(0.4)}
            height={innerH}
            fill="var(--color-secondary)"
            fillOpacity={0.06}
          />
          {/* 40% and 60% reference lines */}
          {[0.4, 0.6].map((v) => (
            <Line
              key={v}
              from={{ x: xScale(v), y: 0 }}
              to={{ x: xScale(v), y: innerH }}
              stroke="var(--color-outline-variant)"
              strokeOpacity={0.5}
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          ))}

          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={6}
            tickFormat={(v) => `${Math.round(Number(v) * 100)}%`}
            stroke="transparent"
            tickStroke="transparent"
            label="WIN RATE"
            labelProps={{ ...AXIS_LABEL_STYLE, y: 36 }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              style: TICK_LABEL_NUMERIC_STYLE,
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
            label="VOLUME"
            labelProps={{
              ...AXIS_LABEL_STYLE,
              angle: -90,
              x: -50,
              y: innerH / 2,
              textAnchor: "middle",
            }}
            tickLabelProps={() => ({
              ...TICK_LABEL_STYLE,
              style: TICK_LABEL_NUMERIC_STYLE,
              textAnchor: "end",
              dx: "-0.25em",
              dy: "0.3em",
            })}
          />

          {rows
            .slice()
            .sort((a, b) => Number(b.lost) - Number(a.lost))
            .map((d, i) => {
              const cx = xScale(Number(d.win_rate));
              const cy = yScale(Math.max(1, Number(d.quotes)));
              const r = radiusScale(Math.sqrt(Number(d.lost)));
              const fill = colorScale(d.zone_name);
              const isHover =
                hover?.zone_name === d.zone_name &&
                hover?.coarse_weight_bin === d.coarse_weight_bin;
              return (
                <Tooltip key={`${d.zone_name}-${d.coarse_weight_bin}-${i}`}>
                  <TooltipTrigger asChild>
                    <Circle
                      cx={cx}
                      cy={cy}
                      r={r}
                      fill={fill}
                      fillOpacity={isHover ? 0.95 : 0.7}
                      stroke={fill}
                      strokeOpacity={0.9}
                      strokeWidth={1}
                      style={{
                        cursor: "pointer",
                        transition: "fill-opacity 120ms var(--ease-precision)",
                      }}
                      onMouseEnter={() => setHover(d)}
                      onMouseLeave={() => setHover(null)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <SwingTooltip row={d} />
                  </TooltipContent>
                </Tooltip>
              );
            })}

          {/* Swing zone label */}
          <text
            x={xScale(0.5)}
            y={-8}
            textAnchor="middle"
            fill="var(--color-secondary)"
            fontFamily="var(--font-jetbrains)"
            fontSize={10}
            letterSpacing="0.08em"
          >
            SWING ZONE · 40-60%
          </text>
        </Group>
      </svg>

      <Legend zones={zones} colorScale={colorScale} />
    </TooltipProvider>
  );
}

function Legend({
  zones,
  colorScale,
}: {
  zones: string[];
  colorScale: (s: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pl-[72px] pr-6">
      {zones.map((z) => (
        <div key={z} className="flex items-center gap-1.5 text-[0.6875rem] font-mono text-[color:var(--color-on-surface-muted)]">
          <span
            className="h-2.5 w-2.5 rounded-xs"
            style={{ backgroundColor: colorScale(z) }}
            aria-hidden
          />
          {z.replace(/^\d+\.\s*/, "")}
        </div>
      ))}
    </div>
  );
}

function SwingTooltip({ row }: { row: Row }) {
  return (
    <div className="space-y-1 min-w-[180px]">
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Zone</span>
        <span className="font-mono text-xs">{row.zone_name}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Weight</span>
        <span className="font-mono text-xs">{row.coarse_weight_bin} lb</span>
      </div>
      <div className="h-px bg-[color:var(--color-outline-variant)]/20 my-1" />
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Win rate</span>
        <span className="font-mono text-xs">{formatPct(Number(row.win_rate))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Volume</span>
        <span className="font-mono text-xs">{formatCount(Number(row.quotes))}</span>
      </div>
      <div className="flex justify-between gap-3">
        <span className="font-label text-[color:var(--color-on-surface-dim)]">Lost</span>
        <span className="font-mono text-xs">{formatCount(Number(row.lost))}</span>
      </div>
    </div>
  );
}

function SwingTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-label text-[color:var(--color-on-surface-dim)]">
            <th className="py-2 px-2">Zone</th>
            <th className="py-2 px-2">Weight</th>
            <th className="py-2 px-2 text-right">Volume</th>
            <th className="py-2 px-2 text-right">Wins</th>
            <th className="py-2 px-2 text-right">Lost</th>
            <th className="py-2 px-2 text-right">Win Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-[color:var(--color-surface-container)]/40">
              <td className="py-1.5 px-2">{r.zone_name}</td>
              <td className="py-1.5 px-2 font-mono">{r.coarse_weight_bin} lb</td>
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

function EmptySwing() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-[color:var(--color-on-surface-dim)]">
      No matching segments above the 5-quote floor.
    </div>
  );
}
