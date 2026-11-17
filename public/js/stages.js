import { celSurface, paintedTexture } from './stage-paint.js';

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
export const stageArtwork = id => new URL('../img/stages/' + id + '.webp', import.meta.url).href;
export const stageById = id => STAGES.find(s => s.id === id) || STAGES[0];

export function buildStage(id, T, opts = {}) {
  const K = kit(T, opts.quality ?? 2);
  const S = id === 'azotea' ? azotea(K) : id === 'mercado' ? mercado(K) : sala(K);
  return S;
}

// ---------- Herramientas comunes ----------
function kit(T, quality) {
  const mats = [], geos = [], paints = new Map();
  const keep = m => { mats.push(m); return m; };
  const toon = (color, emissive = '#000000', kind) => {
    if (kind && !paints.has(kind)) paints.set(kind, paintedTexture(T,kind));
    return keep(celSurface(new T.MeshToonMaterial({color, emissive, map:paints.get(kind) || null})));
  };
  const flat = (color, extra = {}) => keep(new T.MeshBasicMaterial({ color, ...extra }));
  // Contorno de tinta (mismo color que el de los personajes, INK #140f1c). Casco invertido por escala: una copia
  // negra un poco más grande alrededor del centro de la pieza, vista por dentro (BackSide), así las aristas de
  // cajas y cilindros quedan cerradas (empujar por la normal abre las esquinas de las cajas). En piezas planas
  // (carteles, ventanas) va una placa negra mayor justo detrás, con polygonOffset para que no parpadee.
  // El grosor crece con la distancia para que en pantalla mida lo mismo cerca y lejos (≈2 px).
  const INK = '#140f1c';
  const inkHull = keep(new T.MeshBasicMaterial({ color: INK, side: T.BackSide }));
  const inkFlat = keep(new T.MeshBasicMaterial({ color: INK, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 6 }));
  const inkW = z => 0.012 + Math.min(Math.abs(z),8) * 0.0011;
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
  const graphic = (points, mat, x, y, z) => {
    const shape = new T.Shape(points.map(([px, py]) => new T.Vector2(px, py)));
    const mesh = new T.Mesh(new T.ShapeGeometry(shape), mat);
    mesh.position.set(x, y, z);
    return add(mesh);
  };
  const floorGraphic = (points, mat, x, y, z) => {
    const mesh = graphic(points, mat, x, y, z);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  };
  const octPanel = (w, h, bevel, mat, x, y, z) => {
    const x0 = w * 0.5, y0 = h * 0.5;
    const mesh = graphic([
      [-x0 + bevel,-y0], [x0 - bevel,-y0], [x0,-y0+bevel], [x0,y0-bevel],
      [x0-bevel,y0], [-x0+bevel,y0], [-x0,y0-bevel], [-x0,-y0+bevel],
    ], mat, x, y, z);
    return mesh;
  };
  const floorTiles = (nx, nz, dx, dz, colors, z, kind, stagger = false) => {
    const g = new T.BoxGeometry(dx - 0.024, 0.05, dz - 0.023);
    geos.push(g);
    const tiles = new T.InstancedMesh(g, toon('#ffffff','#000000',kind), nx * nz);
    const paint = colors.map(c => new T.Color(c)), m = new T.Matrix4();
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      m.makeTranslation((i - nx/2 + 0.5 + (stagger ? 0.5 * (j % 2) : 0)) * dx, -0.025, z - j * dz);
      const index = i * nz + j;
      tiles.setMatrixAt(index, m);
      tiles.setColorAt(index, paint[(i + j) % paint.length]);
    }
    group.add(tiles);
  };
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
  // Nubes de dos planos, con perfiles afilados como las sombras dibujadas de la azotea.
  const cloud = (x, y, z, w, light, shade) => {
    const silhouette = [[-.52,-.07],[-.34,.00],[-.40,.027],[-.14,.10],[-.19,.11],
      [.06,.155],[.25,.122],[.47,.153],[.30,.064],[.52,.089],[.31,.012],[.03,-.028],[-.15,-.022]];
    const shadow = [[-.52,-.07],[-.25,.00],[-.10,-.017],[.12,.04],[.38,.075],
      [.31,.012],[.03,-.028],[-.15,-.022]];
    graphic(silhouette.map(p => p.map(v => w*v)), flat(light), x,y,z);
    graphic(shadow.map(p => p.map(v => w*v)), flat(shade), x,y,z + 0.02);
  };
  // textura de texto (rótulos, números del suelo) con las fuentes de la interfaz
  const textTex = (txt, { font = '600 64px "Zalando Sans Expanded", sans-serif', color = '#ECEEF4', w = 512, h = 128, bg = null, align = 'center' } = {}) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = font; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(txt, align === 'center' ? w / 2 : 8, h / 2);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const dispose = () => {
    group.traverse(mesh => { if (mesh.isInstancedMesh) mesh.dispose(); });
    for (const g of new Set(geos)) g.dispose();
    for (const texture of new Set(mats.map(m=>m.map))) texture?.dispose();
    for (const m of mats) m.dispose();
  };
  return { T, quality, group, toon, flat, inkHull, inkW, add, box, graphic, floorGraphic, octPanel, floorTiles, sky, cloud, textTex, keep, geos, dispose };
}
const rnd = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

