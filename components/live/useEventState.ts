"use client";

import { useEffect, useState } from "react";
import { REVEAL_PHASES, type PublicEventState } from "@/lib/live";

/** Normal gap between polls. Each gap is moved by up to POLL_JITTER_MS either way. */
const POLL_MS = 4000;
/** So a room of browsers that loaded together does not poll in the same instant. */
const POLL_JITTER_MS = 500;
/** Gap between polls while the tab is in the background. */
const HIDDEN_POLL_MS = 10000;
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
 * Polls GET /api/event-state about every 4 seconds (with a little jitter per
 * browser) and keeps a countdown synced to the server clock. While the tab is
 * hidden it polls every 10 seconds, and it refetches the moment the tab is
 * visible again.
 *
 * The countdown never depends on when a poll lands: it is computed on every
 * tick from revealAt and the server clock offset. At zero the hook switches to
 * fast polling until the keywords arrive, so the reveal is on time even when
 * the regular poll would have been seconds away.
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
    // How long to wait after the last request before the next regular one. Re-drawn after every request.
    let gap = POLL_MS;
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
      gap = POLL_MS + (Math.random() * 2 - 1) * POLL_JITTER_MS;
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
      // In the background: nothing to draw, just a slow poll so the state is not stale on return.
      if (document.hidden) {
        if (Date.now() - lastFetch >= HIDDEN_POLL_MS) load();
        return;
      }

      let remaining: number | null = null;
      if (latest && !latest.keywords && latest.revealAt && REVEAL_PHASES.includes(latest.phase)) {
        remaining = Date.parse(latest.revealAt) - (Date.now() + (offset ?? 0));
      }
      setSeconds(remaining === null ? null : Math.max(0, Math.ceil(remaining / 1000)));

      const waitingForKeywords = remaining !== null && remaining <= 0;
      if (Date.now() - lastFetch >= (waitingForKeywords ? FAST_POLL_MS : gap)) load();
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
