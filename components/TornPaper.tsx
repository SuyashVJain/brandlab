/**
 * Torn black paper corners and the shared SVG filters that give flat shapes a
 * rough, hand-made edge. Everything here is static decoration.
 */

/** Small seeded PRNG so server and client generate identical tears. */
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
 * A corner piece in a 100x100 box: it fills the top-left corner and its
 * diagonal edge is ragged. `reach` (0..1) scales how far it extends.
 */
function tornCornerPath(seed: number, reach = 1, steps = 36) {
  const random = mulberry32(seed);
  const points = ["0,0", `${(100 * reach).toFixed(2)},0`];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const edge = i === 0 || i === steps ? 0 : 1;
    // Concave sweep from the top edge to the left edge, plus a slow wave and jitter.
    const wave = Math.sin(t * Math.PI * 3 + seed) * 2.4 * edge;
    const jitter = (random() - 0.5) * 6 * edge;
    const x = 100 * reach * Math.pow(1 - t, 1.7) + wave + jitter;
    const y = 100 * reach * Math.pow(t, 1.7) + wave + jitter * 0.8;
    points.push(`${Math.max(0, x).toFixed(2)},${Math.max(0, y).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

const CORNERS = [
  { name: "tl", seed: 11 },
  { name: "tr", seed: 23 },
  { name: "bl", seed: 37 },
  { name: "br", seed: 53 },
] as const;

export function TornCorners() {
  return (
    <>
      {CORNERS.map(({ name, seed }) => (
        <div key={name} className={`torn torn--${name}`} data-depth="0.12" aria-hidden>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* White lip of the tear showing under the black sheet. */}
            <path d={tornCornerPath(seed + 100)} fill="#f8f6f1" />
            <path d={tornCornerPath(seed, 0.93)} fill="#0A0A0A" />
          </svg>
        </div>
      ))}
    </>
  );
}

/** Referenced from CSS as filter: url(#rough-edge) / url(#brush-streaks) / url(#cloud). */
export function SvgFilters() {
  return (
    <svg className="svg-defs" width="0" height="0" aria-hidden focusable="false">
      <defs>
        {/* Wobbly outline for brush-stroke blocks (button, paint dabs). */}
        <filter id="rough-edge" x="-6%" y="-30%" width="112%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.14" numOctaves="3" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Brush streaks for LAB: rough outline, then streaks scraped out along the stroke. */}
        <filter id="brush-streaks" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="7" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="7" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.5" numOctaves="2" seed="3" result="streaks" />
          <feColorMatrix in="streaks" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 16 -10.7" result="gaps" />
          <feComposite in="rough" in2="gaps" operator="out" />
        </filter>

        {/* Turns a few soft ellipses into a billowy cloud. */}
        <filter id="cloud" x="-30%" y="-40%" width="160%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.026" numOctaves="5" seed="9" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="62" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
    </svg>
  );
}
