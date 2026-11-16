// =====================================================================
//  SIMULACIÓN DETERMINISTA (60 Hz). Sin DOM ni aleatoriedad:
//  con las mismas entradas, dos móviles calculan exactamente lo mismo.
// =====================================================================
import { DT, D2R, L, STAGE, ROUND_FRAMES, WINS_NEEDED, G, CR, SQ, AIR_UP, AIR_DN, HIT_H, HIT_B, AIR_HIT, DOWN, HELD, P, ANIM, WEAPONS, CHARS, damageMult } from './data.js';

const dir = th => [Math.sin(th), -Math.cos(th)];
export const NO_INPUT = { dx: 0, up: false, down: false, block: false, act: null };
const REACTION = ['hit', 'blockstun', 'launched', 'down', 'getup', 'thrown', 'win', 'lose'];
const THROWABLE = ['idle', 'walkF', 'walkB', 'crouch', 'block', 'cblock', 'land', 'dashF', 'dashB'];
// Dash por doble pulsación de dirección (66 / 44): ventana entre pulsaciones y duración en frames
export const DASH = { window: 12, fwdFrames: 16, backFrames: 18, fwdSpeed: 7.8, backSpeed: 6.4, fwdCancel: 7 };

// ---------- Utilidades de poses ----------
export function lerpPose(a, b, t) {
  const o = {};
  for (const k in a) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => v + (b[k][i] - v) * t) : a[k] + ((b[k] ?? 0) - a[k]) * t;
  return o;
}
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export function sample(keys, f, loop) {
  if (loop) f = ((f % loop) + loop) % loop;
  const last = keys[keys.length - 1];
  if (f >= last[0]) return last[1];
  let i = 0; while (i < keys.length - 2 && f >= keys[i + 1][0]) i++;
  const [fa, pa] = keys[i], [fb, pb] = keys[i + 1];
  return lerpPose(pa, pb, ease((f - fa) / (fb - fa)));
}

// ---------- Cinemática directa 2D (mirando a la derecha, origen en la cadera) ----------
export function fk(p, W) {
  const J = {}; const add = (a, d, len) => [a[0] + d[0] * len, a[1] + d[1] * len];
  const rot = (p.rot || 0) * D2R;
  const H = [p.rx, 0]; J.hip = H;
  const tw = Math.PI - p.lean * D2R + rot; J.waist = add(H, dir(tw), L.waist);
  const tc = tw - p.chest * D2R; J.neck = add(J.waist, dir(tc), L.chest);
  const th = tc - p.head * D2R; J.head = add(J.neck, dir(th), L.neck);
  const R = tc - Math.PI; J.shoulder = add(J.neck, dir(tc), -0.06);
  for (const s of ['F', 'N']) {
    const [sh, el, wr] = p['a' + s];
    const tu = R + sh * D2R, tf = tu + el * D2R, thd = tf + wr * D2R;
    const E = add(J.shoulder, dir(tu), L.upper), Wr = add(E, dir(tf), L.fore);
    J['elbow' + s] = E; J['wrist' + s] = Wr; J['hand' + s] = add(Wr, dir(thd), L.hand);
    if (s === 'N' && W && W.len) { J.tipN = add(J.handN, dir(thd), W.len); J.bladeAng = thd; }
    const [hp, kn, ft] = p['l' + s];
    const rp = -p.lean * 0.35 * D2R + rot;
    const tt = rp + hp * D2R, ts = tt - kn * D2R, tfoot = Math.PI / 2 + ft * D2R + rot;
    const K = add(H, dir(tt), L.thigh), A = add(K, dir(ts), L.shin);
    J['knee' + s] = K; J['ankle' + s] = A; J['foot' + s] = add(A, dir(tfoot), L.toe); J['heel' + s] = add(A, dir(tfoot), -L.heel);
  }
  J.minFoot = Math.min(J.footF[1], J.heelF[1], J.footN[1], J.heelN[1]) - L.sole;
  let m = Infinity; for (const k of ['hip', 'waist', 'neck', 'kneeF', 'kneeN', 'ankleF', 'ankleN', 'footF', 'footN', 'handF', 'handN']) m = Math.min(m, J[k][1]);
  J.minAll = Math.min(m - 0.1, J.head[1] - 0.13);
  return J;
}

