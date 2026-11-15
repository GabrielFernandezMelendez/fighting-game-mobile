// =====================================================================
//  DATOS DEL JUEGO: esqueleto, poses, personajes, armas, movimientos y combos
//  Todo es determinista (sin aleatoriedad) para que el online cuadre.
// =====================================================================
export const FPS = 60, DT = 1 / FPS, D2R = Math.PI / 180;
export const L = { waist: 0.20, chest: 0.30, neck: 0.17, upper: 0.28, fore: 0.26, hand: 0.09, thigh: 0.45, shin: 0.44, toe: 0.19, heel: 0.05, sole: 0.025 };
export const STAGE = { min: -4.2, max: 4.2 };
export const ROUND_FRAMES = 180 * FPS;      // 3 minutos por ronda
export const WINS_NEEDED = 2;               // al mejor de 3

// ---------- Poses base (grados). rot = giro de todo el cuerpo hacia atrás ----------
export const G = { rot: 0, lean: 8, chest: 4, head: -10, rx: 0, ry: 0, aF: [50, 115, 10], aN: [25, 130, 10], lF: [25, 20, 0], lN: [-14, 10, 14] };
export const P = o => Object.assign(structuredClone(G), structuredClone(o));
export const G2 = P({ lean: 10, head: -11, aF: [53, 112, 10], lF: [27, 28, 0], lN: [-12, 18, 14] });
export const CR = P({ lean: 22, chest: 6, head: -24, aF: [55, 122, 10], aN: [35, 128, 10], lF: [80, 110, 0], lN: [45, 100, 12] });
export const SQ = P({ lean: 14, head: -14, aF: [40, 110, 0], aN: [20, 122, 0], lF: [50, 78, 0], lN: [5, 66, 0] });
export const AIR_UP = P({ lean: 5, chest: 0, head: -8, aF: [70, 100, 0], aN: [42, 112, 0], lF: [88, 118, -30], lN: [42, 112, -30] });
export const AIR_DN = P({ lean: 4, head: -8, aF: [62, 88, 0], aN: [35, 98, 0], lF: [36, 42, -22], lN: [-6, 36, -22] });
export const BLOCK = P({ lean: -4, chest: -4, head: -4, rx: -0.03, aF: [72, 100, 0], aN: [58, 118, 0], lF: [22, 26, 0], lN: [-16, 18, 16] });
export const CBLOCK = P({ ...CR, lean: 16, head: -18, aF: [66, 104, 0], aN: [52, 120, 0] });
export const HIT_H = P({ lean: -18, chest: -10, head: 28, rx: -0.06, aF: [20, 40, 0], aN: [-10, 30, 0], lF: [12, 20, 0], lN: [-22, 14, 20] });
export const HIT_B = P({ lean: 32, chest: 12, head: -30, rx: -0.04, aF: [40, 70, 0], aN: [30, 80, 0], lF: [35, 40, 0], lN: [-10, 40, 10] });
export const AIR_HIT = P({ lean: -30, chest: -10, head: 20, aF: [-30, 20, 0], aN: [-60, 30, 0], lF: [40, 60, -30], lN: [10, 40, -30] });
export const DOWN = P({ rot: 86, lean: 0, chest: 0, head: 14, aF: [30, 20, 0], aN: [-25, 30, 0], lF: [8, 12, 10], lN: [28, 50, 10] });
export const HELD = P({ lean: -14, chest: -10, head: 18, aF: [-20, 30, 0], aN: [-45, 20, 0], lF: [18, 34, -30], lN: [-12, 42, -30] });
export const WIN = P({ lean: -6, chest: -8, head: -14, aF: [40, 120, 0], aN: [170, 10, 0], lF: [18, 10, 0], lN: [-14, 8, 10] });

