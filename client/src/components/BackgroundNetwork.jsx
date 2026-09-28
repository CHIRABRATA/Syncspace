import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { onNetworkPulse } from '../lib/networkPulse';

/* ── Constants ─────────────────────────────────── */
const CAMERA_Z = 6;
const DESKTOP_NODES = 80;
const MOBILE_NODES = 44;
const DRIFT = 0.22;          // world-units of ambient wobble
const MOUSE_PUSH = 0.55;     // max displacement near the pointer
const LINK_FACTOR = 1.5;     // link distance = factor * average node spacing
const LINKS_PER_NODE = 4;    // line buffer size per node
const PULSE_DECAY = 1.5;     // pulse units lost per second
const PULSE_MAX = 3;
const EMPTY = [];

// Calm blue/indigo tones so the network never fights with document text.
const PALETTES = {
  dark: {
    colors: ['#38bdf8', '#818cf8', '#a78bfa'],
    blending: THREE.AdditiveBlending,
    nodeAlpha: 0.9,
    lineAlpha: 0.35,
  },
  light: {
    colors: ['#2563eb', '#4f46e5', '#0891b2'],
    blending: THREE.NormalBlending,
    nodeAlpha: 0.55,
    lineAlpha: 0.22,
  },
};

// Soft "spotlight" that keeps the middle (where the document sits) quieter.
const FOCUS_MASK =
  'radial-gradient(ellipse 55% 65% at 50% 45%, rgba(0,0,0,0.3) 0%, #000 100%)';

/* ── Helpers ───────────────────────────────────── */
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Seeded RNG: layout stays identical across theme switches / StrictMode remounts.
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, [query]);
  return matches;
}

// 'auto' follows <html class="dark"> / data-theme, then the OS setting.
function useResolvedTheme(theme) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [docDark, setDocDark] = useState(null);

  useEffect(() => {
    if (theme !== 'auto') return;
    const root = document.documentElement;
    const read = () => {
      const attr = root.getAttribute('data-theme');
      if (root.classList.contains('dark') || attr === 'dark') return true;
      if (root.classList.contains('light') || attr === 'light') return false;
      return null;
    };
    setDocDark(read());
    const obs = new MutationObserver(() => setDocDark(read()));
    obs.observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
    return () => obs.disconnect();
  }, [theme]);

  if (theme === 'light' || theme === 'dark') return theme;
  return (docDark ?? prefersDark) ? 'dark' : 'light';
}

