"use client";

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ASSETS, hero } from "@/lib/heroState";
import {
  applyMountainSlice,
  createScanMaterial,
  createSliceUniforms,
  type SliceUniforms,
} from "./shaders/mountainSlice";

/* ------------------------------------------------------------------------ */
/* Tunables                                                                 */
/* ------------------------------------------------------------------------ */

const FOV = 30;
/** Camera distance before the scroll zoom. */
const CAMERA_Z = 8;
/** Extra rotation applied to the raw model so the face looks at +Z (the camera). */
const MODEL_FIX = new THREE.Euler(0, 0, 0);
/** Resting pose in the hero: a three-quarter view, chin slightly up, like the poster. */
const POSE = { x: -0.06, y: -0.1, z: 0.03 };
/** Statue height as a fraction of the DOM stage box it is aligned to. */
const STAGE_FILL = 0.94;
/** How close the camera ends up, in statue heights from the face. */
const ZOOM_DISTANCE = 0.62;
/** At rest the mountain photo spans this many statue heights on screen. */
const MOUNTAIN_SPAN = 1.5;

const lerp = THREE.MathUtils.lerp;
const easeInOut = (t: number) => t * t * (3 - 2 * t);

type SceneProps = {
  /** DOM box the statue is positioned and sized against. */
  stageRef: RefObject<HTMLDivElement | null>;
  mobile: boolean;
  reduced: boolean;
  /** Model and texture have settled (texture failure still counts as ready). */
  onReady: () => void;
  /** The model or WebGL itself failed. The hero swaps to its static fallback. */
  onError: () => void;
};

/* ------------------------------------------------------------------------ */
/* Error boundary: works both around and inside the Canvas                  */
/* ------------------------------------------------------------------------ */

class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[BrandLab] 3D statue unavailable, using fallback.", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ------------------------------------------------------------------------ */
/* Geometry prep                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Collapses the GLB into one geometry that is upright, centred on the origin
 * and exactly 1 unit tall. Baking this in (instead of scaling a group) is what
 * lets the slice shader use raw vertex positions as "statue space".
 */
function bakeGeometry(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);

  const parts: THREE.BufferGeometry[] = [];
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.geometry;
    // Keep only what the shader needs so differently-built meshes can merge.
    const part = new THREE.BufferGeometry();
    part.setAttribute("position", source.getAttribute("position").clone());
    if (source.getAttribute("normal")) {
      part.setAttribute("normal", source.getAttribute("normal").clone());
    }
    if (source.index) part.setIndex(source.index.clone());
    part.applyMatrix4(mesh.matrixWorld); // includes the file's Z-up to Y-up node transform
    parts.push(part);
  });
  if (parts.length === 0) throw new Error("statue.glb contains no meshes");

  const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts);
  if (!geometry) throw new Error("statue.glb meshes could not be merged");

  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(MODEL_FIX));
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();

  // Auto-centre and auto-scale.
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const centre = box.getCenter(new THREE.Vector3());
  const height = box.max.y - box.min.y || 1;
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.scale(1 / height, 1 / height, 1 / height);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/* ------------------------------------------------------------------------ */
/* Statue                                                                   */
/* ------------------------------------------------------------------------ */

