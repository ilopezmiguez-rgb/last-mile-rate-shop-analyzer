"use client";

import type { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import { buildNormalizedWeightSql } from "@/lib/formulas/weight";
import { buildZoneNameSql } from "@/lib/formulas/distance";
import { buildCoarseWeightBinSql } from "@/lib/formulas/physics";

/**
 * Build the base table and the derived views. Kept idempotent: `CREATE OR
 * REPLACE` lets us call this on every boot without worrying about state.
 */
export async function applySchema(db: AsyncDuckDB) {
  const conn = await db.connect();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS records (
        record_type           TEXT   NOT NULL,
        bt_shipment_id        TEXT   NOT NULL,
        origin_zipcode        TEXT   NOT NULL,
        destination_metro_code TEXT  NOT NULL,
        weight                DOUBLE NOT NULL,
        distance              DOUBLE NOT NULL,
        total_charge          DOUBLE NOT NULL,
        record_date           DATE   NOT NULL
      );
    `);

    const normalizedWeight = buildNormalizedWeightSql("weight");
    const zoneName = buildZoneNameSql("distance");
    const coarseBin = buildCoarseWeightBinSql("weight");

    await conn.query(`
      CREATE OR REPLACE VIEW won_ids AS
      SELECT DISTINCT bt_shipment_id
      FROM records
      WHERE record_type = 'Transaction';
    `);

    await conn.query(`
      CREATE OR REPLACE VIEW records_normalized AS
      SELECT
        r.*,
        ${normalizedWeight}       AS normalized_weight,
        ${zoneName}               AS zone_name,
        ${coarseBin}              AS coarse_weight_bin,
        (w.bt_shipment_id IS NOT NULL) AS is_won
      FROM records r
      LEFT JOIN won_ids w ON r.bt_shipment_id = w.bt_shipment_id;
    `);

    // Stable zone ordering — every axis/list joins against this.
    await conn.query(`
      CREATE OR REPLACE VIEW zone_order AS
      SELECT * FROM (VALUES
        ('1. 0-50 miles',       1),
        ('2. 50-150 miles',     2),
        ('3. 150-300 miles',    3),
        ('4. 300-600 miles',    4),
        ('5. 600-1000 miles',   5),
        ('6. 1000-1400 miles',  6),
        ('7. 1400-1800 miles',  7),
        ('8. 1800-2200 miles',  8),
        ('9. 2200-2600 miles',  9),
        ('10. Over 2600 miles', 10)
      ) AS t(zone_name, rank);
    `);
  } finally {
    await conn.close();
  }
}

export async function clearRecords(db: AsyncDuckDB) {
  const conn = await db.connect();
  try {
    await conn.query(`DELETE FROM records;`);
  } finally {
    await conn.close();
  }
}
