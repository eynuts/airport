import { useEffect, useRef } from "react";
import * as THREE from "three";

function lerp(a, b, t) { return a + (b - a) * t; }

export default function Sphere3D({
  isSpeaking = false,
  isThinking = false,
  micVolume  = 0,
  onSphereClick,
}) {
  const containerRef  = useRef(null);
  const sceneRef      = useRef(null);
  const cameraRef     = useRef(null);
  const rendererRef   = useRef(null);
  const mouseRef      = useRef({ x: 0, y: 0 });

  const sphereRef     = useRef(null);
  const mouthRef      = useRef(null);
  const eyesRef       = useRef([]);
  const hudRingsRef   = useRef([]);
  const ringsRef      = useRef(null);
  const particlesRef  = useRef(null);
  const thinkDotsRef  = useRef(null);
  const outerGlowRef  = useRef(null);

  const speakBlendRef = useRef(0);
  const thinkBlendRef = useRef(0);
  const isSpeakingRef = useRef(isSpeaking);
  const isThinkingRef = useRef(isThinking);
  const micVolumeRef  = useRef(micVolume);
  const onSphereClickRef = useRef(onSphereClick);

  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);
  useEffect(() => { micVolumeRef.current  = micVolume;  }, [micVolume]);
  useEffect(() => { onSphereClickRef.current = onSphereClick; }, [onSphereClick]);

  // Radial glow sprite texture
  const makeGlow = (c1, c2, c3, size = 256) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(size/2,size/2,0, size/2,size/2,size/2);
    g.addColorStop(0,    c1);
    g.addColorStop(0.35, c2);
    g.addColorStop(0.7,  c3);
    g.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cv);
  };

  // Arc curve helper
  class ArcCurve extends THREE.Curve {
    constructor(r, a, startAngle = 0) { super(); this.r = r; this.a = a; this.s = startAngle; }
    getPoint(t, out = new THREE.Vector3()) {
      const angle = this.s + t * this.a;
      return out.set(Math.cos(angle) * this.r, Math.sin(angle) * this.r, 0);
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;
    if (!sceneRef.current) sceneRef.current = new THREE.Scene();
    const scene = sceneRef.current;

    const onMouseMove = (e) => {
      mouseRef.current = {
        x:  (e.clientX / window.innerWidth)  * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener("mousemove", onMouseMove);

    if (!cameraRef.current) {
      cameraRef.current = new THREE.PerspectiveCamera(
        55, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000,
      );
      cameraRef.current.position.z = 3.2;
    }

    if (!rendererRef.current) {
      rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current.toneMapping = THREE.ACESFilmicToneMapping;
      rendererRef.current.toneMappingExposure = 1.3;
    }
    const renderer = rendererRef.current;
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);

    const onClick = () => { if (onSphereClickRef.current) onSphereClickRef.current(); };
    containerRef.current.addEventListener("click", onClick);
    if (containerRef.current.children.length === 0) containerRef.current.appendChild(renderer.domElement);

    if (scene.children.length === 0) {
      // ── Core sphere — dark with rich internal glow ───────────────────────
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 64, 64),
        new THREE.MeshPhysicalMaterial({
          color: 0x060c22,
          emissive: 0x0d2060,
          emissiveIntensity: 1.2,
          roughness: 0.08,
          metalness: 0.4,
          transparent: true,
          opacity: 0.97,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
        }),
      );
      sphereRef.current = sphere;
      scene.add(sphere);

      // ── Rim glow shell — soft edge light instead of a Saturn ring ────────
      // Slightly larger transparent sphere that creates a rim/halo effect
      const rimGlow = new THREE.Mesh(
        new THREE.SphereGeometry(1.06, 64, 64),
        new THREE.MeshBasicMaterial({
          color: 0x2255ff,
          transparent: true,
          opacity: 0.13,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      outerGlowRef.current = rimGlow;
      sphere.add(rimGlow);

      // Second rim layer — cyan tint
      const rimGlow2 = new THREE.Mesh(
        new THREE.SphereGeometry(1.12, 64, 64),
        new THREE.MeshBasicMaterial({
          color: 0x00ccff,
          transparent: true,
          opacity: 0.07,
          side: THREE.BackSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sphere.add(rimGlow2);

      // Outer soft glow sprite (the big bloom around the whole sphere)
      const outerBloomTex = makeGlow("rgba(0,180,255,0.0)","rgba(0,160,255,0.35)","rgba(80,0,255,0.15)", 512);
      const outerBloom = new THREE.Sprite(new THREE.SpriteMaterial({
        map: outerBloomTex, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      outerBloom.scale.set(3.0, 3.0, 1);
      outerBloom.userData.isOuterBloom = true;
      sphere.add(outerBloom);

      // Aura sprites — cyan halo + purple bloom
      const addAura = (glow, scale, ud) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glow, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        s.scale.set(scale, scale, 1);
        Object.assign(s.userData, ud);
        sphere.add(s);
      };
      addAura(makeGlow("rgba(0,200,255,0.9)","rgba(0,120,255,0.5)","rgba(0,40,180,0.05)"), 3.2,
        { isAura: true, baseScale: 3.2, auraType: "cyan" });
      addAura(makeGlow("rgba(160,60,255,0.7)","rgba(120,20,255,0.35)","rgba(60,0,180,0.05)"), 4.6,
        { isAura: true, baseScale: 4.6, auraType: "purple" });
      // Speaking aura
      addAura(makeGlow("rgba(180,255,255,0.95)","rgba(0,220,255,0.5)","rgba(0,100,200,0.05)"), 3.5,
        { isSpeakAura: true });
      // Thinking aura — warm gold
      addAura(makeGlow("rgba(255,200,60,0.9)","rgba(255,140,20,0.4)","rgba(180,60,0,0.05)"), 4.0,
        { isThinkAura: true });

      // ── HUD concentric rings inside the sphere ────────────────────────────
      const hudMat = (op = 0.22) => new THREE.MeshBasicMaterial({
        color: 0x00ccff, transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const hudRings = [];
      [0.50, 0.63, 0.76, 0.88].forEach((r, i) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(r, 0.005, 12, 120),
          hudMat(0.20 - i * 0.02),
        );
        ring.rotation.x = Math.PI / 2;
        ring.userData.hudIdx = i;
        hudRings.push(ring);
        sphere.add(ring);
      });
      // Top and bottom tick marks
      const tickMat = new THREE.MeshBasicMaterial({
        color: 0x00eeff, transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      [{ x: 0, y: 0.92 }, { x: 0, y: -0.92 }, { x: 0.92, y: 0 }, { x: -0.92, y: 0 }].forEach(({ x, y }) => {
        const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.005, 0.12), tickMat);
        tick.position.set(x, y, 0.42);
        sphere.add(tick);
      });
      hudRingsRef.current = hudRings;

      // ── Face: arc eyes — clean thin upward arcs, no blob fill ────────────
      const eyeMat = () => new THREE.MeshBasicMaterial({
        color: 0x00ffff, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      });
      // Upward arc (◠) — arc from 0 to PI, centered
      const makeEyeArc = (r, tube) => {
        const geo = new THREE.TubeGeometry(new ArcCurve(r, Math.PI, 0), 64, tube, 12, false);
        geo.center();
        return geo;
      };

      const leftEye = new THREE.Mesh(makeEyeArc(0.14, 0.018), eyeMat());
      leftEye.position.set(-0.30, 0.18, 0.98);
      leftEye.renderOrder = 10;
      leftEye.userData = { isEye: true, side: "left", baseY: 0.18 };
      sphere.add(leftEye);

      // White inner core for left eye
      const leftEyeInner = new THREE.Mesh(makeEyeArc(0.14, 0.007), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      }));
      leftEyeInner.position.set(-0.30, 0.18, 0.99);
      leftEyeInner.renderOrder = 11;
      sphere.add(leftEyeInner);

      const rightEye = new THREE.Mesh(makeEyeArc(0.14, 0.018), eyeMat());
      rightEye.position.set(0.30, 0.18, 0.98);
      rightEye.renderOrder = 10;
      rightEye.userData = { isEye: true, side: "right", baseY: 0.18 };
      sphere.add(rightEye);

      // White inner core for right eye
      const rightEyeInner = new THREE.Mesh(makeEyeArc(0.14, 0.007), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      }));
      rightEyeInner.position.set(0.30, 0.18, 0.99);
      rightEyeInner.renderOrder = 11;
      sphere.add(rightEyeInner);

      // Subtle soft glow behind each eye — small and tight, no blob
      const eyeGlowTex = makeGlow("rgba(0,220,255,0.7)","rgba(0,140,255,0.25)","rgba(0,60,200,0.0)", 64);
      [-0.30, 0.30].forEach((x) => {
        const eg = new THREE.Sprite(new THREE.SpriteMaterial({
          map: eyeGlowTex, transparent: true, opacity: 0.45,
          blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
        }));
        eg.scale.set(0.42, 0.32, 1);
        eg.position.set(x, 0.18, 0.93);
        eg.renderOrder = 9;
        sphere.add(eg);
      });

      eyesRef.current = [leftEye, rightEye];

      // ── Face: wide glowing smile ──────────────────────────────────────────
      const mouthGeo = new THREE.TubeGeometry(new ArcCurve(0.26, Math.PI * 0.9, Math.PI * 0.05), 64, 0.020, 12, false);
      mouthGeo.center();
      const mouth = new THREE.Mesh(mouthGeo, new THREE.MeshBasicMaterial({
        color: 0x00ffff, transparent: true, opacity: 1.0,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      }));
      mouth.position.set(0, -0.30, 0.98);
      mouth.rotation.set(0, 0, Math.PI);
      mouth.renderOrder = 10;
      mouthRef.current = mouth;
      sphere.add(mouth);

      // Mouth glow sprite — tighter and more subtle
      const mouthGlowTex = makeGlow("rgba(0,220,255,0.7)","rgba(0,160,255,0.3)","rgba(0,0,0,0)", 96);
      const mouthGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: mouthGlowTex, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      }));
      mouthGlow.scale.set(0.85, 0.38, 1);
      mouthGlow.position.set(0, -0.30, 0.93);
      mouthGlow.renderOrder = 9;
      sphere.add(mouthGlow);

      // ── Sparkle particles on sphere surface ───────────────────────────────
      const sparkCount = 80;
      const sparkPos   = new Float32Array(sparkCount * 3);
      for (let i = 0; i < sparkCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 1.01 + Math.random() * 0.06;
        sparkPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        sparkPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        sparkPos[i*3+2] = r * Math.cos(phi);
      }
      const sparkGeo = new THREE.BufferGeometry();
      sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
      const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
        size: 0.03, color: 0x88eeff, transparent: true, opacity: 0.8,
        blending: THREE.AdditiveBlending, sizeAttenuation: true, depthWrite: false,
      }));
      sphere.add(sparks);

      // ── Background orbital rings ──────────────────────────────────────────
      const rings = new THREE.Group();
      ringsRef.current = rings;
      const addRing = (r, t, c, rx, ry, spd, op) => {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(r, t, 16, 120),
          new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending }),
        );
        m.rotation.set(rx, ry, 0);
        m.userData.speed = spd;
        rings.add(m);
      };
      addRing(1.6,  0.003, 0x00ccff, Math.PI/3.5,   0.6,  0.0015, 0.12);
      addRing(2.0,  0.002, 0x8833ff, Math.PI/2.8,  -0.8, -0.001,  0.10);
      addRing(2.5,  0.003, 0x0088ff, Math.PI/4,     1.2,  0.002,  0.08);
      scene.add(rings);

      // ── Background sparkle particles ──────────────────────────────────────
      const pCount = 600;
      const pPos   = new Float32Array(pCount * 3);
      const pCol   = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        const r     = 2.0 + Math.random() * 4.0;
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        pPos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
        pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
        pPos[i*3+2] = r * Math.cos(phi);
        const t = Math.random();
        pCol[i*3]   = lerp(0.3, 0.7, t);
        pCol[i*3+1] = lerp(0.8, 0.4, t);
        pCol[i*3+2] = 1.0;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
      pGeo.setAttribute("color",    new THREE.BufferAttribute(pCol, 3));
      particlesRef.current = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.022, vertexColors: true, transparent: true, opacity: 0.65,
        blending: THREE.AdditiveBlending, sizeAttenuation: true, depthWrite: false,
      }));
      scene.add(particlesRef.current);

      // ── Thinking orbit dots ───────────────────────────────────────────────
      const thinkDots = new THREE.Group();
      thinkDotsRef.current = thinkDots;
      const dotCols  = [0xffcc44, 0xffaa22, 0xffdd66, 0xff8800, 0xffbb33];
      const dotSizes = [0.055, 0.04, 0.065, 0.035, 0.05];
      const dotRadii = [1.45, 1.58, 1.38, 1.62, 1.52];
      const dotPhase = [0, Math.PI*0.4, Math.PI*0.8, Math.PI*1.2, Math.PI*1.6];
      for (let i = 0; i < 5; i++) {
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(dotSizes[i], 10, 10),
          new THREE.MeshBasicMaterial({ color: dotCols[i], transparent: true, opacity: 0, blending: THREE.AdditiveBlending }),
        );
        dot.userData = { orbitRadius: dotRadii[i], phase: dotPhase[i], orbitSpeed: 1.0+i*0.16, orbitTilt: (i%3)*0.4 };
        thinkDots.add(dot);
      }
      scene.add(thinkDots);

      // ── Lighting ──────────────────────────────────────────────────────────
      scene.add(new THREE.AmbientLight(0x112255, 3.0));
      const kl = new THREE.PointLight(0x44bbff, 8, 14);
      kl.position.set(2, 2, 4);
      scene.add(kl);
      const fl = new THREE.PointLight(0x8833ff, 5, 12);
      fl.position.set(-2, -1, 3);
      scene.add(fl);
      const rl = new THREE.PointLight(0x00ffff, 4, 8);
      rl.position.set(0, 0, -3);
      scene.add(rl);
    } // end scene build

    // ── Animation loop ──────────────────────────────────────────────────────
    let time = 0;
    const SPEAK_IN = 0.04, SPEAK_OUT = 0.025;
    const THINK_IN = 0.03, THINK_OUT = 0.02;

    const animate = () => {
      time += 0.01;
      const targetSpeak = isSpeakingRef.current ? 1 : 0;
      const targetThink = isThinkingRef.current ? 1 : 0;
      const mic         = micVolumeRef.current;

      speakBlendRef.current += (targetSpeak - speakBlendRef.current) *
        (targetSpeak > speakBlendRef.current ? SPEAK_IN : SPEAK_OUT);
      thinkBlendRef.current += (targetThink - thinkBlendRef.current) *
        (targetThink > thinkBlendRef.current ? THINK_IN : THINK_OUT);

      const sb = speakBlendRef.current;
      const tb = thinkBlendRef.current;
      const ib = Math.max(0, 1 - sb - tb);

      if (sphereRef.current) {
        // Bob
        sphereRef.current.position.y =
          ib * Math.sin(time * 1.1) * 0.055 +
          tb * Math.sin(time * 0.5) * 0.03 +
          sb * Math.sin(time * 2.0) * 0.045;

        // Scale / breathe
        const base = 0.76;
        const pulse =
          ib * (base + Math.sin(time * 1.6) * 0.013 + mic/1000) +
          tb * (base + Math.sin(time * 0.9) * 0.016) +
          sb * (base + Math.sin(time * 11)  * 0.032 + mic/600);
        sphereRef.current.scale.set(pulse, pulse, pulse);

        // Mouse follow
        sphereRef.current.rotation.y +=
          (mouseRef.current.x * 0.4 - sphereRef.current.rotation.y) * 0.05;
        sphereRef.current.rotation.x +=
          (-mouseRef.current.y * 0.25 - sphereRef.current.rotation.x) * 0.05;
        sphereRef.current.rotation.y += ib*0.0012 + tb*0.0003 + sb*0.002;

        // Rim glow pulse
        if (outerGlowRef.current) {
          outerGlowRef.current.material.opacity =
            0.10 + Math.sin(time * 2.0) * 0.04 + sb * 0.08 + mic/2000;
        }

        // Outer bloom + auras
        sphereRef.current.children.forEach((child) => {
          if (child.userData.isOuterBloom) {
            child.material.opacity = 0.65 + Math.sin(time * 1.5) * 0.15 + sb * 0.2;
            const s = 3.0 + Math.sin(time * 1.2) * 0.1 + sb * 0.3;
            child.scale.set(s, s, 1);
          }
        });

        // HUD rings — slow counter-rotation
        hudRingsRef.current.forEach((ring, i) => {
          ring.rotation.z += (i % 2 === 0 ? 0.002 : -0.0015) * (1 + sb * 1.5);
          ring.material.opacity = 0.14 + Math.sin(time * 1.5 + i) * 0.06 + sb * 0.1;
        });

        // Mouth
        if (mouthRef.current) {
          const mouthScaleTarget =
            ib * (1.0 + mic/65) +
            tb * (0.78 + Math.sin(time * 1.8) * 0.07) +
            sb * (1.1  + Math.sin(time * 13)  * 0.42 + mic/80);
          mouthRef.current.scale.y +=
            (mouthScaleTarget - mouthRef.current.scale.y) * 0.13;
          const mouthYTarget =
            ib * (-0.30 - mic/650) +
            tb * -0.32 +
            sb * (-0.34 - Math.sin(time * 9) * 0.04);
          mouthRef.current.position.y +=
            (mouthYTarget - mouthRef.current.position.y) * 0.1;
          mouthRef.current.material.opacity = 0.9 + sb * 0.1;
        }

        // Eyes
        eyesRef.current.forEach((eye) => {
          const isLeft = eye.userData.side === "left";
          const baseY  = eye.userData.baseY; // 0.18
          const eyeScaleTarget =
            ib * 1.0 +
            tb * (0.72 + Math.sin(time * 1.2) * 0.1) +   // squint when thinking
            sb * (1.08 + Math.sin(time * 7)   * 0.06);    // slight widen when speaking
          eye.scale.y += (eyeScaleTarget - eye.scale.y) * 0.09;
          const eyeYTarget =
            ib * baseY +
            tb * (isLeft ? baseY + 0.035 + Math.sin(time*0.7)*0.012 : baseY) +
            sb * baseY;
          eye.position.y += (eyeYTarget - eye.position.y) * 0.06;
          eye.material.opacity = 0.92 + Math.sin(time * 1.8 + (isLeft ? 0 : 0.7)) * 0.08;
        });

        // Auras
        sphereRef.current.children.forEach((child) => {
          const micB = mic / 700;
          if (child.userData.isAura) {
            const bs = child.userData.baseScale;
            const opTarget =
              ib * (0.55 + Math.sin(time*2)*0.18 + mic/1000) +
              tb * (0.18 + Math.sin(time*1.2)*0.06) +
              sb * (0.75 + Math.sin(time*7)*0.18 + mic/700);
            child.material.opacity += (opTarget - child.material.opacity) * 0.05;
            const sTarget =
              ib * (bs + Math.sin(time*1.8)*0.18 + micB) +
              tb * (bs*0.85 + Math.sin(time*1.0)*0.08) +
              sb * (bs + Math.sin(time*9)*0.25 + micB*1.5);
            child.scale.set(sTarget, sTarget, 1);
          }
          if (child.userData.isSpeakAura) {
            const op = sb * (0.5 + Math.sin(time*8)*0.18);
            child.material.opacity += (op - child.material.opacity) * 0.07;
            child.scale.set(3.5 + sb*Math.sin(time*6)*0.3, 3.5 + sb*Math.sin(time*6)*0.3, 1);
          }
          if (child.userData.isThinkAura) {
            const op = tb * (0.45 + Math.sin(time*1.5)*0.15);
            child.material.opacity += (op - child.material.opacity) * 0.06;
            child.scale.set(4.0 + tb*Math.sin(time*1.0)*0.25, 4.0 + tb*Math.sin(time*1.0)*0.25, 1);
          }
        });
      }

      // Orbital rings
      if (ringsRef.current) {
        ringsRef.current.children.forEach((ring, i) => {
          const spd = ring.userData.speed || 0.0015;
          ring.rotation.z += ib*spd + tb*spd*0.3 + sb*spd*2;
          ring.rotation.x += Math.sin(time*0.3+i)*0.001;
        });
        ringsRef.current.rotation.y += ib*0.0006 + tb*0.0002 + sb*0.0014;
      }

      // Particles
      if (particlesRef.current) {
        particlesRef.current.rotation.y -= ib*0.0003 + tb*0.0001 + sb*0.0007;
        particlesRef.current.position.y  = Math.sin(time*0.6)*0.03;
        particlesRef.current.material.opacity = 0.45 + sb*0.25 + Math.sin(time*0.4)*0.08;
      }

      // Thinking dots
      if (thinkDotsRef.current) {
        thinkDotsRef.current.children.forEach((dot) => {
          dot.material.opacity += (tb*0.8 - dot.material.opacity) * 0.07;
          if (dot.material.opacity > 0.005) {
            const a = dot.userData.phase + time * dot.userData.orbitSpeed;
            const r = dot.userData.orbitRadius;
            dot.position.set(Math.cos(a)*r, Math.sin(a*0.7+dot.userData.orbitTilt)*r*0.4, Math.sin(a)*r);
          }
        });
      }

      renderer.render(scene, cameraRef.current);
    };

    renderer.setAnimationLoop(animate);

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      if (containerRef.current) containerRef.current.removeEventListener("click", onClick);
      if (rendererRef.current) rendererRef.current.setAnimationLoop(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }} />;
}
