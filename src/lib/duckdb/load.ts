"use client";

import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { generateDemoRecords } from "@/lib/demo/generate";
import type { RawRecord } from "@/types/record";
import { clearRecords } from "@/lib/duckdb/schema";

export type DatasetMeta = {
  rows: number;
  quotes: number;
  transactions: number;
  metros: number;
  minDate: string | null;
  maxDate: string | null;
  fileName?: string;
};

const REQUIRED_COLUMNS = [
  "record_type",
  "bt_shipment_id",
  "origin_zipcode",
  "destination_metro_code",
  "weight",
  "distance",
  "total_charge",
  "record_date",
] as const;

function toCsvLine(r: RawRecord): string {
  // No fields contain commas/quotes in our demo generator, so simple join is
  // safe. User uploads go through DuckDB's read_csv_auto, not this function.
  return [
    r.record_type,
    r.bt_shipment_id,
    r.origin_zipcode,
    r.destination_metro_code,
    r.weight,
    r.distance,
    r.total_charge,
    r.record_date,
  ].join(",");
}

function recordsToCsv(rows: RawRecord[]): string {
  const header = REQUIRED_COLUMNS.join(",");
  const body = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) body[i] = toCsvLine(rows[i]);
  return header + "\n" + body.join("\n") + "\n";
}

async function registerCsv(
  db: AsyncDuckDB,
  name: string,
  csvText: string
): Promise<void> {
  // Remove any previous file with this name so re-registering is idempotent.
  try {
    await db.dropFile(name);
  } catch {}
  await db.registerFileText(name, csvText);
}

export async function loadDemoDataset(db: AsyncDuckDB): Promise<void> {
  const rows = generateDemoRecords();
  const csv = recordsToCsv(rows);
  await registerCsv(db, "demo.csv", csv);
  await clearRecords(db);

  const conn = await db.connect();
  try {
    await conn.query(`
      INSERT INTO records
      SELECT
        record_type,
        bt_shipment_id,
        origin_zipcode,
        destination_metro_code,
        CAST(weight AS DOUBLE),
        CAST(distance AS DOUBLE),
        CAST(total_charge AS DOUBLE),
        CAST(record_date AS DATE)
      FROM read_csv_auto('demo.csv', HEADER=TRUE);
    `);
  } finally {
    await conn.close();
  }
}

export async function loadCsvText(
  db: AsyncDuckDB,
  csvText: string,
  fileName: string
): Promise<void> {
  const virtualName = `user_${Date.now()}.csv`;
  await registerCsv(db, virtualName, csvText);

  const conn = await db.connect();
  try {
    // Probe schema — will throw if required columns are missing.
    const probe = await conn.query(
      `SELECT column_name FROM (DESCRIBE SELECT * FROM read_csv_auto('${virtualName}', HEADER=TRUE)) t;`
    );
    const cols = new Set(
      probe.toArray().map((r) => String(r.toJSON().column_name).toLowerCase())
    );
    const missing = REQUIRED_COLUMNS.filter((c) => !cols.has(c));
    if (missing.length) {
      throw new Error(
        `CSV is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`
      );
    }

    // Replace current records atomically-ish.
    await conn.query(`BEGIN;`);
    await conn.query(`DELETE FROM records;`);
    await conn.query(`
      INSERT INTO records
      SELECT
        record_type,
        bt_shipment_id,
        origin_zipcode,
        destination_metro_code,
        CAST(weight AS DOUBLE),
        CAST(distance AS DOUBLE),
        CAST(total_charge AS DOUBLE),
        CAST(record_date AS DATE)
      FROM read_csv_auto('${virtualName}', HEADER=TRUE, IGNORE_ERRORS=FALSE);
    `);
    await conn.query(`COMMIT;`);
  } catch (e) {
    try {
      await conn.query(`ROLLBACK;`);
    } catch {}
    throw e;
  } finally {
    await conn.close();
    try {
      await db.dropFile(virtualName);
    } catch {}
  }

  // Attach filename via meta.
  _lastFileName = fileName;
}

let _lastFileName: string | undefined = undefined;

export async function getDatasetMeta(db: AsyncDuckDB): Promise<DatasetMeta> {
  const conn = await db.connect();
  try {
    const summary = await conn.query(`
      SELECT
        COUNT(*)                                                         AS rows,
        COUNT(*) FILTER (WHERE record_type = 'Rate Shop')                AS quotes,
        COUNT(*) FILTER (WHERE record_type = 'Transaction')              AS transactions,
        COUNT(DISTINCT destination_metro_code)                           AS metros,
        MIN(record_date)                                                  AS min_date,
        MAX(record_date)                                                  AS max_date
      FROM records;
    `);
    const row = summary.toArray()[0]?.toJSON() as
      | {
          rows: bigint | number;
          quotes: bigint | number;
          transactions: bigint | number;
          metros: bigint | number;
          min_date: Date | string | null;
          max_date: Date | string | null;
        }
      | undefined;

    const toNum = (v: bigint | number | undefined) =>
      typeof v === "bigint" ? Number(v) : v ?? 0;
    const toIso = (d: Date | string | null | undefined) =>
      d == null ? null : d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

    return {
      rows: toNum(row?.rows),
      quotes: toNum(row?.quotes),
      transactions: toNum(row?.transactions),
      metros: toNum(row?.metros),
      minDate: toIso(row?.min_date ?? null),
      maxDate: toIso(row?.max_date ?? null),
      fileName: _lastFileName,
    };
  } finally {
    await conn.close();
  }
}
