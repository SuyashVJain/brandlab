"use client";

import { useSyncExternalStore } from "react";
import type { Phase } from "@/lib/admin-schema";
import type { PublicEventState } from "@/lib/live";

/**
 * The current event phase for the home page buttons, from GET /api/event-state.
 * ONE poller is shared by every component that calls usePhase(), however many
 * there are on the page, and it stops when the last one unmounts.
 *
 * Same pace as the live screen: about every 4 seconds with a little jitter,
 * every 10 seconds while the tab is hidden, and at once when it is visible again.
 */

const POLL_MS = 4000;
const POLL_JITTER_MS = 500;
const HIDDEN_POLL_MS = 10000;
const FETCH_TIMEOUT_MS = 8000;

/** null until the first answer arrives; a failed poll keeps the last known phase. */
let phase: Phase | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight = false;

function schedule() {
  clearTimeout(timer);
  if (listeners.size === 0) return;
  const wait = document.hidden ? HIDDEN_POLL_MS : POLL_MS + (Math.random() * 2 - 1) * POLL_JITTER_MS;
  timer = setTimeout(load, wait);
}

function load() {
  if (inFlight || listeners.size === 0) return;
  inFlight = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  fetch("/api/event-state", { cache: "no-store", signal: controller.signal })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad status"))))
    .then((next: PublicEventState) => {
      if (typeof next?.phase !== "string" || next.phase === phase) return;
      phase = next.phase;
      for (const notify of listeners) notify();
    })
    .catch(() => {
      // Keep the last known phase and try again on the next turn.
    })
    .finally(() => {
      clearTimeout(timeout);
      inFlight = false;
      schedule();
    });
}

function onVisibility() {
  if (document.hidden) schedule();
  else load();
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    load();
  }
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

const getPhase = () => phase;
const getServerPhase = () => null;

/** The event phase, or null before the first answer (and during server rendering). */
export function usePhase(): Phase | null {
  return useSyncExternalStore(subscribe, getPhase, getServerPhase);
}
