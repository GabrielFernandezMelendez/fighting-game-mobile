// =====================================================================
//  ESCENARIOS (cel-shading NEÓN)
//  Estilo: fondos de anime 3D tipo arena de lucha (DBFZ y similares) con nuestra identidad:
//  colores planos en 2-3 tonos duros, contorno de tinta en los objetos cercanos, cielos en bandas,
//  capas de profundidad (cerca / medio / lejos) y acentos naranja, carmesí y cian de la paleta.
//  Cada escenario devuelve { group, update(t, dt, cam), dispose() } y no toca la simulación.
// =====================================================================
export const STAGES = [
  { id: 'sala', name: 'Sala de pruebas', desc: 'Laboratorio de entrenamiento de NEÓN.' },
  { id: 'azotea', name: 'Azotea', desc: 'Noche en la ciudad, lluvia de cometas.' },
  { id: 'mercado', name: 'Mercado bajo la lluvia', desc: 'Puestos, farolillos y charcos.' },
];
export const stageById = id => STAGES.find(s => s.id === id) || STAGES[0];

export function buildStage(id, T, opts = {}) {
  const K = kit(T, opts.quality ?? 2);
  const S = id === 'azotea' ? azotea(K) : id === 'mercado' ? mercado(K) : sala(K);
  return S;
}

