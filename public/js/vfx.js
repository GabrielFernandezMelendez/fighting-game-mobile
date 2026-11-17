// =====================================================================
//  EFECTOS CARTOON (solo presentación, no tocan la simulación)
//  - Estela del arma en los frames de ataque, con el color de acento del
//    personaje (Aura: naranja como en su lámina).
//  - Estrella de impacto plana (estilo anime/2XKO) en cada golpe.
//  - Polvo al hacer dash, backdash, saltar y aterrizar.
// =====================================================================
import { practiceDustFrames } from './practice-sprites.js';

const TRAIL_N = 12;            // muestras de la estela
const DUST_POOL = 24, STAR_POOL = 6;
// Polvo como en la lámina V3 (AVANCE / SALTO): nube beige con volumen cel de tres tonos, volutas onduladas,
// con lenguas puntiagudas que se arrastran hacia atrás y se deshace en huecos (no se desvanece).
const DUST_LIGHT = '#e2d5c5', DUST_SHADE = '#ae9c90', DUST_DEEP = '#7f6c66';
const DUST_FPS = 12;           // animación limitada: la forma cambia a 12 fps como en el anime
const DUST_FRAG = `
uniform float uT, uDir, uSeed, uW, uH; uniform vec3 uLight, uShade, uDeep; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float smax(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0); return mix(b, a, h) + k * h * (1.0 - h); }
// p en unidades de altura de la nube; x positiva = hacia atrás (la estela)
float field(vec2 p){
  float g = 1.0 - pow(1.0 - min(1.0, uT * 2.4), 3.0);          // crece muy rápido y se frena
  float f = -1.0;
  for (int i = 0; i < 3; i++) {                                  // cuerpo de la nube pegado al suelo
    float fi = float(i), j = hash(vec2(fi, uSeed));
    vec2 c = vec2((0.12 + fi * 0.30) * g + uT * 0.2 * fi, 0.20 - fi * 0.03 + uT * 0.08 + j * 0.04);
    float r = (0.34 - fi * 0.06) * (0.5 + 0.5 * g) * (0.9 + 0.2 * j);
    f = smax(f, r - length(p - c), 0.10);
  }
  for (int i = 0; i < 3; i++) {                                  // volutas onduladas que barren hacia atrás y se enroscan
    float fi = float(i), j = hash(vec2(fi + 7.0, uSeed));
    vec2 b = vec2(0.10 + fi * 0.16, 0.16 + fi * 0.13) * g;
    float len = (1.25 + 0.35 * j - fi * 0.22) * g + uT * 0.4, x = p.x - b.x;
    float k = clamp(x / max(len, 0.05), 0.0, 1.0);
    float yc = b.y + x * (0.07 + 0.10 * fi) + x * x * (0.10 + 0.08 * j)                // sube suave y se curva al final
             + 0.09 * sin(x * 5.0 + j * 6.28 + uT * 4.0) * k;                       // ondulación
    float w = (0.30 - fi * 0.06) * g * pow(1.0 - k, 0.65) * (1.0 + 0.28 * sin(x * 9.0 + fi * 2.0 + j * 3.0));   // borde festoneado
    f = smax(f, min(w - abs(p.y - yc), min(x + 0.2, len - x)), 0.07);
  }
  f += (vnoise(p * 6.0 + uSeed) - 0.5) * 0.03;
  float e = smoothstep(0.35, 1.0, uT);                           // se deshace en huecos y adelgaza
  f -= e * (0.05 + 0.28 * vnoise(p * 3.5 + uSeed * 3.1));
  return f;
}
void main(){
  vec2 p = vec2((vUv.x - 0.5) * 2.0 * uW, vUv.y * uH * 1.5) / uH;
  p.x = uDir == 0.0 ? abs(p.x) : -uDir * p.x;
  if (p.y < 0.0) discard;
  float f = field(p);
  if (f < 0.0) discard;
  // volumen cel: tres tonos duros según lo que queda "debajo" del punto respecto a la luz (arriba-delante)
  vec2 L = normalize(vec2(-0.45, 1.0));
  vec3 col = uLight;
  float u1 = field(p - L * 0.26), u2 = field(p - L * 0.10);
  if (u1 < 0.02) col = uShade;
  if (u2 < 0.01) col = uDeep;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export class VFX {
  constructor(THREE, scene) {
    this.T = THREE; this.scene = scene;
    this.trails = []; this.dust = []; this.stars = [];
    // polvo cel-shading: un quad por nube, la forma se dibuja en el shader (ver DUST_FRAG)
    const dGeo = new THREE.PlaneGeometry(1, 1); dGeo.translate(0, 0.5, 0);
    for (let i = 0; i < DUST_POOL; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uDir: { value: 0 }, uSeed: { value: 0 }, uW: { value: 1 }, uH: { value: 0.5 },
          uLight: { value: new THREE.Color(DUST_LIGHT) }, uShade: { value: new THREE.Color(DUST_SHADE) }, uDeep: { value: new THREE.Color(DUST_DEEP) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: DUST_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const g = new THREE.Mesh(dGeo, mat); g.visible = false; g.renderOrder = 4; g.frustumCulled = false; scene.add(g);
      this.dust.push({ g, mat, life: 0 });
    }
    // estrella de impacto de 8 puntas
    const sh = new THREE.Shape();
    for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 0.38 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    const sGeo = new THREE.ShapeGeometry(sh);
    for (let i = 0; i < STAR_POOL; i++) {
      const g = new THREE.Group();
      const outer = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: '#ff7a1a', transparent: true, depthWrite: false }));
      const inner = new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ color: '#fff6e0', transparent: true, depthWrite: false }));
      inner.scale.setScalar(0.55); inner.position.z = 0.002; g.add(outer, inner); g.visible = false; scene.add(g);
      this.stars.push({ g, outer, inner, life: 0 });
    }
  }

  // ---------- estelas ----------
  // rig.trailA/trailB: objetos en la base y la punta del arma (los crea render.js)
  ensureTrail(i, color) {
    if (this.trails[i]) { this.trails[i].mat.uniforms.color.value.set(color); return this.trails[i]; }
    const T = this.T, n = TRAIL_N;
    const geo = new T.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3), alpha = new Float32Array(n * 2), idx = [];
    for (let k = 0; k < n - 1; k++) { const a = k * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
    geo.setIndex(idx); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('a', new T.BufferAttribute(alpha, 1));
    // color plano con núcleo claro: dos bandas según la distancia a la punta
    const mat = new T.ShaderMaterial({
      uniforms: { color: { value: new T.Color(color) }, core: { value: new T.Color('#fff3d6') } },
      vertexShader: 'attribute float a; varying float va; varying float vside; void main(){ va = a; vside = float(gl_VertexID % 2); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 color; uniform vec3 core; varying float va; varying float vside; void main(){ if (va < 0.02) discard; vec3 c = vside > 0.62 && va > 0.45 ? core : color; gl_FragColor = vec4(c, step(0.15, va) * 0.95);\n#include <colorspace_fragment>\n}',
      transparent: true, depthWrite: false, side: T.DoubleSide,
    });
    const mesh = new T.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 5; this.scene.add(mesh);
    const tr = { mesh, geo, mat, pts: [], fade: 0 };
    this.trails[i] = tr; return tr;
  }
  updateTrail(i, rig, F, move, color) {
    if (!rig.trailA) return;
    const tr = this.ensureTrail(i, color), T = this.T;
    const live = F.state === 'attack' && move && move.hit && F.f >= move.active[0] - 2 && F.f <= move.active[1] + 2;
    if (live) {
      const a = rig.trailA.getWorldPosition(new T.Vector3()), b = rig.trailB.getWorldPosition(new T.Vector3());
      // la estela nace desde la mitad del arma hacia la punta y se alarga un poco
      a.lerp(b, 0.35); b.add(b.clone().sub(a).multiplyScalar(0.15));
      tr.pts.unshift({ a, b }); if (tr.pts.length > TRAIL_N) tr.pts.pop(); tr.fade = 1;
    } else { tr.fade = Math.max(0, tr.fade - 0.25); if (tr.fade === 0) tr.pts.length = 0; }
    const pos = tr.geo.attributes.position.array, al = tr.geo.attributes.a.array, n = tr.pts.length;
    for (let k = 0; k < TRAIL_N; k++) {
      const p = tr.pts[Math.min(k, n - 1)];
      const t = n > 1 ? 1 - k / (n - 1) : 0;
      if (!p) { al[k * 2] = al[k * 2 + 1] = 0; continue; }
      // la parte de la base se estrecha hacia la cola → forma de media luna
      const base = p.a.clone().lerp(p.b, 1 - Math.max(0.15, t));
      pos.set([base.x, base.y, base.z], k * 6); pos.set([p.b.x, p.b.y, p.b.z], k * 6 + 3);
      const v = k < n ? t * tr.fade : 0; al[k * 2] = v; al[k * 2 + 1] = v;
    }
    tr.geo.attributes.position.needsUpdate = true; tr.geo.attributes.a.needsUpdate = true;
    tr.mesh.visible = n > 1;
  }

  clearTrail(index) {
    const trail = this.trails[index];
    if (!trail) return;
    trail.pts.length = 0;
    trail.fade = 0;
    trail.mesh.visible = false;
  }

  setPracticeDust(enabled) {
    this.practiceDust = enabled;
    for (const dust of this.dust) { dust.life = 0; dust.g.visible = false; }
    this.trails.forEach((_, i) => this.clearTrail(i));
    if (enabled && !this.drawnDust) this.drawnDust = practiceDustFrames(this.T);
  }

  // ---------- polvo e impactos ----------
  // dir: dirección del movimiento (-1/1); 0 = nube a ambos lados (salto, aterrizaje)
  puff(x, y, dir = 0, big = false, age = 0) {
    if (this.practiceDust && dir === 0) {
      this.puff(x, y, -1, big, age);
      this.puff(x, y, 1, big, age);
      return;
    }
    const d = this.dust.find(p => p.life <= 0) || this.dust[0];
    d.life = 1; d.age = age; d.dur = big ? 0.5 : 0.38; d.x = x; d.y = y;
    if (this.practiceDust) {
      const T = this.T;
      d.drawn ??= new T.MeshBasicMaterial({transparent:true,alphaTest:.04,depthWrite:false,side:T.DoubleSide});
      d.g.material = d.drawn;
      d.g.scale.set(-dir * (big ? 1.5 : 1.02), big ? .58 : .43, 1);
      d.x -= dir * (big ? .44 : .30);
      d.g.visible = true;
      this.stepDust(d);
      return;
    }
    d.g.material = d.mat;
    const u = d.mat.uniforms; u.uDir.value = dir; u.uSeed.value = Math.floor(Math.random() * 97);
    u.uH.value = big ? 0.58 : 0.4; u.uW.value = big ? 1.1 : 0.7;
    d.g.scale.set(2 * u.uW.value, u.uH.value * 1.5, 1); d.g.visible = true;
    this.stepDust(d);
  }
  stepDust(d) {
    const t = Math.floor(d.age * DUST_FPS) / DUST_FPS / d.dur;   // escalonado
    d.life = t >= 1 ? 0 : 1;
    if (this.practiceDust) {
      const map = this.drawnDust[Math.min(5, Math.floor(Math.max(0, t) * 6))];
      if (d.drawn.map !== map) { d.drawn.map = map; d.drawn.needsUpdate = true; }
      d.g.visible = d.life > 0;
    } else d.mat.uniforms.uT.value = Math.min(1, t);
  }
  star(x, y, color) {
    const s = this.stars.find(p => p.life <= 0) || this.stars[0];
    s.life = 1; s.x = x; s.y = y; s.rot = Math.random() * Math.PI; s.outer.material.color.set(color); s.g.visible = true;
  }
  update(dt, camera) {
    for (const d of this.dust) {
      if (d.life <= 0) { d.g.visible = false; continue; }
      d.age += dt; this.stepDust(d);
      d.g.position.set(d.x, d.y, -0.2); d.g.quaternion.copy(camera.quaternion);   // detrás del luchador, como en la lámina
    }
    for (const s of this.stars) {
      if (s.life <= 0) { s.g.visible = false; continue; }
      s.life -= dt * 7;
      const k = 1 - s.life; s.g.position.set(s.x, s.y, 0.5); s.g.rotation.z = s.rot; s.g.scale.setScalar(0.12 + k * 0.28);
      s.outer.material.opacity = s.inner.material.opacity = s.life > 0.35 ? 1 : s.life / 0.35;
    }
  }
}
