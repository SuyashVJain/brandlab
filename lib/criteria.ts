// SERVER ONLY. Reads the judging criteria.

import { db } from "@/lib/db";
import type { Criterion } from "@/lib/jury-schema";

/** The criteria in display order. */
export async function readCriteria(): Promise<Criterion[]> {
  const rows = await db()`select id, position, label, max_points from criteria order by position, id`;
  return rows.map((row) => ({
    id: row.id,
    position: row.position,
    label: row.label,
    max_points: row.max_points,
  }));
}

/** True once any judge has saved a score: from then on the criteria cannot change. */
export async function criteriaLocked(): Promise<boolean> {
  const [row] = await db()`select exists (select 1 from scores) as locked`;
  return row?.locked === true;
}
