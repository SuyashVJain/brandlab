"use client";

import TornEdge from "@/components/how-it-works/TornEdge";
import { siteContent } from "@/lib/site-content";
import { useMediaQuery } from "@/lib/useMediaQuery";
import Revealed from "./Revealed";
import { useEventState } from "./useEventState";
import "@/components/shared/shared.css";
import "@/components/how-it-works/how-it-works.css"; // styles for the torn strip
import "./live.css";

/**
 * The public keyword reveal screen. No login and no participant code.
 *   waiting   -> "Stand by"
 *   countdown -> seconds to the reveal, on the server clock
 *   revealed  -> the keywords (animated only if this page watched them arrive)
 */
export default function Live() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { data, seconds, reconnecting, animate } = useEventState();
  const reporting = siteContent.timeline[0].note;

  let view;
  if (data?.keywords) {
    view = (
      <Revealed
        key={data.keywords.join("\n")}
        keywords={data.keywords}
        phase={data.phase}
        animate={animate && !reduced}
      />
    );
  } else if (seconds !== null) {
    view = (
      <div className="live-countdown">
        <p className="eyebrow">{seconds > 0 ? "Keywords in" : "Here they come"}</p>
        <p className="live-count" role="timer" aria-label={`${seconds} seconds`}>
          <span className="swipe">
            <span className="swipe-ink" aria-hidden />
            {seconds}
          </span>
        </p>
      </div>
    );
  } else if (!data && !reconnecting) {
    // First answer not in yet. Kept neutral so a page opened after the reveal never flashes "Stand by".
    view = <p className="eyebrow">Connecting...</p>;
  } else {
    view = (
      <div className="live-wait">
        <h1 className="section-title">
          Stand{" "}
          <span className="swipe">
            <span className="swipe-ink" aria-hidden />
            by
          </span>
        </h1>
        <p className="tagline">
          Think it. <mark>Name it.</mark> <em>Brand it.</em>
        </p>
        <p className="live-line">Keywords appear here the moment the event starts.</p>
        {reporting && <p className="eyebrow live-reporting">Reporting {reporting}</p>}
      </div>
    );
  }

  return (
    <section className="sheet live" aria-label="Live">
      <div className="hero-paper" aria-hidden />
      <TornEdge />
      <div className="sheet-inner">{view}</div>
      {reconnecting && (
        <p className="live-note" role="status">
          Reconnecting...
        </p>
      )}
    </section>
  );
}
