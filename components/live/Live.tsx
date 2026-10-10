"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import TornEdge from "@/components/how-it-works/TornEdge";
import { siteContent } from "@/lib/site-content";
import { useMediaQuery } from "@/lib/useMediaQuery";
import RankReveal from "./RankReveal";
import Revealed from "./Revealed";
import { useEventState } from "./useEventState";
import "@/components/shared/shared.css";
import "@/components/how-it-works/how-it-works.css"; // styles for the torn strip
import "./live.css";

// Desktop only: the hero's 3D statue scene. A separate chunk, so phones never download three.js.
const LiveScene = dynamic(() => import("./LiveScene"), {
  ssr: false,
  loading: () => <div className="live-scene-loading" aria-hidden />,
});

/**
 * The public keyword reveal screen. No login and no participant code.
 *   waiting   -> "Stand by"
 *   countdown -> seconds to the reveal, on the server clock
 *   revealed  -> the keywords (animated only if this page watched them arrive)
 * On desktop the same three states play over the hero's statue scene (LiveScene).
 */
export default function Live() {
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const { data, seconds, reconnecting, animate } = useEventState();
  const reporting = siteContent.timeline[0].note;

  // Desktop with a mouse and normal motion gets the statue scene. Phones,
  // tablets and reduced motion keep the plain screen below, and so does any
  // device where WebGL or the model fails.
  const desktop = useMediaQuery("(min-width: 821px) and (pointer: fine)");
  const [sceneFailed, setSceneFailed] = useState(false);
  const failScene = useCallback(() => setSceneFailed(true), []);

  if (desktop && !reduced && !sceneFailed) {
    return (
      <>
        <LiveScene data={data} seconds={seconds} animate={animate} onFail={failScene} />
        {reconnecting && (
          <p className="live-note" role="status">
            Reconnecting...
          </p>
        )}
      </>
    );
  }

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
      {/* Desktop without the 3D stage (reduced motion, or WebGL failed): the rank reveal as a simple fade. Phones are unchanged. */}
      {desktop && (
        <RankReveal
          rank={data?.phase === "results" ? (data.revealedRank ?? 0) : 0}
          nonce={data?.revealNonce ?? 0}
          mode="simple"
        />
      )}
      {reconnecting && (
        <p className="live-note" role="status">
          Reconnecting...
        </p>
      )}
    </section>
  );
}