export const ANIM = {
  idle: { loop: 64, keys: [[0, G], [32, G2], [64, G]] },
  walkF: { loop: 32, keys: [[0, G], [8, P({ lean: 10, lF: [40, 46, -12], lN: [-18, 18, 8] })], [16, P({ lean: 9, lF: [26, 16, 0], lN: [-6, 26, 0] })], [24, P({ lean: 8, lF: [22, 18, 0], lN: [2, 52, -22] })], [32, G]] },
  walkB: { loop: 36, keys: [[0, G], [9, P({ lean: 6, lF: [22, 18, 0], lN: [2, 52, -22] })], [18, P({ lean: 6, lF: [26, 16, 0], lN: [-6, 26, 0] })], [27, P({ lean: 7, lF: [40, 46, -12], lN: [-18, 18, 8] })], [36, G]] },
  crouch: { loop: 60, keys: [[0, CR], [30, P({ ...CR, lean: 24, lF: [82, 114, 0], lN: [47, 104, 12] })], [60, CR]] },
  prejump: { keys: [[0, G], [3, SQ]] },
  land: { keys: [[0, SQ], [6, G]] },
  block: { keys: [[0, G], [4, BLOCK]] },
  cblock: { keys: [[0, CR], [4, CBLOCK]] },
  blockstun: { keys: [[0, P({ ...BLOCK, rx: -0.08, lean: -10 })], [8, BLOCK]] },
  getup: { keys: [[0, DOWN], [12, P({ rot: 40, lean: 30, head: -10, lF: [80, 120, 0], lN: [60, 130, 0], aF: [20, 40, 0], aN: [-30, 40, 0] })], [22, SQ], [30, G]] },
  win: { loop: 80, keys: [[0, G], [16, WIN], [80, WIN]] },
};

// ---------- Agarre y lanzamiento (comunes) ----------
const GRAB_POSE = P({ lean: 18, head: -12, rx: 0.08, aF: [95, 16, 0], aN: [86, 24, 0], lF: [35, 18, 0], lN: [-25, 10, 15] });
const COMMON = {
  grab: { name: 'Agarre', total: 32, active: [5, 7], grab: true, range: 0.95, keys: [[0, G], [5, GRAB_POSE], [16, GRAB_POSE], [32, G]] },
  throw: { name: 'Lanzamiento', total: 48, release: 24, dmg: 120, stop: 12,
    keys: [[0, GRAB_POSE],
      [12, P({ lean: -8, chest: -8, head: -12, rx: 0.02, aF: [158, 30, 0], aN: [152, 36, 0], lF: [22, 28, 0], lN: [-20, 22, 10] })],
      [18, P({ lean: -12, chest: -10, head: -14, aF: [165, 26, 0], aN: [160, 32, 0], lF: [20, 30, 0], lN: [-22, 24, 10] })],
      [24, P({ lean: 30, chest: 10, head: -20, rx: 0.16, aF: [100, 0, 0], aN: [96, 6, 0], lF: [46, 30, 0], lN: [-40, 6, 30] })],
      [30, P({ lean: 30, chest: 10, head: -20, rx: 0.16, aF: [96, 6, 0], aN: [92, 10, 0], lF: [46, 30, 0], lN: [-40, 6, 30] })], [48, G]] },
};

