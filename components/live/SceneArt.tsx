/**
 * Cloud and lightbulb for the /live stage. Same drawings and class names as
 * the hero's (so they pick up the hero's styles and the shared #cloud filter);
 * they are repeated here because the hero's versions are private to its own
 * parallax component and carry its layout.
 */

export function StageCloud({ className = "" }: { className?: string }) {
  return (
    <svg className={`cloud stage-cloud ${className}`} viewBox="0 0 400 240" aria-hidden>
      <defs>
        <linearGradient id="stage-cloud-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.25" stopColor="#ffffff" />
          <stop offset="1" stopColor="#a9acb3" />
        </linearGradient>
      </defs>
      {/* Three passes: dark underside, grey body, bright top. */}
      <g filter="url(#cloud)" fill="#6f737b" opacity="0.85">
        <ellipse cx="205" cy="160" rx="120" ry="26" />
      </g>
      <g filter="url(#cloud)" fill="url(#stage-cloud-body)">
        <ellipse cx="200" cy="140" rx="128" ry="38" />
        <ellipse cx="150" cy="108" rx="60" ry="44" />
        <ellipse cx="246" cy="116" rx="54" ry="36" />
        <ellipse cx="96" cy="140" rx="40" ry="26" />
      </g>
      <g filter="url(#cloud)" fill="#ffffff">
        <ellipse cx="165" cy="96" rx="44" ry="26" />
        <ellipse cx="236" cy="104" rx="36" ry="20" />
      </g>
    </svg>
  );
}

export function StageBulb() {
  return (
    <div className="bulb">
      <span className="bulb-glow" />
      <svg viewBox="0 0 120 190" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g className="bulb-rays" stroke="#0A0A0A" strokeWidth="3">
          <path d="M60 4v16M17 22l10 13M103 22 93 35M2 62l15 5M118 62l-15 5" />
        </g>
        <path
          className="bulb-glass"
          d="M60 34c-24 0-42 18-42 41 0 15 7 25 15 34 6 7 9 13 9 21h36c0-8 3-14 9-21 8-9 15-19 15-34 0-23-18-41-42-41Z"
          stroke="#0A0A0A"
          strokeWidth="3.5"
        />
        <path className="bulb-filament" d="M48 130V98l6-9 6 9 6-9 6 9v32" stroke="#0A0A0A" strokeWidth="2.5" />
        <path d="M42 134h36v30a8 8 0 0 1-8 8H50a8 8 0 0 1-8-8v-30Z" fill="#0A0A0A" />
        <path d="M44 146h32M44 157h32" stroke="#EFECE6" strokeWidth="2.5" />
        <path d="M52 176h16v6a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4v-6Z" fill="#0A0A0A" />
      </svg>
    </div>
  );
}

/** One side of the symmetric backdrop. The right side is this same piece, mirrored in CSS. */
export function StageSide({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <div className={`stage-side${mirrored ? " stage-side--right" : ""}`}>
      <span className="stage-scrap stage-scrap--black" />
      <span className="stage-scrap stage-scrap--blue" />
      <span className="stage-dots" />
      <span className="crosshair stage-cross" />
      <StageCloud className="stage-cloud--low" />
      <StageCloud className="stage-cloud--high" />
    </div>
  );
}
