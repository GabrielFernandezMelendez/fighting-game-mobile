// =====================================================================
//  MODELOS (Quaternius RPG Characters, CC0) + ANIMACIONES (Universal
//  Animation Library 1 y 2, CC0) retargeteadas al esqueleto compartido.
//  Cel-shading con MeshToonMaterial + contorno por casco invertido que
//  respeta el skinning (atributo outlineNormal suavizado).
// =====================================================================
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from '../vendor/jsm/utils/SkeletonUtils.js';

const BASE = new URL('../assets/chars/', import.meta.url).href;
let gradTex = null;
function grad() {
  if (gradTex) return gradTex;
  gradTex = new THREE.DataTexture(new Uint8Array([125, 125, 125, 255, 195, 195, 195, 255, 255, 255, 255, 255]), 3, 1, THREE.RGBAFormat);
  gradTex.minFilter = gradTex.magFilter = THREE.NearestFilter; gradTex.needsUpdate = true;
  return gradTex;
}

// Material de contorno: desplaza el vértice ANTES del skinning
const outlineMats = new Map();
export function outlineMaterial(thick = 0.022) {
  if (outlineMats.has(thick)) return outlineMats.get(thick);
  const m = new THREE.MeshBasicMaterial({ color: '#0d0d14', side: THREE.BackSide });
  // empujar el contorno hacia atrás en profundidad: en prendas finas (dos capas muy juntas) el casco
  // extruido de la capa trasera taparía a la delantera y aparecerían manchas negras
  m.polygonOffset = true; m.polygonOffsetFactor = 2; m.polygonOffsetUnits = 8;
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec3 outlineNormal;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed = vec3(position) + normalize(outlineNormal) * ${thick.toFixed(4)};`)
      .replace('#include <fog_vertex>', '#include <fog_vertex>\n  gl_Position.z += 0.0008 * gl_Position.w;');
  };
  m.userData.outline = true; outlineMats.set(thick, m); return m;
}

// ------------------------------------------------------------------
//  Cel-shading NEÓN: dos bandas duras con color de sombra propio por material (no gris),
//  borde iluminado con el acento del personaje y sin depender de la intensidad de las luces.
//  La banda se decide con N·L de una luz clave fija en espacio de cámara.
// ------------------------------------------------------------------
export const CEL_PRESETS = {
  default: { shade: '#7b6d98', band: 0.12, rim: 0.22 },
  pelo:    { shade: '#9a8ac4', band: 0.22, rim: 0.14 },
  mascara: { shade: '#a39db8', band: 0.28, rim: 0.12 },
  borgona: { shade: '#a06682', band: 0.10, rim: 0.13 },
  granate: { shade: '#96607e', band: 0.11, rim: 0.10 },
  vacio:   { shade: '#4b3052', band: 0.28, rim: 0 },
  vendas:  { shade: '#b78a8b', band: 0.10, rim: 0.05 },
  piel:    { shade: '#c08680', band: 0.10, rim: 0.10 },
};
export function makeCel(mat, preset, rimColor = '#ff9a50') {
  const P = preset || CEL_PRESETS.default;
  mat.userData.cel = { uShade: { value: new THREE.Color(P.shade) }, uBand: { value: P.band }, uRim: { value: new THREE.Color(rimColor).multiplyScalar(P.rim) } };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, mat.userData.cel);
    sh.fragmentShader = 'uniform vec3 uShade; uniform float uBand; uniform vec3 uRim;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 alb = diffuseColor.rgb;
      // luz clave fija respecto a la cámara (arriba y a un lado): sombras legibles en la vista lateral
      float nl = dot(normal, normalize(vec3(0.62, 0.58, 0.52)));
      float lit = smoothstep(uBand - 0.015, uBand + 0.015, nl);
      vec3 cel = mix(alb * uShade, alb, lit);
      float fres = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      cel += uRim * step(0.62, fres) * lit;
      outgoingLight = cel + totalEmissiveRadiance;
      #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'neon-cel';
  mat.needsUpdate = true;
  return mat;
}

// Normales promediadas por posición (las mallas low-poly vienen con aristas duras)
function addOutlineNormals(geo) {
  if (geo.getAttribute('outlineNormal')) return;
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), map = new Map();
  const key = i => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  for (let i = 0; i < pos.count; i++) { const k = key(i), v = map.get(k) || [0, 0, 0]; v[0] += nor.getX(i); v[1] += nor.getY(i); v[2] += nor.getZ(i); map.set(k, v); }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { const v = map.get(key(i)), l = Math.hypot(...v) || 1; out[i * 3] = v[0] / l; out[i * 3 + 1] = v[1] / l; out[i * 3 + 2] = v[2] / l; }
  geo.setAttribute('outlineNormal', new THREE.BufferAttribute(out, 3));
}

// Juego de clips por modelo: los modelos RPG comparten 'anims'; los esqueletos propios llevan el suyo
// (mismos nombres de hueso, distinta pose de reposo → el retarget se hace por esqueleto).
export const MODEL_ANIMS = { aura: 'aura_anims', sombra: 'aura_anims' };
export const animSetFor = model => MODEL_ANIMS[model] || 'anims';

export class ModelLibrary {
  constructor() { this.loader = new GLTFLoader(); this.chars = new Map(); this.sets = new Map(); this.clips = null; }
  async loadAnims(set = 'anims') {
    if (!this.sets.has(set)) this.sets.set(set, this.loader.loadAsync(BASE + set + '.glb').then(g => {
      const clips = new Map(g.animations.map(c => [c.name, c]));
      return { clips, meta: analyzeClips(g.scene, clips) };
    }));
    const r = await this.sets.get(set);
    if (set === 'anims') { this.clips = r.clips; this.meta = r.meta; }   // compatibilidad
    return r;
  }
  setFor(model) { return this.sets.get(animSetFor(model)); }
  async loadChar(model) {
    if (!this.chars.has(model)) this.chars.set(model, this.loader.loadAsync(BASE + model + '.glb').then(g => { prepare(g.scene); return g; }));
    return this.chars.get(model);
  }
  async preload(models) {
    const sets = [...new Set(['anims', ...models.map(animSetFor)])];
    await Promise.all([...sets.map(x => this.loadAnims(x)), ...models.map(m => this.loadChar(m))]);
    this.resolved = new Map(); for (const x of sets) this.resolved.set(x, await this.sets.get(x));
  }
  animsFor(model) { return (this.resolved && this.resolved.get(animSetFor(model))) || { clips: this.clips, meta: this.meta }; }
}

function prepare(scene) {
  scene.traverse(o => {
    if (!o.isMesh) return;
    addOutlineNormals(o.geometry);
    const src = o.material; o.userData.srcMat = src.name || '';
    // color plano por cara (atributo COLOR_0) si el GLB no trae textura: bordes de color duros
    const vc = !src.map && !!o.geometry.attributes.color;
    o.material = new THREE.MeshToonMaterial({ map: src.map || null, color: src.map || vc ? '#ffffff' : (src.color || '#ffffff'), vertexColors: vc, gradientMap: grad() });
    if (o.material.map) { o.material.map.colorSpace = THREE.SRGBColorSpace; o.material.map.magFilter = THREE.LinearFilter; }
    o.frustumCulled = false;
  });
}

// Punto de impacto de cada clip: fotograma de máxima velocidad del puño/arma derecho (o pie)
function analyzeClips(scene, clips) {
  const meta = {}, root = scene, mixer = new THREE.AnimationMixer(root);
  const bones = {}; root.traverse(o => { if (o.isBone || o.type === 'Object3D') bones[o.name] = o; });
  const probes = ['FistR', 'FistL', 'FootR', 'FootL'].map(n => bones[n]).filter(Boolean);
  const v = new THREE.Vector3();
  for (const [name, clip] of clips) {
    const act = mixer.clipAction(clip); act.play();
    const n = Math.max(2, Math.round(clip.duration * 30)); let best = 0, bestT = 0.5; const prev = probes.map(() => new THREE.Vector3());
    for (let i = 0; i <= n; i++) {
      act.time = clip.duration * i / n; mixer.update(0); root.updateMatrixWorld(true);
      probes.forEach((b, k) => { b.getWorldPosition(v); if (i > 0) { const s = v.distanceTo(prev[k]); if (s > best && i / n < 0.85) { best = s; bestT = i / n; } } prev[k].copy(v); });
    }
    act.stop(); meta[name] = { dur: clip.duration, hit: bestT };
  }
  return meta;
}

// ------------------------------------------------------------------
//  Instancia de luchador: modelo clonado + mezclador + selección de clip
// ------------------------------------------------------------------
export class ModelFighter {
  constructor(lib, gltf, opts) {
    const { height = 1.8, outline = 0.022, model, doubleSide = false, cel = false, rimColor } = opts;
    this.lib = lib;
    this.root = new THREE.Group();         // posición + espejo
    this.turn = new THREE.Group();         // orientación 3/4
    this.model = skClone(gltf.scene);
    this.root.add(this.turn); this.turn.add(this.model);
    this.turn.rotation.y = -(Math.PI / 2 - 1.0);   // junto con el espejo de root: mano del arma hacia el rival
    const s = height / 2.76; this.model.scale.setScalar(s); this.baseScale = s;
    this.outlines = [];
    this.model.traverse(o => {
      if (o.isSkinnedMesh) {
        const ol = new THREE.SkinnedMesh(o.geometry, outlineMaterial(outline)); ol.bind(o.skeleton, o.bindMatrix); ol.frustumCulled = false; ol.userData.outline = true;
        o.parent.add(ol); this.outlines.push(ol);
      } else if (o.isMesh && !o.userData.outline && o.geometry.getAttribute('outlineNormal')) {
        const ol = new THREE.Mesh(o.geometry, outlineMaterial(outline)); ol.userData.outline = true; o.add(ol); this.outlines.push(ol);
      }
    });
    this.bones = {}; this.model.traverse(o => { if (o.isBone) this.bones[o.name] = o; });
    this.mats = []; this.model.traverse(o => { if (o.isMesh && !o.userData.outline && o.material.isMeshToonMaterial) this.mats.push(o.material = o.material.clone()); });
    // mallas de imagen→3D con capas finas: doble cara evita ver el casco del contorno por dentro
    if (doubleSide) for (const m of this.mats) m.side = THREE.DoubleSide;
    // cel-shading por material: el nombre del material del GLB elige el preset (Aura_pelo, Aura_mascara…)
    if (cel) this.model.traverse(o => {
      if (!o.isMesh || o.userData.outline || !o.material.isMeshToonMaterial) return;
      const key = Object.keys(CEL_PRESETS).find(k => (o.userData.srcMat || '').toLowerCase().includes(k));
      makeCel(o.material, CEL_PRESETS[key] || CEL_PRESETS.default, rimColor);
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    const set = lib.animsFor(model); this.meta = set.meta;
    this.actions = {}; for (const [n, c] of set.clips) this.actions[n] = this.mixer.clipAction(c);
    this.cur = null; this.prev = null; this.blend = 0;
  }
  hand() { return this.bones.WeaponR || this.bones.FistR; }
  // clip: nombre, t: segundos, blendFrames: fotogramas de fundido al cambiar de clip
  pose(clip, t, blendFrames = 0) {
    const a = this.actions[clip]; if (!a) return;
    if (this.cur !== a) {
      if (this.prev && this.prev !== a) this.prev.stop();
      this.prev = blendFrames > 0 ? this.cur : null; if (this.cur && !this.prev) this.cur.stop();
      this.cur = a; a.reset(); a.play(); a.setEffectiveWeight(1); this.blend = blendFrames; this.blendLeft = blendFrames;
    }
    a.time = Math.min(t, a.getClip().duration - 1e-4); a.paused = true;
    if (this.prev) {
      this.blendLeft--; const w = Math.max(0, this.blendLeft / Math.max(1, this.blend));
      if (w <= 0) { this.prev.stop(); this.prev = null; a.setEffectiveWeight(1); }
      else { this.prev.paused = true; this.prev.setEffectiveWeight(w); a.setEffectiveWeight(1 - w); }
    }
    this.mixer.update(0);
  }
  flash(on) { for (const m of this.mats) m.emissive.set(on ? '#ffffff' : '#000000'), m.emissiveIntensity = on ? 0.6 : 0; }
  setOutline(on) { for (const o of this.outlines) o.visible = on; }
}