// ---------- Generador de ataques aéreos (misma coreografía, distinta arma) ----------
// spd escala la duración; dmg = [toque, →, ←, ↑, ↓]
function airMoves(W, spd, dmg, names) {
  const f = n => Math.max(1, Math.round(n * spd));
  const AU = P({ ...AIR_UP, aN: W.airGuard });
  const legs = { lF: [60, 96, -20], lN: [30, 104, -20] };
  const hit = W.hit;
  return {
    a_tap: { name: names[0], air: true, total: f(18), active: [f(4), f(9)], hit, dmg: dmg[0], stop: 7, push: 0.8, stun: 16, react: 'high', overhead: true,
      keys: [[0, AU], [f(4), P({ lean: 10, head: -12, aN: [100, 6, 0], aF: [30, 120, 0], ...legs })], [f(9), P({ lean: 10, head: -12, aN: [96, 10, 0], aF: [30, 120, 0], ...legs })], [f(18), AIR_DN]] },
    a_fwd: { name: names[1], air: true, total: f(24), active: [f(6), f(12)], hit, dmg: dmg[1], stop: 8, push: 1.2, stun: 18, react: 'body', overhead: true,
      keys: [[0, AU], [f(4), P({ lean: -6, chest: -8, aN: [30, 140, -100], ...legs })], [f(7), P({ lean: 14, chest: 8, aN: [100, 20, -20], ...legs })], [f(12), P({ lean: 16, chest: 8, aN: [78, 10, 10], ...legs })], [f(24), AIR_DN]] },
    a_back: { name: names[2], air: true, total: f(28), active: [f(8), f(13)], hit, dmg: dmg[2], stop: 11, push: 1.0, react: 'spike', overhead: true,
      keys: [[0, AU], [f(5), P({ lean: -8, chest: -10, aN: [175, 30, 0], aF: [70, 100, 0], ...legs })], [f(8), P({ lean: 26, chest: 10, head: -20, aN: [110, 10, 20], ...legs })], [f(13), P({ lean: 28, chest: 10, head: -20, aN: [94, 10, 30], ...legs })], [f(28), AIR_DN]] },
    a_up: { name: names[3], air: true, total: f(24), active: [f(5), f(11)], hit, dmg: dmg[3], stop: 8, push: 0.5, react: 'launch', overhead: true,
      keys: [[0, AU], [f(5), P({ lean: -4, aN: [100, 30, 0], ...legs })], [f(9), P({ lean: -14, chest: -8, aN: [170, 10, 0], ...legs })], [f(24), AIR_DN]] },
    a_down: { name: names[4], air: true, dive: true, total: 60, active: [6, 60], hit, dmg: dmg[4], stop: 9, push: 1.6, stun: 18, react: 'high', overhead: true,
      keys: [[0, AU], [6, P({ lean: 20, head: -14, aN: [60, 0, 0], aF: [20, 110, 0], lF: [40, 60, -20], lN: [10, 50, -20] })], [60, P({ lean: 20, head: -14, aN: [60, 0, 0], aF: [20, 110, 0], lF: [40, 60, -20], lN: [10, 50, -20] })]] },
  };
}
const LUNGE = { lF: [40, 22, 0], lN: [-36, 6, 28] }, STEP = { lF: [30, 14, 0], lN: [-24, 12, 14] }, RISE = { lF: [22, 8, 0], lN: [-18, 6, 24] }, DIP = { lF: [52, 64, 0], lN: [10, 58, 0] };

// =====================================================================
//  ARMAS: modelo (len = punta), agarre en reposo y sus 10 ataques
// =====================================================================
export const WEAPONS = {};
function weapon(key, def, ground, air) {
  const W = { key, ...def };
  const PW = o => P({ aN: W.guard, ...o });
  const GW = PW({}), CRW = P({ ...CR, aN: W.crouchGuard || W.guard });
  W.moves = { ...COMMON, ...ground(PW, GW, CRW, W), ...air(W) };
  for (const k in W.moves) if (k.startsWith('g_') && !W.moves[k].hit) W.moves[k].hit = W.hit;   // la hitbox va por el arma
  WEAPONS[key] = W;
}

