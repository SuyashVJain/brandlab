// SERVER ONLY. Reads the judging criteria.

import { NeonDbError } from "@neondatabase/serverless";
import { db } from "@/lib/db";
import type { Criterion } from "@/lib/jury-schema";

/** Postgres "undefined column": the database has not had migration 004 applied yet. */
export function isMissingColumn(error: unknown): boolean {
  return error instanceof NeonDbError && error.code === "42703";
}

/**
 * The criteria in display order.
 * `description` comes from migration 004. Until that migration has been run
 * the column does not exist, so this falls back to reading without it (every
 * description is then null) instead of failing.
 */
export async function readCriteria(): Promise<Criterion[]> {
  const sql = db();
  let rows: Record<string, unknown>[];
  try {
    rows = await sql`select id, position, label, max_points, description from criteria order by position, id`;
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    rows = await sql`select id, position, label, max_points from criteria order by position, id`;
  }
  return rows.map((row) => ({
    id: row.id as number,
    position: row.position as number,
    label: row.label as string,
    max_points: row.max_points as number,
    description: (row.description as string | null | undefined) || null,
  }));
}

/** True once any judge has saved a score: from then on the criteria cannot change. */
export async function criteriaLocked(): Promise<boolean> {
  const [row] = await db()`select exists (select 1 from scores) as locked`;
  return row?.locked === true;
}
