"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/Tooltip";
import { cn } from "@/lib/cn";

/**
 * Shared bespoke SVG heatmap grid. Rows and columns are caller-provided
 * ordered label arrays. `cells` is a map keyed by `${row}|${col}` of
 * unordered numeric measures — the caller also supplies a fill/text colorizer
 * and a tooltip renderer.
 *
 * The component intentionally does NOT depend on the underlying semantics:
 * conversion matrix, volume matrix, and metro×weight all reuse it.
 */

export interface HeatCell {
  value: number;
  volume: number; // used by low-volume mask
  label?: string; // value as formatted text
}

export type ColorFn = (cell: HeatCell, masked: boolean) => string;

export interface HeatmapGridProps<R extends string | number, C extends string | number> {
  rows: R[];
  cols: C[];
  rowLabel: (r: R) => string;
  colLabel: (c: C) => string;
  cells: Map<string, HeatCell>;
  fill: ColorFn;
  textFill: ColorFn;
  maskThreshold: number;
  cellHeight?: number;
  renderTooltip: (row: R, col: C, cell: HeatCell | null, masked: boolean) => React.ReactNode;
  emptyCellColor?: string;
  axisLabelRow?: string;
  axisLabelCol?: string;
  animateKey?: string | number;
}

export function HeatmapGrid<R extends string | number, C extends string | number>({
  rows,
  cols,
  rowLabel,
  colLabel,
  cells,
  fill,
  textFill,
  maskThreshold,
  cellHeight = 28,
  renderTooltip,
  emptyCellColor = "var(--color-surface-container)",
  axisLabelRow,
  axisLabelCol,
  animateKey,
}: HeatmapGridProps<R, C>) {
  const [hover, setHover] = useState<{ r: R; c: C } | null>(null);

  const key = (r: R, c: C) => `${String(r)}|${String(c)}`;

  const rowLabels = useMemo(() => rows.map(rowLabel), [rows, rowLabel]);
  const colLabels = useMemo(() => cols.map(colLabel), [cols, colLabel]);

  return (
    <TooltipProvider delayDuration={80}>
      <div className="overflow-x-auto -mx-1 px-1">
        <div
          className="grid gap-y-[1px]"
          style={{
            gridTemplateColumns: `minmax(64px, max-content) 1fr`,
            fontVariantNumeric: "tabular-nums lining-nums",
          }}
        >
          {/* Column axis row */}
          <div />
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${cols.length}, minmax(48px, 1fr))`,
              gap: "1px",
            }}
          >
            {colLabels.map((lbl, i) => (
              <div
                key={`colhdr-${i}`}
                className="font-label text-center text-[color:var(--color-on-surface-dim)] py-1 truncate"
                title={lbl}
              >
                {lbl}
              </div>
            ))}
          </div>

          {/* Body rows */}
          {rows.map((r, ri) => (
            <RowFragment
              key={`row-${ri}-${animateKey ?? ""}`}
              r={r}
              ri={ri}
              rows={rows}
              cols={cols}
              cells={cells}
              fill={fill}
              textFill={textFill}
              maskThreshold={maskThreshold}
              cellHeight={cellHeight}
              emptyCellColor={emptyCellColor}
              rowLabel={rowLabels[ri]}
              renderTooltip={renderTooltip}
              hover={hover}
              setHover={setHover}
              animateKey={animateKey}
              colLabel={colLabel}
              keyFn={key}
            />
          ))}

          {(axisLabelRow || axisLabelCol) && (
            <>
              <div />
              <div className="flex items-center justify-between pt-2">
                <span className="font-label text-[color:var(--color-on-surface-dim)]">
                  {axisLabelRow ?? ""}
                </span>
                <span className="font-label text-[color:var(--color-on-surface-dim)]">
                  {axisLabelCol ?? ""}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function RowFragment<R extends string | number, C extends string | number>(props: {
  r: R;
  ri: number;
  rows: R[];
  cols: C[];
  cells: Map<string, HeatCell>;
  fill: ColorFn;
  textFill: ColorFn;
  maskThreshold: number;
  cellHeight: number;
  emptyCellColor: string;
  rowLabel: string;
  renderTooltip: (r: R, c: C, cell: HeatCell | null, masked: boolean) => React.ReactNode;
  hover: { r: R; c: C } | null;
  setHover: (h: { r: R; c: C } | null) => void;
  animateKey?: string | number;
  colLabel: (c: C) => string;
  keyFn: (r: R, c: C) => string;
}) {
  const {
    r,
    ri,
    cols,
    cells,
    fill,
    textFill,
    maskThreshold,
    cellHeight,
    emptyCellColor,
    rowLabel,
    renderTooltip,
    hover,
    setHover,
    animateKey,
    colLabel,
    keyFn,
  } = props;

  return (
    <>
      <div
        className="pr-3 pl-1 flex items-center justify-end font-mono text-[0.75rem] text-[color:var(--color-on-surface-muted)]"
        style={{ height: cellHeight }}
        title={rowLabel}
      >
        {rowLabel}
      </div>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols.length}, minmax(48px, 1fr))`,
          gap: "1px",
        }}
      >
        {cols.map((c, ci) => {
          const cell = cells.get(keyFn(r, c)) ?? null;
          const masked =
            cell == null || cell.volume < maskThreshold || !Number.isFinite(cell.value);
          const hovered = hover?.r === r && hover?.c === c;
          const bg = cell == null ? emptyCellColor : fill(cell, masked);
          const fg = cell == null ? "var(--color-on-surface-dim)" : textFill(cell, masked);

          return (
            <Tooltip key={`cell-${ri}-${ci}`}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: bg,
                    scale: hovered ? 1.04 : 1,
                  }}
                  transition={{
                    duration: 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  onMouseEnter={() => setHover({ r, c })}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover({ r, c })}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${rowLabel} ${colLabel(c)}: ${cell?.label ?? "no data"}`}
                  className={cn(
                    "relative rounded-xs flex items-center justify-center font-mono text-[0.6875rem] cursor-pointer focus-visible:outline-2 focus-visible:outline-[color:var(--color-primary-fixed)]",
                    hovered && "z-10"
                  )}
                  style={{
                    height: cellHeight,
                    color: fg,
                  }}
                  data-animate-key={animateKey}
                >
                  {cell && !masked && cell.label}
                  {cell && masked && (
                    <span className="opacity-60">{cell.label}</span>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-0">
                <div className="px-3 py-2 min-w-[180px]">
                  {renderTooltip(r, c, cell, masked)}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </>
  );
}

export type HeatRow = HeatCell & { row: string | number; col: string | number };

export function buildCellMap<T extends HeatRow>(rows: T[]): Map<string, HeatCell> {
  const m = new Map<string, HeatCell>();
  for (const r of rows) {
    m.set(`${String(r.row)}|${String(r.col)}`, r);
  }
  return m;
}