// ---- DAGA (Aura): muy rápida, poco alcance ----
weapon('dagger', { name: 'Daga', scale: { str: 0.3, dex: 1.2 }, len: 0.30, guard: [40, 120, -70], airGuard: [60, 100, -60], hit: [['wristN', 'tipN', 0.085]],
  style: 'Rápida, cuerpo a cuerpo, presión constante' },
(PW, GW, CRW) => ({
  g_tap: { name: 'Puñalada', total: 14, active: [4, 6], dmg: 35, stop: 5, push: 0.7, stun: 13, react: 'high',
    keys: [[0, GW], [2, PW({ aN: [20, 135, -80] })], [4, PW({ lean: 16, chest: 6, rx: 0.07, aN: [100, 6, -6], ...STEP })], [6, PW({ lean: 16, chest: 6, rx: 0.07, aN: [98, 8, -6], ...STEP })], [14, GW]] },
  g_fwd: { name: 'Tajo cruzado', total: 22, active: [6, 10], dmg: 50, stop: 7, push: 1.0, stun: 16, react: 'body',
    keys: [[0, GW], [4, PW({ lean: -2, chest: -10, aN: [20, 150, -120] })], [6, PW({ lean: 18, chest: 10, rx: 0.08, aN: [95, 30, -40], ...STEP })], [10, PW({ lean: 18, chest: 10, rx: 0.08, aN: [70, 20, -10], ...STEP })], [22, GW]] },
  g_back: { name: 'Reverso giratorio', total: 30, active: [10, 14], dmg: 75, stop: 10, push: 1.6, stun: 20, react: 'high',
    keys: [[0, GW], [6, PW({ lean: -6, chest: -16, aN: [-20, 90, 0], aF: [70, 100, 0] })], [10, PW({ lean: 20, chest: 14, rx: 0.12, aN: [110, 0, 30], aF: [20, 110, 0], ...LUNGE })], [14, PW({ lean: 20, chest: 14, rx: 0.12, aN: [104, 4, 30], aF: [20, 110, 0], ...LUNGE })], [30, GW]] },
  g_up: { name: 'Corte lanzador', total: 30, active: [7, 11], dmg: 60, stop: 9, push: 0.5, react: 'launch', jumpCancel: true,
    keys: [[0, GW], [4, PW({ lean: 22, head: -20, aN: [10, 140, -90], ...DIP })], [7, PW({ lean: -8, chest: -6, rx: 0.16, aN: [56, 20, 20], ...RISE })], [11, PW({ lean: -12, chest: -8, rx: 0.16, aN: [126, 10, 10], ...RISE })], [30, GW]] },
  g_down: { name: 'Deslizamiento', total: 32, active: [8, 14], dmg: 65, stop: 9, push: 1.0, react: 'knock', low: true, crouchEnd: true,
    keys: [[0, CRW], [5, P({ ...CR, lean: 30, aN: [30, 140, -90] })], [8, P({ lean: 40, chest: 4, head: -30, rx: 0.28, aN: [100, 0, 0], aF: [60, 90, 0], lF: [70, 10, -30], lN: [40, 120, 15] })], [14, P({ lean: 40, chest: 4, head: -30, rx: 0.3, aN: [100, 0, 0], aF: [60, 90, 0], lF: [70, 10, -30], lN: [40, 120, 15] })], [32, CRW]] },
}),
W => airMoves(W, 0.85, [35, 45, 60, 50, 55], ['Puñalada aérea', 'Giro aéreo', 'Picado de hoja', 'Tajo ascendente', 'Caída en picado']));