// =====================================================================
//  CREACIÓN DE LA PARTIDA
// =====================================================================
// sel = { c: personaje, w: arma }  (cualquier personaje puede usar cualquier arma)
function makeFighter(idx, sel, x, face) {
  const charId = sel.c, C = CHARS[charId];
  return { idx, charId, wk: sel.w || C.weapon, x, y: 0, vx: 0, vy: 0, face, state: 'idle', f: 0, t: idx * 17, move: null, hitDone: false,
    chain: 0, airUsed: [], airJumpsLeft: C.airJumps, prevUp: false, buffer: [], pose: G, blendFrom: null, blend: 0, J: null,
    hipY: 0.9, airBase: 0.9, hp: C.hp, maxHp: C.hp, stun: 0, react: 'high', push: 0, juggle: 0, comboHits: 0, comboDmg: 0, comboIdle: 0,
    superJump: false, jumpDir: 0, ko: false, blockLow: false, scale: C.scale, prevDx: 0, tapDir: 0, tapT: -99 };
}
export function createMatch({ mode = 'training', chars = [{ c: 'aura', w: 'dagger' }, { c: 'dummy', w: 'none' }] } = {}) {
  chars = chars.map(x => typeof x === 'string' ? { c: x, w: CHARS[x].weapon } : x);
  const M = { mode, chars, frame: 0, round: 1, wins: [0, 0], timer: ROUND_FRAMES, phase: mode === 'training' ? 'fight' : 'intro', phaseT: 0,
    hitstop: 0, roundWinner: -1, matchWinner: -1, events: [], fighters: [] };
  resetRound(M);
  return M;
}
function resetRound(M) {
  M.fighters = [makeFighter(0, M.chars[0], -1.3, 1), makeFighter(1, M.chars[1], 1.3, -1)];
  for (const F of M.fighters) finalizePose(F);
  M.timer = ROUND_FRAMES; M.hitstop = 0; M.roundWinner = -1;
  M.phase = M.mode === 'training' ? 'fight' : 'intro'; M.phaseT = 0;
}
export const serialize = M => JSON.stringify({ ...M, events: [] });
export const restore = s => JSON.parse(s);
export function checksum(M) {
  let h = M.frame * 31 + M.phase.length;
  for (const F of M.fighters) h = (h * 131 + Math.round(F.x * 1000) * 7 + Math.round(F.y * 1000) * 13 + F.hp * 17 + F.f * 3 + F.state.length) | 0;
  return h;
}

// =====================================================================
//  PASO DE SIMULACIÓN
// =====================================================================
const getMove = F => F.move ? WEAPONS[F.wk].moves[F.move] : null;
export { getMove };
function setState(F, s, move = null) {
  F.blendFrom = F.pose; F.blend = (s === 'attack' || s === 'hit') ? 2 : 5;
  F.state = s; F.f = 0; F.move = move; F.hitDone = false;
}
export function toWorld(F, p) { return [F.x + F.face * p[0] * F.scale, F.hipY + p[1] * F.scale]; }
const isAir = F => F.state === 'air' || (F.state === 'attack' && getMove(F).air);
const invuln = F => ['down', 'getup', 'thrown', 'win', 'lose'].includes(F.state) || F.ko;

