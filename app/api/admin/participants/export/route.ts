import { adminOnly } from "@/lib/admin-route";
import { listParticipants } from "@/lib/participants-server";

/**
 * GET /api/admin/participants/export (admin only)
 * Every participant as a CSV download: brandlab-registrations-<date>.csv
 */

const COLUMNS = [
  ["code", "Code"],
  ["full_name", "Full name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["enrollment_no", "Enrollment no"],
  ["course_year", "Course / year"],
  ["partner_name", "Partner name"],
  ["partner_enrollment_no", "Partner enrollment no"],
  ["checked_in", "Checked in"],
  ["created_at", "Registered at (UTC)"],
] as const;

/**
 * One CSV cell. Always quoted, with quotes doubled. A value that starts with
 * = + - @ (or a tab / carriage return) gets a leading single quote, so a
 * spreadsheet shows it as text instead of running it as a formula.
 */
function cell(value: string | boolean | null): string {
  let text = value === null ? "" : typeof value === "boolean" ? (value ? "yes" : "no") : value;
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  return adminOnly(request, "api/admin/participants/export", async () => {
    const participants = await listParticipants("", "all");

    const lines = [
      COLUMNS.map(([, title]) => cell(title)).join(","),
      ...participants.map((row) => COLUMNS.map(([key]) => cell(row[key])).join(",")),
    ];

    // The date in the file name is the day in India (UTC+05:30).
    const date = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // The BOM makes Excel read the file as UTF-8.
    return new Response(`﻿${lines.join("\r\n")}\r\n`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="brandlab-registrations-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}