// ---- ESPADA (Vega): equilibrada ----
weapon('sword', { name: 'Espada', scale: { str: 0.7, dex: 0.7 }, len: 0.82, guard: [45, 105, -55], airGuard: [60, 100, -50], hit: [['handN', 'tipN', 0.08]],
  style: 'Equilibrada, buen alcance, combos largos' },
(PW, GW, CRW) => ({
  g_tap: { name: 'Corte rápido', total: 18, active: [5, 8], dmg: 45, stop: 6, push: 0.8, stun: 15, react: 'high',
    keys: [[0, GW], [3, PW({ aN: [60, 130, -90] })], [5, PW({ lean: 14, chest: 6, rx: 0.06, aN: [95, 20, -30], ...STEP })], [8, PW({ lean: 14, chest: 6, rx: 0.06, aN: [80, 15, -10], ...STEP })], [18, GW]] },
  g_fwd: { name: 'Estocada', total: 26, active: [9, 13], dmg: 70, stop: 9, push: 1.6, stun: 18, react: 'body',
    keys: [[0, GW], [6, PW({ lean: 0, rx: -0.03, aN: [30, 140, -80] })], [9, PW({ lean: 20, chest: 8, rx: 0.2, aN: [104, 2, -6], lF: [42, 20, 0], lN: [-34, 6, 24] })], [13, PW({ lean: 20, chest: 8, rx: 0.2, aN: [102, 4, -6], lF: [42, 20, 0], lN: [-34, 6, 24] })], [26, GW]] },
  g_back: { name: 'Tajo pesado', total: 36, active: [12, 16], dmg: 95, stop: 12, push: 1.8, stun: 22, react: 'high', overhead: true,
    keys: [[0, GW], [8, PW({ lean: -10, chest: -12, aN: [175, 30, 0] })], [12, PW({ lean: 24, chest: 12, rx: 0.15, aN: [100, 10, 10], ...LUNGE })], [16, PW({ lean: 26, chest: 12, rx: 0.15, aN: [70, 10, 20], ...LUNGE })], [36, GW]] },
  g_up: { name: 'Corte ascendente', total: 32, active: [8, 12], dmg: 65, stop: 10, push: 0.5, react: 'launch', jumpCancel: true,
    keys: [[0, GW], [5, PW({ lean: 24, head: -20, aN: [20, 150, -140], ...DIP })], [8, PW({ lean: -6, chest: -8, rx: 0.14, aN: [56, 25, 10], ...RISE })], [12, PW({ lean: -12, chest: -8, rx: 0.14, aN: [130, 10, 0], ...RISE })], [32, GW]] },
  g_down: { name: 'Corte bajo', total: 30, active: [9, 14], dmg: 60, stop: 8, push: 1.0, stun: 18, react: 'body', low: true, crouchEnd: true,
    keys: [[0, CRW], [6, P({ ...CR, aN: [40, 150, -120] })], [9, P({ ...CR, lean: 34, rx: 0.1, aN: [80, 10, -10] })], [14, P({ ...CR, lean: 34, rx: 0.1, aN: [70, 10, 0] })], [30, CRW]] },
}),
W => airMoves(W, 1.0, [40, 55, 75, 60, 65], ['Corte aéreo', 'Barrido aéreo', 'Tajo descendente', 'Media luna', 'Estocada en picado']));

// ---- MARTILLO (Kai): lento, golpes enormes ----
weapon('hammer', { name: 'Martillo', scale: { str: 1.2, dex: 0.3 }, len: 0.75, guard: [20, 150, 40], airGuard: [30, 140, 40], crouchGuard: [10, 150, 40], hit: [['handN', 'tipN', 0.13]],
  style: 'Lento y devastador, armadura en golpes fuertes' },
(PW, GW, CRW) => ({
  g_tap: { name: 'Empujón', total: 22, active: [7, 10], dmg: 50, stop: 8, push: 1.2, stun: 17, react: 'high',
    keys: [[0, GW], [4, PW({ aN: [30, 130, -60] })], [7, PW({ lean: 14, rx: 0.08, aN: [95, 30, -100], ...STEP })], [10, PW({ lean: 14, rx: 0.08, aN: [92, 32, -100], ...STEP })], [22, GW]] },
  g_fwd: { name: 'Mazazo lateral', total: 36, active: [13, 18], dmg: 95, stop: 12, push: 2.2, stun: 22, react: 'body',
    keys: [[0, GW], [9, PW({ lean: -8, chest: -14, aN: [-10, 60, 90] })], [13, PW({ lean: 20, chest: 12, rx: 0.14, aN: [95, 0, 0], ...LUNGE })], [18, PW({ lean: 22, chest: 12, rx: 0.14, aN: [60, 0, 0], ...LUNGE })], [36, GW]] },
  g_back: { name: 'Machaque', total: 46, active: [17, 21], dmg: 130, stop: 15, push: 1.2, react: 'knock', overhead: true, armor: [0, 21],
    keys: [[0, GW], [11, PW({ lean: -14, chest: -14, aN: [180, 20, 20] })], [17, PW({ lean: 34, chest: 16, rx: 0.18, aN: [110, 0, 20], lF: [42, 30, 0], lN: [-36, 8, 28] })], [21, PW({ lean: 36, chest: 16, rx: 0.18, aN: [92, 0, 30], lF: [42, 30, 0], lN: [-36, 8, 28] })], [46, GW]] },
  g_up: { name: 'Uppercut de martillo', total: 40, active: [13, 17], dmg: 90, stop: 12, push: 0.6, react: 'launch', jumpCancel: true, armor: [0, 17],
    keys: [[0, GW], [9, PW({ lean: 26, head: -20, aN: [0, 20, -60], ...DIP })], [13, PW({ lean: -10, chest: -10, rx: 0.14, aN: [50, 0, 20], ...RISE })], [17, PW({ lean: -14, chest: -10, rx: 0.14, aN: [125, 0, 0], ...RISE })], [40, GW]] },
  g_down: { name: 'Terremoto', total: 42, active: [15, 21], dmg: 100, stop: 12, push: 1.0, react: 'knock', low: true,
    keys: [[0, GW], [10, PW({ lean: -10, aN: [180, 20, 20] })], [15, P({ ...SQ, lean: 50, rx: 0.2, aN: [100, 0, 50], lF: [70, 90, 0], lN: [30, 100, 10] })], [21, P({ ...SQ, lean: 50, rx: 0.2, aN: [96, 0, 54], lF: [70, 90, 0], lN: [30, 100, 10] })], [42, GW]] },
}),
W => airMoves(W, 1.25, [45, 70, 100, 75, 90], ['Pomo aéreo', 'Giro de martillo', 'Martillazo meteoro', 'Golpe ascendente', 'Caída sísmica']));