export function step(M, inputs) {
  M.frame++;
  const control = M.phase === 'fight';
  const ins = control ? inputs : [NO_INPUT, NO_INPUT];
  // acciones al buffer (relativas a hacia dónde mira cada luchador)
  M.fighters.forEach((F, i) => {
    const a = ins[i].act;
    if (a) F.buffer.push({ a: a === 'left' ? (F.face > 0 ? 'back' : 'fwd') : a === 'right' ? (F.face > 0 ? 'fwd' : 'back') : a, t: M.frame });
  });
  if (M.hitstop > 0) { M.hitstop--; for (const F of M.fighters) for (const b of F.buffer) b.t++; return; }
  for (const F of M.fighters) F.buffer = F.buffer.filter(b => M.frame - b.t <= 8);

  const [A, B] = M.fighters;
  updateFighter(M, A, B, ins[0]); updateFighter(M, B, A, ins[1]);
  A.prevUp = ins[0].up; B.prevUp = ins[1].up;
  pushboxes(A, B);
  for (const F of M.fighters) finalizePose(F);
  // golpes en ambas direcciones (se calculan antes de aplicar: permite intercambios)
  const hA = testHit(A, B), hB = testHit(B, A);
  const gA = testGrab(A, B), gB = testGrab(B, A);
  if (gA && gB) { techThrow(M, A, B); }
  else { if (gA) startThrow(M, A, B); else if (hA) applyHit(M, A, B, hA); if (gB) startThrow(M, B, A); else if (hB) applyHit(M, B, A, hB); }
  // contadores de combo
  for (const F of M.fighters) {
    if (['hit', 'launched', 'down', 'thrown', 'blockstun'].includes(F.state)) F.comboIdle = 0; else if (++F.comboIdle > 20) { F.comboHits = 0; F.comboDmg = 0; }
    if (M.mode === 'training' && F.idx === 1 && F.comboIdle > 90 && F.hp < F.maxHp) F.hp = F.maxHp;   // recarga en prácticas
  }
  updatePhase(M);
}

function updatePhase(M) {
  const [A, B] = M.fighters;
  M.phaseT++;
  if (M.mode === 'training') return;
  if (M.phase === 'intro' && M.phaseT >= 100) { M.phase = 'fight'; M.phaseT = 0; }
  else if (M.phase === 'fight') {
    if (A.ko || B.ko) { M.phase = 'ko'; M.phaseT = 0; M.roundWinner = A.ko && B.ko ? -1 : A.ko ? 1 : 0; M.hitstop = 24; M.events.push({ type: 'ko' }); }
    else if (--M.timer <= 0) {
      M.timer = 0; M.phase = 'timeup'; M.phaseT = 0;
      const ra = A.hp / A.maxHp, rb = B.hp / B.maxHp; M.roundWinner = ra > rb ? 0 : rb > ra ? 1 : -1; M.events.push({ type: 'timeup' });
    }
  } else if ((M.phase === 'ko' && M.phaseT >= 150) || (M.phase === 'timeup' && M.phaseT >= 120)) {
    if (M.roundWinner >= 0) M.wins[M.roundWinner]++;
    if (M.wins[0] >= WINS_NEEDED || M.wins[1] >= WINS_NEEDED) {
      M.matchWinner = M.wins[0] >= WINS_NEEDED ? 0 : 1; M.phase = 'matchEnd'; M.phaseT = 0;
      const W = M.fighters[M.matchWinner]; if (!W.ko) setState(W, 'win');
      M.events.push({ type: 'matchEnd', winner: M.matchWinner });
    } else { M.round++; resetRound(M); M.events.push({ type: 'round', round: M.round }); }
  }
}

// ---------- Control de cada luchador ----------
function takeAction(F, filter) {
  for (let i = F.buffer.length - 1; i >= 0; i--) { const b = F.buffer[i]; if (!filter || filter(b.a)) { F.buffer.splice(i, 1); return b.a; } }
  return null;
}
function startAttack(F, key) { setState(F, 'attack', key); }
function canAirAttack(F, key) { return WEAPONS[F.wk].moves[key] && F.airUsed.length < 3 && !F.airUsed.includes(key); }
function doubleJump(M, F, input) {
  F.airJumpsLeft--; F.airUsed = []; setState(F, 'air'); F.vy = CHARS[F.charId].jumpV * 0.9; F.vx = input.dx * 2.4;
  M.events.push({ type: 'djump', x: F.x, y: F.y });
}

