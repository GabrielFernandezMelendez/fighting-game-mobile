// =====================================================================
//  RENDER 3D (Three.js): cel-shading, contorno por casco invertido,
//  piezas fusionadas por hueso, armas, coleta/bufanda con física.
// =====================================================================
import { L, D2R, STAGE, CHARS, WEAPONS } from './data.js';
import { toWorld, hurtbox, getMove } from './sim.js';
import { ModelLibrary, ModelFighter } from './models.js';
import { clipFor } from './anims.js';
import { VFX } from './vfx.js';
import { buildStage as makeStage, stageById } from './stages.js';
import { buildStageArt } from './stage-art.js';
import { isInstalledApp } from './app-mode.js';

// La app instalada y ?aura3d activan ambos modelos. ?sombra3d permite revisar solo a Sombra.
const previewFlags = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const AURA3D = isInstalledApp() || previewFlags.has('aura3d');
const AURA3D_OVERRIDE = { model: 'aura', outline: 0.016, doubleSide: true, modelHeight: 1.78, cel: true };
const SOMBRA3D = AURA3D || previewFlags.has('sombra3d');
const ROSTER_3D = previewFlags.has('roster3d');
const ROSTER_3D_OVERRIDES = {
  vega: { model: 'vega', outline: 0.013, modelHeight: 1.76, cel: true },
  kai: { model: 'kai', outline: 0.014, modelHeight: 1.78, cel: true },
};
const SOMBRA3D_OVERRIDE = { model: 'sombra', outline: 0.016, doubleSide: true, modelHeight: 1.78, cel: true };

const PALETTES = {
  white: { white: '#f2f2f6', whiteB: '#dfe1e8', suit: '#2f3342', suitL: '#41465a', acc: '#ff7a1a', neon: '#ffd23f', neonO: '#ff9a3c', visor: '#ff8a2c', visorE: '#5a1e00' },
  vega: { white: '#d93a9e', whiteB: '#a92a7a', suit: '#16171e', suitL: '#232532', acc: '#20e3e3', neon: '#46f6ff', neonO: '#ff5ad0', visor: '#2ad4ff', visorE: '#003040' },
  kai: { white: '#646b78', whiteB: '#4b515c', suit: '#24272e', suitL: '#30343d', acc: '#ffc21a', neon: '#ffe14a', neonO: '#ffb000', visor: '#ffb000', visorE: '#3a2400' },
  black: { white: '#2a2b33', whiteB: '#1e1f26', suit: '#121318', suitL: '#1c1d24', acc: '#d4203f', neon: '#ff4d6d', neonO: '#ff2d55', visor: '#ff2d55', visorE: '#4a0010' },
  dummy: { white: '#8a8f9c', whiteB: '#6f7482', suit: '#3a3e4a', suitL: '#4a4f5c', acc: '#46c8ff', neon: '#7ee8ff', neonO: '#46c8ff', visor: '#46c8ff', visorE: '#00202a' },
};
const WCOLORS = { dagger: '#ff9a3c', sword: '#46f6ff', hammer: '#ffe14a', spear: '#ff2d55' };

