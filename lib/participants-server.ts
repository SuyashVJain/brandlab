// SERVER ONLY. Participant queries for the admin registrations tools.
// These return personal data: use them from admin-only routes and nowhere else.

import { isMissingColumn } from "@/lib/criteria";
import { db } from "@/lib/db";
import type { CheckinStatus, ParticipantRow } from "@/lib/registrations";

type DbRow = Record<string, unknown>;

const text = (value: unknown) => (value as string | null) ?? null;
const whole = (value: unknown) => (value === null || value === undefined ? null : Number(value));

export function toParticipantRow(row: DbRow): ParticipantRow {
  return {
    id: row.id as string,
    code: row.code as string,
    full_name: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    enrollment_no: row.enrollment_no as string,
    partner_name: text(row.partner_name),
    partner_enrollment_no: text(row.partner_enrollment_no),
    program: text(row.program),
    semester: whole(row.semester),
    partner_phone: text(row.partner_phone),
    partner_program: text(row.partner_program),
    partner_semester: whole(row.partner_semester),
    checked_in: row.checked_in === true,
    created_at: new Date(row.created_at as string).toISOString(),
  };
}

/**
 * The column list every participant query selects. Programme, semester and the
 * partner's phone come from migration 007; `full` false is the same list for a
 * database where those columns do not exist yet (they read as null).
 * Fixed text only, never user input.
 */
export function participantColumns(full: boolean): string {
  const added = full
    ? "program, semester, partner_phone, partner_program, partner_semester"
    : "null as program, null as semester, null as partner_phone, null as partner_program, null as partner_semester";
  return `id, code, full_name, email, phone, enrollment_no,
          partner_name, partner_enrollment_no, ${added}, checked_in, created_at`;
}

/** Runs a query with the migration 007 columns, and again without them if they do not exist yet. */
export async function withNewFields<T>(run: (full: boolean) => Promise<T>): Promise<T> {
  try {
    return await run(true);
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    return run(false);
  }
}

/**
 * Participants ordered by code. `q` matches code, name, email, enrollment
 * number, phone, programme, partner name, partner enrollment number, partner
 * phone or partner programme, case-insensitively (`%`, `_` and `\` in it are
 * taken literally), and a semester when it is exactly that number.
 */
export async function listParticipants(q: string, status: CheckinStatus): Promise<ParticipantRow[]> {
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await withNewFields((full) =>
    db().query(
      `select ${participantColumns(full)}
       from participants
       where (
           $1 = ''
           or code ilike $2
           or full_name ilike $2
           or email ilike $2
           or enrollment_no ilike $2
           or phone ilike $2
           or partner_name ilike $2
           or partner_enrollment_no ilike $2
           ${
             full
               ? `or program ilike $2
           or partner_program ilike $2
           or partner_phone ilike $2
           or semester::text = $1
           or partner_semester::text = $1`
               : ""
           }
         )
         and ($3 = 'all' or checked_in = ($3 = 'checked_in'))
       order by code`,
      [q, pattern, status],
    ),
  );
  return rows.map(toParticipantRow);
}
