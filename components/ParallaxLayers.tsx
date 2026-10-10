"use client";

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { hero } from "@/lib/heroState";

/** Pixels a depth-1 layer travels for a full mouse sweep / a full scroll. */
const MOUSE_TRAVEL = 34;
const SCROLL_TRAVEL = 140;

type ParallaxLayersProps = {
  /** Set on the back stage box; StatueScene aligns the 3D statue to it. */
  stageRef: RefObject<HTMLDivElement | null>;
  /** Lightbulb on/off. */
  lit: boolean;
  /** The 3D statue is unavailable: show a flat torn mountain strip instead. */
  failed: boolean;
  reduced: boolean;
};

function Cloud({ className, flip = false }: { className: string; flip?: boolean }) {
  return (
    <div className={`layer ${className}`} data-depth="0.9" aria-hidden>
      <svg
        className="cloud intro-cloud"
        viewBox="0 0 400 240"
        style={flip ? { transform: "scaleX(-1)" } : undefined}
      >
        {/* Three passes: dark underside, grey body, bright top. */}
        <defs>
          <linearGradient id="cloud-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.25" stopColor="#ffffff" />
            <stop offset="1" stopColor="#a9acb3" />
          </linearGradient>
        </defs>
        <g filter="url(#cloud)" fill="#6f737b" opacity="0.85">
          <ellipse cx="205" cy="160" rx="120" ry="26" />
        </g>
        <g filter="url(#cloud)" fill="url(#cloud-body)">
          <ellipse cx="200" cy="140" rx="128" ry="38" />
          <ellipse cx="150" cy="108" rx="60" ry="44" />
          <ellipse cx="246" cy="116" rx="54" ry="36" />
          <ellipse cx="96" cy="140" rx="40" ry="26" />
        </g>
        <g filter="url(#cloud)" fill="#ffffff">
          <ellipse cx="165" cy="96" rx="44" ry="26" />
          <ellipse cx="236" cy="104" rx="36" ry="20" />
        </g>
      </svg>
    </div>
  );
}

function Bulb({ lit }: { lit: boolean }) {
  return (
    <div className={`layer bulb-layer${lit ? " is-lit" : ""}`} data-depth="0.6" aria-hidden>
      <div className="bulb intro-pop">
        <span className="bulb-glow" />
        <svg viewBox="0 0 120 190" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <g className="bulb-rays" stroke="#0A0A0A" strokeWidth="3">
            <path d="M60 4v16M17 22l10 13M103 22 93 35M2 62l15 5M118 62l-15 5" />
          </g>
          <path
            className="bulb-glass"
            d="M60 34c-24 0-42 18-42 41 0 15 7 25 15 34 6 7 9 13 9 21h36c0-8 3-14 9-21 8-9 15-19 15-34 0-23-18-41-42-41Z"
            stroke="#0A0A0A"
            strokeWidth="3.5"
          />
          <path
            className="bulb-filament"
            d="M48 130V98l6-9 6 9 6-9 6 9v32"
            stroke="#0A0A0A"
            strokeWidth="2.5"
          />
          <path d="M42 134h36v30a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8v-30Z" fill="#0A0A0A" />
          <path d="M44 146h32M44 157h32" stroke="#EFECE6" strokeWidth="2.5" />
          <path d="M52 176h16v6a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4v-6Z" fill="#0A0A0A" />
        </svg>
      </div>
    </div>
  );
}

/**
 * Everything around the statue that is not 3D: the yellow circle, bulb, paper
 * scraps (behind the canvas) and the clouds (in front of it).
 *
 * It also runs the one DOM animation loop of the hero. Inside the pinned area:
 *  - any element with data-depth shifts with the smoothed mouse and with scroll
 *  - any element with data-zoom scales up and fades as the camera pushes in
 */
export default function ParallaxLayers({ stageRef, lit, failed, reduced }: ParallaxLayersProps) {
  const front = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const root = front.current?.parentElement;
    if (!root) return;

    const layers = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]")).map((element) => ({
      element,
      depth: parseFloat(element.dataset.depth ?? "0"),
    }));
    const zoomers = Array.from(root.querySelectorAll<HTMLElement>("[data-zoom]")).map((element) => ({
      element,
      amount: parseFloat(element.dataset.zoom ?? "0"),
    }));

    let lastKey = "";
    const tick = (_time: number, deltaMs: number) => {
      // Frame-rate independent lerp toward the raw pointer.
      const ease = 1 - Math.exp((-deltaMs / 1000) * 5);
      hero.mouseX += (hero.pointerX - hero.mouseX) * ease;
      hero.mouseY += (hero.pointerY - hero.mouseY) * ease;

      const scroll = hero.scroll;
      const key = `${hero.mouseX.toFixed(3)}|${hero.mouseY.toFixed(3)}|${scroll.toFixed(4)}`;
      if (key === lastKey) return; // nothing moved: skip the style writes
      lastKey = key;

      for (const { element, depth } of layers) {
        const tx = -hero.mouseX * depth * MOUSE_TRAVEL;
        const ty = -hero.mouseY * depth * MOUSE_TRAVEL - scroll * depth * SCROLL_TRAVEL;
        element.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      }

      const zoom = scroll * scroll * (3 - 2 * scroll);
      for (const { element, amount } of zoomers) {
        element.style.transform = `scale(${(1 + zoom * amount).toFixed(4)})`;
        // Nearer groups (bigger zoom) leave sooner.
        const fade = Math.min(1, Math.max(0, (scroll * (0.6 + amount * 0.5) - 0.25) / 0.4));
        element.style.opacity = (1 - fade).toFixed(3);
      }
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      for (const { element } of [...layers, ...zoomers]) {
        element.style.transform = "";
        element.style.opacity = "";
      }
    };
  }, [reduced, failed]);

  return (
    <>
      {/* ---- behind the statue ---- */}
      <div ref={stageRef} className="stage stage--back" data-zoom="1.1" aria-hidden>
        <div className="layer shard shard--black-left" data-depth="0.18">
          <i className="intro-pop" />
        </div>
        <div className="layer circle-layer" data-depth="0.28">
          <div className="circle" />
        </div>
        <div className="layer shard shard--blue" data-depth="0.4">
          <i className="intro-pop" />
        </div>
        <div className="layer shard shard--yellow" data-depth="0.5">
          <i className="intro-pop" />
        </div>
        <div className="layer shard shard--black-base" data-depth="0.35">
          <i className="intro-pop" />
        </div>
        <div className="layer dots" data-depth="0.45">
          <i className="intro-pop" />
        </div>
        <div className="layer marquee" data-depth="0.55">
          <i className="intro-pop" />
        </div>
        <Bulb lit={lit} />

        {failed && (
          <div className="layer fallback-slice" data-depth="0.5">
            <i />
          </div>
        )}
      </div>

      {/* ---- in front of the statue ---- */}
      <div ref={front} className="stage stage--front" data-zoom="2.4" aria-hidden>
        <Cloud className="cloud-layer cloud-layer--top" />
        <Cloud className="cloud-layer cloud-layer--left" flip />
      </div>
    </>
  );
}
