"use client";

import { Gauge, Globe, MapPin, Weight, Zap } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSqlQuery } from "@/lib/useQuery";
import { useFilter } from "@/lib/filters/params";
import { MultiSelect } from "@/components/filters/MultiSelect";
import { FilterChips } from "@/components/filters/FilterChips";
import { Button } from "@/components/ui/Button";

type Row = { v: string };
type WRow = { v: number };

export function FilterBar() {
  const { filter, setFilter, clear, activeCount } = useFilter();

  const zones = useSqlQuery<Row>(
    `SELECT zone_name AS v FROM zone_order ORDER BY rank`
  );
  const metros = useSqlQuery<Row>(
    `SELECT DISTINCT destination_metro_code AS v FROM records ORDER BY destination_metro_code`
  );
  const origins = useSqlQuery<Row>(
    `SELECT origin_zipcode AS v, COUNT(*) AS n
     FROM records GROUP BY origin_zipcode
     ORDER BY n DESC, origin_zipcode`
  );
  const weights = useSqlQuery<WRow>(
    `SELECT DISTINCT normalized_weight AS v FROM records_normalized ORDER BY normalized_weight`
  );

  const searchInputRef = useRef<HTMLDivElement>(null);

  // Global "/" focuses the filter bar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      const firstBtn =
        searchInputRef.current?.querySelector<HTMLButtonElement>("button");
      firstBtn?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const zoneOptions = useMemo(
    () => (zones.data ?? []).map((r) => ({ value: r.v, label: r.v })),
    [zones.data]
  );
  const metroOptions = useMemo(
    () => (metros.data ?? []).map((r) => ({ value: r.v, label: r.v })),
    [metros.data]
  );
  const originOptions = useMemo(
    () =>
      (origins.data ?? []).slice(0, 2500).map((r) => ({
        value: r.v,
        label: r.v,
      })),
    [origins.data]
  );
  const weightOptions = useMemo(
    () =>
      (weights.data ?? []).map((r) => ({
        value: String(r.v),
        label:
          r.v < 1 ? `${r.v.toFixed(4).replace(/\.?0+$/, "")} lb` : `${r.v} lb`,
      })),
    [weights.data]
  );

  return (
    <div
      ref={searchInputRef}
      className="rounded-md bg-[color:var(--color-surface-container-low)] ghost-border px-4 py-3 flex flex-col gap-3"
      role="region"
      aria-label="Filters"
    >
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 pr-2">
          <Zap
            className="size-3.5 text-[color:var(--color-on-surface-dim)]"
            aria-hidden
          />
          <span className="font-label text-[color:var(--color-on-surface-dim)]">
            Filters
          </span>
        </div>
        <MultiSelect
          label="Metro"
          icon={MapPin}
          options={metroOptions}
          values={filter.metros}
          onChange={(v) => setFilter({ metros: v })}
          placeholder="Search metros…"
        />
        <MultiSelect
          label="Origin ZIP"
          icon={Globe}
          options={originOptions}
          values={filter.origins}
          onChange={(v) => setFilter({ origins: v })}
          placeholder="Search ZIPs…"
        />
        <MultiSelect
          label="Zone"
          icon={Gauge}
          options={zoneOptions}
          values={filter.zones}
          onChange={(v) => setFilter({ zones: v })}
          placeholder="Search zones…"
        />
        <MultiSelect
          label="Weight"
          icon={Weight}
          options={weightOptions}
          values={filter.weights.map(String)}
          onChange={(v) => setFilter({ weights: v.map((x) => Number(x)) })}
          placeholder="Search weights…"
          valueFormatter={(v) =>
            Number(v) < 1 ? `${v} lb` : `${Number(v).toFixed(0)} lb`
          }
        />
        <div className="flex-1" />
        <span className="font-label text-[color:var(--color-on-surface-dim)] hidden lg:inline">
          Press <kbd className="font-mono">/</kbd> to focus
        </span>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => clear()}>
            Clear all
          </Button>
        )}
      </div>
      {activeCount > 0 && <FilterChips />}
    </div>
  );
}