// =====================================================================
//  1) SALA DE PRUEBAS — laboratorio de NEÓN: suelo de paneles con medidas, pared con franjas de luz,
//     emblema octogonal, focos de techo y blancos holográficos.
// =====================================================================
function sala(K) {
  const { T, group, toon, flat, box, add, textTex, graphic, octPanel, floorTiles, floorGraphic } = K;
  floorTiles(18, 7, 1.15, 1.18, ['#343250', '#2B2946', '#302E4C'], 1.8, 'panel');
  const orange = flat('#FF7A1A'), cyan = flat('#20E3E3'), ink = flat('#140F1C');
  const floorLight = flat('#403A5B');
  for (const side of [-1, 1]) {
    const lit = [[0,0],[side*3.1,0],[side*3.1,1.5],[side*1.55,1.5]];
    floorGraphic(lit, floorLight, side*1.85, .003, -3.3);
  }
  box(16.7,.004,.028,orange,0,.004,.76,false);
  for (let x = -8; x <= 8; x++) {
    const depth = x % 2 ? .10 : .23;
    box(.027,.004,depth,x ? orange : cyan,x,.005,.76,false);
  }
  const deckRing = new T.Mesh(new T.RingGeometry(.63,.67,8,1,Math.PI/8),orange);
  deckRing.rotation.x = -Math.PI/2; deckRing.scale.y = .73; deckRing.position.set(0,.007,-1.05); add(deckRing);

  box(46,6,.28,toon('#302B4B'),0,3,-6.25,false);
  box(46,.46,.4,toon('#201C37','#000000','panel'),0,.25,-5.98,true);
  box(46,.055,.16,orange,0,.81,-5.61);
  const frame = flat('#413B60'), face = flat('#292640'), dark = flat('#1C192D'), edge = flat('#51496D');
  const strut = toon('#494260','#000000','panel');
  for (const x of [-5.25,-1.9,1.9,5.25]) {
    const support=box(.23,2.6,.32,strut,x,2.18,-5.66);
    support.rotation.z=(x<0?1:-1)*.27;
    box(.46,.20,.38,strut,x*1.05,.95,-5.67);
  }
  for (const x of [-11.5,-6.9,-3.4,3.4,6.9,11.5]) {
    octPanel(3.16,2.15,.47,ink,x,1.98,-5.99);
    octPanel(3.08,2.08,.45,frame,x,1.98,-5.96);
    octPanel(2.74,1.75,.40,dark,x,1.98,-5.92);
    graphic([[-1.28,.36],[-.91,.86],[.78,.86],[-.47,-.88],[-1.28,-.51]],face,x,1.98,-5.90);
    graphic([[-1.55,.59],[-1.1,1.03],[-.21,1.03],[-1.42,.19]],edge,x,1.98,-5.89);
    octPanel(1.42,.29,.09,frame,x,.45,-5.74);
    box(1.7,.07,.22,toon('#5E5878'),x,3.4,-5.61);
    box(1.42,.032,.041,flat('#C9EDF6'),x,3.36,-5.48,false);
    const beam = flat('#657BA5', { transparent: true, opacity: .17, depthWrite: false });
    graphic([[-.69,0],[.69,0],[1.20,-1.49],[-1.35,-1.49]],beam,x,3.35,-5.82);
  }
  octPanel(2.4,1.65,.44,ink,0,2.25,-5.94);
  octPanel(2.21,1.49,.41,face,0,2.25,-5.92);
  const emblem = new T.Mesh(new T.RingGeometry(.81,.86,8,1,Math.PI/8),flat('#A3512D'));
  emblem.scale.x=1.47; emblem.position.set(0,2.25,-5.89); add(emblem);
  const logo = new T.Mesh(new T.PlaneGeometry(1.12,.29), K.keep(new T.MeshBasicMaterial({
    transparent: true, map: textTex('NEÓN', { font: '400 92px Megrim, sans-serif', color:'#80758D' }),
  })));
  logo.position.set(0,2.25,-5.87); add(logo);
  const targets = [];
  for (const x of [-6.9,-3.4,3.4,6.9]) {
    const target = new T.Mesh(new T.RingGeometry(.28,.31,8,1,Math.PI/8),cyan);
    target.position.set(x,1.99,-5.87); add(target); targets.push(target);
  }
  return { group, background: new T.Color('#16132A'), fog: null, update(t, dt, camera, still) {
    targets.forEach((target,i) => { target.rotation.z = still ? 0 : Math.sin(t*.63+i)*.12; });
  }, dispose: K.dispose };
}

