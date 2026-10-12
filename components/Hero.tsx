"use client";

import dynamic from "next/dynamic";
import EventCta from "@/components/shared/EventCta";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { hero, resetHero } from "@/lib/heroState";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Loader from "./Loader";
import ParallaxLayers from "./ParallaxLayers";
import { SvgFilters, TornCorners } from "./TornPaper";

// WebGL only exists in the browser, and this keeps three.js out of the first paint.
const StatueScene = dynamic(() => import("./StatueScene"), { ssr: false });

// Top bar logos, in display order. Sizes are the cleaned PNGs' intrinsic pixels (transparent background, trimmed).
const IEEE_LOGOS = [
  { src: "/logos/ieee-blue-clean.png", alt: "IEEE", width: 544, height: 160 },
  { src: "/logos/ieee-suas-sb-clean.png", alt: "IEEE SUAS Student Branch", width: 245, height: 241 },
  { src: "/logos/ieee-cs-clean.png", alt: "IEEE Computer Society, SUAS chapter", width: 250, height: 251 },
  { src: "/logos/ieee-wie-clean.png", alt: "IEEE Women in Engineering, SUAS", width: 243, height: 244 },
];
const SUAS_LOGO = {
  src: "/logos/suas-logo-clean.png",
  alt: "Symbiosis University of Applied Sciences",
  width: 1139,
  height: 240,
};

type Phase = "loading" | "intro" | "ready";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <circle cx="8.5" cy="8" r="3.5" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M1.5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5ZM16.5 20c0-2-.6-3.7-1.7-5 .7-.3 1.4-.4 2.2-.4 3.2 0 5.5 2 5.5 5.4Z" />
    </svg>
  );
}

/**
 * The whole hero: poster layout in the DOM, the 3D statue on a transparent
 * canvas between the DOM layers, the loading intro, and the pinned scroll.
 *
 * Layer order inside the pinned viewport (low to high):
 *   paper + torn corners -> stage back (circle, bulb, scraps) -> canvas
 *   -> stage front (clouds) -> copy -> loader -> end-of-scroll mountain.
 * While the loader is up the canvas is lifted above it, so the statue is the
 * one thing that shows through.
 */
