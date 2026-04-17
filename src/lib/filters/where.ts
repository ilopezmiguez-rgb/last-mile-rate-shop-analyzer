import type { Filter } from "@/lib/filters/params";

/**
 * Build a SQL WHERE fragment from a Filter. Uses DuckDB positional bindings
 * so the final SQL stays auditable without string concat.
 *
 * The returned `sql` is a boolean expression suitable to splice after `WHERE`.
 * When no filters are set, it emits `1=1` so callers can always prefix it with
 * a plain `WHERE`.
 */
export interface WhereFragment {
  sql: string;
  params: unknown[];
}

export function buildWhere(
  filter: Filter,
  extra: { sql: string; params?: unknown[] }[] = []
): WhereFragment {
  const parts: string[] = [];
  const params: unknown[] = [];

  const inClause = (col: string, vals: readonly (string | number)[]) => {
    if (vals.length === 0) return;
    const placeholders = vals.map(() => "?").join(",");
    parts.push(`${col} IN (${placeholders})`);
    params.push(...vals);
  };

  inClause("origin_zipcode", filter.origins);
  inClause("destination_metro_code", filter.metros);
  inClause("zone_name", filter.zones);
  inClause("normalized_weight", filter.weights);

  for (const e of extra) {
    parts.push(`(${e.sql})`);
    if (e.params) params.push(...e.params);
  }

  return { sql: parts.length === 0 ? "1=1" : parts.join(" AND "), params };
}
