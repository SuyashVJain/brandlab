"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import type { Phase } from "@/lib/admin-schema";
import { tornClip } from "@/lib/torn";

type RevealedProps = {
  keywords: string[];
  phase: Phase;
  /** Play the one-by-one reveal. False when the page was opened after the reveal, or with reduced motion. */
  animate: boolean;
};

/** The keywords: big on a torn mountain strip, then pinned in a bar at the top of the screen. */
export default function Revealed({ keywords, phase, animate }: RevealedProps) {
  const root = useRef<HTMLDivElement>(null);
  // The bar would give the words away, so it waits for the reveal to finish.
  const [barVisible, setBarVisible] = useState(!animate);

  useLayoutEffect(() => {
    if (!animate) return;
    const context = gsap.context(() => {
      gsap
        .timeline({ onComplete: () => setBarVisible(true) })
        // The torn strip wipes in from the left...
        .fromTo(
          ".live-band",
          { clipPath: "inset(0% 100% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.6, ease: "power3.inOut", clearProps: "clipPath" },
        )
        // ...then the keywords land one by one, 0.5s apart.
        .from(
          ".live-word",
          { opacity: 0, y: 36, scale: 1.25, duration: 0.45, ease: "power3.out", stagger: 0.5 },
          "+=0.1",
        );
    }, root);
    return () => context.revert();
  }, [animate]);

  return (
    <div ref={root} className="live-revealed">
      {barVisible && (
        <div className="live-bar" role="region" aria-label="Keywords">
          <span className="live-bar-label">Keywords</span>
          {keywords.map((word) => (
            <span key={word}>{word}</span>
          ))}
        </div>
      )}

      <p className="eyebrow">Your keywords</p>

      <div className="live-band">
        <div className="live-band-paper" style={{ clipPath: tornClip(301, 9) }}>
          <div className="live-band-photo" style={{ clipPath: tornClip(317, 9) }}>
            {/* Grayscale mountain strip. If the image is missing the dark backing still shows. */}
            <div className="live-band-img" aria-hidden />
            <ol className="live-words">
              {keywords.map((word) => (
                <li key={word} className="live-word">
                  <span className="swipe">
                    <span className="swipe-ink" aria-hidden />
                    {word}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="live-next">
        <p className="eyebrow">What to do now</p>
        <p className="live-next-line">Create a unique event name, then design a poster.</p>

        {phase === "submissions_open" && (
          <span className="live-soon" aria-disabled="true">
            Submissions open soon, link appears here
          </span>
        )}
        {phase === "submissions_closed" && <p className="live-flag">Submissions are closed</p>}
        {phase === "results" && <p className="live-flag">Results are being announced</p>}
      </div>
    </div>
  );
}
