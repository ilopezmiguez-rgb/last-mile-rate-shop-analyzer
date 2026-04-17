"use client";

import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";

/**
 * Lazy singleton around the DuckDB-Wasm async database. The engine is ~10 MB
 * gzipped, so we load it on demand via dynamic import. Bundle loading itself
 * comes from the jsDelivr CDN — keeps us from shipping ~40 MB of .wasm in the
 * Next.js static output.
 */

let dbPromise: Promise<AsyncDuckDB> | null = null;

async function bootDuckDb(): Promise<AsyncDuckDB> {
  const duckdb = await import("@duckdb/duckdb-wasm");
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  // Create the worker from an inline-served URL (duckdb-wasm's recommended path).
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker ?? null);
  URL.revokeObjectURL(workerUrl);

  return db;
}

export function getDuckDb(): Promise<AsyncDuckDB> {
  if (!dbPromise) {
    dbPromise = bootDuckDb().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
}

export async function resetDuckDb() {
  if (!dbPromise) return;
  try {
    const db = await dbPromise;
    await db.terminate();
  } catch {}
  dbPromise = null;
}
