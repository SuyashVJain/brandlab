/**
 * Hand-drawn artwork for the "How it works" cards. Everything is plain SVG
 * strokes in ink, so no extra font or image is needed.
 */

/** Pen strokes for each digit, drawn in a 34 x 60 cell. */
const DIGITS: Record<string, string> = {
  "0": "M19 8C8 9 3 26 6 41C9 55 23 55 28 40C33 24 30 7 18 9",
  "1": "M6 20L20 7L16 54",
  "2": "M5 18C8 5 29 4 28 20C27 34 11 42 4 54L31 51",
  "3": "M5 11C15 4 31 8 24 22C21 28 15 29 12 29C24 29 34 39 25 49C19 55 8 54 4 47",
};

/** Marker-style step number ("01") on a yellow swipe. */
export function StepNumber({ value }: { value: string }) {
  return (
    <span className="how-num" aria-hidden>
      <span className="how-num-swipe" />
      <svg viewBox="0 0 84 62" fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Slanted like quick handwriting. */}
        <g transform="skewX(-10) translate(10 0)">
          {value.split("").map((digit, index) => (
            <path key={index} d={DIGITS[digit]} transform={`translate(${index * 38} 0)`} />
          ))}
        </g>
      </svg>
    </span>
  );
}

export type IconName = "bulb" | "pencil" | "image";

const ICONS: Record<IconName, string[]> = {
  bulb: [
    "M32 8C19 8 11 18 12 29C13 37 18 40 20 46L43 45C45 39 51 36 52 28C53 17 44 8 32 8Z",
    "M23 52L41 51",
    "M26 58L38 57",
    "M27 45L26 33L32 27L37 33L37 45",
  ],
  pencil: [
    "M44 8L56 20L24 52L9 56L12 41Z",
    "M38 14L50 26",
    "M12 41L24 52",
    "M9 56L15 50",
  ],
  image: [
    "M8 13L55 11L57 51L9 53Z",
    "M10 45L24 30L33 40L41 33L56 46",
    "M43 23m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
  ],
};

/** Small ink icon for a step. */
export function StepIcon({ name }: { name: IconName }) {
  return (
    <svg className="how-icon" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * Hand-drawn arrow between two cards. pathLength="1" lets the scroll reveal
 * draw both strokes with a simple dash offset.
 */
export function StepArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      className={`how-arrow-art${flip ? " how-arrow-art--flip" : ""}`}
      viewBox="0 0 66 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path data-draw pathLength={1} strokeDasharray={1} d="M4 34C16 10 40 6 59 24" />
      <path data-draw pathLength={1} strokeDasharray={1} d="M46 23L60 25L57 11" />
    </svg>
  );
}