function Statue({ stageRef, mobile, reduced, onReady }: Omit<SceneProps, "onError">) {
  const gltf = useGLTF(ASSETS.model, false);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  const group = useRef<THREE.Group>(null);
  const marbleMesh = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>(null);
  const pointCloud = useRef<THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const rimLight = useRef<THREE.DirectionalLight>(null);

  const geometry = useMemo(() => bakeGeometry(gltf.scene), [gltf.scene]);
  const uniforms = useMemo(() => createSliceUniforms(), []);

  const marble = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: "#e9e7e3",
      roughness: 0.62,
      metalness: 0,
    });
    applyMountainSlice(material, uniforms);
    return material;
  }, [uniforms]);

  // Loader look: blue wireframe on desktop, black point cloud everywhere.
  const wireMaterial = useMemo(
    () => createScanMaterial(uniforms, { color: "#1F3BFF", opacity: 0.4, wireframe: true }),
    [uniforms],
  );
  const pointMaterial = useMemo(
    () => createScanMaterial(uniforms, { color: "#0A0A0A", opacity: 0.9 }),
    [uniforms],
  );

  // The wireframe/points only exist while the loader runs.
  const [scanning, setScanning] = useState(() => hero.loading);

  // Mountain texture. Loaded by hand (not Suspense) so a failure degrades to
  // the shader's procedural ridge instead of taking the statue down with it.
  useEffect(() => {
    const uniforms = marbleMesh.current?.material.userData.slice as SliceUniforms | undefined;
    if (!uniforms) return;
    let alive = true;
    let texture: THREE.Texture | null = null;
    new THREE.TextureLoader().load(
      ASSETS.mountain,
      (loaded) => {
        if (!alive) return loaded.dispose();
        texture = loaded;
        // The slice is composited after tone mapping, so sample raw sRGB values.
        loaded.colorSpace = THREE.NoColorSpace;
        loaded.wrapS = loaded.wrapT = THREE.MirroredRepeatWrapping;
        loaded.anisotropy = 4;
        uniforms.uMountain.value = loaded;
        uniforms.uHasMountain.value = 1;
        uniforms.uMountainAspect.value = loaded.image.width / loaded.image.height;
        invalidate();
        onReady();
      },
      undefined,
      () => {
        if (!alive) return;
        console.warn("[BrandLab] mountain.jpg failed to load, using procedural band.");
        onReady();
      },
    );
    return () => {
      alive = false;
      uniforms.uMountain.value = null;
      uniforms.uHasMountain.value = 0;
      texture?.dispose();
    };
  }, [invalidate, onReady]);

  useEffect(
    () => () => {
      geometry.dispose();
      marble.dispose();
      wireMaterial.dispose();
      pointMaterial.dispose();
    },
    [geometry, marble, wireMaterial, pointMaterial],
  );

  // Where the DOM stage box sits, converted to world units at z = 0.
  // offset* values are used because they ignore the parallax transforms.
  const layout = useRef({ x: 0, y: 0, height: 2.2, viewHeight: 4 });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || size.width === 0 || size.height === 0) return;
    const viewHeight = 2 * CAMERA_Z * Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const viewWidth = (viewHeight * size.width) / size.height;
    const centreX = stage.offsetLeft + stage.offsetWidth / 2;
    const centreY = stage.offsetTop + stage.offsetHeight / 2;
    layout.current = {
      x: (centreX / size.width - 0.5) * viewWidth,
      y: -(centreY / size.height - 0.5) * viewHeight,
      height: (stage.offsetHeight / size.height) * viewHeight * STAGE_FILL,
      viewHeight,
    };
    invalidate();
  }, [size, stageRef, invalidate]);

  const scratch = useMemo(
    () => ({ eye: new THREE.Vector3(), buffer: new THREE.Vector2() }),
    [],
  );

  // Per-frame loop. Writing to three.js objects here is the whole point, so the
  // React Compiler's immutability rule does not apply to this block.
  /* eslint-disable react-hooks/immutability */
  useFrame((state, delta) => {
    const statue = group.current;
    const uniforms = marbleMesh.current?.material.userData.slice as SliceUniforms | undefined;
    if (!statue || !uniforms) return;

    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    const { x, y, height: stageHeight, viewHeight } = layout.current;

    const zoom = easeInOut(hero.scroll);
    const calm = 1 - zoom; // idle motion fades out as the camera pushes in
    const pose = hero.loaderPose;
    const alive = reduced ? 0 : 1;

    // Loader turntable.
    if (hero.loading) hero.spin += dt * 0.55;
    if (scanning && !hero.loading) setScanning(false);

    // --- statue transform: loader pose (centred, frontal) -> hero pose ---
    const height = stageHeight * lerp(1, mobile ? 0.9 : 0.82, pose);
    const baseX = lerp(x, 0, pose);
    const baseY = lerp(y, 0, pose);
    const float = Math.sin(time * 0.9) * 0.03 * height * alive * calm;
    statue.position.set(baseX, baseY + float, 0);
    statue.scale.setScalar(height);

    // Mouse tilt (already lerp-smoothed in the parallax ticker; zero on touch devices).
    const settle = (1 - pose) * calm;
    statue.rotation.set(
      POSE.x * (1 - pose) + hero.mouseY * 0.16 * settle + Math.sin(time * 0.7) * 0.015 * alive * calm,
      POSE.y * (1 - pose) + hero.spin + hero.mouseX * 0.3 * settle,
      POSE.z * (1 - pose) + Math.sin(time * 0.55) * 0.012 * alive * calm,
    );

    // --- camera: dolly from the wide shot into the eye line ---
    const frontZ = geometry.boundingBox!.max.z * height;
    const eyeY = baseY + hero.bandPosition * height;
    const camera = state.camera;
    camera.position.set(
      lerp(0, baseX, zoom),
      lerp(0, eyeY, zoom),
      lerp(CAMERA_Z, frontZ + ZOOM_DISTANCE * height, zoom),
    );
    camera.updateMatrixWorld();

    // --- lights follow the statue so the shadow frustum always contains it ---
    const key = keyLight.current;
    if (key) {
      key.position.set(baseX - 2.2 * height, baseY + 2.4 * height, 3.2 * height);
      key.target.position.set(baseX, baseY, 0);
      key.target.updateMatrixWorld();
    }
    const rim = rimLight.current;
    if (rim) {
      rim.position.set(baseX + 2.6 * height, baseY + 1.2 * height, -2.8 * height);
      rim.target.position.set(baseX, baseY, 0);
      rim.target.updateMatrixWorld();
    }

    // --- slice uniforms ---
    const buffer = state.gl.getDrawingBufferSize(scratch.buffer);
    uniforms.uResolution.value.copy(buffer);
    uniforms.bandPosition.value = hero.bandPosition;
    uniforms.bandTilt.value = hero.bandTilt;
    // Scroll opens the band until the whole face is mountain.
    uniforms.bandWidth.value = hero.bandWidth + Math.pow(hero.scroll, 1.6) * 2.6;
    uniforms.mountainOffset.value.set(hero.mountainOffsetX * calm, hero.mountainOffsetY * calm);
    uniforms.uMouse.value.set(hero.mouseX * calm, hero.mouseY * calm);
    uniforms.uFlatten.value = zoom;
    uniforms.uReveal.value = hero.bandReveal;
    uniforms.uFlash.value = hero.flash;
    uniforms.uScan.value = hero.loading ? hero.scan : 10;
    uniforms.uScanSoft.value = mobile ? 0 : 0.03; // mobile: plain hard cut
    if (pointCloud.current) {
      pointCloud.current.material.uniforms.uPointSize.value = (mobile ? 0.9 : 1.4) * state.viewport.dpr;
    }

    // The photo is centred on the eyes, then eases to exactly cover the screen
    // so the last frame matches the full-bleed image the next section starts on.
    const eye = scratch.eye.set(baseX, eyeY, frontZ * 0.6).project(camera);
    uniforms.uAnchor.value.set(eye.x * calm, eye.y * calm);
    const coverScale = Math.min(1, uniforms.uMountainAspect.value / (buffer.x / buffer.y));
    uniforms.uMountainScale.value = lerp(viewHeight / (MOUNTAIN_SPAN * height), coverScale, zoom);
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <>
      <hemisphereLight args={["#ffffff", "#6e7482", 0.45]} />
      {/* Warm key from the upper left, casting soft self-shadows. */}
      <directionalLight
        ref={keyLight}
        color="#fff0de"
        intensity={3}
        castShadow={!mobile}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={5}
      >
        <orthographicCamera attach="shadow-camera" args={[-2.4, 2.4, 2.4, -2.4, 0.1, 30]} />
      </directionalLight>
      {/* Cool rim from behind on the right. */}
      <directionalLight ref={rimLight} color="#9db4ff" intensity={2.6} />

      <group ref={group}>
        <mesh
          ref={marbleMesh}
          geometry={geometry}
          material={marble}
          castShadow={!mobile}
          receiveShadow={!mobile}
        />
        {scanning && !mobile && <mesh geometry={geometry} material={wireMaterial} />}
        {scanning && <points ref={pointCloud} geometry={geometry} material={pointMaterial} />}
      </group>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Canvas                                                                   */
/* ------------------------------------------------------------------------ */

export default function StatueScene({ stageRef, mobile, reduced, onReady, onError }: SceneProps) {
  const wrap = useRef<HTMLDivElement>(null);

  // Stop rendering once the hero has scrolled out of view.
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = wrap.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Reduced motion renders single frames on demand; nothing animates.
  const frameloop = !inView ? "never" : reduced ? "demand" : "always";

  return (
    <div ref={wrap} className="absolute inset-0">
      <SceneBoundary onError={onError}>
        <Canvas
          frameloop={frameloop}
          dpr={mobile ? [1, 1.5] : [1, 2]}
          shadows={mobile ? false : "variance"}
          gl={{ alpha: true, antialias: !mobile, powerPreference: "high-performance" }}
          camera={{ fov: FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 60 }}
          style={{ pointerEvents: "none" }}
        >
          <SceneBoundary onError={onError}>
            <Suspense fallback={null}>
              <Statue stageRef={stageRef} mobile={mobile} reduced={reduced} onReady={onReady} />
            </Suspense>
          </SceneBoundary>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
