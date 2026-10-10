"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMediaQuery } from "@/lib/useMediaQuery";

/**
 * Scroll reveals for a section, driven by data attributes so the markup stays
 * readable. Inside `root`, every [data-reveal-batch] element is one trigger;
 * when it scrolls into view its descendants animate:
 *
 *   [data-reveal]  rise 32px + fade, staggered by 0.08s
 *   [data-swipe]   highlight swipe wipes in from the left
 *   [data-draw]    SVG path draws itself (needs pathLength="1")
 *   [data-fill]    bar grows from the left
 *
 * Batches must not be nested. With prefers-reduced-motion nothing is set up,
 * so everything simply shows in its final state.
 */
export function useScrollReveal(root: RefObject<HTMLElement | null>) {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (reduced || !root.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal-batch]").forEach((batch) => {
        const timeline = gsap.timeline({
          defaults: { ease: "power2.out" },
          scrollTrigger: { trigger: batch, start: "top 82%", once: true },
        });

        const items = batch.querySelectorAll("[data-reveal]");
        const swipes = batch.querySelectorAll("[data-swipe]");
        const paths = batch.querySelectorAll("[data-draw]");
        const bars = batch.querySelectorAll("[data-fill]");

        if (items.length) {
          timeline.from(items, { y: 32, opacity: 0, duration: 0.75, stagger: 0.08 }, 0);
        }
        if (swipes.length) {
          timeline.from(swipes, { scaleX: 0, transformOrigin: "0% 50%", duration: 0.6, ease: "power3.out" }, 0.15);
        }
        if (paths.length) {
          timeline.from(paths, { strokeDashoffset: 1, duration: 0.7, stagger: 0.12, ease: "power1.inOut" }, 0.35);
        }
        if (bars.length) {
          timeline.from(bars, { scaleX: 0, transformOrigin: "0% 50%", duration: 0.9, stagger: 0.08, ease: "power3.out" }, 0.2);
        }
      });
    }, root);

    // revert() restores the elements and kills every ScrollTrigger created above.
    return () => context.revert();
  }, [reduced, root]);
}