// ---- LANZA (Sombra): el mayor alcance ----
weapon('spear', { name: 'Lanza', scale: { str: 0.5, dex: 1.0 }, len: 0.98, back: 0.45, guard: [70, 60, -30], airGuard: [70, 70, -40], hit: [['handN', 'tipN', 0.07]],
  style: 'Alcance enorme, controla la distancia' },
(PW, GW, CRW) => ({
  g_tap: { name: 'Pinchazo', total: 18, active: [6, 9], dmg: 40, stop: 6, push: 1.0, stun: 14, react: 'high',
    keys: [[0, GW], [3, PW({ aN: [50, 90, -50] })], [6, PW({ lean: 12, rx: 0.1, aN: [92, 0, 0], ...STEP })], [9, PW({ lean: 12, rx: 0.1, aN: [90, 2, 0], ...STEP })], [18, GW]] },
  g_fwd: { name: 'Embestida', total: 30, active: [10, 15], dmg: 75, stop: 9, push: 1.8, stun: 18, react: 'body',
    keys: [[0, GW], [6, PW({ lean: 0, rx: -0.05, aN: [40, 100, -50] })], [10, PW({ lean: 26, chest: 8, rx: 0.3, aN: [100, 0, 0], lF: [45, 20, 0], lN: [-40, 4, 28] })], [15, PW({ lean: 26, chest: 8, rx: 0.3, aN: [98, 2, 0], lF: [45, 20, 0], lN: [-40, 4, 28] })], [30, GW]] },
  g_back: { name: 'Asta descendente', total: 34, active: [11, 16], dmg: 85, stop: 11, push: 1.4, stun: 20, react: 'high', overhead: true,
    keys: [[0, GW], [7, PW({ lean: -8, aN: [170, 30, 0] })], [11, PW({ lean: 24, chest: 10, rx: 0.1, aN: [95, 10, 10], ...LUNGE })], [16, PW({ lean: 24, chest: 10, rx: 0.1, aN: [60, 10, 20], ...LUNGE })], [34, GW]] },
  g_up: { name: 'Antiaéreo', total: 30, active: [8, 13], dmg: 65, stop: 10, push: 0.5, react: 'launch', jumpCancel: true,
    keys: [[0, GW], [5, PW({ lean: 16, aN: [20, 120, -60] })], [8, PW({ lean: -10, chest: -8, rx: 0.12, aN: [82, 0, 0], ...RISE })], [13, PW({ lean: -12, chest: -8, rx: 0.12, aN: [122, 0, 0], ...RISE })], [30, GW]] },
  g_down: { name: 'Barrido de asta', total: 34, active: [10, 16], dmg: 70, stop: 9, push: 1.0, stun: 18, react: 'body', low: true, crouchEnd: true,
    keys: [[0, CRW], [6, P({ ...CR, aN: [20, 100, -40] })], [10, P({ ...CR, lean: 34, rx: 0.05, aN: [75, 0, 0] })], [16, P({ ...CR, lean: 34, rx: 0.05, aN: [72, 2, 0] })], [34, CRW]] },
}),
W => airMoves(W, 1.05, [40, 60, 80, 60, 70], ['Pinchazo aéreo', 'Barrido de asta', 'Lanza meteoro', 'Ascenso', 'Caída perforante']));