// =====================================================================
//  2) AZOTEA — la portada: noche violeta, luna, cometas cayendo en diagonal, ciudad con neón rosa,
//     barandilla, depósito de agua, máquinas de aire y antena con luz roja.
// =====================================================================
function azotea(K) {
  const { T, group, toon, flat, box, add, sky, cloud } = K;
  sky(['#5A3A78', '#2E2558', '#120F26'], 7);
  const horizon = new T.Mesh(new T.PlaneGeometry(90, 1.1), flat('#58375D')); horizon.position.set(0, 0.6, -25.5); add(horizon);
  // luna con halo en anillos (sin degradado: dos círculos planos)
  const moon = new T.Mesh(new T.CircleGeometry(1.5, 32), flat('#F2E6D8')); moon.position.set(-4.9, 3.7, -25); add(moon);
  const halo = new T.Mesh(new T.CircleGeometry(1.66, 32), flat('#5C4795')); halo.position.set(-4.9, 3.7, -25.1); add(halo);
  cloud(-3.3, 3.14, -24, 13, '#604B8B', '#4A3A75'); cloud(7.4, 4.4, -24, 15, '#54417D', '#46356F'); cloud(-14, 2.75, -23, 12, '#4A397B', '#3D3066');
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
    const t = K.inkW(z) * .55, bo = new T.InstancedMesh(geo, K.inkHull, n), mm = new T.Matrix4(), pp = new T.Vector3(), qq = new T.Quaternion(), ss = new T.Vector3();
    for (let i = 0; i < n; i++) { bld.getMatrixAt(i, mm); mm.decompose(pp, qq, ss); ss.x += 2 * t; ss.y += 2 * t; ss.z += 2 * t; bo.setMatrixAt(i, mm.compose(pp, qq, ss)); }
    if (z > -19) { bo.userData.outline = true; bo.visible = K.quality > 0; group.add(bo); } else bo.dispose();
    const wg = new T.PlaneGeometry(0.16, 0.12); K.geos.push(wg);
    const wi = new T.InstancedMesh(wg, flat(winCol), wins.length);
    wins.forEach((p, i) => { m.makeTranslation(...p); wi.setMatrixAt(i, m); }); group.add(wi);
  };
  layer(-21, 34, 1.5, 6.3, '#514274', '#77689C', false);
  layer(-16, 30, 0.8, 4.3, '#352954', '#B27564', true);
  layer(-11, 26, 0.5, 2.75, '#221C3B', '#E6A267', true);
  K.floorTiles(20, 6, 1.5, 1.46, ['#4A435E', '#3B3652', '#443E59'], 1.4, 'slate');
  const roofLight = flat('#4C455F');
  for (const x of [-5.6,-2.8,.3,3.55,6.9]) {
    K.floorGraphic([[0,0],[2,0],[1.72,.22],[.28,.22]], roofLight, x,.004,-1.4);
  }
  box(32, 0.5, 0.35, toon('#312B48'), 0, 0.25, -5.4, true);
  box(32, .055, .36, toon('#655B7A'), 0, .53, -5.4, true);
  // barandilla: postes y dos travesaños
  const rail = toon('#4A4168');
  box(32, 0.08, 0.08, rail, 0, 1.25, -5.3, true); box(32, 0.06, 0.06, rail, 0, 0.85, -5.3, true);
  for (let x = -14; x <= 14; x += 1.75) {
    box(.075,.8,.08,rail,x,.9,-5.3,true);
    box(.19,.20,.1,rail,x,.57,-5.27,true);
  }
  // depósito de agua sobre patas, máquinas de aire y antena
  const tankM = toon('#605573','#000000','roof');
  const tank = new T.Mesh(new T.CylinderGeometry(0.72, 0.76, 1.14, 12), tankM); tank.position.set(-3.93, 2.11, -5.2); add(tank, true);
  const roof = new T.Mesh(new T.ConeGeometry(.82, .38, 12), toon('#433A63')); roof.position.set(-3.93, 2.87, -5.2); add(roof, true);
  for (const [dx, dz] of [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]]) box(0.08, 1.55, 0.08, rail, -3.93 + dx, .775, -5.2 + dz, true);
  const tankRing = toon('#76698A');
  for (const y of [1.71,2.31]) {
    const band = new T.Mesh(new T.CylinderGeometry(.77,.77,.054,12),tankRing);
    band.position.set(-3.93,y,-5.2); add(band,true);
  }
  const brace = box(.085,1.55,.08,rail,-3.94,.80,-4.78);
  brace.rotation.z=.62;
  const pipe = toon('#8B7D98');
  box(.095,1.2,.10,pipe,-3.14,1.49,-5.07);
  box(.59,.095,.10,pipe,-3.36,2.09,-5.07);
  const acM = toon('#746981','#000000','panel');
  for (const [x, z] of [[3.74, -4.85], [5.1, -4.25]]) { box(1.1, 0.8, 0.8, acM, x, 0.4, z, true); const fan = new T.Mesh(new T.CircleGeometry(0.26, 12), flat('#241F3E')); fan.position.set(x, 0.42, z + 0.41); add(fan, true); }
  box(0.06, 3.6, 0.06, rail, 8.2, 1.8, -4.8, true);
  const blink = new T.Mesh(new T.SphereGeometry(0.07, 8, 6), flat('#FF3355')); blink.position.set(8.2, 3.65, -4.8); add(blink, true);
  // cometas: detrás de todo, de arriba-izquierda a abajo-derecha, naranja y carmesí, escalonados
  const N = K.quality > 0 ? 7 : 4, comets = [];
  for (let i = 0; i < N; i++) {
    const g = new T.Group(), col = i % 2 ? '#FF3355' : '#FF7A1A';
    const m = K.keep(new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 }));
    const tail = K.graphic([[-3.7,0],[-.24,-.064],[.06,0],[-.26,.061]],m,0,0,0);
    g.add(tail);
    const head = new T.Mesh(new T.CircleGeometry(0.09, 10), flat('#FFF1DC')); g.add(head); K.geos.push(head.geometry);
    g.rotation.z = -0.62; g.userData = { t0: i * 6 / N, life: 1.3, x0: -13 + (i * 7) % 22, y0: 9.5 }; g.position.z = -22; group.add(g); comets.push(g);
  }
  return { group, background: new T.Color('#100E22'), fog: null,
    update(t, dt, camera, still) {
      blink.visible = still || (t % 1.4) < 0.25;
      for (const c of comets) { const u = c.userData, p = ((t - u.t0) % 6 + 6) % 6; c.visible = !still && p < u.life;
        if (c.visible) { const k = p / u.life; c.position.x = u.x0 + k * 8; c.position.y = u.y0 - k * 6; c.children[0].material.opacity = 0.85 * Math.min(1, (1 - k) * 3); } }
    }, dispose: K.dispose };
}

