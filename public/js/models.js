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
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec3 outlineNormal;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `vec3 transformed = vec3(position) + normalize(outlineNormal) * ${thick.toFixed(4)};`);
  };
  m.userData.outline = true; outlineMats.set(thick, m); return m;
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

export class ModelLibrary {
  constructor() { this.loader = new GLTFLoader(); this.chars = new Map(); this.clips = null; }
  async loadAnims() {
    if (this.clips) return this.clips;
    const g = await this.loader.loadAsync(BASE + 'anims.glb');
    this.clips = new Map(g.animations.map(c => [c.name, c]));
    this.meta = analyzeClips(g.scene, this.clips);
    return this.clips;
  }
  async loadChar(model) {
    if (!this.chars.has(model)) this.chars.set(model, this.loader.loadAsync(BASE + model + '.glb').then(g => { prepare(g.scene); return g; }));
    return this.chars.get(model);
  }
  async preload(models) { await Promise.all([this.loadAnims(), ...models.map(m => this.loadChar(m))]); }
}

function prepare(scene) {
  scene.traverse(o => {
    if (!o.isMesh) return;
    addOutlineNormals(o.geometry);
    const src = o.material;
    o.material = new THREE.MeshToonMaterial({ map: src.map || null, color: src.map ? '#ffffff' : (src.color || '#ffffff'), gradientMap: grad() });
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
    const { height = 1.8, outline = 0.022 } = opts;
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
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {}; for (const [n, c] of lib.clips) this.actions[n] = this.mixer.clipAction(c);
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
