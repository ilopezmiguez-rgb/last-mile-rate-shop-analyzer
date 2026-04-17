"use client";

import { useEffect, useRef, useState } from "react";
import { useData } from "@/components/data/DataProvider";

export type QueryState<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

/**
 * Minimal SQL query hook: re-runs when `sql`, `deps`, or the dataset version
 * changes. Keeps stale data during re-fetches so charts don't flash empty.
 */
export function useSqlQuery<T = Record<string, unknown>>(
  sql: string | null,
  params?: ReadonlyArray<unknown>,
  deps: ReadonlyArray<unknown> = []
): QueryState<T[]> & { refetch: () => void } {
  const { query, status: dataStatus, version } = useData();
  const [state, setState] = useState<QueryState<T[]>>({
    status: "idle",
    data: null,
    error: null,
  });
  const lastData = useRef<T[] | null>(null);
  const token = useRef(0);

  const keyJson = JSON.stringify([sql, params ?? null, ...deps]);

  const run = () => {
    if (!sql || dataStatus !== "ready") return;
    const t = ++token.current;
    setState({
      status: "loading",
      data: lastData.current,
      error: null,
    });
    query<T>(sql, params)
      .then((rows) => {
        if (t !== token.current) return;
        lastData.current = rows;
        setState({ status: "success", data: rows, error: null });
      })
      .catch((e: unknown) => {
        if (t !== token.current) return;
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("[useSqlQuery] failed", err, { sql });
        setState({ status: "error", data: null, error: err });
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(run, [keyJson, dataStatus, version]);

  return { ...state, refetch: run };
}
