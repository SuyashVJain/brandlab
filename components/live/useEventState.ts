"use client";

import { useEffect, useState } from "react";
import { REVEAL_PHASES, type PublicEventState } from "@/lib/live";

const POLL_MS = 3000;
/** Once the countdown hits zero, ask again quickly until the keywords arrive. */
const FAST_POLL_MS = 700;
const TICK_MS = 200;
const FETCH_TIMEOUT_MS = 8000;

export type LiveState = {
  /** Last state the server confirmed. Stays as it was while polling fails. */
  data: PublicEventState | null;
  /** Whole seconds until the reveal on the SERVER clock, or null when no countdown is running. */
  seconds: number | null;
  /** The last request failed; `data` is the last known state. */
  reconnecting: boolean;
  /** True when this page watched the keywords arrive (so the reveal should animate). */
  animate: boolean;
};

/**
 * Polls GET /api/event-state every 3 seconds and keeps a countdown synced to
 * the server clock. Polling pauses while the tab is hidden and refetches the
 * moment it becomes visible again.
 */
export function useEventState(): LiveState {
  const [data, setData] = useState<PublicEventState | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    let alive = true;
    let latest: PublicEventState | null = null;
    let inFlight = false;
    let lastFetch = 0;
    // Did this page see the "not revealed yet" state? Opening the page after
    // the reveal must show the keywords at once, with no animation.
    let sawWaiting = false;
    // serverTime minus the device clock when the response arrived. Latency and
    // edge caching can only make a sample too SMALL, so the largest sample
    // seen is the best estimate of the real offset.
    let offset: number | null = null;

    const load = () => {
      if (!alive || inFlight) return;
      inFlight = true;
      lastFetch = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      fetch("/api/event-state", { cache: "no-store", signal: controller.signal })
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad status"))))
        .then((next: PublicEventState) => {
          if (!alive) return;
          const serverMs = Date.parse(next?.serverTime);
          if (typeof next?.phase !== "string" || !Number.isFinite(serverMs)) throw new Error("bad response");

          // An older (cached) answer must never replace a newer one.
          if (latest && serverMs < Date.parse(latest.serverTime)) return;

          const sample = serverMs - Date.now();
          offset = offset === null ? sample : Math.max(offset, sample);

          if (next.keywords && !latest?.keywords) setAnimate(sawWaiting);
          if (!next.keywords) sawWaiting = true;

          latest = next;
          setData(next);
          setReconnecting(false);
        })
        .catch(() => {
          // Keep whatever is on screen; just say we are retrying.
          if (alive) setReconnecting(true);
        })
        .finally(() => {
          clearTimeout(timeout);
          inFlight = false;
        });
    };

    const tick = () => {
      if (document.hidden) return; // paused while the tab is in the background

      let remaining: number | null = null;
      if (latest && !latest.keywords && latest.revealAt && REVEAL_PHASES.includes(latest.phase)) {
        remaining = Date.parse(latest.revealAt) - (Date.now() + (offset ?? 0));
      }
      setSeconds(remaining === null ? null : Math.max(0, Math.ceil(remaining / 1000)));

      const waitingForKeywords = remaining !== null && remaining <= 0;
      if (Date.now() - lastFetch >= (waitingForKeywords ? FAST_POLL_MS : POLL_MS)) load();
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

  return { data, seconds, reconnecting, animate };
}
