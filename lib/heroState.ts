/**
 * Shared, mutable animation state for the hero.
 *
 * GSAP tweens these numbers and the per-frame loops (react-three-fiber's
 * useFrame and the DOM parallax ticker) read them. Keeping them outside React
 * means animating never triggers a re-render.
 */

export const ASSETS = {
  model: "/models/statue.glb",
  mountain: "/textures/mountain.jpg",
} as const;

/** Resting values for the mountain slice. Units are statue heights (the head is 1 unit tall, centred on 0). */
export const SLICE = {
  /** Height of the band centre, i.e. the eye line. */
  bandPosition: 0.14,
  /** Band thickness before the scroll opens it up. */
  bandWidth: 0.15,
  /** Band angle in radians; positive rises to the right. */
  bandTilt: 0.3,
  /** Extra UV shift of the mountain image inside the band. */
  mountainOffset: [0, 0.04] as [number, number],
};

export const hero = {
  /** Raw pointer position, -1..1 (x right, y down). */
  pointerX: 0,
  pointerY: 0,
  /** Lerp-smoothed pointer, used by both the 3D tilt and the DOM parallax. */
  mouseX: 0,
  mouseY: 0,
  /** Progress through the pinned scroll, 0..1. */
  scroll: 0,

  /** True while the loader is counting up. */
  loading: true,
  /** Scan line height, 0 (bottom) .. 1 (top). Below it the statue is solid marble. */
  scan: 0,
  /** Loader turntable rotation in radians. */
  spin: 0,
  /** 1 = centred, front-facing loader pose; 0 = hero pose. */
  loaderPose: 1,
  /** Mountain band wipe, 0 hidden .. 1 fully across. */
  bandReveal: 0,
  /** Brightness burst on the band. */
  flash: 0,

  bandPosition: SLICE.bandPosition,
  bandWidth: SLICE.bandWidth,
  bandTilt: SLICE.bandTilt,
  mountainOffsetX: SLICE.mountainOffset[0],
  mountainOffsetY: SLICE.mountainOffset[1],
};

/**
 * Put the state at the start of the intro, or (finalState) straight at the
 * finished hero for prefers-reduced-motion.
 */
export function resetHero(finalState: boolean) {
  hero.pointerX = hero.pointerY = hero.mouseX = hero.mouseY = 0;
  hero.scroll = 0;
  hero.spin = 0;
  hero.flash = 0;
  hero.loading = !finalState;
  hero.scan = finalState ? 1 : 0;
  hero.loaderPose = finalState ? 0 : 1;
  hero.bandReveal = finalState ? 1 : 0;
}