function updateFighter(M, F, O, input) {
  F.t++;
  const C = CHARS[F.charId];
  const upEdge = input.up && !F.prevUp;
  // doble pulsación de dirección (flanco de subida) → dash; la detección corre siempre para no perder toques
  let dashTap = null;
  if (input.dx && input.dx !== F.prevDx) {
    if (input.dx === F.tapDir && M.frame - F.tapT <= DASH.window && !input.down && !input.up) dashTap = input.dx === F.face ? 'dashF' : 'dashB';
    F.tapDir = dashTap ? 0 : input.dx; F.tapT = M.frame;
  }
  F.prevDx = input.dx;
  if (F.state === 'win' || F.state === 'lose') { F.f++; return; }
  // ---- estados de reacción (recibiendo golpes) ----
  switch (F.state) {
    case 'hit': F.f++; F.x += F.push * DT; F.push *= 0.86; if (F.f >= F.stun) setState(F, 'idle'); return;
    case 'blockstun': F.f++; F.x += F.push * DT; F.push *= 0.86; if (F.f >= F.stun) setState(F, input.block ? (F.blockLow ? 'cblock' : 'block') : 'idle'); return;
    case 'launched': F.f++; F.x += F.vx * DT; F.y += F.vy * DT; F.vy -= (20 + F.juggle * 0.8) * DT;
      if (F.y <= 0) { F.y = 0; F.vy = 0; F.vx = 0; setState(F, 'down'); M.events.push({ type: 'land', x: F.x }); } return;
    case 'down': F.f++; F.juggle = 0; if (!F.ko && F.f >= 46) setState(F, 'getup'); return;
    case 'getup': F.f++; if (F.f >= 30) setState(F, 'idle'); return;
    case 'thrown': F.f++; return;
  }
  // mirar al rival salvo atacando
  if (F.state !== 'attack' && F.state !== 'prejump') F.face = Math.sign(O.x - F.x) || F.face;

  if (F.state === 'attack') {
    F.f++;
    const m = getMove(F);
    if (m.air) airPhysics(M, F);
    if (F.state !== 'attack') return;
    if (m.dive && F.f === 6) { F.vx = F.face * 3.6; F.vy = -7.5; }
    if (F.move === 'throw') { updateThrow(M, F, O); }
    // cancelaciones al conectar
    if (F.hitDone && m.hit && F.f > m.active[0]) {
      if (m.jumpCancel && input.up) { F.jumpDir = 0; F.superJump = true; setState(F, 'prejump'); return; }
      if (m.air && upEdge && F.airJumpsLeft > 0) { doubleJump(M, F, input); return; }
      const a = takeAction(F, x => x !== 'grab');
      if (a) {
        if (m.air) { const k = 'a_' + a; if (canAirAttack(F, k)) { F.airUsed.push(k); startAttack(F, k); return; } }
        else {
          const k = (input.down && a === 'tap') ? 'g_down' : 'g_' + a;
          if (WEAPONS[F.wk].moves[k] && F.chain < C.chainMax && (k !== F.move || k === 'g_tap')) { F.chain++; startAttack(F, k); return; }
        }
      }
    }
    if (!m.air && F.f >= m.total) setState(F, m.crouchEnd && input.down ? 'crouch' : 'idle');
    else if (m.air && !m.dive && F.f >= m.total) setState(F, 'air');
    return;
  }
  if (F.state === 'prejump') {
    F.f++;
    if (F.f >= 3) {
      F.airBase = F.hipY; setState(F, 'air'); F.airUsed = []; F.airJumpsLeft = C.airJumps;
      M.events.push({ type: 'dust', x: F.x, dir: 0 });
      F.vy = F.superJump ? C.jumpV * 1.24 : C.jumpV; F.vx = F.superJump ? F.face * 1.1 : F.jumpDir * 2.8; F.superJump = false;
    }
    return;
  }
  if (F.state === 'air') {
    F.f++; airPhysics(M, F);
    if (F.state !== 'air') return;
    if (upEdge && F.airJumpsLeft > 0 && F.f > 4) { doubleJump(M, F, input); return; }
    const a = takeAction(F, x => x !== 'grab');
    if (a) { const k = 'a_' + a; if (canAirAttack(F, k)) { F.airUsed.push(k); startAttack(F, k); } }
    return;
  }
  if (F.state === 'land') { F.f++; if (F.f >= 5) setState(F, 'idle'); return; }
  if (F.state === 'dashF' || F.state === 'dashB') {
    F.f++;
    const fwd = F.state === 'dashF', dur = fwd ? DASH.fwdFrames : DASH.backFrames;
    const sp = (fwd ? DASH.fwdSpeed : -DASH.backSpeed) * (F.f < 5 ? 1 : Math.pow(0.84, F.f - 4));
    F.x += F.face * sp * DT;
    // el dash hacia delante se puede cancelar en ataque a partir de cierto frame
    if (fwd && F.f >= DASH.fwdCancel) {
      const a = takeAction(F);
      if (a === 'grab') { F.chain = 0; startAttack(F, 'grab'); return; }
      if (a) { const k = (input.down && a === 'tap') ? 'g_down' : 'g_' + a; if (WEAPONS[F.wk].moves[k]) { F.chain = 0; startAttack(F, k); return; } }
    }
    if (F.f >= dur) setState(F, 'idle');
    return;
  }

  // ---- estados neutros en el suelo ----
  if (dashTap) { setState(F, dashTap); M.events.push({ type: 'dust', x: F.x, dir: dashTap === 'dashF' ? F.face : -F.face, big: true }); return; }
  if (input.up) { F.jumpDir = input.dx; setState(F, 'prejump'); return; }
  const a = takeAction(F);
  if (a === 'grab') { F.chain = 0; startAttack(F, 'grab'); return; }
  if (a) { const k = (input.down && a === 'tap') ? 'g_down' : 'g_' + a; if (WEAPONS[F.wk].moves[k]) { F.chain = 0; startAttack(F, k); return; } }
  if (input.block) { const s = input.down ? 'cblock' : 'block'; if (F.state !== s) setState(F, s); F.blockLow = input.down; F.f++; return; }
  if (input.down) { if (F.state !== 'crouch') setState(F, 'crouch'); F.f++; return; }
  if (input.dx) {
    const s = input.dx === F.face ? 'walkF' : 'walkB';
    if (F.state !== s) setState(F, s);
    F.f++; F.x += input.dx * (s === 'walkF' ? C.walkF : C.walkB) * DT;
    return;
  }
  if (F.state !== 'idle') setState(F, 'idle');
  F.f++;
}

