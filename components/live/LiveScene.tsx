"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ParallaxLayers from "@/components/ParallaxLayers";
import StatueScene from "@/components/StatueScene";
import { SvgFilters, TornCorners } from "@/components/TornPaper";
import { hero, resetHero, SLICE } from "@/lib/heroState";
import type { PublicEventState } from "@/lib/live";
import Revealed from "./Revealed";

/** How far the mountain band opens while it "breathes" (statue heights). */
const BREATH = 0.09;
/** Seconds for one full open-and-close. */
const BREATH_CYCLE = 8;
/** Band width when the countdown starts and when it reaches zero. */
const COUNT_FROM = 0.24;
const COUNT_TO = 0.6;

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
 * Desktop version of /live: the hero's own statue scene (same StatueScene,
 * ParallaxLayers, paper and torn corners; nothing is duplicated) used as the
 * backdrop for the waiting screen, the countdown and the reveal.
 *
 * The 3D scene reads the shared `hero` state every frame, so this component
 * only has to put that state in its finished pose and animate bandWidth.
 * Loaded with next/dynamic from Live.tsx, so three.js is downloaded on
 * desktop only.
 */
export default function LiveScene({ data, seconds, animate, reporting, onFail }: LiveSceneProps) {
  const stage = useRef<HTMLDivElement>(null);
  const keywords = data?.keywords;
  const counting = !keywords && seconds !== null;

  // Finished hero pose: solid marble, band across the eyes, no loader, no scroll zoom.
  useEffect(() => {
    resetHero(true);
    return () => {
      hero.bandWidth = SLICE.bandWidth;
    };
  }, []);

  // Mouse tilt + parallax (same mapping as the hero).
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      hero.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      hero.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      hero.pointerX = hero.pointerY = 0;
    };
  }, []);

  // The mountain band: breathes while waiting, opens up as the count runs down.
  useEffect(() => {
    if (counting) {
      const progress = 1 - Math.min(seconds, 10) / 10;
      const tween = gsap.to(hero, {
        bandWidth: COUNT_FROM + (COUNT_TO - COUNT_FROM) * progress,
        duration: 1,
        ease: "none",
      });
      return () => {
        tween.kill();
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

  return (
    <div className={`hero-pin live-scene${keywords ? " is-revealed" : ""}`}>
      <SvgFilters />
      <div className="hero-paper" aria-hidden />
      <TornCorners />

      {/* Yellow circle, bulb, paper scraps (behind the statue) and clouds (in front). */}
      <ParallaxLayers stageRef={stage} lit failed={false} reduced={false} />

      <div className="hero-canvas" style={{ zIndex: 2 }} aria-hidden>
        <StatueScene stageRef={stage} mobile={false} reduced={false} onReady={noop} onError={onFail} />
      </div>

      <div className="live-scene-top">
        <span className="live-tag">
          <span className="live-dot" aria-hidden />
          Live
        </span>
        {reporting && <span className="eyebrow">Reporting {reporting}</span>}
      </div>

      {/* Headline exactly as in the hero (same classes, same LAB lettering). */}
      <div className="hero-copy" aria-hidden={keywords ? true : undefined}>
        <h1 className="hero-headline" aria-label="Brand Lab">
          <span className="brand-wrap" aria-hidden>
            <span className="brand">BRAND</span>
          </span>
          <span className="lab-wrap" aria-hidden>
            <span className="lab">LAB</span>
          </span>
        </h1>
        <p className="tagline">
          Think it. <mark>Name it.</mark> <em>Brand it.</em>
        </p>
        <p className="hero-blurb">Keywords appear here the moment the event starts.</p>
      </div>

      {counting && (
        <div className="live-scene-count">
          <p className="eyebrow">{seconds > 0 ? "Keywords in" : "Here they come"}</p>
          <p className="live-count" role="timer" aria-label={`${seconds} seconds`}>
            <span className="swipe">
              <span className="swipe-ink" aria-hidden />
              {seconds}
            </span>
          </p>
        </div>
      )}

      {keywords && data && (
        <div className="live-scene-reveal">
          <Revealed key={keywords.join("\n")} keywords={keywords} phase={data.phase} animate={animate} />
        </div>
      )}
    </div>
  );
}
