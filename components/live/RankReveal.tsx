"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { ResultsData, RevealedEntry } from "@/lib/results";
import { isImagePoster } from "@/lib/submit-schema";
import { tornClip } from "@/lib/torn";

/** Paper pieces in the rank 1 burst. */
const CONFETTI = 44;
const CONFETTI_PIECES = Array.from({ length: CONFETTI }, (_, index) => index);
/** How long the old card takes to leave before the next one enters. */
const EXIT_SECONDS = 0.28;
/** The public answer can lag the state by a moment (edge cache), so ask again a few times. */
const RETRY_MS = 700;
const MAX_TRIES = 6;

/**
 * How big each reveal plays.
 *   top    rank 1: flash, confetti, the bulb lights up, the longest pauses
 *   medium ranks 2 and 3
 *   calm   rank 4 and below: short and quiet
 */
type Tier = "top" | "medium" | "calm";
const tierOf = (rank: number): Tier => (rank === 1 ? "top" : rank <= 3 ? "medium" : "calm");

const TIMING: Record<Tier, { dim: number; wipe: number; drum: number; slamFrom: number; slam: number; hold: number; letter: number }> = {
  top: { dim: 0.6, wipe: 0.8, drum: 0.55, slamFrom: 3.4, slam: 0.42, hold: 1.5, letter: 0.07 },
  medium: { dim: 0.5, wipe: 0.65, drum: 0.25, slamFrom: 2.4, slam: 0.36, hold: 0.75, letter: 0.05 },
  calm: { dim: 0.35, wipe: 0.45, drum: 0, slamFrom: 1.3, slam: 0.3, hold: 0.25, letter: 0.03 },
};

type Shown = { entry: RevealedEntry; nonce: number };

type RankRevealProps = {
  /** The rank to reveal; 0 hides the reveal. */
  rank: number;
  /** Changes on every admin save: the same rank with a new nonce plays again. */
  nonce: number;
  /** "stage": the full reveal over the 3D stage. "simple": one fade (reduced motion, or no 3D). */
  mode: "stage" | "simple";
  /** Rank 1 lights the stage bulb. */
  onSpotlight?: (on: boolean) => void;
};

/**
 * The rank reveal on /live. Loads the ONE team at the revealed rank from
 * /api/results and plays it in over the stage; a new rank or nonce sends the
 * old card out first, and rank 0 clears it.
 */