function airPhysics(M, F) {
  F.x += F.vx * DT; F.y += F.vy * DT; F.vy -= 20 * DT;
  if (F.y <= 0) { F.y = 0; F.vy = 0; F.vx = 0; setState(F, 'land'); M.events.push({ type: 'land', x: F.x }); }
}

// ---------- Agarres ----------
function testGrab(A, D) {
  const m = getMove(A);
  if (!m || !m.grab || A.hitDone || A.f < m.active[0] || A.f > m.active[1]) return false;
  const dmv = getMove(D);
  const throwable = THROWABLE.includes(D.state) || (D.state === 'attack' && !dmv.air);
  return throwable && D.y <= 0 && !D.ko && Math.abs(D.x - A.x) < m.range * A.scale;
}
function startThrow(M, A, D) {
  setState(A, 'attack', 'throw'); A.hitDone = true;
  setState(D, 'thrown'); M.hitstop = 4; M.events.push({ type: 'grab', x: (A.x + D.x) / 2, y: 1.1 });
}
function techThrow(M, A, B) {
  for (const F of [A, B]) { setState(F, 'blockstun'); F.stun = 16; F.push = -F.face * 2.6; }
  M.hitstop = 8; M.events.push({ type: 'tech', x: (A.x + B.x) / 2, y: 1.1 });
}
function updateThrow(M, A, D) {
  const m = WEAPONS[A.wk].moves.throw;
  if (A.f < m.release) {
    const a = toWorld(A, A.J.handF), b = toWorld(A, A.J.handN);
    D.x = (a[0] + b[0]) / 2 + A.face * 0.12; D.y = Math.max(0, (a[1] + b[1]) / 2 - 0.95); D.face = -A.face;
  } else if (A.f === m.release) {
    D.vx = A.face * 4.2; D.vy = 4.6; D.y = Math.max(D.y, 0.3);
    damage(M, D, Math.round(m.dmg * damageMult(A.charId, A.wk, 'throw')), true); setState(D, 'launched'); D.juggle = 99;
    const p = toWorld(D, D.J.waist); M.hitstop = m.stop; M.events.push({ type: 'hit', x: p[0], y: p[1], power: 2, big: true });
  }
}

