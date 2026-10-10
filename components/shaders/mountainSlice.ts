import * as THREE from "three";

/**
 * MOUNTAIN SLICE
 *
 * Patches a lit three.js material (MeshStandardMaterial) through
 * onBeforeCompile, so all of the built-in lighting and shadowing stays intact
 * and only the final colour is touched.
 *
 * What it adds:
 *  1. A diagonal band across the eye line with noisy, torn edges. Inside it the
 *     mountain photo is sampled in SCREEN space (it does not wrap around the
 *     head, it reads like a window cut into it), converted to grayscale with
 *     boosted contrast, and shifted by the mouse for parallax.
 *  2. Thin torn white and yellow paper strips along both band edges.
 *  3. A left-to-right wipe + flash used by the intro.
 *  4. A screen-space scan line used by the loader: everything above it is
 *     discarded (the wireframe/point materials below draw that part instead).
 *  5. Faint procedural marble veining.
 *
 * Band coordinates use the statue's baked local space: the geometry is
 * normalised so the head is 1 unit tall and centred on the origin, and the
 * band lives in its XY plane. That keeps the slice glued to the eyes while the
 * head floats, tilts and zooms.
 */

export function createSliceUniforms() {
  return {
    // --- public controls (names requested by the design) ---
    /** Band centre height in statue units (eye line). */
    bandPosition: { value: 0.1 },
    /** Band thickness in statue units. Scroll widens this until it covers the face. */
    bandWidth: { value: 0.17 },
    /** Band angle in radians, positive rises to the right. */
    bandTilt: { value: 0.3 },
    /** UV offset of the mountain image inside the band. */
    mountainOffset: { value: new THREE.Vector2() },

    // --- internals, driven every frame by StatueScene ---
    uMountain: { value: null as THREE.Texture | null },
    /** 0 while the texture is missing: a procedural ridge is drawn instead. */
    uHasMountain: { value: 0 },
    uMountainAspect: { value: 1.5 },
    /** Screen-to-image zoom. Eases to "cover the screen" at the end of the scroll. */
    uMountainScale: { value: 2 },
    /** NDC point the image is centred on (the eyes); eases to screen centre. */
    uAnchor: { value: new THREE.Vector2() },
    /** Smoothed mouse, -1..1, for UV parallax. */
    uMouse: { value: new THREE.Vector2() },
    /** 0 = shaded like paper stuck on the statue, 1 = flat full-screen image. */
    uFlatten: { value: 0 },
    /** Drawing buffer size in pixels. */
    uResolution: { value: new THREE.Vector2(1, 1) },
    /** Intro wipe, 0..1. */
    uReveal: { value: 1 },
    /** Intro flash, 0..1. */
    uFlash: { value: 0 },
    /** Loader scan line as a fraction of screen height. Anything > 1 disables it. */
    uScan: { value: 10 },
    /** Size of the blocky dissolve fringe on the scan line (0 = hard cut, used on mobile). */
    uScanSoft: { value: 0.03 },
  };
}

export type SliceUniforms = ReturnType<typeof createSliceUniforms>;

/** Noise helpers + the shared scan-line coordinate. Prefixed to avoid clashing with three's chunks. */
const NOISE_GLSL = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uScan;
  uniform float uScanSoft;

  float sliceHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float sliceNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(sliceHash(i), sliceHash(i + vec2(1.0, 0.0)), f.x),
      mix(sliceHash(i + vec2(0.0, 1.0)), sliceHash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float sliceFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * sliceNoise(p);
      p = p * 2.03 + 17.1;
      a *= 0.5;
    }
    return v / 0.875;
  }

  // Screen height of this fragment (0 bottom, 1 top), jittered per 3px block so
  // the scan line dissolves instead of cutting cleanly.
  float sliceScanY() {
    float n = sliceHash(floor(gl_FragCoord.xy / 3.0));
    return gl_FragCoord.y / uResolution.y + (n - 0.5) * uScanSoft;
  }
