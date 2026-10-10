"use client";

import { useEffect, useState } from "react";
import type { Phase } from "@/lib/admin-schema";
import type { PublicEventState } from "@/lib/live";
import type { SubmitStatus } from "@/lib/submit-schema";

const POLL_MS = 5000;
const TICK_MS = 500;
const FETCH_TIMEOUT_MS = 8000;

/** Phases that come before submissions open. */
const BEFORE: readonly Phase[] = ["closed", "registration", "live", "keywords_revealed"];

export type Gate = "loading" | "open" | "not-open" | "closed";

export type SubmitGate = {
  gate: Gate;
  /** Deadline as ISO, or null when none is set. */
  closesAt: string | null;
  /** Whole seconds left on the SERVER clock; null when there is no deadline or nothing is loaded. */
  secondsLeft: number | null;
  /** The last status request failed; the last known state is kept. */
  reconnecting: boolean;
};

/**
 * Polls GET /api/submit/status every 5 seconds (paused while the tab is hidden)
 * and keeps a countdown to the deadline synced to the server clock.
 */
export function useSubmitStatus(): SubmitGate {
  const [status, setStatus] = useState<SubmitStatus | null>(null);
  const [before, setBefore] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    let alive = true;
    let latest: SubmitStatus | null = null;
    let inFlight = false;
    let lastFetch = 0;
    // serverTime minus the device clock on arrival. Latency only ever makes a
    // sample too small, so the largest one seen is the best estimate.
    let offset: number | null = null;

    const getJson = (url: string, signal: AbortSignal) =>
      fetch(url, { cache: "no-store", signal }).then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("bad status")),
      );

    const load = () => {
      if (!alive || inFlight) return;
      inFlight = true;
      lastFetch = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      getJson("/api/submit/status", controller.signal)
        .then(async (next: SubmitStatus) => {
          const serverMs = Date.parse(next?.serverTime);
          if (typeof next?.open !== "boolean" || !Number.isFinite(serverMs)) throw new Error("bad response");

          const sample = serverMs - Date.now();
          offset = offset === null ? sample : Math.max(offset, sample);

          // The status only says open or not. When it is not, the public event
          // state tells "not open yet" apart from "closed".
          let isBefore = false;
          if (!next.open) {
            const event = (await getJson("/api/event-state", controller.signal)) as PublicEventState;
            isBefore = BEFORE.includes(event.phase);
          }
          if (!alive) return;
          latest = next;
          setStatus(next);
          setBefore(isBefore);
          setReconnecting(false);
        })
        .catch(() => {
          if (alive) setReconnecting(true);
        })
        .finally(() => {
          clearTimeout(timeout);
          inFlight = false;
        });
    };

    const tick = () => {
      if (document.hidden) return; // paused in the background
      const remaining = latest?.closesAt ? Date.parse(latest.closesAt) - (Date.now() + (offset ?? 0)) : null;
      setSecondsLeft(remaining === null ? null : Math.max(0, Math.ceil(remaining / 1000)));

      // Right at the deadline, ask again sooner so the page flips to "closed" promptly.
      const due = latest?.open && remaining !== null && remaining <= 0 ? 1000 : POLL_MS;
      if (Date.now() - lastFetch >= due) load();
    };

    const onVisibility = () => {
      if (!document.hidden) load();
    };

    const first = setTimeout(load, 0);
    const ticker = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(ticker);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  let gate: Gate = "loading";
  if (status) {
    // The local countdown closes the form the moment it reaches zero; the server stays the judge.
    const deadlinePassed = status.closesAt !== null && secondsLeft === 0;
    if (status.open && !deadlinePassed) gate = "open";
    else gate = before ? "not-open" : "closed";
  }

  return { gate, closesAt: status?.closesAt ?? null, secondsLeft, reconnecting };
}

/** "1d 4h", "02:15:09" or "04:59". */
export function formatCountdown(seconds: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds % 60)}`;
  return `${pad(minutes)}:${pad(seconds % 60)}`;
}