// ---------- Cajas de empuje ----------
function pushboxes(A, B) {
  const skip = ['thrown', 'down'].includes(A.state) || ['thrown', 'down'].includes(B.state) || A.ko || B.ko;
  if (!skip && !(A.y > 0.55 || B.y > 0.55)) {
    const d = A.x - B.x, min = 0.29 * (A.scale + B.scale);
    if (Math.abs(d) < min) {
      const side = Math.sign(d) || -A.face, over = (min - Math.abs(d)) / 2;
      A.x += side * over; B.x -= side * over;
    }
  }
  for (const [F, O] of [[A, B], [B, A]]) {
    const cx = Math.max(STAGE.min, Math.min(STAGE.max, F.x));
    if (cx !== F.x) { if (!skip && Math.abs(O.x - F.x) < 1.2) O.x += cx - F.x; F.x = cx; }
  }
}

// ---------- Pose final, cadera y articulaciones ----------
export function finalizePose(F) {
  let pose;
  const m = getMove(F), W = WEAPONS[F.wk];
  if (F.state === 'attack') pose = sample(m.keys, F.f, false);
  else if (F.state === 'air') pose = lerpPose(P({ ...AIR_UP, aN: W.airGuard }), P({ ...AIR_DN, aN: W.airGuard }), Math.min(1, Math.max(0, (6.8 - F.vy) / 12)));
  else if (F.state === 'hit') { const base = F.react === 'body' ? HIT_B : HIT_H; pose = lerpPose(base, G, Math.max(0, (F.f - F.stun * 0.5) / Math.max(1, F.stun * 0.5))); }
  else if (F.state === 'launched') pose = lerpPose(AIR_HIT, P({ ...AIR_HIT, rot: 60 }), Math.min(1, Math.max(0, -F.vy / 8)));
  else if (F.state === 'down') pose = DOWN;
  else if (F.state === 'thrown') pose = HELD;
  else {
    const st = F.state === 'dashF' ? 'walkF' : F.state === 'dashB' ? 'walkB' : F.state;
    const a = ANIM[st === 'blockstun' ? 'blockstun' : st] || ANIM.idle;
    pose = sample(a.keys, (F.state === 'idle' || F.state === 'win') ? F.t : F.f, a.loop);
    // el brazo del arma mantiene su guardia en estados neutros
    if (['idle', 'walkF', 'walkB', 'prejump', 'land', 'dashF', 'dashB'].includes(F.state)) pose = { ...pose, aN: W.guard };
    if (F.state === 'crouch') pose = { ...pose, aN: W.crouchGuard || W.guard };
  }
  if (F.blend > 0 && F.blendFrom) { pose = lerpPose(pose, F.blendFrom, F.blend / 6); F.blend--; }
  F.pose = pose;
  const J = fk(pose, W); F.J = J;
  const airborne = isAir(F) || F.state === 'launched' || F.state === 'thrown';
  if (airborne) F.hipY = F.y + (F.state === 'launched' || F.state === 'thrown' ? 0.9 : F.airBase);
  else F.hipY = ((pose.rot || 0) > 20 ? -J.minAll : -J.minFoot) * F.scale;
}

