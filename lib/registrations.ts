import { z } from "zod";

/**
 * Shapes shared by the admin registrations API (server) and the Registrations
 * tab (browser). No server-only imports in this file.
 */

export const STATUSES = ["all", "checked_in", "not_checked_in"] as const;
export type CheckinStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<CheckinStatus, string> = {
  all: "Everyone",
  checked_in: "Checked in",
  not_checked_in: "Not checked in",
};

export type ParticipantRow = {
  id: string;
  code: string;
  full_name: string;
  email: string;
  phone: string;
  enrollment_no: string;
  partner_name: string | null;
  partner_enrollment_no: string | null;
  /** Null for entries registered before these fields existed. */
  program: string | null;
  semester: number | null;
  partner_phone: string | null;
  partner_program: string | null;
  partner_semester: number | null;
  checked_in: boolean;
  /** ISO time (UTC). */
  created_at: string;
};

/** Counts over ALL participants, whatever the current search or filter. */
export type ParticipantCounts = { total: number; checked_in: number; solo: number; pairs: number };

/** GET /api/admin/participants */
export type ParticipantsData = { participants: ParticipantRow[]; counts: ParticipantCounts };

/** POST /api/admin/checkin */
export const checkinSchema = z.object({
  id: z.uuid("Unknown participant."),
  checked_in: z.boolean("checked_in must be true or false."),
});

/** What a participant code looks like (BL-0012). Used to spot a scanned or typed code. */
export const PARTICIPANT_CODE = /^BL-\d{4,6}$/;
