import { tornStripPath } from "@/lib/torn";

/**
 * Torn strip of black paper laid across the seam between the hero and this
 * section. Its top edge overlaps the hero's last frame; the rest sits on the paper.
 */
export default function TornEdge() {
  return (
    <div className="torn-edge" aria-hidden>
      <svg viewBox="0 0 1200 100" preserveAspectRatio="none">
        {/* Pale lip of the tear, peeking out above and below the black sheet. */}
        <path d={tornStripPath(41, 16, 88, 8)} fill="#f8f6f1" />
        <path d={tornStripPath(7, 27, 76, 10)} fill="#0A0A0A" />
      </svg>
    </div>
  );
}
