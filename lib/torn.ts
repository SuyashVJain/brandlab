/**
 * Torn-paper shapes for the sections below the hero.
 * Everything is generated from a seed, so the server and the browser produce
 * exactly the same markup.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * CSS clip-path for a paper scrap: ragged top and bottom, slightly uneven
 * sides. Offsets are in px so a tall panel does not get deeper tears.
 */
export function tornClip(seed: number, rough = 7): string {
  const random = mulberry32(seed);
  const bite = (max: number) => (random() * max).toFixed(1);
  const points: string[] = [];
  const long = 28;
  const short = 9;

  for (let i = 0; i <= long; i++) points.push(`${((i / long) * 100).toFixed(1)}% ${bite(rough)}px`);
  for (let i = 1; i < short; i++) points.push(`calc(100% - ${bite(rough / 2)}px) ${((i / short) * 100).toFixed(1)}%`);
  for (let i = long; i >= 0; i--) points.push(`${((i / long) * 100).toFixed(1)}% calc(100% - ${bite(rough)}px)`);
  for (let i = short - 1; i >= 1; i--) points.push(`${bite(rough / 2)}px ${((i / short) * 100).toFixed(1)}%`);

  return `polygon(${points.join(", ")})`;
}

/**
 * SVG path for a horizontal torn strip inside a 1200 x 100 box.
 * `top` and `bottom` are the resting heights of its two ragged edges.
 */
export function tornStripPath(seed: number, top: number, bottom: number, rough = 9): string {
  const random = mulberry32(seed);
  const steps = 90;
  const edge = (base: number, phase: number, i: number) =>
    base + Math.sin((i / steps) * Math.PI * 5 + phase) * rough * 0.6 + (random() - 0.5) * rough * 2;

  const upper: string[] = [];
  const lower: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = ((i / steps) * 1200).toFixed(1);
    upper.push(`${x},${edge(top, seed, i).toFixed(1)}`);
    lower.push(`${x},${edge(bottom, seed * 1.7, i).toFixed(1)}`);
  }
  return `M${upper.join("L")}L${lower.reverse().join("L")}Z`;
}