export default function RankReveal({ rank, nonce, mode, onSpotlight }: RankRevealProps) {
  const root = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  // Load the team for this rank and nonce. Whatever is on screen exits first.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let exit: gsap.core.Tween | undefined;
    const controller = new AbortController();

    /** Sends the current card out, then swaps in `next` (null = nothing). */
    const swap = (next: Shown | null) => {
      const element = root.current;
      const finish = () => {
        if (alive) setShown(next);
      };
      if (!element) return finish();
      exit = gsap.to(element, { opacity: 0, duration: EXIT_SECONDS, ease: "power2.in", onComplete: finish });
    };

    const load = (tries: number) => {
      fetch(`/api/results?n=${nonce}`, { cache: "no-store", signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<ResultsData>) : Promise.reject(new Error("bad status"))))
        .then((result) => {
          if (!alive) return;
          if (result.published && result.rank === rank) return swap({ entry: result, nonce });
          throw new Error("not this rank yet");
        })
        .catch(() => {
          if (!alive) return;
          if (tries < MAX_TRIES) timer = setTimeout(() => load(tries + 1), RETRY_MS);
          else swap(null);
        });
    };

    if (rank > 0) load(1);
    else timer = setTimeout(() => swap(null), 0);

    return () => {
      alive = false;
      clearTimeout(timer);
      controller.abort();
      exit?.kill();
    };
  }, [rank, nonce]);

  const playing = shown?.nonce;
  const tier = shown ? tierOf(shown.entry.rank) : "calm";

  // The reveal itself: one timeline per card, rebuilt for every new nonce.
  useLayoutEffect(() => {
    const element = root.current;
    if (playing === undefined || !element) return;

    const context = gsap.context(() => {
      gsap.set(element, { opacity: 1 });

      if (mode === "simple") {
        gsap.from(element, { opacity: 0, duration: 0.5, ease: "power1.out" });
        return;
      }

      const time = TIMING[tier];
      const timeline = gsap.timeline();

      // a) the stage dims (LiveScene pushes the statue back with the is-ranking class).
      timeline.from(".rank-dim", { opacity: 0, duration: time.dim, ease: "power2.out" }, 0);

      // b) the torn strip wipes across the screen.
      timeline.fromTo(
        ".rank-strip",
        { clipPath: "inset(0% 100% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: time.wipe, ease: "power3.inOut", clearProps: "clipPath" },
        time.dim * 0.4,
      );

      // c) the numeral slams in over the yellow circle.
      const slam = time.dim * 0.4 + time.wipe + time.drum;
      timeline.from(".rank-circle", { scale: 0, duration: 0.5, ease: "power3.out" }, slam - 0.35);
      timeline.from(".rank-numeral", { scale: time.slamFrom, opacity: 0, duration: time.slam, ease: "power4.in" }, slam);
      const hit = slam + time.slam;
      if (tier !== "calm") {
        // The hit: a short shake that settles (no bounce).
        const kick = tier === "top" ? 16 : 8;
        timeline.to(
          ".rank-card",
          { keyframes: { x: [kick, -kick * 0.6, kick * 0.3, -kick * 0.12, 0] }, duration: 0.4, ease: "none" },
          hit,
        );
      }

      // e) rank 1 only: white flash, paper confetti, and the bulb lights up.
      if (tier === "top") {
        timeline.fromTo(".rank-flash", { opacity: 0.95 }, { opacity: 0, duration: 0.7, ease: "power2.out" }, hit);
        timeline.call(() => onSpotlight?.(true), undefined, hit);
        gsap.utils.toArray<HTMLElement>(".rank-confetti > i").forEach((piece) => {
          const angle = gsap.utils.random(-Math.PI, 0);
          const reach = gsap.utils.random(0.25, 1);
          const x = Math.cos(angle) * reach * window.innerWidth * 0.55;
          const peak = Math.sin(angle) * reach * window.innerHeight * 0.5;
          const life = gsap.utils.random(2.2, 3.4);
          gsap.set(piece, { scale: gsap.utils.random(0.6, 1.5), rotation: gsap.utils.random(0, 360) });
          timeline
            .set(piece, { opacity: 1 }, hit)
            .to(piece, { x, duration: life, ease: "power2.out" }, hit)
            .to(piece, { y: peak, duration: life * 0.3, ease: "power2.out" }, hit)
            .to(piece, { y: window.innerHeight * 0.7, duration: life * 0.7, ease: "power1.in" }, hit + life * 0.3)
            .to(piece, { rotation: `+=${gsap.utils.random(-540, 540)}`, duration: life, ease: "none" }, hit)
            .to(piece, { opacity: 0, duration: 0.4, ease: "none" }, hit + life - 0.4);
        });
      }

      // d) the poster drops in pinned at a slight tilt, then the event name, then the names.
      const drop = hit + time.hold;
      timeline.from(
        ".rank-poster",
        { yPercent: -130, rotation: tier === "calm" ? -4 : -12, opacity: 0, duration: tier === "calm" ? 0.45 : 0.6, ease: "power3.out" },
        drop,
      );
      timeline.from(".rank-pin", { scale: 0, duration: 0.2, ease: "power2.out" }, ">-0.05");
      timeline.from(
        ".rank-letter",
        { opacity: 0, yPercent: 60, duration: 0.3, ease: "power3.out", stagger: time.letter },
        ">+0.1",
      );
      // "Typed": the name tape rolls out, then each character switches on in turn.
      timeline.from(".rank-names", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.3, ease: "power3.out" }, ">+0.1");
      timeline.from(".rank-char", { opacity: 0, duration: 0.01, stagger: 0.04 }, ">");
    }, element);

    return () => {
      context.revert();
      onSpotlight?.(false);
    };
  }, [playing, tier, mode, onSpotlight]);

  if (!shown) return null;
  const { entry } = shown;
  const numeral = String(entry.rank).padStart(2, "0");
  const names = entry.partner ? `${entry.name} & ${entry.partner}` : entry.name;

  return (
    <div ref={root} className={`rank-reveal rank-reveal--${mode} rank-reveal--${tier}`} role="status" aria-live="polite">
      <div className="rank-dim" aria-hidden />

      <div className="rank-strip" aria-hidden>
        <div className="live-band-paper" style={{ clipPath: tornClip(521, 9) }}>
          <div className="live-band-photo" style={{ clipPath: tornClip(547, 9) }}>
            <div className="live-band-img" />
          </div>
        </div>
      </div>

      <div key={shown.nonce} className="rank-card">
        <div className="rank-side">
          <div className="rank-badge">
            <div className="rank-circle circle" aria-hidden />
            <p className="rank-numeral" aria-label={`Rank ${entry.rank}`}>
              {numeral}
            </p>
          </div>
          <h2 className="rank-event" aria-label={entry.event_name}>
            {entry.event_name.split(/\s+/).map((word, at) => (
              <span key={at} className="rank-word" aria-hidden>
                {Array.from(word).map((letter, index) => (
                  <span key={index} className="rank-letter">
                    {letter}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <p className="rank-names" aria-label={names}>
            {Array.from(names).map((character, index) => (
              <span key={index} className="rank-char" aria-hidden>
                {character}
              </span>
            ))}
          </p>
        </div>

        <div className="rank-poster">
          <span className="rank-pin" aria-hidden />
          {isImagePoster(entry.poster_url) ? (
            // eslint-disable-next-line @next/next/no-img-element -- participant upload on Vercel Blob, shown as is
            <img src={entry.poster_url} alt={`Poster for ${entry.event_name}`} />
          ) : (
            <a className="rank-pdf" href={entry.poster_url} target="_blank" rel="noopener noreferrer">
              Open the poster (PDF)
            </a>
          )}
        </div>
      </div>

      <div className="rank-confetti" aria-hidden>
        {tier === "top" && CONFETTI_PIECES.map((piece) => <i key={piece} />)}
      </div>
      <div className="rank-flash" aria-hidden />
    </div>
  );
}
