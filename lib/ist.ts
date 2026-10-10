/**
 * Indian Standard Time helpers for the admin screens.
 * IST is a fixed UTC+05:30 with no daylight saving, so plain arithmetic is
 * exact and gives the same text on the server and in any browser.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (value: number) => String(value).padStart(2, "0");

/** A Date whose UTC fields read as the IST wall clock for the given instant. */
function shifted(iso: string): Date {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MS);
}

/** "13 Oct 2026, 2:30 PM IST" (with seconds when asked). */
export function formatIst(iso: string | null, withSeconds = false): string {
  if (!iso) return "Not set";
  const date = shifted(iso);
  const hours = date.getUTCHours();
  const time = `${hours % 12 || 12}:${pad(date.getUTCMinutes())}${withSeconds ? `:${pad(date.getUTCSeconds())}` : ""} ${hours < 12 ? "AM" : "PM"}`;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${time} IST`;
}

/** Value for <input type="datetime-local"> showing the instant in IST. */
export function toIstInput(iso: string | null): string {
  if (!iso) return "";
  const date = shifted(iso);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

/** Reads a datetime-local value as IST and returns ISO with the +05:30 offset. */
export function fromIstInput(value: string): string {
  return `${value.length === 16 ? `${value}:00` : value}+05:30`;
}
