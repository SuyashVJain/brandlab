"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import StatueScene from "@/components/StatueScene";
import { SvgFilters, TornCorners } from "@/components/TornPaper";
import { hero, resetHero, SLICE } from "@/lib/heroState";
import type { PublicEventState } from "@/lib/live";
import RankReveal from "./RankReveal";
import Revealed from "./Revealed";
import { StageBulb, StageSide } from "./SceneArt";

/** How far the mountain band opens while it "breathes" (statue heights). */
const BREATH = 0.09;
/** Seconds for one full open-and-close. */
const BREATH_CYCLE = 8;
/** Band width when the countdown starts and when it reaches zero. */
const COUNT_FROM = 0.24;
const COUNT_TO = 0.62;
/** Pixels a depth-1 layer shifts for a full mouse sweep. */
const MOUSE_TRAVEL = 30;

const noop = () => {};

type LiveSceneProps = {
  data: PublicEventState | null;
  seconds: number | null;
  animate: boolean;
  reporting?: string;
  /** WebGL or the model failed: the page falls back to the plain screen. */
  onFail: () => void;
};

/**
 * Desktop version of /live: a centred, symmetrical stage for a big screen.
 * The statue stands in the middle (the hero's StatueScene with
 * layout="center"; no 3D or shader code is duplicated), BRAND and LAB sit
 * behind its head, and the countdown and the reveal play over it.
 *
 * The 3D scene reads the shared `hero` state every frame, so this component
 * only puts that state in its finished pose and animates bandWidth.
 * Loaded with next/dynamic from Live.tsx: three.js is desktop-only.
 */