/* ── Scene: nodes + connection lines in ONE frame loop ── */
function NetworkScene({ palette, count, collaboratorColors, reduced, interactive }) {
  const invalidate = useThree((s) => s.invalidate);
  const pulse = useRef(0);
  const time = useRef(0);
  const pointer = useRef({ x: 0, y: 0, active: false });
  const mouse = useRef({ x: 0, y: 0, strength: 0 });
  const collabKey = collaboratorColors.join('|');

  const data = useMemo(() => {
    const rand = mulberry32(1337);
    const collab = collabKey ? collabKey.split('|') : [];
    const maxLines = count * LINKS_PER_NODE;
    const palRgb = palette.colors.map(hexToRgb);

    const base = new Float32Array(count * 3);     // normalized layout (-0.5..0.5), z in world units
    const motion = new Float32Array(count * 4);   // phaseX, phaseY, freqX, freqY
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3, i4 = i * 4;
      base[i3] = rand() - 0.5;
      base[i3 + 1] = rand() - 0.5;
      base[i3 + 2] = rand() * 3 - 2.5;

      motion[i4] = rand() * Math.PI * 2;
      motion[i4 + 1] = rand() * Math.PI * 2;
      motion[i4 + 2] = 0.12 + rand() * 0.25;
      motion[i4 + 3] = 0.12 + rand() * 0.25;

      const f = rand() * (palRgb.length - 1);
      const a = palRgb[Math.floor(f)];
      const b = palRgb[Math.min(Math.floor(f) + 1, palRgb.length - 1)];
      const k = f - Math.floor(f);
      let rgb = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      sizes[i] = 6 + rand() * 5;

      // First N nodes act as "collaborators": their own color, a bit larger.
      if (i < collab.length) {
        rgb = hexToRgb(collab[i]);
        sizes[i] *= 1.6;
      }
      colors[i3] = rgb[0];
      colors[i3 + 1] = rgb[1];
      colors[i3 + 2] = rgb[2];
    }

    const pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    pointGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    pointGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const pointMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: palette.nodeAlpha },
        uPulse: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uCamZ: { value: CAMERA_Z },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute vec3 aColor;
        uniform float uPulse;
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uCamZ;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float twinkle = 0.85 + 0.15 * sin(uTime * 0.8 + position.x * 1.7 + position.y * 2.3);
          // aSize is in CSS pixels at the z=0 plane
          gl_PointSize = aSize * (1.0 + uPulse * 0.35) * twinkle * uPixelRatio * (uCamZ / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        uniform float uPulse;
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float halo = pow(1.0 - d * 2.0, 2.0);
          float core = 1.0 - smoothstep(0.12, 0.26, d);
          float a = clamp(halo * 0.55 + core * 0.8, 0.0, 1.0) * uOpacity * (1.0 + uPulse * 0.25);
          gl_FragColor = vec4(vColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: palette.blending,
    });

    const linePos = new Float32Array(maxLines * 6);
    const lineCol = new Float32Array(maxLines * 6);
    const lineAlpha = new Float32Array(maxLines * 2);

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('aColor', new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute('aAlpha', new THREE.BufferAttribute(lineAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() { gl_FragColor = vec4(vColor, vAlpha); }
      `,
      transparent: true,
      depthWrite: false,
      blending: palette.blending,
    });

    return {
      count, maxLines, base, motion, colors, positions,
      linePos, lineCol, lineAlpha, pointGeo, pointMat, lineGeo, lineMat,
    };
  }, [count, palette, collabKey]);

  // Free GPU resources when the data set is replaced or the scene unmounts
  useEffect(() => {
    invalidate(); // make sure at least one frame is drawn (needed for frameloop="demand")
    return () => {
      data.pointGeo.dispose();
      data.pointMat.dispose();
      data.lineGeo.dispose();
      data.lineMat.dispose();
    };
  }, [data, invalidate]);

  // Network pulses (skipped entirely for reduced motion)
  useEffect(() => {
    if (reduced) return;
    const off = onNetworkPulse((intensity = 1) => {
      pulse.current = Math.min(pulse.current + intensity, PULSE_MAX);
    });
    return typeof off === 'function' ? off : undefined;
  }, [reduced]);

  // Pointer tracking (mouse/pen only, never on touch)
  useEffect(() => {
    if (reduced || !interactive) return;
    const onMove = (e) => {
      if (e.pointerType === 'touch') return;
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.current.active = true;
    };
    const onLeave = () => { pointer.current.active = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, [reduced, interactive]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05); // avoid jumps after tab refocus
    const { width: vw, height: vh } = state.viewport;
    const {
      count, maxLines, base, motion, colors, positions,
      linePos, lineCol, lineAlpha, pointGeo, pointMat, lineGeo,
    } = data;

    if (!reduced) time.current += dt;
    const t = time.current;

    pulse.current = Math.max(0, pulse.current - dt * PULSE_DECAY);
    const p = Math.min(pulse.current, 2);
    const expand = 1 + p * 0.02; // whole network "breathes" outward on a pulse

    // Frame-rate independent pointer smoothing
    const ptr = pointer.current;
    const m = mouse.current;
    m.x += ((ptr.x * vw) / 2 - m.x) * (1 - Math.exp(-dt * 6));
    m.y += ((ptr.y * vh) / 2 - m.y) * (1 - Math.exp(-dt * 6));
    m.strength += ((ptr.active ? 1 : 0) - m.strength) * (1 - Math.exp(-dt * 4));
    const pushRadius = Math.min(vw, vh) * 0.35;
    const canPush = !reduced && interactive && m.strength > 0.01;

    // Nodes: layout scales with the viewport, so it fills any aspect ratio
    const sx = vw * 1.05;
    const sy = vh * 1.05;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3, i4 = i * 4;
      const z = base[i3 + 2];
      const persp = (CAMERA_Z - z) / CAMERA_Z;

      let x = base[i3] * sx * persp + Math.sin(t * motion[i4 + 2] + motion[i4]) * DRIFT;
      let y = base[i3 + 1] * sy * persp + Math.cos(t * motion[i4 + 3] + motion[i4 + 1]) * DRIFT;
      x *= expand;
      y *= expand;

      if (canPush) {
        const dx = x / persp - m.x;
        const dy = y / persp - m.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < pushRadius * pushRadius && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          const f = 1 - d / pushRadius;
          const push = f * f * MOUSE_PUSH * m.strength * persp;
          x += (dx / d) * push;
          y += (dy / d) * push;
        }
      }

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
    }

    // Connections: distance scales with node spacing so density stays constant
    const linkDist = LINK_FACTOR * Math.sqrt((vw * vh) / count);
    const linkDist2 = linkDist * linkDist;
    const lineStrength = palette.lineAlpha * (1 + p * 0.8);

    let n = 0;
    for (let i = 0; i < count && n < maxLines; i++) {
      const i3 = i * 3;
      for (let j = i + 1; j < count; j++) {
        const j3 = j * 3;
        const dx = positions[i3] - positions[j3];
        const dy = positions[i3 + 1] - positions[j3 + 1];
        const dz = positions[i3 + 2] - positions[j3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= linkDist2) continue;
        if (n >= maxLines) break;

        const f = 1 - Math.sqrt(d2) / linkDist;
        const a = Math.min(1, f * f * lineStrength);
        const o = n * 6;
        const oa = n * 2;

        linePos[o] = positions[i3];
        linePos[o + 1] = positions[i3 + 1];
        linePos[o + 2] = positions[i3 + 2];
        linePos[o + 3] = positions[j3];
        linePos[o + 4] = positions[j3 + 1];
        linePos[o + 5] = positions[j3 + 2];

        lineCol[o] = colors[i3];
        lineCol[o + 1] = colors[i3 + 1];
        lineCol[o + 2] = colors[i3 + 2];
        lineCol[o + 3] = colors[j3];
        lineCol[o + 4] = colors[j3 + 1];
        lineCol[o + 5] = colors[j3 + 2];

        lineAlpha[oa] = a;
        lineAlpha[oa + 1] = a;
        n++;
      }
    }

    lineGeo.setDrawRange(0, n * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.aColor.needsUpdate = true;
    lineGeo.attributes.aAlpha.needsUpdate = true;
    pointGeo.attributes.position.needsUpdate = true;

    pointMat.uniforms.uTime.value = t;
    pointMat.uniforms.uPulse.value = p;
    pointMat.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <>
      <lineSegments geometry={data.lineGeo} material={data.lineMat} frustumCulled={false} renderOrder={0} />
      <points geometry={data.pointGeo} material={data.pointMat} frustumCulled={false} renderOrder={1} />
    </>
  );
}

/* ── Never let a WebGL failure take the app down ── */
class CanvasBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.warn('[BackgroundNetwork] disabled (WebGL unavailable?):', err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/* ── Exported Component ────────────────────────── */
/**
 * Props
 *  theme               'auto' | 'light' | 'dark'   (auto follows <html class="dark"> / data-theme / OS)
 *  intensity           0..1 overall visibility
 *  collaboratorColors  ['#f43f5e', '#10b981', ...] first N nodes become larger, colored "collaborator" nodes
 *  zIndex              keep your editor/content at a higher z-index
 *  focusMask           dim the center so document text stays readable
 */
export default function BackgroundNetwork({
  theme = 'auto',
  intensity = 1,
  collaboratorColors = EMPTY,
  zIndex = 0,
  focusMask = true,
}) {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const coarse = useMediaQuery('(pointer: coarse)');
  const resolved = useResolvedTheme(theme);
  const [ready, setReady] = useState(false);
  const [count] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? MOBILE_NODES : DESKTOP_NODES
  );

  // Client-only: avoids SSR/hydration issues and reads media queries before first paint of the canvas
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  const palette = PALETTES[resolved];
  const opacity = Math.max(0, Math.min(1, (reduced ? 0.35 : 0.6) * intensity));

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.4s ease',
        WebkitMaskImage: focusMask ? FOCUS_MASK : undefined,
        maskImage: focusMask ? FOCUS_MASK : undefined,
      }}
    >
      <CanvasBoundary>
        <Canvas
          camera={{ position: [0, 0, CAMERA_Z], fov: 60, near: 0.1, far: 50 }}
          dpr={[1, 1.5]}
          frameloop={reduced ? 'demand' : 'always'}
          gl={{ antialias: false, alpha: true, powerPreference: 'low-power', stencil: false, depth: false }}
          style={{ background: 'transparent' }}
        >
          <NetworkScene
            palette={palette}
            count={count}
            collaboratorColors={collaboratorColors}
            reduced={reduced}
            interactive={!coarse}
          />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}