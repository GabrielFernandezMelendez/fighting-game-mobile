// =====================================================================
//  EFECTOS CARTOON (solo presentación, no tocan la simulación)
//  - Estela del arma en los frames de ataque, con el color de acento del
//    personaje (Aura: naranja como en su lámina).
//  - Estrella de impacto plana (estilo anime/2XKO) en cada golpe.
//  - Polvo al hacer dash, backdash, saltar y aterrizar.
// =====================================================================
const TRAIL_N = 12;            // muestras de la estela
const DUST_POOL = 28, STAR_POOL = 6;

export class VFX {
  constructor(THREE, scene) {
    this.T = THREE; this.scene = scene;
    this.trails = []; this.dust = []; this.stars = [];
    // polvo: discos planos con borde, mirando a cámara
    const dGeo = new THREE.CircleGeometry(1, 14), dEdge = new THREE.RingGeometry(0.86, 1, 14);
    for (let i = 0; i < DUST_POOL; i++) {
      const g = new THREE.Group();
      const fill = new THREE.Mesh(dGeo, new THREE.MeshBasicMaterial({ color: '#d9d3e6', transparent: true, depthWrite: false }));
      const edge = new THREE.Mesh(dEdge, new THREE.MeshBasicMaterial({ color: '#6b6280', transparent: true, depthWrite: false }));
      edge.position.z = 0.001; g.add(fill, edge); g.visible = false; scene.add(g);
      this.dust.push({ g, fill, edge, life: 0 });
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
      fragmentShader: 'uniform vec3 color; uniform vec3 core; varying float va; varying float vside; void main(){ if (va < 0.02) discard; vec3 c = vside > 0.62 && va > 0.45 ? core : color; gl_FragColor = vec4(c, step(0.15, va) * 0.95); }',
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

  // ---------- polvo e impactos ----------
  puff(x, y, dir = 0, big = false) {
    const n = big ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const d = this.dust.find(p => p.life <= 0); if (!d) return;
      d.life = 1; d.x = x - dir * (0.1 + i * 0.07); d.y = y + 0.06 + Math.random() * 0.05;
      d.vx = -dir * (0.9 + Math.random() * 1.2) + (dir ? 0 : (Math.random() - 0.5) * 2.4); d.vy = 0.25 + Math.random() * 0.5;
      d.s = (big ? 0.11 : 0.08) + Math.random() * 0.05; d.g.visible = true;
    }
  }
  star(x, y, color) {
    const s = this.stars.find(p => p.life <= 0) || this.stars[0];
    s.life = 1; s.x = x; s.y = y; s.rot = Math.random() * Math.PI; s.outer.material.color.set(color); s.g.visible = true;
  }
  update(dt, camera) {
    for (const d of this.dust) {
      if (d.life <= 0) { d.g.visible = false; continue; }
      d.life -= dt * 2.2; d.x += d.vx * dt; d.y += d.vy * dt; d.vx *= 0.9; d.vy *= 0.92;
      const sc = d.s * (1.6 - d.life * 0.6);
      d.g.position.set(d.x, d.y, 0.3); d.g.scale.setScalar(sc); d.g.quaternion.copy(camera.quaternion);
      // animación limitada: la opacidad cae en escalones
      const o = Math.ceil(Math.max(0, d.life) * 3) / 3; d.fill.material.opacity = o * 0.9; d.edge.material.opacity = o;
    }
    for (const s of this.stars) {
      if (s.life <= 0) { s.g.visible = false; continue; }
      s.life -= dt * 7;
      const k = 1 - s.life; s.g.position.set(s.x, s.y, 0.5); s.g.rotation.z = s.rot; s.g.scale.setScalar(0.12 + k * 0.28);
      s.outer.material.opacity = s.inner.material.opacity = s.life > 0.35 ? 1 : s.life / 0.35;
    }
  }
}