// ---- Sin arma (muñeco de prácticas) ----
weapon('none', { name: 'Puños', scale: { str: 0, dex: 0 }, len: 0, guard: [25, 130, 10], airGuard: [42, 112, 0], hit: [['elbowN', 'handN', 0.09]], style: '' },
(PW, GW) => ({ g_tap: { name: 'Jab', total: 18, active: [5, 8], dmg: 40, stop: 6, push: 0.9, stun: 15, react: 'high', keys: [[0, GW], [5, PW({ aN: [104, 4, 0] })], [18, GW]] } }),
() => ({}));

// =====================================================================
//  PERSONAJES
// =====================================================================
export const CHARS = {
  aura: { id: 'aura', model: 'cleric', name: 'AURA', title: 'La Centella', weapon: 'dagger', palette: 'white', airJumps: 1, scale: 0.97, chainMax: 5,
    stats: { fuerza: 3, destreza: 8, defensa: 4, velocidad: 7 }, passive: 'Doble salto', passiveDesc: 'Puede saltar otra vez en el aire y reinicia sus ataques aéreos.',
    desc: 'Asesina ágil que vive pegada al rival.', portrait: 'img/aura.jpg', hair: { color: '#ece8f2', segs: 6 }, accent: '#ff7a1a' },
  vega: { id: 'vega', model: 'warrior', name: 'VEGA', title: 'Filo de Neón', weapon: 'sword', palette: 'vega', airJumps: 0, scale: 1.0, chainMax: 6,
    stats: { fuerza: 5, destreza: 6, defensa: 5, velocidad: 6 }, passive: 'Filo encadenado', passiveDesc: 'Puede encadenar un golpe más que el resto en cada combo.',
    desc: 'Samurái cibernética, la más completa.', portrait: 'img/vega.jpg', hair: { color: '#1d1530', segs: 7 }, accent: '#20e3e3' },
  kai: { id: 'kai', model: 'monk', name: 'KAI', title: 'El Bastión', weapon: 'hammer', palette: 'kai', airJumps: 0, scale: 1.12, chainMax: 4, armor: true,
    stats: { fuerza: 8, destreza: 3, defensa: 8, velocidad: 3 }, passive: 'Armadura', passiveDesc: 'Sus golpes ← y ↑ no se interrumpen al recibir daño, con cualquier arma.',
    desc: 'Coloso blindado: lento, pero cada golpe cuenta.', portrait: 'img/kai.jpg', hair: null, accent: '#ffc21a' },
  sombra: { id: 'sombra', model: 'rogue', name: 'SOMBRA', title: 'La Lanza Roja', weapon: 'spear', palette: 'black', airJumps: 0, scale: 1.03, chainMax: 5, lowKnock: true,
    stats: { fuerza: 5, destreza: 7, defensa: 4, velocidad: 6 }, passive: 'Barridos letales', passiveDesc: 'Todos sus golpes bajos derriban al rival.',
    desc: 'Ninja de largo alcance que castiga cada error.', portrait: 'img/sombra.jpg', hair: { color: '#c8173a', segs: 9, scarf: true }, accent: '#ff2d55' },
  dummy: { id: 'dummy', model: 'wizard', tint: '#9aa0b0', name: 'MUÑECO', weapon: 'none', palette: 'dummy', airJumps: 0, scale: 1, chainMax: 3, hair: null,
    stats: { fuerza: 5, destreza: 5, defensa: 6, velocidad: 4 } },
};
// Las estadísticas (todas suman 22, de 3 a 8) definen vida, movilidad y daño
for (const C of Object.values(CHARS)) {
  const S = C.stats;
  C.hp = 750 + 55 * S.defensa;
  C.walkF = 1.4 + 0.15 * S.velocidad; C.walkB = 1.05 + 0.11 * S.velocidad;
  C.jumpV = 6.0 + 0.13 * S.velocidad;
}
// Multiplicador de daño según personaje + arma + tipo de golpe (afinidad implícita)
const HEAVY = ['g_back', 'g_up', 'g_down', 'a_back', 'a_down', 'throw'];
export function damageMult(charId, wk, moveKey) {
  const S = CHARS[charId].stats, W = WEAPONS[wk].scale, heavy = HEAVY.includes(moveKey);
  if (moveKey === 'throw') return 1 + 0.04 * (S.fuerza - 5);
  return 1 + 0.05 * (S.fuerza - 5) * W.str * (heavy ? 1.2 : 0.8) + 0.05 * (S.destreza - 5) * W.dex * (heavy ? 0.8 : 1.2);
}
export const STAT_NAMES = { fuerza: 'Fuerza', destreza: 'Destreza', defensa: 'Defensa', velocidad: 'Velocidad' };
export const ROSTER = ['aura', 'vega', 'kai', 'sombra'];

