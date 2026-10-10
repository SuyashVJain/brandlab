import type { CSSProperties, ReactNode } from "react";
import { tornClip } from "@/lib/torn";
import "./shared.css";

/** Section heading in the display face, with a yellow highlight swipe behind one word. */
export function SectionTitle({ before, highlight }: { before: string; highlight: string }) {
  return (
    <h2 className="section-title" data-reveal>
      {before}{" "}
      <span className="swipe">
        <span className="swipe-ink" data-swipe aria-hidden />
        {highlight}
      </span>
    </h2>
  );
}

/** A scrap of lighter paper with ragged edges and a soft shadow. */
export function TornPanel({
  seed,
  className = "",
  style,
  children,
}: {
  seed: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`torn-panel ${className}`} style={style}>
      <div className="torn-panel-body" style={{ clipPath: tornClip(seed) }}>
        {children}
      </div>
    </div>
  );
}

/** Visible marker for content that is not decided yet (see docs/CONTENT.md). */
export function TbdTag({ large = false }: { large?: boolean }) {
  return (
    <span className={`tbd-tag${large ? " tbd-tag--large" : ""}`} title="To be decided">
      TBD
    </span>
  );
}

/** Small "+" registration mark, as on the poster. */
export function Crosshair({ className = "" }: { className?: string }) {
  return <span className={`crosshair ${className}`} aria-hidden />;
}