`;

const SLICE_PARS_GLSL = /* glsl */ `
  uniform float bandPosition;
  uniform float bandWidth;
  uniform float bandTilt;
  uniform vec2 mountainOffset;

  uniform sampler2D uMountain;
  uniform float uHasMountain;
  uniform float uMountainAspect;
  uniform float uMountainScale;
  uniform vec2 uAnchor;
  uniform vec2 uMouse;
  uniform float uFlatten;
  uniform float uReveal;
  uniform float uFlash;

  varying vec3 vSlicePos;

  ${NOISE_GLSL}

  // Ragged offset of a torn edge: a slow wobble plus fine paper fibres.
  float sliceTear(float along, float seed) {
    return (sliceFbm(vec2(along * 6.0, seed)) - 0.5) * 0.075
         + (sliceNoise(vec2(along * 70.0, seed + 3.1)) - 0.5) * 0.012;
  }
`;

/** Runs first in main(): the loader scan discards everything above the line. */
const SCAN_DISCARD_GLSL = /* glsl */ `
  if (sliceScanY() > uScan) discard;
`;

/** Runs after the base colour is resolved: subtle veins so the stone is not flat grey. */
const MARBLE_GLSL = /* glsl */ `
  {
    vec3 vp = vSlicePos * 5.0;
    float cloud = sliceFbm(vp.xy + vp.z * 0.7);
    float vein = smoothstep(0.035, 0.0, abs(sliceFbm(vp.xy * 1.3 + cloud * 2.2 + vp.z) - 0.5));
    diffuseColor.rgb *= (0.94 + 0.1 * cloud) * (1.0 - 0.16 * vein);
  }
`;

/**
 * Runs last, on the fully lit, tone-mapped, display-space colour.
 * Colours written here are therefore plain sRGB values.
 */
const SLICE_COMPOSITE_GLSL = /* glsl */ `
  {
    // --- band coordinates -------------------------------------------------
    vec2 rel = vSlicePos.xy - vec2(0.0, bandPosition);
    vec2 dir = vec2(cos(bandTilt), sin(bandTilt));
    float along = dot(rel, dir);                      // distance along the band
    float across = dot(rel, vec2(-dir.y, dir.x));     // distance from its centre line
    float side = step(0.0, across);                   // 0 = lower edge, 1 = upper edge

    // Each edge gets its own tear so the two sides do not mirror each other.
    float halfW = bandWidth * 0.5;
    float top = halfW + sliceTear(along, 1.7);
    float bottom = -halfW + sliceTear(along, 8.2);
    float outside = max(across - top, bottom - across); // < 0 inside the band
    float aa = fwidth(outside) + 1e-5;

    // Paper strips sit just outside the band: white first, yellow peeking out
    // from under it in places.
    float paperW = 0.008 + sliceFbm(vec2(along * 9.0, 21.0 + side * 5.0)) * 0.026;
    float yellowW = paperW
      + max(sliceFbm(vec2(along * 4.0, 40.0 + side * 9.0)) - 0.5, 0.0) * 0.16;

    // --- intro wipe ---------------------------------------------------------
    float front = mix(-0.75, 0.75, uReveal)
      + (sliceNoise(vec2(across * 40.0, 3.0)) - 0.5) * 0.06;
    float wipe = step(along, front) * step(0.001, uReveal);

    // How bright the lit marble is here; reused to shade the paper a little.
    float lit = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));

    // --- mountain, sampled in screen space -----------------------------------
    vec2 ndc = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
    vec2 q = ndc - uAnchor;
    q.x *= uResolution.x / uResolution.y / uMountainAspect;
    vec2 muv = q * uMountainScale * 0.5 + 0.5
      + mountainOffset
      + vec2(-uMouse.x, uMouse.y) * 0.03;             // mouse-driven UV parallax

    float g;
    if (uHasMountain > 0.5) {
      g = dot(texture2D(uMountain, muv).rgb, vec3(0.2126, 0.7152, 0.0722));
    } else {
      // Texture failed to load: draw procedural rock so the band still reads.
      float rock = sliceFbm(muv * vec2(7.0, 12.0));
      float cracks = sliceFbm(muv * vec2(26.0, 40.0) + rock * 3.0);
      g = 0.12 + rock * 0.5 + smoothstep(0.45, 0.7, cracks) * 0.3;
    }
    // Grayscale + contrast boost. Matches the CSS filter on .hero-mountain-end
    // (brightness(1.25) contrast(1.45)) so the final cross-fade is seamless.
    g = clamp((g * 1.25 - 0.5) * 1.45 + 0.5, 0.0, 1.0);

    // Shade it like something recessed under the paper: darker near the torn
    // edges, and following the statue's own lighting a little.
    float shade = mix(0.6, 1.0, smoothstep(0.0, 0.035, -outside)) * mix(0.82, 1.12, lit);
    vec3 sliceCol = vec3(g) * mix(shade, 1.0, uFlatten);

    // --- paper strips ---------------------------------------------------------
    vec3 paper = vec3(0.955, 0.945, 0.92)
      * (0.9 + 0.1 * sliceNoise(vSlicePos.xy * 220.0))
      * mix(0.86, 1.04, lit);
    vec3 yellow = vec3(1.0, 0.824, 0.122) * mix(0.9, 1.03, lit);

    float inBand = 1.0 - smoothstep(-aa, aa, outside);
    float inPaper = 1.0 - smoothstep(-aa, aa, outside - paperW);
    float inYellow = 1.0 - smoothstep(-aa, aa, outside - yellowW);
    sliceCol = mix(yellow, mix(paper, sliceCol, inBand), inPaper);
    float mask = inYellow * wipe;

    // Soft shadow the strips throw onto the marble just outside them.
    float stripShadow = (1.0 - smoothstep(yellowW, yellowW + 0.03, outside)) * wipe;

    // --- intro flash: hot leading edge + a global burst -----------------------
    float lead = smoothstep(0.14, 0.0, front - along) * sin(3.14159 * uReveal);
    sliceCol += (uFlash * 0.9 + lead * 0.8) * vec3(1.0, 0.96, 0.8);

    gl_FragColor.rgb = mix(gl_FragColor.rgb * mix(1.0, 0.8, stripShadow), sliceCol, mask);

    // --- loader scan: yellow edge where the marble is being "printed" ----------
    float scanEdge = smoothstep(0.025, 0.0, uScan - sliceScanY());
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.824, 0.122), scanEdge * 0.9);
  }
