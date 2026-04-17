"use client";

import { X } from "lucide-react";
import { useFilter } from "@/lib/filters/params";

type Key = "metros" | "origins" | "zones" | "weights";

const LABELS: Record<Key, string> = {
  metros: "Metro",
  origins: "Origin",
  zones: "Zone",
  weights: "Weight",
};

export function FilterChips() {
  const { filter, setFilter } = useFilter();

  const renderChips = <V,>(
    key: Key,
    vals: V[],
    toLabel: (v: V) => string,
    update: (next: V[]) => void
  ) =>
    vals.map((v, i) => (
      <button
        key={`${key}-${i}-${String(v)}`}
        type="button"
        onClick={() => update(vals.filter((x) => x !== v))}
        className="group inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-xs bg-[color:var(--color-surface-container-highest)] hover:bg-[color:var(--color-surface-bright)] text-xs"
      >
        <span className="font-label text-[color:var(--color-on-surface-dim)]">
          {LABELS[key]}
        </span>
        <span className="font-mono text-[0.75rem] text-[color:var(--color-on-surface)]">
          {toLabel(v)}
        </span>
        <span className="inline-flex items-center justify-center size-4 rounded-xs text-[color:var(--color-on-surface-dim)] group-hover:text-[color:var(--color-on-surface)]">
          <X className="size-3" aria-hidden />
          <span className="sr-only">Remove {LABELS[key]} {String(v)}</span>
        </span>
      </button>
    ));

  return (
    <div className="flex items-center gap-1.5 flex-wrap" aria-label="Active filters">
      {renderChips("metros", filter.metros, (v) => v, (next) =>
        setFilter({ metros: next })
      )}
      {renderChips("origins", filter.origins, (v) => v, (next) =>
        setFilter({ origins: next })
      )}
      {renderChips("zones", filter.zones, (v) => v.replace(/^\d+\.\s*/, ""), (next) =>
        setFilter({ zones: next })
      )}
      {renderChips(
        "weights",
        filter.weights,
        (v) => (v < 1 ? `${v} lb` : `${v.toFixed(0)} lb`),
        (next) => setFilter({ weights: next })
      )}
    </div>
  );
}
