"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Table } from "apache-arrow";
import { getDuckDb, resetDuckDb } from "@/lib/duckdb/client";
import { applySchema } from "@/lib/duckdb/schema";
import {
  loadDemoDataset,
  loadCsvText,
  getDatasetMeta,
  type DatasetMeta,
} from "@/lib/duckdb/load";

export type DataSource = "demo" | "uploaded";
export type DataStatus = "idle" | "booting" | "loading" | "ready" | "error";

export type QueryFn = <T = Record<string, unknown>>(
  sql: string,
  params?: ReadonlyArray<unknown>
) => Promise<T[]>;

type DataContextValue = {
  status: DataStatus;
  source: DataSource;
  meta: DatasetMeta | null;
  error: string | null;
  query: QueryFn;
  uploadCsv: (text: string, fileName: string) => Promise<void>;
  resetToDemo: () => Promise<void>;
  version: number; // bumps when the dataset reloads — for query hook invalidation
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<DataStatus>("idle");
  const [source, setSource] = useState<DataSource>("demo");
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const initStarted = useRef(false);

  const boot = useCallback(async () => {
    try {
      setStatus("booting");
      setError(null);
      const db = await getDuckDb();
      await applySchema(db);
      setStatus("loading");
      await loadDemoDataset(db);
      setMeta(await getDatasetMeta(db));
      setSource("demo");
      setStatus("ready");
      setVersion((v) => v + 1);
    } catch (e) {
      console.error("[DataProvider] boot failed", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (initStarted.current) return;
    initStarted.current = true;
    // Fire and forget — we want first paint to happen before this resolves.
    void boot();
  }, [boot]);

  const query = useCallback<QueryFn>(async (sql, params) => {
    const db = await getDuckDb();
    const conn = await db.connect();
    try {
      let table: Table;
      if (params && params.length > 0) {
        const prep = await conn.prepare(sql);
        table = await prep.query(...params);
        await prep.close();
      } else {
        table = await conn.query(sql);
      }
      return table.toArray().map((row) => row.toJSON()) as never;
    } finally {
      await conn.close();
    }
  }, []);

  const uploadCsv = useCallback(
    async (text: string, fileName: string) => {
      try {
        setStatus("loading");
        setError(null);
        const db = await getDuckDb();
        await loadCsvText(db, text, fileName);
        setMeta(await getDatasetMeta(db));
        setSource("uploaded");
        setStatus("ready");
        setVersion((v) => v + 1);
      } catch (e) {
        console.error("[DataProvider] upload failed", e);
        setError(e instanceof Error ? e.message : String(e));
        // Re-read meta in case the prior data is still loaded
        try {
          const db = await getDuckDb();
          setMeta(await getDatasetMeta(db));
          setStatus("ready");
        } catch {
          setStatus("error");
        }
      }
    },
    []
  );

  const resetToDemo = useCallback(async () => {
    try {
      setStatus("loading");
      setError(null);
      const db = await getDuckDb();
      await loadDemoDataset(db);
      setMeta(await getDatasetMeta(db));
      setSource("demo");
      setStatus("ready");
      setVersion((v) => v + 1);
    } catch (e) {
      console.error("[DataProvider] reset failed", e);
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({ status, source, meta, error, query, uploadCsv, resetToDemo, version }),
    [status, source, meta, error, query, uploadCsv, resetToDemo, version]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// Force full re-init (exposed for debugging)
export async function _reset() {
  await resetDuckDb();
}