export default function Hero() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const mobile = useMediaQuery("(max-width: 820px), (pointer: coarse)");

  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const intro = useRef<gsap.Context | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [sceneReady, setSceneReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const [bulbOn, setBulbOn] = useState(false);

  // Reduced motion jumps straight to the finished, static hero.
  const settled = reduced || phase === "ready";
  const showLoader = !reduced && !loaderGone;

  useEffect(() => {
    resetHero(reduced);
  }, [reduced]);

  // Start at the top and hold the page still until the intro has played.
  useEffect(() => {
    if (settled) return;
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [settled]);

  // Pointer tracking for tilt + parallax. Skipped on touch devices.
  useEffect(() => {
    if (reduced || mobile) return;
    const onMove = (event: PointerEvent) => {
      hero.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
      hero.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      hero.pointerX = hero.pointerY = 0;
    };
  }, [reduced, mobile]);

  // Pinned scroll. The section is 3 screens tall and its content is
  // position: sticky, so it stays pinned for 2 screens while ScrollTrigger
  // scrubs this timeline. hero.scroll drives the camera zoom and the band
  // widening inside StatueScene; the DOM tweens live here.
  useEffect(() => {
    if (reduced || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      gsap
        .timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        })
        .to(hero, { scroll: 1, duration: 1 }, 0)
        // Headline fades and scales out toward the viewer.
        .to(".hero-copy", { opacity: 0, scale: 1.35, duration: 0.3, ease: "power1.in" }, 0.02)
        .to(".hero-chrome", { opacity: 0, duration: 0.2 }, 0.04)
        .to(".torn", { opacity: 0, duration: 0.3 }, 0.3)
        // Full-bleed mountain takes over: the hand-off to the next section.
        .to(".hero-mountain-end", { opacity: 1, duration: 0.14 }, 0.86);
    }, root);
    return () => context.revert();
  }, [reduced]);

  useEffect(() => () => intro.current?.revert(), []);

  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const handleSceneError = useCallback(() => setFailed(true), []);

  // Runs when the loader counter hits 100.
  const playIntro = useCallback(() => {
    if (!root.current || intro.current) return;
    hero.loading = false; // statue is fully solid from here on
    setPhase("intro");

    intro.current = gsap.context(() => {
      const fullTurn = Math.PI * 2;
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline
        // 1. Turntable settles facing the camera.
        .to(hero, {
          spin: Math.ceil(hero.spin / fullTurn) * fullTurn,
          duration: 0.9,
          ease: "power2.inOut",
        })
        // 2. The mountain band wipes across the eyes, with a flash.
        .addLabel("wipe", 0.7)
        .to(hero, { bandReveal: 1, duration: 0.65, ease: "power3.inOut" }, "wipe")
        .to(hero, { flash: 1, duration: 0.12, ease: "power1.in" }, "wipe+=0.35")
        .to(hero, { flash: 0, duration: 0.55 }, "wipe+=0.47")
        .to(".hero-flash", { opacity: 0.7, duration: 0.12, ease: "power1.in" }, "wipe+=0.35")
        .to(".hero-flash", { opacity: 0, duration: 0.5 }, "wipe+=0.47")
        // 3. Loader slides away while the statue moves to its place in the poster.
        .addLabel("slide", "wipe+=0.8")
        .to(".loader", { yPercent: -100, duration: 0.95, ease: "power4.inOut" }, "slide")
        .to(hero, { loaderPose: 0, duration: 1.15, ease: "power3.inOut" }, "slide")
        .add(() => setLoaderGone(true), "slide+=0.96")
        // 4. BRAND and LAB slam in.
        .fromTo(
          ".brand",
          { scale: 2.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.36, ease: "power4.in" },
          "slide+=0.8",
        )
        .to(".hero-headline", { keyframes: { x: [0, -8, 6, -3, 0], y: [0, 5, -3, 2, 0] }, duration: 0.28, ease: "none" })
        .fromTo(
          ".lab",
          { scale: 3, opacity: 0, rotation: 16 },
          { scale: 1, opacity: 1, rotation: 0, duration: 0.32, ease: "power4.in" },
          "<-0.12",
        )
        .addLabel("slam")
        .to(".hero-headline", { keyframes: { x: [0, 9, -6, 3, 0], y: [0, -4, 4, -2, 0] }, duration: 0.3, ease: "none" }, "slam")
        // 5. Yellow circle scales up, scraps pop in, the bulb lights.
        .fromTo(".circle", { scale: 0 }, { scale: 1, duration: 0.9, ease: "back.out(1.5)" }, "slam")
        .fromTo(
          ".intro-pop",
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, stagger: 0.05, ease: "back.out(1.8)" },
          "slam+=0.1",
        )
        .add(() => setBulbOn(true), "slam+=0.5")
        .fromTo(
          ".intro-cloud",
          { opacity: 0, xPercent: -18 },
          { opacity: 1, xPercent: 0, duration: 1, stagger: 0.12 },
          "slam+=0.15",
        )
        .fromTo(
          ".intro-rise",
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.07 },
          "slam+=0.1",
        )
        .add(() => setPhase("ready"));
    }, root);
  }, []);

  return (
    <>
      <section ref={root} className={`hero${reduced ? " hero--static" : ""}`} aria-label="Brand Lab">
        <SvgFilters />

        <div className="hero-pin">
          {/* ---------- paper, grid, torn corners ---------- */}
          <div className="hero-paper" aria-hidden />
          <TornCorners />

          {/* ---------- circle, bulb, scraps (behind) + clouds (in front) ---------- */}
          <ParallaxLayers stageRef={stage} lit={settled || bulbOn} failed={failed} reduced={reduced} />

          {/* ---------- 3D statue ---------- */}
          <div className="hero-canvas" style={{ zIndex: showLoader ? 6 : 2 }} aria-hidden>
            {!failed && (
              <StatueScene
                stageRef={stage}
                mobile={mobile}
                reduced={reduced}
                onReady={handleSceneReady}
                onError={handleSceneError}
              />
            )}
          </div>

          {/* ---------- top bar ---------- */}
          <header className="hero-chrome hero-topbar">
            <div className="hero-logos intro-rise">
              <div className="hero-logo-row">
                {IEEE_LOGOS.map((logo, index) => (
                  <Fragment key={logo.src}>
                    {index > 0 && <span className="hero-rule" aria-hidden />}
                    <Image {...logo} alt={logo.alt} loading="eager" />
                  </Fragment>
                ))}
              </div>
              <span className="hero-rule hero-rule--break" aria-hidden />
              <div className="hero-logo-row">
                <Image {...SUAS_LOGO} alt={SUAS_LOGO.alt} loading="eager" />
              </div>
            </div>
            <p className="hero-sidenote intro-rise" aria-hidden>
              Words
              <br />
              Ideas
              <br />
              Designs
              <br />
              Identities
            </p>
          </header>

          {/* ---------- headline ---------- */}
          <div className="hero-copy">
            <h1 className="hero-headline" aria-label="Brand Lab">
              <span className="brand-wrap" aria-hidden>
                <span className="brand">BRAND</span>
              </span>
              <span className="lab-wrap" aria-hidden>
                <span className="lab">LAB</span>
              </span>
            </h1>
            <p className="tagline intro-rise">
              Think it. <mark>Name it.</mark> <em>Brand it.</em>
            </p>
            <p className="hero-blurb intro-rise">A creative challenge where ideas turn into identities.</p>
          </div>

          {/* ---------- bottom strip ---------- */}
          <footer className="hero-chrome hero-strip">
            <ul className="hero-facts intro-rise">
              <li>
                <CalendarIcon />
                <span>
                  Tuesday
                  <br />
                  <b>13 October 2026</b>
                </span>
              </li>
              <li>
                <PinIcon />
                <span>
                  Engineering
                  <br />
                  <b>Block, SUAS</b>
                </span>
              </li>
              <li>
                <PeopleIcon />
                <span>
                  Individual
                  <br />
                  <b>Participation (1-2)</b>
                </span>
              </li>
            </ul>
            <EventCta className="intro-rise" />
          </footer>

          {/* ---------- loader + transition overlays ---------- */}
          {showLoader && <Loader ready={sceneReady || failed} onDone={playIntro} />}
          <div className="hero-flash" aria-hidden />
          <div className="hero-mountain-end" aria-hidden />
        </div>

        {/* Without JS there is no intro to wait for. */}
        <noscript>
          <style>{`.loader{display:none}`}</style>
        </noscript>
      </section>

    </>
  );
}
