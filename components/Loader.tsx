"use client";

import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import gsap from "gsap";
import { hero } from "@/lib/heroState";

/** The loader never finishes faster than this, however quick the network is. */
const MIN_SECONDS = 2;

type LoaderProps = {
  /** True once the scene has everything it needs (or has given up and fallen back). */
  ready: boolean;
  /** Called once, when the counter reaches 100. */
  onDone: () => void;
};

/**
 * Full-screen paper-white loader. There is no spinner: the statue itself
 * (rendered by StatueScene, which sits above this panel while loading) is the
 * progress indicator. This component owns the counter and the scan line, and
 * writes the displayed progress to hero.scan for the shaders to follow.
 */
export default function Loader({ ready, onDone }: LoaderProps) {
  const progress = useProgress((state) => state.progress);
  const counter = useRef<HTMLSpanElement>(null);
  const scanLine = useRef<HTMLDivElement>(null);

  // Mirror props into refs so the ticker below never has to restart.
  const latest = useRef({ progress, ready, onDone });
  useEffect(() => {
    latest.current = { progress, ready, onDone };
  });

  useEffect(() => {
    const startedAt = performance.now();
    let shown = 0;
    let finished = false;

    const tick = () => {
      if (finished) return;
      const { progress, ready, onDone } = latest.current;
      const elapsed = (performance.now() - startedAt) / 1000;

      // Real progress, held just short of the top until the scene confirms it
      // is ready, and never ahead of the minimum-duration ramp.
      const real = ready ? 100 : Math.min(progress, 92);
      const target = Math.min(real, (elapsed / MIN_SECONDS) * 100);
      shown += (target - shown) * 0.14;
      if (target - shown < 0.08) shown = target;

      hero.scan = shown / 100;
      if (counter.current) {
        counter.current.textContent = String(Math.floor(shown)).padStart(2, "0");
      }
      if (scanLine.current) {
        scanLine.current.style.transform = `translate3d(0, ${-shown}svh, 0)`;
      }

      if (shown >= 100) {
        finished = true;
        onDone();
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="loader" role="status" aria-label="Loading Brand Lab">
      <p className="loader-label">IEEE SUAS-SB / Brand Lab</p>
      <div ref={scanLine} className="loader-scan" aria-hidden />
      <div className="loader-readout">
        <p className="loader-count" aria-hidden>
          <span ref={counter}>00</span>
          <span className="loader-percent">%</span>
        </p>
        <p className="tagline">
          Think it. <mark>Name it.</mark> <em>Brand it.</em>
        </p>
      </div>
    </div>
  );
}