// ---------- Golpes ----------
export function hurtbox(D) {
  const J = D.J; let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const k of ['hip', 'waist', 'neck', 'head', 'kneeF', 'kneeN', 'ankleF', 'ankleN']) {
    const [x, y] = toWorld(D, J[k]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const s = D.scale;
  return { x0: x0 - 0.17 * s, x1: x1 + 0.17 * s, y0: Math.max(0, y0 - 0.1), y1: y1 + 0.15 * s };
}
function testHit(A, D) {
  if (A.state !== 'attack' || A.hitDone || invuln(D)) return null;
  const m = getMove(A);
  if (!m.hit || A.f < m.active[0] || A.f > m.active[1]) return null;
  const hb = hurtbox(D);
  for (const [ja, jb, r] of m.hit) {
    if (!A.J[ja] || !A.J[jb]) continue;
    const a = toWorld(A, A.J[ja]), b = toWorld(A, A.J[jb]), rr = r * A.scale;
    for (let i = 6; i >= 0; i--) {
      const wx = a[0] + (b[0] - a[0]) * i / 6, wy = a[1] + (b[1] - a[1]) * i / 6;
      const cx = Math.max(hb.x0, Math.min(wx, hb.x1)), cy = Math.max(hb.y0, Math.min(wy, hb.y1));
      if ((wx - cx) ** 2 + (wy - cy) ** 2 <= rr * rr) return { m, x: cx, y: cy };
    }
  }
  return null;
}
function damage(M, D, dmg, raw = false) {
  const scale = raw ? 1 : Math.max(0.35, 1 - 0.1 * D.comboHits);
  const d = Math.max(1, Math.round(dmg * scale));
  D.hp = Math.max(M.mode === 'training' && D.idx === 1 ? 1 : 0, D.hp - d);
  D.comboHits++; D.comboDmg += d; D.comboIdle = 0;
  if (D.hp <= 0 && M.phase === 'fight') D.ko = true;
  return d;
}
function applyHit(M, A, D, { m, x, y }) {
  A.hitDone = true;
  const dir = A.face;
  // --- bloqueo: alto bloquea medios y altos, agachado bloquea medios y bajos ---
  const guardHigh = D.state === 'block' || (D.state === 'blockstun' && !D.blockLow);
  const guardLow = D.state === 'cblock' || (D.state === 'blockstun' && D.blockLow);
  if ((guardHigh && !m.low) || (guardLow && !m.overhead)) {
    D.blockLow = guardLow; setState(D, 'blockstun'); D.stun = Math.max(8, Math.round((m.stun || 18) * 0.7)); D.push = dir * (m.push || 1) * 1.1;
    M.hitstop = Math.max(4, (m.stop || 8) - 3); M.events.push({ type: 'block', x, y });
    return;
  }
  // --- armadura (Kai) ---
  const dm = D.state === 'attack' ? getMove(D) : null;
  const armorWin = dm && (dm.armor || (CHARS[D.charId].armor && (D.move === 'g_back' || D.move === 'g_up') ? [0, dm.active[1]] : null));
  if (CHARS[D.charId].armor && armorWin && D.f >= armorWin[0] && D.f <= armorWin[1]) {
    damage(M, D, Math.round(m.dmg * 0.8)); M.hitstop = 6; M.events.push({ type: 'armor', x, y });
    return;
  }
  const counter = dm && dm.active && D.f < dm.active[0];
  damage(M, D, Math.round(m.dmg * damageMult(A.charId, A.wk, A.move) * (counter ? 1.2 : 1)));
  M.hitstop = m.stop + (D.ko ? 16 : 0) + (counter ? 3 : 0);
  M.events.push({ type: 'hit', x, y, power: m.dmg / 60, counter, attacker: A.idx });
  const airborne = D.state === 'launched' || D.y > 0.05;
  let react = m.react;
  if (CHARS[A.charId].lowKnock && m.low) react = 'knock';
  if (react === 'launch' || (airborne && react !== 'spike') || react === 'knock' || D.ko) {
    D.juggle++;
    const vy = react === 'launch' ? (m.air ? 6.2 : 7.6) : react === 'knock' ? 3.6 : Math.max(2.4, 4.4 - D.juggle * 0.3);
    setState(D, 'launched'); D.vy = vy; D.vx = dir * (react === 'launch' ? 0.7 : (m.push || 1) * 0.9); D.y = Math.max(D.y, 0.02); D.face = -dir;
    if (m.air && react !== 'launch') A.vy = Math.max(A.vy, 2.2);
  } else if (react === 'spike') {
    setState(D, 'launched'); D.vy = airborne ? -7 : 2.5; D.vx = dir * 0.6; D.y = Math.max(D.y, 0.02); D.juggle++; D.face = -dir;
  } else {
    setState(D, 'hit'); D.react = react; D.stun = (m.stun || 16) + (counter ? 4 : 0); D.push = dir * (m.push || 1) * 1.0; D.face = -dir;
  }
}

// ¿Aceptará el luchador una nueva acción ahora mismo? (para los combos de demostración)
export function readyFor(F) {
  if (F.state === 'attack') { const m = getMove(F); return F.hitDone && m.hit && F.f > m.active[0]; }
  return ['idle', 'walkF', 'walkB', 'crouch', 'air', 'block', 'cblock', 'dashF'].includes(F.state);
}