// =====================================================================
//  3) MERCADO BAJO LA LLUVIA — calle de noche: puestos con toldos a rayas, farolillos en cables,
//     carteles de colores, lluvia en trazos, charcos que reflejan las luces.
// =====================================================================
function mercado(K) {
  const { T, group, toon, flat, box, add, sky, cloud, graphic, floorGraphic, floorTiles } = K;
  sky(['#2B596A', '#213C50', '#112333'], 6);
  cloud(-6, 4.6, -24, 14, '#315266', '#294659');
  cloud(9, 5.7, -24, 16, '#2D4D61', '#253E52');
  const R = rnd(21);
  const building = [flat('#204050'), flat('#27495A'), flat('#1D3848')];
  const roof = flat('#172F3F'), glass = flat('#3F6171'), amberGlass = flat('#A3704D');
  for (let i = -8; i <= 8; i++) {
    const w = 2.75 + R() * .7, h = 3.6 + R() * 2.3, x = i * 3.32;
    const z = i % 2 ? -11.3 : -13.6;
    box(w,h,1,building[(i+9)%3],x,h/2,z,false);
    graphic([[-w*.58,0],[w*.58,0],[w*.34,.47],[-w*.18,.47]],roof,x,h-.09,z+.52);
    if (i % 3) {
      for (const dx of [-.68,0,.68]) {
        box(.36,.58,.03,R()<.32?amberGlass:glass,x+dx,h-.99,z+.51,false);
        box(.29,.36,.032,(Math.round(dx*10)+i)%3===0?amberGlass:glass,x+dx,2.10+.18*(i%2),z+.52,false);
      }
    }
  }
  box(48,1.27,.35,toon('#173241'),0,.64,-9.18,false);
  box(48,.095,.44,toon('#2F4C5B'),0,1.28,-9.11,false);
  const signColors = ['#89524E','#4B8083','#A26937'];
  for (const [i,x] of [-11,-6.9,-4.1,4.85,8.4,11.5].entries()) {
    box(.19,.9 + R()*.54,.05,flat(signColors[i%3]),x,2.52,-8.43,false);
  }

  const wood = toon('#815036','#000000','wood'), post = toon('#4E3437','#000000','wood'), trim = toon('#BA7345');
  const wedge = flat('#3D2F3B'), crateBoard = flat('#54352A');
  const fruitGeo = new T.IcosahedronGeometry(.10,0);
  K.geos.push(fruitGeo);
  const fruit = new T.InstancedMesh(fruitGeo,toon('#FFFFFF'),126);
  fruit.count = 0;
  group.add(fruit);
  const fm = new T.Matrix4(), fq = new T.Quaternion(), fp = new T.Vector3(), fs = new T.Vector3();
  const up = new T.Vector3(0, 1, 0);
  const paint = ['#FF9338','#A8BD54','#E35458'].map(c => new T.Color(c));
  function crate(x,y,z,fill) {
    box(.60,.22,.48,wood,x,y,z,true);
    box(.62,.065,.51,trim,x,y+.094,z,true);
    box(.50,.035,.015,crateBoard,x,y-.034,z+.248,false);
    if (fill === undefined) return;
    for (let i=0;i<7;i++) {
      fp.set(x+(i%3-1)*.155+(R()-.5)*.04,y+.17+(i===6?.09:0),z+(Math.floor(i/3)-1)*.12);
      fq.setFromAxisAngle(up,R()*6);
      fs.set(.85+R()*.45,.78+R()*.23,.82+R()*.34);
      fruit.setColorAt(fruit.count,paint[fill]);
      fruit.setMatrixAt(fruit.count++,fm.compose(fp,fq,fs));
    }
  }
  function stall(x,z,width,accent) {
    const canopy = toon(accent,'#000000','cloth'), canvas = toon('#F0CC9F','#000000','cloth');
    box(width,.72,.78,wood,x,.36,z,true);
    box(width+.10,.09,.86,trim,x,.747,z,true);
    graphic([[-width/2,-.30],[width*.14,-.30],[-width*.19,.27],[-width/2,.30]],wedge,x,.37,z+.397);
    for (const side of [-1,1]) {
      box(.09,2.25,.14,post,x+side*(width/2-.10),1.125,z+.15,true);
      box(.16,.16,.17,trim,x+side*(width/2-.10),2.15,z+.18,true);
    }
    const stripes = 7, size = (width+.22)/stripes;
    for (let i=0;i<stripes;i++) {
      const xx = x - (width+.22-size)/2 + i*size;
      const cloth = box(size,.052,1.28,i%2?canvas:canopy,xx,2.37,z-.02,false);
      cloth.rotation.x = .38;
      box(size,.125,.04,i%2?canvas:canopy,xx,2.087,z+.57,false);
    }
    for (const side of [-1,1]) {
      const edge = box(.025,.058,1.29,post,x+side*(width+.22)/2,2.37,z-.02);
      edge.rotation.x=.38;
    }
    for (let i=0;i<3;i++) crate(x+(i-1)*width*.29,.895,z+.05,i);
  }
  stall(-9,-6.8,2.62,'#AE4848');
  stall(-3.47,-5.8,2.87,'#138485');
  stall(3.76,-5.75,2.92,'#B74051');
  stall(9.5,-6.9,2.66,'#158787');
  crate(-5.38,.11,-5.38,1);
  crate(-5.43,.34,-5.41);
  crate(5.64,.11,-5.32,0);

  const lanternShape = new T.CylinderGeometry(.18,.15,.31,6);
  const caps = toon('#472D3A');
  const lanterns = [toon('#FFC05C','#6B2B0C'),toon('#E4575C','#441423')];
  const wire = new T.LineBasicMaterial({color:'#241D2D'});
  K.keep(wire);
  const cableY = x => 2.42 + .039 * x * x;
  for (const sign of [-1,1]) {
    const points = [];
    for (let i=0;i<=8;i++) {
      const x = sign*(.3+i*.95);
      points.push(new T.Vector3(x,cableY(Math.min(Math.abs(x),5)), -5.12));
    }
    const wireGeo = new T.BufferGeometry().setFromPoints(points);
    K.geos.push(wireGeo);
    group.add(new T.Line(wireGeo,wire));
    for (let i=1;i<=5;i++) {
      const x = sign*(.6+i*1.33), y = cableY(Math.min(Math.abs(x),5))-.19;
      const lamp = new T.Mesh(lanternShape, lanterns[(i + (sign>0?1:0))%2]);
      lamp.position.set(x,y,-5.08);
      add(lamp,true);
      box(.18,.042,.17,caps,x,y+.155,-5.08,true);
      box(.15,.037,.15,caps,x,y-.155,-5.08,true);
    }
  }

  floorTiles(25, 15, .80, .58, ['#29434F','#2C4656','#334B59','#263E4B'], 1.5, 'stone', true);
  const wet = flat('#283E50'), ripples = [];
  const highlights = ['#AB693A','#306E76'].map(c => flat(c,{transparent:true,opacity:.66,depthWrite:false}));
  for (const [i,[x,z]] of [[-5.15,-2.63],[-3.16,-1.58],[3.54,-1.83],[5.36,-2.53]].entries()) {
    floorGraphic([[-.89,0],[-.58,.22],[.55,.33],[.91,.10],[.73,-.16],[-.62,-.20]],wet,x,.004,z);
    const copy = highlights[i%2];
    for (let j=0;j<3;j++) {
      const dash = floorGraphic([[-.57,0],[.56,0],[.39,.052],[-.52,.07]],copy,x+(R()-.5)*.5,.008,z+j*.10-.12);
      dash.userData.width=.45+R()*.8;
      ripples.push(dash);
    }
  }
  const circles = [];
  const circleGeo = new T.RingGeometry(.83,1,12);
  const ripMat = flat('#AAD0D8',{transparent:true,opacity:.48,depthWrite:false});
  for (let i=0;i<12;i++) {
    const mesh = new T.Mesh(circleGeo, ripMat);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set((i%2?1:-1)*(2.28+R()*3.5),.011,-1.12-R()*2.08);
    mesh.userData.phase=R();
    circles.push(add(mesh));
  }

  // Dos capas de trazos y salpicaduras sin simulación ni mapas de reflejo.
  const m = new T.Matrix4(), p = new T.Vector3(), size = new T.Vector3();
  const tilt = new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),.19);
  const stroke = new T.PlaneGeometry(.018,.37);
  K.geos.push(stroke);
  const rain = [false,true].map(near => {
    const max = near?104:144;
    const mesh = new T.InstancedMesh(stroke,flat('#A6CCD9',{
      transparent:true,opacity:near?.42:.30,depthWrite:false,
    }),max);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.frustumCulled=false;
    group.add(mesh);
    const drops = Array.from({length:max},() => ({
      x:(R()-.5)*19, y:R()*6.8, z:near ? -.55+R()*2.1 : -8.3+R()*4.8,
      speed:6.6+R()*3.2, length:.66+R()*.70,
    }));
    return {mesh,drops};
  });
  let rippleCount=12;
  function setQuality(quality) {
    rain[0].mesh.count = [50,102,144][quality];
    rain[1].mesh.count = [25,66,104][quality];
    rippleCount=[4,8,12][quality];
  }
  function update(t,dt,camera,still) {
    for (const {mesh,drops} of rain) {
      mesh.visible=!still;
      if(still) continue;
      for (let i=0;i<mesh.count;i++) {
        const d=drops[i];
        d.y-=d.speed*dt;
        d.x+=d.speed*.19*dt;
        if (d.y<0) {d.y+=6.8; d.x=(R()-.55)*19;}
        const shorter = Math.abs(d.x)<1.85?.67:1;
        m.compose(p.set(d.x,d.y,d.z),tilt,size.set(shorter,shorter*d.length,1));
        mesh.setMatrixAt(i,m);
      }
      mesh.instanceMatrix.needsUpdate=true;
    }
    circles.forEach((mesh,i) => {
      mesh.visible=!still && i<rippleCount;
      if(still) return;
      const k=(t*1.15+mesh.userData.phase)%1;
      const r=.015+.19*k;
      mesh.scale.set(r,r*.66,1);
      mesh.position.y=.01+Math.sin(k*Math.PI)*.001;
    });
    ripples.forEach((mesh,i) => {mesh.scale.x=mesh.userData.width*(still ? 1 : .83+.17*Math.sin(t*5+i));});
  }
  setQuality(K.quality);
  update(0,0);
  return { group, background: new T.Color('#112333'), fog: null, update, setQuality, dispose: K.dispose };
}
