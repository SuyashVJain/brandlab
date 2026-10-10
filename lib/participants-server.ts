// SERVER ONLY. Participant queries for the admin registrations tools.
// These return personal data: use them from admin-only routes and nowhere else.

import { db } from "@/lib/db";
import type { CheckinStatus, ParticipantRow } from "@/lib/registrations";

type DbRow = Record<string, unknown>;

export function toParticipantRow(row: DbRow): ParticipantRow {
  return {
    id: row.id as string,
    code: row.code as string,
    full_name: row.full_name as string,
    email: row.email as string,
    phone: row.phone as string,
    enrollment_no: row.enrollment_no as string,
    course_year: (row.course_year as string | null) ?? null,
    partner_name: (row.partner_name as string | null) ?? null,
    partner_enrollment_no: (row.partner_enrollment_no as string | null) ?? null,
    checked_in: row.checked_in === true,
    created_at: new Date(row.created_at as string).toISOString(),
  };
}

/**
 * Participants ordered by code. `q` matches code, name, email, enrollment
 * number or phone, case-insensitively; `%`, `_` and `\` in it are taken literally.
 */
export async function listParticipants(q: string, status: CheckinStatus): Promise<ParticipantRow[]> {
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const rows = await db()`
    select id, code, full_name, email, phone, enrollment_no, course_year,
           partner_name, partner_enrollment_no, checked_in, created_at
    from participants
    where (
        ${q} = ''
        or code ilike ${pattern}
        or full_name ilike ${pattern}
        or email ilike ${pattern}
        or enrollment_no ilike ${pattern}
        or phone ilike ${pattern}
      )
      and (${status} = 'all' or checked_in = (${status} = 'checked_in'))
    order by code
  `;
  return rows.map(toParticipantRow);
}