export default function LiveScene({ data, seconds, animate, reporting, onFail }: LiveSceneProps) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);

  const keywords = data?.keywords;
  const revealed = Boolean(keywords);
  const counting = !revealed && seconds !== null;
  const atZero = counting && seconds === 0;

  // Results phase: an admin is revealing a rank. The stage steps back and RankReveal plays over it.
  const rank = data?.phase === "results" ? (data.revealedRank ?? 0) : 0;
  const ranking = rank > 0;
  const [spotlight, setSpotlight] = useState(false);

  // Finished hero pose: solid marble, band across the eyes, no loader, no scroll zoom.
  useEffect(() => {
    resetHero(true);
    return () => {
      hero.bandWidth = SLICE.bandWidth;
      hero.flash = 0;
    };
  }, []);

  // Mouse: smoothed pointer for the statue's tilt, plus a light parallax on every [data-depth] layer.
  useEffect(() => {
    const element = root.current;
    if (!element) return;

    const layers = Array.from(element.querySelectorAll<HTMLElement>("[data-depth]")).map((layer) => ({
      layer,
      depth: parseFloat(layer.dataset.depth ?? "0"),
    }));
    const onMove = (event: PointerEvent) => {
      hero.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      hero.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    const tick = (_time: number, deltaMs: number) => {
      const ease = 1 - Math.exp((-deltaMs / 1000) * 5);
      hero.mouseX += (hero.pointerX - hero.mouseX) * ease;
      hero.mouseY += (hero.pointerY - hero.mouseY) * ease;
      for (const { layer, depth } of layers) {
        const x = -hero.mouseX * depth * MOUSE_TRAVEL;
        const y = -hero.mouseY * depth * MOUSE_TRAVEL;
        layer.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.ticker.remove(tick);
      hero.pointerX = hero.pointerY = hero.mouseX = hero.mouseY = 0;
    };
  }, []);

  // The statue's mountain band: breathes while waiting, opens as the count runs down, and
  // settles back to breathing after the reveal so the marble face stays visible above the keywords.
  useEffect(() => {
    if (counting) {
      const progress = 1 - Math.min(seconds, 10) / 10;
      const widen = gsap.to(hero, {
        bandWidth: COUNT_FROM + (COUNT_TO - COUNT_FROM) * progress,
        duration: 1,
        ease: "none",
      });
      return () => {
        widen.kill();
      };
    }
    const breathing = gsap
      .timeline()
      .to(hero, { bandWidth: SLICE.bandWidth, duration: 1.2, ease: "power2.out" })
      .to(hero, {
        bandWidth: SLICE.bandWidth + BREATH,
        duration: BREATH_CYCLE / 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
    return () => {
      breathing.kill();
    };
  }, [counting, seconds]);

  // A quick white flash when the count hits zero (on the screen and on the statue's band).
  useEffect(() => {
    if (!atZero) return;
    const burst = gsap
      .timeline()
      .fromTo(flash.current, { opacity: 0.9 }, { opacity: 0, duration: 0.55, ease: "power2.out" }, 0)
      .fromTo(hero, { flash: 1 }, { flash: 0, duration: 0.6, ease: "power2.out" }, 0);
    return () => {
      burst.progress(1).kill();
    };
  }, [atZero]);

  return (
    <div ref={root} className={`live-stage${revealed ? " is-revealed" : ""}${counting ? " is-counting" : ""}${ranking ? " is-ranking" : ""}`}>
      <SvgFilters />
      <div className="hero-paper" aria-hidden />
      <TornCorners />

      {/* ---------- behind the statue ---------- */}
      <div className="stage-circle" data-depth="0.18" aria-hidden>
        <div className="circle" />
      </div>
      <div className="stage-sides" data-depth="0.42" aria-hidden>
        <StageSide />
        <StageSide mirrored />
      </div>
      <div className={`stage-bulb${!ranking || spotlight ? " is-lit" : ""}`} data-depth="0.6" aria-hidden>
        <StageBulb />
      </div>

      {/* Headline with the hero's own classes and LAB lettering. The statue's head overlaps it. */}
      <div className="live-stage-title" data-depth="0.1">
        <h1 className="hero-headline" aria-label="Brand Lab">
          <span className="brand-wrap" aria-hidden>
            <span className="brand">BRAND</span>
          </span>
          <span className="lab-wrap" aria-hidden>
            <span className="lab">LAB</span>
          </span>
        </h1>
      </div>

      {/* ---------- statue ---------- */}
      <div ref={stage} className="stage-box" aria-hidden />
      <div className="hero-canvas" style={{ zIndex: 2 }} aria-hidden>
        <StatueScene
          stageRef={stage}
          layout="center"
          mobile={false}
          reduced={false}
          onReady={noop}
          onError={onFail}
        />
      </div>

      {/* ---------- copy ---------- */}
      <div className="live-stage-top">
        {/* <span className="live-tag">
          <span className="live-dot" aria-hidden />
          Live
        </span> */}
      </div>
      <div className="live-stage-copy" aria-hidden={revealed || counting ? true : undefined}>
        <p className="tagline">
          Think it. <mark>Name it.</mark> <em>Brand it.</em>
        </p>
        <p className="live-stage-line">Keywords appear here the moment the event starts.</p>
      </div>
      {reporting && <p className="eyebrow live-stage-reporting">Reporting {reporting}</p>}

      {/* ---------- countdown ---------- */}
      {counting && (
        <div className="live-stage-count">
          <p className="live-count" role="timer" aria-label={`Keywords in ${seconds} seconds`}>
            <span className="swipe">
              <span className="swipe-ink" aria-hidden />
              {seconds}
            </span>
          </p>
        </div>
      )}

      {/* ---------- reveal ---------- */}
      {keywords && data && (
        <Revealed
          key={keywords.join("\n")}
          keywords={keywords}
          phase={data.phase}
          animate={animate}
          variant="tear"
        />
      )}

      {/* ---------- rank reveal (results phase) ---------- */}
      <RankReveal rank={rank} nonce={data?.revealNonce ?? 0} mode="stage" onSpotlight={setSpotlight} />

      <div ref={flash} className="live-flash" aria-hidden />
    </div>
  );
}