// =====================================================================
//  COMBOS DE DEMOSTRACIÓN (se pueden ver en el Campo de práctica)
//  Pasos: tap/fwd/back/up/down = gestos ; jump = súper salto tras lanzador ; djump = doble salto
// =====================================================================
export const COMBOS = {
  dagger: [
    { name: 'Ráfaga', notation: 'Toque · Toque · → · ←', steps: ['tap', 'tap', 'fwd', 'back'] },
    { name: 'Al aire', notation: 'Toque · → · ↑ · ⤒ salto · Toque · → · ←', steps: ['tap', 'fwd', 'up', 'jump', 'a:tap', 'a:fwd', 'a:back'] },
    { name: 'Doble salto (solo Aura)', requires: 'aura', notation: 'Toque · → · ↑ · ⤒ salto · Toque · → · ⤒ doble salto · Toque · ←', steps: ['tap', 'fwd', 'up', 'jump', 'a:tap', 'a:fwd', 'djump', 'a:tap', 'a:back'] },
  ],
  sword: [
    { name: 'Danza del filo', notation: 'Toque · Toque · → · ↓ · ←', steps: ['tap', 'tap', 'fwd', 'down', 'back'] },
    { name: 'Media luna', notation: 'Toque · → · ↑ · ⤒ salto · Toque · → · ←', steps: ['tap', 'fwd', 'up', 'jump', 'a:tap', 'a:fwd', 'a:back'] },
    { name: 'Seis cortes', notation: 'Toque · Toque · → · ↓ · ↑ · ⤒ salto · → · ←', steps: ['tap', 'tap', 'fwd', 'down', 'up', 'jump', 'a:fwd', 'a:back'] },
  ],
  hammer: [
    { name: 'Demolición', notation: 'Toque · → · ←', steps: ['tap', 'fwd', 'back'] },
    { name: 'Meteoro', notation: 'Toque · ↑ · ⤒ salto · → · ←', steps: ['tap', 'up', 'jump', 'a:fwd', 'a:back'] },
    { name: 'Sismo', notation: 'Toque · → · ↓', steps: ['tap', 'fwd', 'down'] },
  ],
  spear: [
    { name: 'Muro de acero', notation: 'Toque · Toque · → · ↓', steps: ['tap', 'tap', 'fwd', 'down'] },
    { name: 'Antiaéreo', notation: 'Toque · ↑ · ⤒ salto · Toque · → · ←', steps: ['tap', 'up', 'jump', 'a:tap', 'a:fwd', 'a:back'] },
    { name: 'Lanza roja', notation: 'Toque · → · ← (overhead)', steps: ['tap', 'fwd', 'back'] },
  ],
};
// Nombres de los gestos para la lista de movimientos
export const GESTURES = [['tap', 'Toque'], ['fwd', '→ hacia el rival'], ['back', '← alejándote'], ['up', '↑ arriba'], ['down', '↓ abajo']];