// ---------- Herramientas comunes ----------
function kit(T, quality) {
  const ramps = new Map();
  // rampa de 3 tonos duros (sombra, medio, luz): el tono de sombra es más frío, como en la guía
  const ramp = (a, b, c) => { const k = a + b + c; if (ramps.has(k)) return ramps.get(k);
    const d = [a, b, c].flatMap(h => { const x = new T.Color(h); return [x.r * 255, x.g * 255, x.b * 255, 255]; });
    const tx = new T.DataTexture(new Uint8Array(d), 3, 1, T.RGBAFormat); tx.minFilter = tx.magFilter = T.NearestFilter; tx.colorSpace = T.SRGBColorSpace; tx.needsUpdate = true;
    ramps.set(k, tx); return tx; };
  const grey = ramp('#5c5c6e', '#a7a7b4', '#ffffff');
  const mats = [], geos = [];
  const keep = (m) => { mats.push(m); return m; };
  const toon = (color, emissive = '#000000') => keep(new T.MeshToonMaterial({ color, emissive, gradientMap: grey }));
  const flat = (color, extra = {}) => keep(new T.MeshBasicMaterial({ color, ...extra }));
  // Contorno de tinta (mismo color que el de los personajes, INK #140f1c). Casco invertido por escala: una copia
  // negra un poco más grande alrededor del centro de la pieza, vista por dentro (BackSide), así las aristas de
  // cajas y cilindros quedan cerradas (empujar por la normal abre las esquinas de las cajas). En piezas planas
  // (carteles, ventanas) va una placa negra mayor justo detrás, con polygonOffset para que no parpadee.
  // El grosor crece con la distancia para que en pantalla mida lo mismo cerca y lejos (≈2 px).
  const INK = '#140f1c';
  const inkHull = keep(new T.MeshBasicMaterial({ color: INK, side: T.BackSide }));
  const inkFlat = keep(new T.MeshBasicMaterial({ color: INK, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 6 }));
  const inkW = z => 0.02 * (1 + Math.abs(z) / 7);
  const sz = new T.Vector3(), ct = new T.Vector3();
  const hull = (mesh, z = mesh.position.z) => {
    const g = mesh.geometry; g.computeBoundingBox(); g.boundingBox.getSize(sz); g.boundingBox.getCenter(ct);
    const t = inkW(z), sc = mesh.scale, dims = [sz.x, sz.y, sz.z], scl = [sc.x, sc.y, sc.z];
    const flatAxis = dims.findIndex(v => v < 1e-3);
    const k = dims.map((v, i) => v < 1e-3 ? 1 : (v + 2 * t / Math.abs(scl[i])) / v);
    const o = new T.Mesh(g, flatAxis >= 0 ? inkFlat : inkHull);
    o.scale.set(k[0], k[1], k[2]); o.position.set(ct.x * (1 - k[0]), ct.y * (1 - k[1]), ct.z * (1 - k[2]));
    o.userData.outline = true; o.visible = quality > 0; mesh.add(o); return o;
  };
  const group = new T.Group();
  const add = (mesh, outline = false, parent = group) => {
    parent.add(mesh); geos.push(mesh.geometry);
    if (outline) hull(mesh);
    return mesh;
  };
  const box = (w, h, d, mat, x, y, z, outline = true, parent) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return add(m, outline, parent); };
  // cielo pintado en bandas (4-6 escalones de color, sin degradado suave)
  const sky = (stops, bands = 6, extra = '') => {
    const cols = stops.map(c => new T.Color(c));
    const m = keep(new T.ShaderMaterial({ depthWrite: false, uniforms: { c0: { value: cols[0] }, c1: { value: cols[1] }, c2: { value: cols[2] }, bands: { value: bands } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 c0, c1, c2; uniform float bands; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){ float y = floor(vUv.y * bands) / bands; vec3 c = y < .5 ? mix(c0, c1, y * 2.) : mix(c1, c2, (y - .5) * 2.);
          vec2 g = floor(vUv * vec2(260., 120.)); float s = step(.996, h(g)) * smoothstep(.45, .9, vUv.y); c += s * .8; ${extra}
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }` }));
    const p = new T.Mesh(new T.PlaneGeometry(90, 34), m); p.position.set(0, 9, -26); return add(p);
  };
  // nube plana de dos tonos (forma de bolas fusionadas, como las del polvo)
  const cloud = (x, y, z, w, light, shade) => {
    const g = new T.Group();
    for (let i = 0; i < 5; i++) {
      const r = w * (0.16 + 0.1 * Math.sin(i * 2.3 + x)), cx = (i - 2) * w * 0.18;
      const a = new T.Mesh(new T.CircleGeometry(r, 18), flat(light)); a.position.set(cx, r * 0.4, 0); g.add(a); geos.push(a.geometry);
      const b = new T.Mesh(new T.CircleGeometry(r * 0.92, 18), flat(shade)); b.position.set(cx + r * 0.1, r * 0.25, -0.01); g.add(b); geos.push(b.geometry);
    }
    const base = new T.Mesh(new T.PlaneGeometry(w * 0.95, w * 0.12), flat(shade)); base.position.set(0, w * 0.02, -0.005); g.add(base); geos.push(base.geometry);
    g.position.set(x, y, z); group.add(g); return g;
  };
  // textura de texto (rótulos, números del suelo) con las fuentes de la interfaz
  const textTex = (txt, { font = '600 64px "Zalando Sans Expanded", sans-serif', color = '#ECEEF4', w = 512, h = 128, bg = null, align = 'center' } = {}) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(txt, align === 'center' ? w / 2 : 8, h / 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const dispose = () => { for (const g of geos) g.dispose(); for (const m of mats) { m.map?.dispose(); m.dispose(); } for (const r of ramps.values()) r.dispose(); };
  return { T, quality, group, toon, flat, inkHull, inkW, add, box, sky, cloud, textTex, keep, geos, dispose, ramp };
}
const rnd = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

// =====================================================================
//  1) SALA DE PRUEBAS — laboratorio de NEÓN: suelo de paneles con medidas, pared con franjas de luz,
//     emblema octogonal, focos de techo y blancos holográficos.
// =====================================================================
function sala(K) {
  const { T, group, toon, flat, box, add, textTex } = K;
  const bg = new T.Color('#16132A');
  // suelo de paneles (dos tonos alternos) + juntas + marcas de distancia cada metro
  const floorA = toon('#25223F'), floorB = toon('#1E1B36');
  for (let i = -9; i < 9; i++) for (let j = 0; j < 6; j++) {
    const m = new T.Mesh(new T.BoxGeometry(0.98, 0.04, 1.48), (i + j) % 2 ? floorA : floorB); m.position.set(i + 0.5, -0.02, 1.5 - j * 1.5); add(m);
  }
  const lines = []; for (let x = -9; x <= 9; x += 1) lines.push(new T.Vector3(x, 0.002, 2.25), new T.Vector3(x, 0.002, -6));
  for (let z = 2.25; z >= -6; z -= 1.5) lines.push(new T.Vector3(-9, 0.002, z), new T.Vector3(9, 0.002, z));
  const lg = new T.BufferGeometry().setFromPoints(lines); K.geos.push(lg);
  group.add(new T.LineSegments(lg, K.keep(new T.LineBasicMaterial({ color: '#140f1c' }))));
  // carril central de combate con marcas naranjas y números
  const lane = new T.Mesh(new T.PlaneGeometry(8.4, 0.05), flat('#FF7A1A')); lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.004, 0.75); add(lane);
  for (let x = -4; x <= 4; x++) {
    const tick = new T.Mesh(new T.PlaneGeometry(0.04, x % 2 ? 0.18 : 0.34), flat(x ? '#FF7A1A' : '#20E3E3')); tick.rotation.x = -Math.PI / 2; tick.position.set(x, 0.005, 0.75); add(tick);
    if (x % 2 === 0) { const n = new T.Mesh(new T.PlaneGeometry(0.42, 0.11), K.keep(new T.MeshBasicMaterial({ map: textTex(String(Math.abs(x)), { color: '#A9ACC2' }), transparent: true })));
      n.rotation.x = -Math.PI / 2; n.position.set(x, 0.006, 1.02); add(n); }
  }
  // emblema octogonal en el suelo (la Ó del logo)
  const oct = new T.Mesh(new T.RingGeometry(0.62, 0.7, 8, 1, Math.PI / 8), flat('#FF7A1A', { transparent: true, opacity: 0.55 })); oct.rotation.x = -Math.PI / 2; oct.position.set(0, 0.006, -1.4); add(oct);
  // pared del fondo: paneles altos con chaflán + franjas de luz
  const wallM = toon('#221E3F'), wallD = toon('#1A1732'), trim = toon('#34305A');
  for (let i = -11; i <= 11; i++) {
    const h = 5.2, w = 1.9;
    const p = new T.Mesh(new T.BoxGeometry(w - 0.06, h, 0.3), i % 2 ? wallM : wallD); p.position.set(i * w, h / 2, -6.2); add(p, true);
    const strip = new T.Mesh(new T.BoxGeometry(0.05, 1.5, 0.05), flat(i % 3 === 0 ? '#20E3E3' : '#FF7A1A')); strip.position.set(i * w - w * 0.32, 1.25, -6.02); add(strip, true);
    const vent = new T.Mesh(new T.BoxGeometry(w * 0.5, 0.36, 0.04), toon('#2E2954')); vent.position.set(i * w + 0.25, 0.75, -6.02); add(vent, true);
  }
  box(44, 0.18, 0.5, trim, 0, 0.09, -5.95, true);                 // zócalo
  box(44, 0.16, 0.5, trim, 0, 1.55, -5.95, true);                   // franja media
  // emblema de la pared: NEÓN en Megrim sobre placa octogonal
  const plate = new T.Mesh(new T.CircleGeometry(1.15, 8, Math.PI / 8), toon('#2A2650')); plate.position.set(0, 2.75, -6.02); add(plate, true);
  const ring = new T.Mesh(new T.RingGeometry(1.15, 1.24, 8, 1, Math.PI / 8), flat('#FF7A1A')); ring.position.set(0, 2.75, -6.01); add(ring);
  const logo = new T.Mesh(new T.PlaneGeometry(2.0, 0.5), K.keep(new T.MeshBasicMaterial({ transparent: true, map: textTex('NEÓN', { font: '400 92px Megrim, sans-serif', w: 512, h: 128 }) })));
  logo.position.set(0, 2.75, -6.0); add(logo);
  // ventanal superior con cielo nocturno
  const glass = new T.Mesh(new T.PlaneGeometry(44, 1.4), flat('#2E2560')); glass.position.set(0, 4.6, -6.1); add(glass, true);
  for (let i = -11; i <= 11; i++) box(0.12, 1.4, 0.12, trim, i * 1.9, 4.6, -6.0, true);
  // focos de techo
  for (let x = -6; x <= 6; x += 3) {
    box(1.4, 0.08, 0.3, toon('#34305A'), x, 5.6, -3.5, true);
    const l = new T.Mesh(new T.PlaneGeometry(1.2, 0.05), flat('#FFF1DC')); l.position.set(x, 5.55, -3.34); add(l);
  }
  // pilares laterales que marcan el límite del escenario, con franjas de peligro
  const stripeTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#1A1732'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#FFC21A'; for (let k = -64; k < 128; k += 24) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 12, 0); g.lineTo(k + 12 - 64, 64); g.lineTo(k - 64, 64); g.fill(); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(1, 6); t.colorSpace = T.SRGBColorSpace; return t; })();
  for (const s of [-1, 1]) {
    const col = new T.Mesh(new T.BoxGeometry(0.42, 4.6, 0.42), K.keep(new T.MeshToonMaterial({ map: stripeTex, gradientMap: K.ramp('#5c5c6e', '#a7a7b4', '#ffffff') })));
    col.position.set(s * 6.4, 2.3, -3.6); add(col, true);
    const cap = new T.Mesh(new T.BoxGeometry(0.5, 0.12, 0.5), flat('#FF7A1A')); cap.position.set(s * 6.4, 4.66, -3.6); add(cap, true);
  }
  // blancos holográficos (anillos cian que rotan despacio)
  const holo = [];
  for (const [x, y] of [[-4.6, 1.6], [4.8, 1.9], [-2.4, 2.8], [2.8, 2.6]]) {
    const r = new T.Mesh(new T.RingGeometry(0.22, 0.27, 8, 1, Math.PI / 8), flat('#20E3E3', { transparent: true, opacity: 0.7, side: T.DoubleSide })); r.position.set(x, y, -5.6); add(r); holo.push(r);
  }
  return { group, background: bg, fog: null, update(t) { holo.forEach((h, i) => { h.rotation.z = t * 0.3 * (i % 2 ? 1 : -1); h.material.opacity = 0.5 + 0.25 * Math.sin(t * 2 + i); }); }, dispose: K.dispose };
}

// =====================================================================
//  2) AZOTEA — la portada: noche violeta, luna, cometas cayendo en diagonal, ciudad con neón rosa,
//     barandilla, depósito de agua, máquinas de aire y antena con luz roja.
// =====================================================================
function azotea(K) {
  const { T, group, toon, flat, box, add, sky, cloud } = K;
  sky(['#5A3A78', '#2E2558', '#120F26'], 7);
  const sun = new T.Mesh(new T.PlaneGeometry(90, 2.2), flat('#7A3E78')); sun.position.set(0, 0.6, -25.5); add(sun);
  // luna con halo en anillos (sin degradado: dos círculos planos)
  const moon = new T.Mesh(new T.CircleGeometry(1.5, 32), flat('#F2E6D8')); moon.position.set(-3.5, 4.2, -25); add(moon);
  const halo = new T.Mesh(new T.CircleGeometry(2.3, 32), flat('#4A3E86')); halo.position.set(-3.5, 4.2, -25.1); add(halo);
  cloud(-1, 4.6, -24, 9, '#4A3A80', '#3A2F6A'); cloud(11, 6.2, -24, 11, '#4A3A80', '#3A2F6A'); cloud(-13, 3.4, -23, 8, '#3D3272', '#30285E');
  // ciudad en tres capas (lejana más fría y clara, cercana más oscura), ventanas encendidas
  const R = rnd(7);
  const layer = (z, n, hMin, hMax, col, winCol, neon) => {
    const geo = new T.BoxGeometry(1, 1, 1); K.geos.push(geo);
    const bld = new T.InstancedMesh(geo, flat(col), n); const m = new T.Matrix4();
    const wins = []; let x = -30;
    for (let i = 0; i < n; i++) {
      const w = 1.2 + R() * 2.4, h = hMin + R() * (hMax - hMin); x += w * 0.5;
      m.makeScale(w, h + 4, 1).setPosition(x, (h - 4) / 2 - 1.2, z); bld.setMatrixAt(i, m);
      for (let k = 0; k < h * 1.6; k++) if (R() < 0.35) wins.push([x - w * 0.35 + R() * w * 0.7, -1.2 + R() * h, z + 0.51]);
      if (neon && R() < 0.3) { const s = new T.Mesh(new T.PlaneGeometry(0.16, 1.6 + R() * 1.6), flat(R() < 0.5 ? '#FF3D9A' : '#FF7A1A')); s.position.set(x + w * 0.5 + 0.1, h - 1.6, z + 0.6); add(s, true); }
      x += w * 0.5 + R() * 0.4;
    }
    group.add(bld);
    // contorno de los edificios: segundo InstancedMesh negro, cada caja un poco mayor (visto por dentro)
    const t = K.inkW(z), bo = new T.InstancedMesh(geo, K.inkHull, n), mm = new T.Matrix4(), pp = new T.Vector3(), qq = new T.Quaternion(), ss = new T.Vector3();
    for (let i = 0; i < n; i++) { bld.getMatrixAt(i, mm); mm.decompose(pp, qq, ss); ss.x += 2 * t; ss.y += 2 * t; ss.z += 2 * t; bo.setMatrixAt(i, mm.compose(pp, qq, ss)); }
    bo.userData.outline = true; bo.visible = K.quality > 0; group.add(bo);
    const wg = new T.PlaneGeometry(0.16, 0.12); K.geos.push(wg);
    const wi = new T.InstancedMesh(wg, flat(winCol), wins.length);
    wins.forEach((p, i) => { m.makeTranslation(...p); wi.setMatrixAt(i, m); }); group.add(wi);
  };
  layer(-21, 34, 1.5, 5, '#3A2F66', '#8070C0', false);
  layer(-16, 30, 0.8, 3.2, '#251F4A', '#C27A4E', true);
  layer(-11, 26, 0.3, 1.8, '#17132F', '#FF9A4A', true);
  // suelo de la azotea: losas en dos tonos + bordillo
  const slabA = toon('#3A3352'), slabB = toon('#332D4A');
  for (let i = -10; i < 10; i++) for (let j = 0; j < 5; j++) box(1.46, 0.06, 1.46, (i + j) % 2 ? slabA : slabB, i * 1.5 + 0.75, -0.03, 1.4 - j * 1.5, true);
  box(32, 0.5, 0.35, toon('#2A2442'), 0, 0.25, -5.4, true);
  // barandilla: postes y dos travesaños
  const rail = toon('#4A4168');
  box(32, 0.08, 0.08, rail, 0, 1.25, -5.3, true); box(32, 0.06, 0.06, rail, 0, 0.85, -5.3, true);
  for (let x = -15; x <= 15; x += 1.25) box(0.07, 0.8, 0.07, rail, x, 0.9, -5.3, true);
  // depósito de agua sobre patas, máquinas de aire y antena
  const tankM = toon('#5B4E7E');
  const tank = new T.Mesh(new T.CylinderGeometry(0.9, 0.9, 1.5, 12), tankM); tank.position.set(-6.4, 2.9, -4.2); add(tank, true);
  const roof = new T.Mesh(new T.ConeGeometry(1, 0.5, 12), toon('#433A63')); roof.position.set(-6.4, 3.9, -4.2); add(roof, true);
  for (const [dx, dz] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) box(0.08, 2.1, 0.08, rail, -6.4 + dx, 1.05, -4.2 + dz, true);
  const acM = toon('#6A6288');
  for (const [x, z] of [[5.2, -4.2], [6.6, -3.8]]) { box(1.1, 0.8, 0.8, acM, x, 0.4, z, true); const fan = new T.Mesh(new T.CircleGeometry(0.26, 12), flat('#241F3E')); fan.position.set(x, 0.42, z + 0.41); add(fan, true); }
  box(0.06, 3.6, 0.06, rail, 8.2, 1.8, -4.8, true);
  const blink = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), flat('#FF3355')); blink.position.set(8.2, 3.65, -4.8); add(blink, true);
  // cometas: detrás de todo, de arriba-izquierda a abajo-derecha, naranja y carmesí, escalonados
  const N = K.quality > 0 ? 7 : 4, comets = [];
  for (let i = 0; i < N; i++) {
    const g = new T.Group(), col = i % 2 ? '#FF3355' : '#FF7A1A';
    const tail = new T.Mesh(new T.PlaneGeometry(3.2, 0.06), K.keep(new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })));
    tail.position.x = -1.6; g.add(tail); K.geos.push(tail.geometry);
    const head = new T.Mesh(new T.CircleGeometry(0.09, 10), flat('#FFF1DC')); g.add(head); K.geos.push(head.geometry);
    g.rotation.z = -0.62; g.userData = { t0: i * 6 / N, life: 1.3, x0: -13 + (i * 7) % 22, y0: 9.5 }; g.position.z = -22; group.add(g); comets.push(g);
  }
  return { group, background: new T.Color('#100E22'), fog: null,
    update(t) {
      blink.visible = (t % 1.4) < 0.25;
      for (const c of comets) { const u = c.userData, p = ((t - u.t0) % 6 + 6) % 6; c.visible = p < u.life;
        if (c.visible) { const k = p / u.life; c.position.x = u.x0 + k * 8; c.position.y = u.y0 - k * 6; c.children[0].material.opacity = 0.85 * Math.min(1, (1 - k) * 3); } }
    }, dispose: K.dispose };
}

// =====================================================================
//  3) MERCADO BAJO LA LLUVIA — calle de noche: puestos con toldos a rayas, farolillos en cables,
//     carteles de colores, lluvia en trazos, charcos que reflejan las luces.
// =====================================================================
function mercado(K) {
  const { T, group, toon, flat, box, add, sky, cloud } = K;
  sky(['#1E3A4A', '#142838', '#0A141E'], 6);
  cloud(-6, 6.4, -24, 14, '#24485A', '#1A3646'); cloud(9, 7.4, -24, 16, '#24485A', '#1A3646');
  const R = rnd(21);
  // fachadas del fondo con carteles verticales de luz
  const facade = ['#20303E', '#1A2834', '#25343F'];
  for (let i = -8; i <= 8; i++) {
    const w = 2.2 + R() * 0.8, h = 6 + R() * 4, x = i * 2.6;
    box(w, h, 1, toon(facade[(i + 9) % 3]), x, h / 2, -10, true);
    for (let k = 0; k < 3; k++) if (R() < 0.7) { const win = new T.Mesh(new T.PlaneGeometry(0.5, 0.7), flat(R() < 0.5 ? '#FFC98A' : '#2E4E62')); win.position.set(x - 0.6 + k * 0.6, 2.4 + R() * 2.6, -9.49); add(win, true); }
    if (R() < 0.55) { const sign = new T.Mesh(new T.PlaneGeometry(0.42, 1.8), flat(['#FF3355', '#20E3E3', '#FF7A1A', '#FFC21A'][i & 3])); sign.position.set(x + w * 0.42, 2.0 + R() * 1.6, -9.2); add(sign, true); }
  }
  // puestos con toldo a rayas (rojo/crema y cian/crema), mostrador y cajas
  const stripes = (a, b) => { const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d');
    for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? a : b; g.fillRect(k * 8, 0, 8, 8); }
    const t = new T.CanvasTexture(c); t.wrapS = T.RepeatWrapping; t.repeat.set(3, 1); t.magFilter = T.NearestFilter; t.colorSpace = T.SRGBColorSpace; return t; };
  const stall = (x, z, a) => {
    const counter = toon('#4A3A34'), post = toon('#2C2430');
    box(2.4, 0.9, 0.7, counter, x, 0.45, z, true);
    for (const dx of [-1.15, 1.15]) box(0.08, 2.3, 0.08, post, x + dx, 1.15, z - 0.3, true);
    const aw = new T.Mesh(new T.BoxGeometry(2.7, 0.06, 1.1), K.keep(new T.MeshToonMaterial({ map: stripes(a, '#F2E6D8'), gradientMap: K.ramp('#5c5c6e', '#a7a7b4', '#ffffff') })));
    aw.position.set(x, 2.35, z + 0.15); aw.rotation.x = 0.28; add(aw, true);
    for (let k = 0; k < 3; k++) box(0.42, 0.32, 0.36, toon('#7A5A44'), x - 0.7 + k * 0.7, 1.06, z, true);
  };
  stall(-6.0, -6.0, '#FF3355'); stall(-2.2, -6.6, '#20E3E3'); stall(2.0, -6.2, '#FF7A1A'); stall(6.0, -5.9, '#FF3355');
  // cables con farolillos (resplandor como disco plano detrás)
  const lanterns = [];
  for (let i = -7; i <= 7; i++) {
    const x = i * 0.95, y = 3.3 - Math.cos(i / 7 * 1.2) * 0.35;
    const l = new T.Mesh(new T.SphereGeometry(0.13, 10, 8), flat(i % 2 ? '#FF7A1A' : '#FF3355')); l.position.set(x, y, -4.4); add(l, true);
    const gl = new T.Mesh(new T.CircleGeometry(0.32, 16), K.keep(new T.MeshBasicMaterial({ color: i % 2 ? '#FF7A1A' : '#FF3355', transparent: true, opacity: 0.22 }))); gl.position.set(x, y, -4.55); add(gl); lanterns.push(gl);
  }
  const cable = new T.Mesh(new T.BoxGeometry(14, 0.03, 0.03), flat('#140f1c')); cable.position.set(0, 3.45, -4.4); add(cable);
  // suelo de adoquines en dos tonos + charcos (franjas de luz reflejada que tiemblan)
  const cobA = toon('#2A3440'), cobB = toon('#232C37');
  for (let i = -12; i < 12; i++) for (let j = 0; j < 12; j++) box(0.78, 0.05, 0.6, (i + j * 3) % 2 ? cobA : cobB, i * 0.8 + 0.4 + (j % 2) * 0.4, -0.025, 1.5 - j * 0.62, false);
  const puddles = [];
  for (const [x, z, c] of [[-3.6, 0.6, '#FF3355'], [1.2, 1.3, '#20E3E3'], [4.6, 0.4, '#FF7A1A'], [-0.8, -0.8, '#FFC21A']]) {
    const p = new T.Mesh(new T.CircleGeometry(0.7, 20), flat('#3C4C5C')); p.scale.y = 0.35; p.rotation.x = -Math.PI / 2; p.position.set(x, 0.004, z); add(p, true);
    const r = new T.Mesh(new T.PlaneGeometry(0.1, 0.9), K.keep(new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 }))); r.rotation.x = -Math.PI / 2; r.position.set(x + 0.1, 0.006, z); add(r); puddles.push(r);
  }
  // lluvia: trazos instanciados que caen en diagonal
  const N = K.quality === 0 ? 120 : K.quality === 1 ? 220 : 360;
  const rg = new T.PlaneGeometry(0.012, 0.42); K.geos.push(rg);
  const rain = new T.InstancedMesh(rg, K.keep(new T.MeshBasicMaterial({ color: '#9FC3D8', transparent: true, opacity: 0.45 })), N);
  const drops = Array.from({ length: N }, () => ({ x: (R() - 0.5) * 22, y: R() * 7, z: -8 + R() * 9, v: 9 + R() * 4 }));
  const m = new T.Matrix4(), q = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 0.18), s = new T.Vector3(1, 1, 1), pv = new T.Vector3();
  group.add(rain);
  return { group, background: new T.Color('#0A141E'), fog: null,
    update(t, dt) {
      for (let i = 0; i < N; i++) { const d = drops[i]; d.y -= d.v * dt; d.x -= d.v * dt * 0.18; if (d.y < 0) { d.y += 7; d.x = (R() - 0.5) * 22; }
        rain.setMatrixAt(i, m.compose(pv.set(d.x, d.y, d.z), q, s)); }
      rain.instanceMatrix.needsUpdate = true;
      puddles.forEach((p, i) => { p.scale.x = 1 + 0.4 * Math.sin(t * 7 + i * 2); });
      lanterns.forEach((l, i) => { l.material.opacity = 0.18 + 0.06 * Math.sin(t * 3 + i); });
    }, dispose: K.dispose };
}