export class Renderer3D {
  async init(host) {
    let THREE;
    THREE = await import('three');
    this.T = THREE; this.host = host;
    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    host.appendChild(renderer.domElement);
    const scene = this.scene = new THREE.Scene(); scene.background = new THREE.Color('#1a1730');
    this.camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    const grad = new THREE.DataTexture(new Uint8Array([80, 80, 80, 255, 165, 165, 165, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    this.toon = (c, e = '#000000') => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, emissive: e });
    this.glow = c => new THREE.MeshBasicMaterial({ color: c });
    this.outlineMat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { thick: { value: 0.0075 } },
      vertexShader: 'uniform float thick; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vec3 n = normalize(normalMatrix * normal); mv.xyz += n * thick; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.05,0.05,0.08,1.0); }' });
    scene.add(new THREE.AmbientLight('#ffffff', 0.5)); scene.add(new THREE.HemisphereLight('#fff4e8', '#3a3360', 0.9));
    const key = new THREE.DirectionalLight('#ffffff', 2.3); key.position.set(-2, 4, 6); scene.add(key);
    const rim = new THREE.DirectionalLight('#ffd2a8', 1.3); rim.position.set(3, 3, -5); scene.add(rim);
    this.gcache = new Map();
    this.buildStage();
    this.rigs = []; this.particles = []; this.quality = 2; this.camX = 0; this.camZ = 6; this.camY = 0.9; this.shake = 0;
    this.vfx = new VFX(THREE, scene);
    // Modelos 3D (Quaternius). Si fallan, se usa el muñeco por piezas.
    this.lib = new ModelLibrary(); this.gltf = {};
    try {
      const models = [...new Set(Object.values(CHARS).map(c => c.model).filter(Boolean))];
      await this.lib.preload(models);
      for (const m of models) this.gltf[m] = await this.lib.loadChar(m);
      this.useModels = true;
    } catch (e) { console.warn('Modelos no disponibles, uso el muñeco procedural', e); this.useModels = false; this.modelError = String((e && e.message) || e).slice(0, 60); }
    if (!this.useModels) return;
    const previews = [];
    if (AURA3D) previews.push('aura');
    if (SOMBRA3D) previews.push('sombra');
    if (ROSTER_3D) previews.push(...Object.keys(ROSTER_3D_OVERRIDES));
    for (const model of previews) {
      try {
        await this.lib.preload([...Object.keys(this.gltf), model]);
        this.gltf[model] = await this.lib.loadChar(model);
      } catch (e) {
        console.warn(`Modelo 3D de ${model} no disponible, se usa el modelo habitual`, e);
      }
    }
  }

  // ---------- Geometrías con caché ----------
  cached(k, f) { if (!this.gcache.has(k)) this.gcache.set(k, f()); return this.gcache.get(k); }
  geo() {
    const T = this.T, V2 = (x, y) => new T.Vector2(x, y), c = this.cached.bind(this);
    return {
      sph: (r, w = 22, h = 16) => c(`s${r}_${w}_${h}`, () => new T.SphereGeometry(r, w, h)),
      cap: (r, l) => c(`c${r}_${l}`, () => new T.CapsuleGeometry(r, l, 6, 16)),
      box: (x, y, z) => c(`b${x}_${y}_${z}`, () => new T.BoxGeometry(x, y, z)),
      tor: (R, r, a, b) => c(`t${R}_${r}_${a}_${b}`, () => new T.TorusGeometry(R, r, a, b)),
      cyl: (a, b, h, s) => c(`y${a}_${b}_${h}_${s}`, () => new T.CylinderGeometry(a, b, h, s)),
      cone: (r, h, s = 12) => c(`k${r}_${h}_${s}`, () => new T.ConeGeometry(r, h, s)),
      lathe: (prof, len, seg = 22) => c('l' + JSON.stringify(prof) + len, () => {
        const pts = [V2(0.0001, 0)]; for (const [t, r] of prof) pts.push(V2(r, -t * len)); pts.push(V2(0.0001, -len)); pts.reverse();
        const g = new T.LatheGeometry(pts, seg); g.computeVertexNormals(); return g; }),
      latheUp: (prof, seg = 26) => c('u' + JSON.stringify(prof), () => {
        const pts = [V2(0.0001, prof[0][0])]; for (const [y, r] of prof) pts.push(V2(r, y)); pts.push(V2(0.0001, prof[prof.length - 1][0]));
        const g = new T.LatheGeometry(pts, seg); g.computeVertexNormals(); return g; }),
      rbox: (w, h, d, bev = 0.012) => c(`r${w}_${h}_${d}_${bev}`, () => {
        const s = new T.Shape(); const x = -w / 2, y = -h / 2, r = Math.min(bev * 1.5, w / 3, h / 3);
        s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
        s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
        s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
        const g = new T.ExtrudeGeometry(s, { depth: d - bev * 2, bevelEnabled: true, bevelSize: bev, bevelThickness: bev, bevelSegments: 3, curveSegments: 6 });
        g.translate(0, 0, -(d - bev * 2) / 2); g.computeVertexNormals(); return g; }),
      boot: () => c('boot', () => {
        const bs = new T.Shape();
        bs.moveTo(-0.06, 0.04); bs.lineTo(-0.065, -0.05); bs.quadraticCurveTo(-0.065, -0.07, -0.045, -0.07); bs.lineTo(0.17, -0.07);
        bs.quadraticCurveTo(0.215, -0.065, 0.2, -0.03); bs.quadraticCurveTo(0.17, 0.0, 0.08, 0.02); bs.lineTo(0.05, 0.05); bs.lineTo(-0.06, 0.04);
        const g = new T.ExtrudeGeometry(bs, { depth: 0.09, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3, curveSegments: 8 });
        g.translate(0, 0, -0.045); g.computeVertexNormals(); return g; }),
    };
  }

  // ---------- Escenario ----------
  buildStage() {
    const T = this.T, scene = this.scene;
    this.setStage(new URLSearchParams(location.search).get('stage') || 'sala');   // main.js lo cambia al empezar cada combate
    // partículas reutilizables
    this.sparkPool = []; for (let i = 0; i < 60; i++) { const m = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 0.05), this.glow('#ffd23f')); m.visible = false; scene.add(m); this.sparkPool.push(m); }
    this.ringPool = []; for (let i = 0; i < 6; i++) { const r = new T.Mesh(new T.TorusGeometry(1, 0.05, 6, 32), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true })); r.visible = false; scene.add(r); this.ringPool.push(r); }
    const dbgM = new T.MeshBasicMaterial({ color: '#ff3030', transparent: true, opacity: .4, depthTest: false });
    this.hitBalls = []; for (let i = 0; i < 14; i++) { const s = new T.Mesh(new T.SphereGeometry(1, 10, 8), dbgM); s.visible = false; s.renderOrder = 10; scene.add(s); this.hitBalls.push(s); }
    this.hurtBoxes = [0, 1].map(() => { const b = new T.Mesh(new T.BoxGeometry(1, 1, 0.02), new T.MeshBasicMaterial({ color: '#30ff7a', transparent: true, opacity: .22, depthTest: false })); b.visible = false; b.renderOrder = 9; scene.add(b); return b; });
  }

  // Cambia el escenario (solo presentación: la simulación no sabe nada de él)
  setStage(id) {
    id = stageById(id).id;
    if (this.stage && this.stageId === id) return;
    const mount = stage => {
      if (this.stage) { this.scene.remove(this.stage.group); this.stage.dispose(); }
      this.stage = stage;
      this.scene.add(stage.group);
      this.scene.background = stage.background;
    };
    this.stageId = id;
    this.stageT = 0;
    const quality = this.quality ?? 2;
    if (new URLSearchParams(location.search).has('stage3d')) {
      mount(makeStage(id, this.T, { quality }));
      return;
    }
    const art = buildStageArt(id, this.T, {
      quality,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)'),
      onUnavailable: () => {
        if (this.stage === art) mount(makeStage(id, this.T, {quality:this.quality ?? quality}));
      },
    });
    mount(art);
  }

  // ---------- Personajes ----------
  // sels = [{ c: personaje, w: arma }, ...]
  setFighters(sels) {
    for (const r of this.rigs) this.disposeRig(r);
    this.rigs = sels.map(x => typeof x === 'string' ? { c: x, w: CHARS[x].weapon } : x).map(x => this.buildFighter(CHARS[x.c], x.w));
    this.applyQuality(this.quality);
  }
  disposeRig(r) { this.scene.remove(r.root); for (const s of r.hairSegs) this.scene.remove(s); this.scene.remove(r.shadow); }

  buildFighter(C, wk = C.weapon) {
    if (AURA3D && C.id === 'aura' && this.gltf.aura) C = { ...C, ...AURA3D_OVERRIDE };
    if (SOMBRA3D && C.id === 'sombra' && this.gltf.sombra) C = { ...C, ...SOMBRA3D_OVERRIDE };
    if (ROSTER_3D && ROSTER_3D_OVERRIDES[C.id] && this.gltf[C.id]) C = { ...C, ...ROSTER_3D_OVERRIDES[C.id] };
    if (this.useModels && C.model && this.gltf[C.model]) return this.buildModelFighter(C, wk);
    return this.buildProcFighter(C, wk);
  }

  // Personaje con modelo + clips retargeteados
  buildModelFighter(C, wk) {
    const T = this.T, g = this.geo();
    const mf = new ModelFighter(this.lib, this.gltf[C.model], { height: C.modelHeight || 1.75, outline: C.outline || 0.02, model: C.model, doubleSide: !!C.doubleSide, cel: !!C.cel, rimColor: C.accent });
    if (C.tint) for (const m of mf.mats) m.color.set(C.tint);
    this.scene.add(mf.root);
    // arma en el hueso Weapon.R, orientada como el arma original del pack (hoja hacia arriba en reposo)
    const hand = mf.hand(); mf.model.updateMatrixWorld(true);
    const wq = hand.getWorldQuaternion(new T.Quaternion()), ws = hand.getWorldScale(new T.Vector3()).x;
    // en reposo (pose T) la hoja original apunta hacia delante del personaje (+Z del modelo)
    const fwd = new T.Vector3(0, 0, 1).applyQuaternion(mf.model.getWorldQuaternion(new T.Quaternion()));
    const up = fwd.applyQuaternion(wq.invert()).normalize();
    const holder = new T.Group(); holder.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), up); holder.scale.setScalar(1.3 / ws);
    holder.position.copy(new T.Vector3(0, 0, 0)); hand.add(holder);
    const outlineMat = this.outlineMat;
    const mesh = (geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], outline = true) => {
      const m = new T.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot); parent.add(m);
      if (outline) { const o = new T.Mesh(geo, outlineMat); o.userData.outline = true; m.add(o); }
      return m;
    };
    const wgrp = new T.Group(); holder.add(wgrp);
    this.buildWeapon(wk, wgrp, mesh, g, {});
    this.mergeRig(wgrp);
    const len = (WEAPONS[wk] && WEAPONS[wk].len) || 0.2;
    const trailA = new T.Object3D(), trailB = new T.Object3D(); trailB.position.set(0, -Math.max(0.22, len), 0); wgrp.add(trailA, trailB);
    const shadow = new T.Mesh(this.cached('blob', () => new T.CircleGeometry(0.32, 24)), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .45 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; this.scene.add(shadow);
    return { C, model: mf, root: mf.root, shadow, hairSegs: [], hairPts: [], flashMats: [], trailA, trailB };
  }
  poseModel(rig, F) {
    const mf = rig.model, s = F.scale, a = clipFor(F, mf.meta);
    mf.pose(a.clip, a.t, a.blend || 0);
    mf.root.position.set(F.x, F.y, 0); mf.root.scale.set(-F.face * s, s, s);
    rig.shadow.position.x = F.x; rig.shadow.scale.setScalar(s * Math.max(0.4, 1 - Math.max(0, F.y) * 0.35));
    mf.flash((F.state === 'hit' || F.state === 'launched') && F.f < 4);
  }

  buildProcFighter(C, wk = C.weapon) {
    const T = this.T, g = this.geo(), pal = PALETTES[C.palette];
    const M = { white: this.toon(pal.white), whiteB: this.toon(pal.whiteB), suit: this.toon(pal.suit), suitL: this.toon(pal.suitL), orange: this.toon(pal.acc),
      visor: this.toon(pal.visor, pal.visorE), neon: this.glow(pal.neon), neonO: this.glow(pal.neonO), shine: this.glow('#fff6e0') };
    const outlineMat = this.outlineMat, scene = this.scene;
    const mesh = (geo, mat, parent, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], outline = true) => {
      const m = new T.Mesh(geo, mat); m.position.set(...pos); m.scale.set(...scale); m.rotation.set(...rot); parent.add(m);
      if (outline) { const o = new T.Mesh(geo, outlineMat); o.userData.outline = true; m.add(o); }
      return m;
    };
    const grp = (parent, pos = [0, 0, 0]) => { const o = new T.Group(); o.position.set(...pos); parent.add(o); return o; };
    const root = grp(scene), hip = grp(root);
    mesh(g.latheUp([[-0.11, 0.02], [-0.09, 0.1], [-0.05, 0.145], [0.0, 0.155], [0.05, 0.145], [0.09, 0.125]]), M.suit, hip, [0, 0, 0], [0.82, 1, 1]);
    mesh(g.tor(0.15, 0.022, 8, 32), M.orange, hip, [0, 0.055, 0], [0.84, 1, 1.02], [Math.PI / 2, 0, 0]);
    mesh(g.rbox(0.03, 0.06, 0.08, 0.008), M.white, hip, [0.13, 0.055, 0]);
    mesh(g.box(0.012, 0.022, 0.05), M.neon, hip, [0.147, 0.055, 0], [1, 1, 1], [0, 0, 0], false);
    for (const z of [-1, 1]) { mesh(g.rbox(0.07, 0.07, 0.04, 0.01), M.whiteB, hip, [-0.02, 0.0, z * 0.15]); mesh(g.rbox(0.13, 0.12, 0.025, 0.008), M.white, hip, [0.0, -0.05, z * 0.155]); }
    const waist = grp(hip);
    mesh(g.latheUp([[0.0, 0.125], [0.07, 0.112], [0.14, 0.11], [0.21, 0.125]]), M.suit, waist, [0, 0, 0], [0.78, 1, 1]);
    mesh(g.rbox(0.035, 0.15, 0.13, 0.01), M.suitL, waist, [0.08, 0.1, 0]);
    const chest = grp(waist, [0, L.waist, 0]);
    mesh(g.latheUp([[0.0, 0.12], [0.06, 0.135], [0.13, 0.15], [0.2, 0.16], [0.25, 0.155], [0.285, 0.12], [0.31, 0.06]]), M.suit, chest, [0, 0, 0], [0.74, 1, 1]);
    mesh(g.sph(0.13), M.white, chest, [0.055, 0.17, 0], [0.7, 0.8, 1.02]);
    for (const z of [-1, 1]) mesh(g.sph(0.066), M.white, chest, [0.1, 0.15, z * 0.055], [0.9, 0.85, 0.85]);
    mesh(g.rbox(0.02, 0.06, 0.11, 0.008), M.orange, chest, [0.16, 0.21, 0]);
    for (const z of [-1, 1]) mesh(g.box(0.01, 0.012, 0.09), M.neon, chest, [0.15, 0.1, z * 0.04], [1, 1, 1], [z * 0.5, 0, 0], false);
    mesh(g.rbox(0.06, 0.18, 0.2, 0.015), M.white, chest, [-0.11, 0.17, 0]);
    for (const z of [-1, 1]) mesh(g.box(0.01, 0.12, 0.012), M.neonO, chest, [-0.142, 0.17, z * 0.06], [1, 1, 1], [0, 0, 0], false);
    const neck = grp(chest, [0, L.chest, 0]);
    mesh(g.cyl(0.048, 0.06, 0.1, 16), M.suit, neck, [0, 0.03, 0]);
    mesh(g.tor(0.062, 0.016, 8, 24), M.white, neck, [0, -0.005, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    const head = grp(neck, [0, L.neck, 0]);
    mesh(g.sph(0.128, 28, 20), M.white, head, [0, 0.01, 0], [1.05, 1.0, 0.92]);
    mesh(this.cached('visor', () => new T.SphereGeometry(0.136, 32, 14, Math.PI - 1.15, 2.3, 1.05, 0.72)), M.visor, head, [0.004, 0.01, 0], [1.05, 1.0, 0.92]);
    mesh(g.box(0.006, 0.012, 0.11), M.shine, head, [0.137, 0.035, 0], [1, 1, 1], [0, 0, 0], false);
    mesh(g.rbox(0.06, 0.05, 0.11, 0.012), M.white, head, [0.095, -0.085, 0], [1, 1, 1], [0, 0, 0.35]);
    for (const z of [-1, 1]) {
      mesh(g.cyl(0.04, 0.045, 0.026, 20), M.whiteB, head, [-0.02, -0.01, z * 0.112], [1, 1, 1], [Math.PI / 2, 0, 0]);
      mesh(g.box(0.05, 0.008, 0.004), M.neonO, head, [-0.02, -0.01, z * 0.127], [1, 1, 1], [0, 0, 0], false);
      mesh(g.rbox(0.12, 0.022, 0.012, 0.004), M.orange, head, [-0.04, 0.115, z * 0.035], [1, 1, 1], [0, 0, 0.42]);
    }
    if (C.id === 'kai') mesh(g.rbox(0.05, 0.06, 0.2, 0.01), M.orange, head, [-0.02, 0.13, 0]);   // cresta del casco de Kai
    const hairAnchor = grp(C.hair && C.hair.scarf ? neck : head, C.hair && C.hair.scarf ? [-0.07, 0.04, 0] : [-0.12, 0.05, 0]);
    const arms = {};
    for (const [s, z] of [['F', -0.165], ['N', 0.165]]) {
      const out = Math.sign(z);
      const sh = grp(chest, [0, L.chest - 0.06, z]);
      mesh(g.sph(0.075), M.suit, sh, [0, -0.01, 0]);
      const big = C.id === 'kai' ? 1.25 : 1;
      mesh(g.sph(0.085), M.white, sh, [0, 0.025, out * 0.01], [1.1 * big, 0.7 * big, 1.0 * big]);
      mesh(g.sph(0.065), M.whiteB, sh, [0, -0.02, out * 0.022], [1.05, 0.7, 0.9]);
      mesh(g.tor(0.082, 0.01, 6, 28), M.orange, sh, [0, 0.0, out * 0.01], [1.1 * big, 1, big], [Math.PI / 2, 0, 0]);
      mesh(g.lathe([[0.0, 0.05], [0.15, 0.058], [0.45, 0.056], [0.8, 0.046], [1.0, 0.04]], L.upper), M.suit, sh);
      const el = grp(sh, [0, -L.upper, 0]);
      mesh(g.sph(0.045), M.suitL, el);
      mesh(g.lathe([[0.0, 0.05], [0.12, 0.066], [0.5, 0.068], [0.85, 0.058], [1.0, 0.05]], L.fore * 0.92), M.white, el, [0, -0.02, 0], [1, 1, 0.95]);
      mesh(g.tor(0.067, 0.008, 6, 22), M.neon, el, [0, -0.1, 0], [1, 1, 1], [Math.PI / 2, 0, 0], false);
      mesh(g.rbox(0.02, 0.12, 0.05, 0.006), M.orange, el, [0.06, -0.14, 0]);
      const wr = grp(el, [0, -L.fore, 0]);
      mesh(g.rbox(0.07, 0.08, 0.075, 0.016), M.suit, wr, [0.0, -0.045, 0]);
      for (let i = 0; i < 4; i++) {
        const fz = -0.027 + i * 0.018;
        mesh(g.cap(0.0125, 0.02), M.suit, wr, [0.038, -0.07, fz], [1, 1, 1], [0, 0, 0.2]);
        mesh(g.cap(0.012, 0.016), M.suit, wr, [0.025, -0.092, fz], [1, 1, 1], [0, 0, 1.5]);
      }
      mesh(g.rbox(0.018, 0.035, 0.075, 0.006), M.orange, wr, [0.048, -0.072, 0]);
      mesh(g.cap(0.014, 0.03), M.suit, wr, [0.03, -0.04, out * 0.045], [1, 1, 1], [0.5 * out, 0, 0.6]);
      if (s === 'N') this.buildWeapon(wk, wr, mesh, g, M);
      arms[s] = { sh, el, wr };
    }
    const legs = {};
    for (const [s, z] of [['F', -0.095], ['N', 0.095]]) {
      const out = Math.sign(z);
      const hp = grp(hip, [0, -0.01, z]);
      mesh(g.lathe([[0.0, 0.095], [0.1, 0.1], [0.4, 0.092], [0.75, 0.072], [1.0, 0.06]], L.thigh), M.suit, hp);
      mesh(g.lathe([[0.0, 0.07], [0.1, 0.1], [0.5, 0.094], [0.85, 0.075], [1.0, 0.05]], L.thigh * 0.62), M.white, hp, [0.012, -0.12, out * 0.012], [0.98, 1, 1.02]);
      mesh(g.box(0.012, 0.16, 0.012), M.neonO, hp, [0.0, -0.24, out * 0.1], [1, 1, 1], [0, 0, 0], false);
      const kn = grp(hp, [0, -L.thigh, 0]);
      mesh(g.sph(0.065), M.suit, kn);
      mesh(g.sph(0.075), M.orange, kn, [0.05, 0.0, 0], [0.62, 1.05, 0.95]);
      mesh(g.sph(0.04), M.white, kn, [0.083, 0.0, 0], [0.4, 0.9, 0.8]);
      mesh(g.lathe([[0.0, 0.065], [0.18, 0.078], [0.4, 0.074], [0.7, 0.064], [0.9, 0.07], [1.0, 0.072]], L.shin), M.white, kn, [0, -0.01, 0], [1, 1, 0.95]);
      mesh(g.tor(0.07, 0.014, 6, 22), M.orange, kn, [0, -L.shin * 0.62, 0], [1, 1, 0.95], [Math.PI / 2, 0, 0]);
      mesh(g.tor(0.068, 0.006, 6, 22), M.neon, kn, [0, -L.shin * 0.3, 0], [1, 1, 0.95], [Math.PI / 2, 0, 0], false);
      const an = grp(kn, [0, -L.shin, 0]);
      mesh(g.boot(), M.white, an);
      mesh(g.box(0.27, 0.025, 0.115), M.orange, an, [0.07, -0.08, 0]);
      mesh(g.box(0.08, 0.008, 0.09), M.neon, an, [0.15, -0.045, 0], [1, 1, 1], [0, 0, -0.25], false);
      legs[s] = { hp, kn, an };
    }
    // coleta o bufanda
    const hairSegs = [], hairPts = [];
    if (C.hair) {
      const hm = this.toon(C.hair.color);
      for (let i = 0; i < C.hair.segs; i++) {
        const r = C.hair.scarf ? 0.045 - i * 0.002 : +(0.042 - i * 0.005).toFixed(3);
        hairSegs.push(mesh(g.sph(Math.max(0.012, r), 14, 10), hm, scene, [0, 0, 0], C.hair.scarf ? [1, 0.7, 0.45] : [1, 1.3, 1]));
        hairPts.push({ p: new T.Vector3(), o: new T.Vector3(), init: false });
      }
    }
    const shadow = new T.Mesh(this.cached('blob', () => new T.CircleGeometry(0.32, 24)), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .45 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.003; scene.add(shadow);
    this.mergeRig(root);
    return { C, root, hip, waist, chest, neck, arms, legs, hairAnchor, hairSegs, hairPts, shadow, flashMats: [M.white, M.whiteB, M.suit, M.suitL], scarf: !!(C.hair && C.hair.scarf) };
  }

  // Armas: se cuelgan de la muñeca del brazo cercano, apuntando a -Y (dirección de la mano)
  buildWeapon(wk, wr, mesh, g, M) {
    if (!wk || wk === 'none') return;
    const glow = this.glow(WCOLORS[wk]), metal = this.toon('#c9ccd6'), grip = this.toon('#1c1d24');
    const w = this.T.Group ? new this.T.Group() : null; wr.add(w);
    if (wk === 'dagger') {
      mesh(g.cyl(0.016, 0.016, 0.1, 10), grip, w, [0, -0.05, 0]);
      mesh(g.box(0.07, 0.016, 0.03), metal, w, [0, -0.105, 0]);
      mesh(g.box(0.045, 0.2, 0.012), glow, w, [0, -0.21, 0], [1, 1, 1], [0, 0, 0], true);
      mesh(g.cone(0.024, 0.08, 4), glow, w, [0, -0.35, 0], [1, 1, 0.3], [Math.PI, 0, 0]);
    } else if (wk === 'sword') {
      mesh(g.cyl(0.017, 0.017, 0.12, 10), grip, w, [0, -0.06, 0]);
      mesh(g.box(0.13, 0.022, 0.04), metal, w, [0, -0.125, 0]);
      mesh(g.box(0.04, 0.66, 0.012), glow, w, [0, -0.46, 0], [1, 1, 1], [0, 0, 0], true);
      mesh(g.box(0.012, 0.6, 0.014), metal, w, [0.022, -0.45, 0], [1, 1, 1], [0, 0, 0], false);
      mesh(g.cone(0.028, 0.12, 4), glow, w, [0, -0.85, 0], [1, 1, 0.3], [Math.PI, 0, 0]);
    } else if (wk === 'hammer') {
      mesh(g.cyl(0.022, 0.022, 0.86, 10), grip, w, [0, -0.31, 0]);
      mesh(g.rbox(0.28, 0.17, 0.17, 0.02), metal, w, [0.03, -0.8, 0]);
      mesh(g.cyl(0.05, 0.05, 0.18, 16), glow, w, [0.03, -0.8, 0], [1, 1, 1], [Math.PI / 2, 0, 0], false);
      mesh(g.box(0.03, 0.15, 0.16), this.toon('#ffc21a'), w, [0.17, -0.8, 0]);
    } else if (wk === 'spear') {
      mesh(g.cyl(0.018, 0.018, 1.5, 10), grip, w, [0, -0.3, 0]);
      mesh(g.cone(0.05, 0.22, 4), glow, w, [0, -1.12, 0], [1, 1, 0.35], [Math.PI, 0, 0]);
      mesh(g.tor(0.03, 0.008, 6, 14), glow, w, [0, -0.98, 0], [1, 1, 1], [Math.PI / 2, 0, 0], false);
      mesh(g.cyl(0.026, 0.026, 0.06, 10), metal, w, [0, 0.44, 0]);
    }
  }

  // Fusiona por hueso y material: reduce los draw calls a menos de la mitad
  mergeRig(root) {
    const T = this.T, outlineMat = this.outlineMat;
    const concat = gs => {
      let n = 0; for (const g of gs) n += g.getAttribute('position').count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
      for (const g of gs) { pos.set(g.getAttribute('position').array, o * 3); nor.set(g.getAttribute('normal').array, o * 3); o += g.getAttribute('position').count; }
      const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(pos, 3)); r.setAttribute('normal', new T.BufferAttribute(nor, 3)); r.computeBoundingSphere(); return r;
    };
    const groups = []; root.traverse(o => { if (o.isGroup || o === root) groups.push(o); });
    for (const grp of groups) {
      const meshes = grp.children.filter(c => c.isMesh && !c.userData.outline);
      if (!meshes.length) continue;
      const byMat = new Map(), withOutline = [];
      for (const m of meshes) {
        m.updateMatrix();
        const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
        const g = new T.BufferGeometry();
        g.setAttribute('position', src.getAttribute('position').clone()); g.setAttribute('normal', src.getAttribute('normal').clone());
        g.applyMatrix4(m.matrix);
        if (!byMat.has(m.material)) byMat.set(m.material, []); byMat.get(m.material).push(g);
        if (m.children.some(c => c.userData.outline)) withOutline.push(g);
        grp.remove(m);
      }
      for (const [mat, gs] of byMat) grp.add(new T.Mesh(concat(gs), mat));
      if (withOutline.length) { const om = new T.Mesh(concat(withOutline), outlineMat); om.userData.outline = true; grp.add(om); }
    }
  }

  applyQuality(q) {
    this.quality = q; const dpr = devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 2 ? Math.min(2, dpr) : q === 1 ? Math.min(1.25, dpr) : 0.85);
    this.scene.traverse(o => { if (o.userData.outline) o.visible = q > 0; });
    this.stage?.setQuality?.(q);
    this.sizeKey = '';
  }

  // ---------- Fotograma ----------
  poseRig(rig, F) {
    if (rig.model) return this.poseModel(rig, F);
    const p = F.pose, s = F.scale;
    rig.root.position.set(F.x + F.face * p.rx * s, F.hipY, 0); rig.root.scale.set(F.face * s, s, s);
    rig.root.rotation.y = -0.42 * F.face;
    rig.hip.rotation.z = (p.rot || 0) * D2R;
    rig.waist.rotation.z = -p.lean * D2R; rig.chest.rotation.z = -p.chest * D2R; rig.neck.rotation.z = -p.head * D2R;
    for (const k of ['F', 'N']) {
      const a = p['a' + k]; rig.arms[k].sh.rotation.z = a[0] * D2R; rig.arms[k].el.rotation.z = a[1] * D2R; rig.arms[k].wr.rotation.z = a[2] * D2R;
      const l = p['l' + k], rp = -p.lean * 0.35;
      rig.legs[k].hp.rotation.z = (rp + l[0]) * D2R; rig.legs[k].kn.rotation.z = -l[1] * D2R;
      rig.legs[k].an.rotation.z = l[2] * D2R - ((rp + l[0] - l[1]) * D2R);
    }
    rig.shadow.position.x = F.x; rig.shadow.scale.setScalar(s * Math.max(0.4, 1 - Math.max(0, F.hipY - 0.9) * 0.35));
    const fl = (F.state === 'hit' || F.state === 'launched') && F.f < 4;
    for (const m of rig.flashMats) m.emissive.set(fl ? '#ffffff' : '#000000');
  }
  updateHair(rig, F) {
    if (!rig.hairSegs.length) return;
    const T = this.T, anchor = rig.hairAnchor.getWorldPosition(new T.Vector3()), seg = rig.scarf ? 0.075 : 0.06;
    rig.hairPts.forEach((h, i) => {
      if (!h.init) { h.p.set(anchor.x - F.face * seg * i, anchor.y - seg * i * 0.5, anchor.z); h.o.copy(h.p); h.init = true; }
      if (i === 0) { h.p.copy(anchor); h.o.copy(anchor); return; }
      const v = h.p.clone().sub(h.o).multiplyScalar(rig.scarf ? 0.93 : 0.9); h.o.copy(h.p); h.p.add(v);
      h.p.y -= rig.scarf ? 0.0012 : 0.0022; h.p.x -= F.face * (rig.scarf ? 0.0016 : 0.0006);
    });
    for (let it = 0; it < 4; it++) for (let i = 1; i < rig.hairPts.length; i++) {
      const a = rig.hairPts[i - 1].p, b = rig.hairPts[i].p, d = b.clone().sub(a), len = d.length() || 1e-6;
      b.copy(a).add(d.multiplyScalar(seg / len));
    }
    rig.hairSegs.forEach((m, i) => m.position.copy(rig.hairPts[i].p));
  }
  consumeEvents(events) {
    for (const e of events) {
      if (e.type === 'hit' || e.type === 'block' || e.type === 'armor' || e.type === 'tech' || e.type === 'grab') {
        const color = e.type === 'block' ? '#46c8ff' : e.type === 'armor' ? '#ffffff' : e.counter ? '#ff3355' : null;
        const n = e.type === 'block' ? 8 : 14;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 5) * Math.min(1.6, (e.power || 1) + 0.4);
          this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color: color || (i % 2 ? '#ff9a3c' : '#ffd23f') });
        }
        this.particles.push({ x: e.x, y: e.y, life: 1, ring: true, color: color || '#ffffff' });
        this.shake = Math.max(this.shake, e.type === 'block' ? 0.03 : 0.04 + (e.power || 1) * 0.04);
        if (e.type === 'hit') this.vfx.star(e.x, e.y, (e.attacker != null && this.rigs[e.attacker] && this.rigs[e.attacker].C.accent) || '#ff7a1a');
      } else if (e.type === 'dust') { this.vfx.puff(e.x, 0, e.dir, e.big); continue; }
      if (e.type === 'land') this.vfx.puff(e.x, 0, 0, false);
      if (e.type === 'land' || e.type === 'djump') this.particles.push({ x: e.x, y: e.type === 'land' ? 0.05 : (e.y || 0) + 0.9, life: 1, ring: true, flat: e.type === 'land', color: '#bfc3cf' });
      else if (e.type === 'ko') this.shake = 0.25;
    }
  }
  render(M, dt, { boxes = false } = {}) {
    const { renderer, scene, camera, host } = this;
    const W = host.clientWidth, H = host.clientHeight, key = `${W}x${H}x${renderer.getPixelRatio()}`;
    if (this.sizeKey !== key) { renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); this.sizeKey = key; }
    this.stageT = (this.stageT || 0) + dt; this.stage?.update(this.stageT, dt, camera);
    M.fighters.forEach((F, i) => this.poseRig(this.rigs[i], F));
    scene.updateMatrixWorld();
    M.fighters.forEach((F, i) => this.vfx.updateTrail(i, this.rigs[i], F, getMove(F), this.rigs[i].C.accent || '#ffffff'));
    M.fighters.forEach((F, i) => this.updateHair(this.rigs[i], F));
    // partículas
    let si = 0, ri = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const s = this.particles[i]; s.life -= dt * 3;
      if (s.life <= 0) { this.particles.splice(i, 1); continue; }
      if (s.ring) { const r = this.ringPool[ri++]; if (!r) continue; r.visible = true; r.position.set(s.x, s.y, 0.35); r.rotation.x = s.flat ? Math.PI / 2 : 0;
        r.scale.setScalar((1.2 - s.life) * (s.flat ? 0.6 : 0.45)); r.material.opacity = s.life; r.material.color.set(s.color); continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= .9; s.vy *= .9;
      const m = this.sparkPool[si++]; if (!m) continue; m.visible = true; m.position.set(s.x, s.y, 0.35); m.scale.setScalar(Math.max(0.15, s.life)); m.rotation.z += 0.3; m.material.color.set(s.color);
    }
    for (; si < this.sparkPool.length; si++) this.sparkPool[si].visible = false;
    for (; ri < this.ringPool.length; ri++) this.ringPool[ri].visible = false;
    // depuración
    this.hitBalls.forEach(b => b.visible = false); this.hurtBoxes.forEach(b => b.visible = false);
    if (boxes) {
      let bi = 0;
      M.fighters.forEach((F, i) => {
        const hb = hurtbox(F), b = this.hurtBoxes[i]; b.visible = true; b.position.set((hb.x0 + hb.x1) / 2, (hb.y0 + hb.y1) / 2, 0.4); b.scale.set(hb.x1 - hb.x0, hb.y1 - hb.y0, 1);
        const m = getMove(F);
        if (F.state === 'attack' && m && m.hit && F.f >= m.active[0] && F.f <= m.active[1]) {
          const [ja, jb, r] = m.hit[0]; if (!F.J[ja] || !F.J[jb]) return;
          const a = toWorld(F, F.J[ja]), c = toWorld(F, F.J[jb]);
          for (let k = 0; k <= 6 && bi < this.hitBalls.length; k++) { const s = this.hitBalls[bi++]; s.visible = true; s.position.set(a[0] + (c[0] - a[0]) * k / 6, a[1] + (c[1] - a[1]) * k / 6, 0.45); s.scale.setScalar(r * F.scale); }
        }
      });
    }
    // cámara: punto medio, se aleja con la distancia y sube con los saltos
    // cámara: encuadra a los dos luchadores en horizontal y en vertical (saltos incluidos)
    const [A, B] = M.fighters, mid = (A.x + B.x) / 2, dist = Math.abs(A.x - B.x);
    const aspect = W / H, tanH = Math.tan(camera.fov * Math.PI / 360);
    const bottom = Math.min(0, A.y, B.y) - 0.1, top = Math.max(A.y, B.y) + 2.05;
    const yT = Math.max(0.95, (bottom + top) / 2);
    const zX = (dist / 2 + 1.1) / (tanH * aspect), zY = (top - bottom) / 2 / tanH * 1.08;
    const zT = Math.min(11, Math.max(5.2, zX, zY));
    this.camX += (mid - this.camX) * 0.12; this.camZ += (zT - this.camZ) * 0.1; this.camY += (yT - this.camY) * 0.14;
    this.shake *= 0.85; const sh = (Math.random() - .5) * this.shake;
    camera.position.set(this.camX + sh, this.camY + 0.15 + sh * 0.5, this.camZ); camera.lookAt(this.camX, this.camY, 0);
    this.vfx.update(dt, camera);
    renderer.render(scene, camera);
  }
  get drawCalls() { return this.renderer.info.render.calls; }
}
