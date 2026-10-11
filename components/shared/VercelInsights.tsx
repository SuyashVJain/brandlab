"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** True for the staff pages (/admin and everything under it), which are never tracked. */
function isStaffPage(url: string): boolean {
  try {
    const { pathname } = new URL(url, window.location.origin);
    return pathname === "/admin" || pathname.startsWith("/admin/");
  } catch {
    return false;
  }
}

/** Returning null drops the event before anything is sent. */
function publicOnly<T extends { url: string }>(event: T): T | null {
  return isStaffPage(event.url) ? null : event;
}

/**
 * Vercel Web Analytics and Speed Insights. Both are cookieless, so no consent
 * banner is needed. A client component because `beforeSend` is a function,
 * which the server layout cannot pass as a prop.
 */
export default function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={publicOnly} />
      <SpeedInsights beforeSend={publicOnly} />
    </>
  );
}