`;

/** Injects the slice into a standard (lit) material. Call once per material. */
export function applyMountainSlice(material: THREE.Material, uniforms: SliceUniforms) {
  // Kept on the material so per-frame code can reach the uniforms from a mesh ref.
  material.userData.slice = uniforms;
  material.onBeforeCompile = (shader) => {
    // Share the uniform objects so updating `uniforms.x.value` reaches the GPU.
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSlicePos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvSlicePos = position;");

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${SLICE_PARS_GLSL}`)
      .replace("void main() {", `void main() {\n${SCAN_DISCARD_GLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${MARBLE_GLSL}`)
      .replace("#include <dithering_fragment>", `#include <dithering_fragment>\n${SLICE_COMPOSITE_GLSL}`);
  };
  material.customProgramCacheKey = () => "mountain-slice";
}

/**
 * Unlit material for the loader's wireframe / point cloud. It is the inverse
 * of the scan discard above: it only draws ABOVE the scan line, so the sweep
 * appears to turn wireframe into marble.
 */
export function createScanMaterial(
  uniforms: SliceUniforms,
  options: { color: string; opacity: number; wireframe?: boolean; pointSize?: number },
) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uResolution: uniforms.uResolution,
      uScan: uniforms.uScan,
      uScanSoft: uniforms.uScanSoft,
      uColor: { value: new THREE.Color(options.color) },
      uOpacity: { value: options.opacity },
      uPointSize: { value: options.pointSize ?? 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uPointSize;
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uPointSize;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      ${NOISE_GLSL}
      void main() {
        if (sliceScanY() <= uScan) discard;
        gl_FragColor = vec4(uColor, uOpacity);
        #include <colorspace_fragment>
      }
    `,
    wireframe: options.wireframe ?? false,
    transparent: true,
    depthWrite: false,
  });
}
