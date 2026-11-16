// =====================================================================
//  CPU (modo contra la máquina)
//
//  Inspirado en cómo lo hacen los juegos de referencia:
//  · Street Fighter 6 (CEDEC 2024): cada acción es una "carta"; las cartas se agrupan en
//    "tácticas" según la situación (neutral, defensa, antiaéreo, castigo…); cada nivel tiene
//    más tácticas y mejor "capacidad de ejecución"; un medidor de "presión" hace que la CPU
//    falle más cuando le aprietan (más en los niveles bajos).
//  · Skullgirls: cada nivel tiene puntos fuertes y débiles claros que enseñan algo al jugador.
//  · Sin "leer botones": la CPU solo VE el combate con retraso (su tiempo de reacción). Nunca
//    mira la entrada del jugador, solo estados que se ven en pantalla.
//
//  Devuelve una entrada por fotograma, igual que un jugador. No toca la simulación, así que es
//  determinista con la misma semilla y no afecta al online.
// =====================================================================
import { createMatch, step, NO_INPUT } from './sim.js';
import { WEAPONS } from './data.js';

// block: probabilidad de cubrirse ante un ataque visto a tiempo · fast: factor contra ataques rápidos
// lowRead: acierta alto/bajo · antiAir · punish · antiTurtle: agarra si te cubres mucho
// combo: golpes de su ruta de combo · think: fotogramas entre decisiones · exec: capacidad de ejecución
export const CPU_LEVELS = [
  { id: 'aprendiz', name: 'Aprendiz', desc: 'Reacciona tarde y casi no se cubre.',
    lesson: 'Golpea y encadena: apenas se defiende.',
    react: 28, think: 26, exec: 0.6, block: 0.12, fast: 0.2, lowRead: 0.3, antiAir: 0.05, punish: 0.1, antiTurtle: 0,
    combo: 1, dash: 0, jumpIn: 0.03, backoff: 0.05, aggression: 0.5, mixup: 0 },
  { id: 'luchador', name: 'Luchador', desc: 'Bloquea lo lento. Combos cortos.',
    lesson: 'Usa golpes rápidos y mezcla alto/bajo: bloquea lo lento.',
    react: 18, think: 18, exec: 0.78, block: 0.42, fast: 0.35, lowRead: 0.5, antiAir: 0.3, punish: 0.35, antiTurtle: 0.2,
    combo: 2, dash: 0.12, jumpIn: 0.08, backoff: 0.12, aggression: 0.55, mixup: 0.15 },
  { id: 'veterano', name: 'Veterano', desc: 'Si te cubres mucho, te agarra.',
    lesson: 'No te quedes cubriéndote: el agarre rompe el bloqueo.',
    react: 11, think: 12, exec: 0.9, block: 0.7, fast: 0.65, lowRead: 0.75, antiAir: 0.6, punish: 0.65, antiTurtle: 0.6,
    combo: 3, dash: 0.25, jumpIn: 0.1, backoff: 0.15, aggression: 0.6, mixup: 0.35 },
  { id: 'leyenda', name: 'Leyenda', desc: 'Bloquea casi todo y castiga fallos.',
    lesson: 'Bloquea bien, castiga sus fallos y varía tu ataque.',
    react: 7, think: 7, exec: 0.97, block: 0.9, fast: 0.9, lowRead: 0.88, antiAir: 0.85, punish: 0.9, antiTurtle: 0.85,
    combo: 4, dash: 0.4, jumpIn: 0.12, backoff: 0.15, aggression: 0.65, mixup: 0.6 },
];
const ROUTES = [['tap'], ['tap', 'fwd'], ['tap', 'fwd', 'up'], ['tap', 'tap', 'fwd', 'up']];
const NEUTRAL = ['idle', 'walkF', 'walkB', 'crouch', 'block', 'cblock', 'land'];
const GROUND_MOVES = ['g_tap', 'g_fwd', 'g_back', 'g_up', 'g_down', 'grab'];

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- Alcance real de cada golpe (medido con la propia simulación) ----------
const reachCache = new Map();
export function moveTable(c, w) {
  const key = c + '/' + w;
  if (reachCache.has(key)) return reachCache.get(key);
  const T = {};
  for (const k of GROUND_MOVES) {
    const m = WEAPONS[w].moves[k]; if (!m) continue;
    let reach = 0;
    for (let d = 2.6; d >= 0.4 && !reach; d -= 0.1) {
      const M = createMatch({ mode: 'training', chars: [{ c, w }, { c: 'dummy', w: 'none' }] });
      const [A, B] = M.fighters; A.x = -d / 2; B.x = d / 2;
      const act = k === 'grab' ? 'grab' : k === 'g_fwd' ? 'right' : k === 'g_back' ? 'left' : k === 'g_down' ? 'tap' : k.slice(2);
      for (let f = 0; f < 70; f++) {
        step(M, [f === 0 ? { ...NO_INPUT, act, down: k === 'g_down' } : { ...NO_INPUT, down: k === 'g_down' && f < 4 }, NO_INPUT]);
        if (B.hp < B.maxHp || ['hit', 'launched', 'thrown', 'blockstun'].includes(B.state)) { reach = +d.toFixed(2); break; }
      }
    }
    T[k] = { reach, startup: m.active[0], end: m.active[1], total: m.total, low: !!m.low, overhead: !!m.overhead, dmg: m.dmg || 0 };
  }
  reachCache.set(key, T);
  return T;
}

// ---------- Jugador CPU ----------
export class CpuPlayer {
  constructor({ level = 1, idx = 1, chars, seed = 7 }) {
    this.L = CPU_LEVELS[level]; this.level = level; this.idx = idx; this.rng = mulberry32(seed);
    this.me = moveTable(chars[idx].c, chars[idx].w); this.op = moveTable(chars[1 - idx].c, chars[1 - idx].w);
    this.opMax = Math.max(...Object.entries(this.op).filter(([k]) => k !== 'grab').map(([, m]) => m.reach));
    this.reset();
    this.stats = { blocked: 0, hitTaken: 0, grabs: 0, punishes: 0, antiAir: 0, mistakes: 0, blocksTried: 0 };
  }
  reset() {
    this.hist = []; this.plan = []; this.cool = 20; this.pressure = 0; this.turtle = 0; this.guard = null;
    this.lastHp = null; this.seenMove = null; this.combo = null; this.lastOwnMove = null; this.opMoves = 1; this.opLows = 0;
  }
  r() { return this.rng(); }
  // Lo que la CPU "ve": el rival tal y como estaba hace L.react fotogramas
  perceive(O) {
    this.hist.push({ state: O.state, move: O.move, f: O.f, x: O.x, y: O.y, vx: O.vx, vy: O.vy, hitDone: O.hitDone, t: O.t });
    if (this.hist.length > 60) this.hist.shift();
    return this.hist[Math.max(0, this.hist.length - 1 - this.L.react)];
  }
  // capacidad de ejecución, rebajada por la presión (los niveles bajos se ponen más nerviosos)
  execOk() { const e = this.L.exec - this.pressure * (1.1 - this.L.exec) * 0.7; return this.r() < e; }

  input(M) {
    const F = M.fighters[this.idx], O = M.fighters[1 - this.idx];
    const P = this.perceive(O);
    if (M.phase !== 'fight') { if (M.phase === 'intro') this.reset(); return NO_INPUT; }
    // presión: golpes recibidos, bloqueos y vida baja
    const opened = ['hit', 'launched', 'thrown'].includes(F.state) && !['hit', 'launched', 'thrown', 'down'].includes(this.prevState);
    if (opened) { this.pressure = Math.min(1, this.pressure + 0.22); this.stats.hitTaken++; }
    this.prevState = F.state;
    if (F.state === 'blockstun') this.pressure = Math.min(1, this.pressure + 0.004);
    this.pressure *= 0.992;
    // el jugador "tortuga": cuánto lleva cubriéndose (visto)
    if (['block', 'cblock', 'blockstun'].includes(P.state)) this.turtle++; else this.turtle *= 0.993;
    if (F.state === 'blockstun' && F.f <= 1 && this.prevBlock !== F.t - F.f) { this.stats.blocked++; this.prevBlock = F.t - F.f; }

    const face = F.face, dist = Math.abs(O.x - F.x);
    const out = { ...NO_INPUT };

    // 1) combo en curso: tras conectar, siguiente golpe de la ruta (una vez por golpe)
    if (F.state === 'attack' && F.hitDone && this.combo && this.combo.length && F.move !== this.lastOwnMove &&
        ['hit', 'launched'].includes(O.state)) {
      this.lastOwnMove = F.move;
      const next = this.combo.shift();
      if (this.execOk()) return this.act(next, face, out);
      this.stats.mistakes++; this.combo = null;
    }
    if (F.state !== 'attack') this.lastOwnMove = null;

    // 2) manteniendo la guardia
    if (this.guard) {
      const g = this.guard;
      g.n++;
      const attacking = P.state === 'attack';
      const pmG = attacking ? this.op[P.move] : null;
      const opening = pmG && P.f > pmG.end && !P.hitDone && F.state !== 'blockstun' && this.bestPunish(Math.abs(O.x - F.x), pmG.total - P.f);
      if (opening || (!attacking && g.n > g.min) || g.n > 70 || !this.canBlock(F)) this.guard = null;
      else return { ...out, block: true, down: g.low };
    }

    // 3) plan en marcha
    if (this.plan.length && !this.interruptPlan(F, P, dist)) return this.runPlan(F, O, out);

    if (!NEUTRAL.includes(F.state) && F.state !== 'air') return out;
    if (F.state === 'air') return out;

    // 4) defensa: ve un ataque del rival que le puede alcanzar
    const pm = P.state === 'attack' ? this.op[P.move] : null;
    const moveId = pm ? P.move + '@' + (P.t - P.f) : null;   // cada golpe visto se decide una sola vez
    if (pm && P.f <= pm.end && moveId !== this.seenMove) {
      this.seenMove = moveId; this.opMoves++; if (pm.low) this.opLows++;
      if (dist <= pm.reach + 0.3) {
        if (P.move === 'grab') {
          // agarre: no se bloquea; los niveles altos lo rompen agarrando a la vez o se apartan
          if (this.r() < this.L.antiTurtle * 0.5 && this.execOk()) return this.act('grab', face, out);
          if (this.r() < this.L.backoff * 2) { this.plan = [{ n: 12, dx: -face }]; return this.runPlan(F, O, out); }
          return out;
        }
        const chance = this.L.block * (pm.startup >= 8 ? 1 : this.L.fast);
        this.stats.blocksTried++;
        if (this.r() < chance) {
          // alto o bajo: acierta según lowRead; si falla, se cubre al revés
          const right = !!pm.low;                       // bajo → agachado; alto o normal → de pie
          const mixed = pm.low || pm.overhead;          // en golpes normales no hay que adivinar
          const low = mixed && this.r() >= this.L.lowRead ? !right : right;
          this.guard = { low, n: 0, min: Math.max(6, pm.end - P.f + 6) };
          return { ...out, block: true, down: this.guard.low };
        }
      }
    }

    // 5) antiaéreo
    if (P.y > 0.25 && dist < 1.8 && Math.sign(P.vx || 0) !== Math.sign(P.x - F.x) && this.aaSeen !== P.t - Math.round(P.y * 100)) {
      this.aaSeen = P.t - Math.round(P.y * 100);
      if (this.r() < this.L.antiAir) {
        const up = this.me.g_up;
        if (up && dist < up.reach + 0.25 && this.execOk()) { this.stats.antiAir++; this.combo = ROUTES[Math.min(this.L.combo, 2) - 1].slice(1); return this.act('up', face, out); }
        this.guard = { low: false, n: 0, min: 20 }; return { ...out, block: true };
      }
    }

    // 6) castigo: el rival ha fallado un golpe y está recuperándose
    const pmNow = P.state === 'attack' ? this.op[P.move] : null;
    if (pmNow && P.f > pmNow.end && !P.hitDone && this.cool <= 0) {
      this.cool = this.L.think;
      const k = this.bestPunish(dist, pmNow.total - P.f);
      if (k && this.r() < this.L.punish) {
        if (!this.execOk()) { this.stats.mistakes++; return out; }
        this.stats.punishes++; this.combo = ROUTES[this.L.combo - 1].slice(k === 'g_tap' ? 1 : 2);
        return this.act(k.slice(2), face, out);
      }
    }

    // 7) neutral: elegir una carta según la distancia (una decisión cada L.think fotogramas)
    if (--this.cool > 0) {
      // entre decisiones: los niveles altos no se quedan "en blanco" a tiro del rival, se cubren
      if (this.idleGuard && dist <= this.opMax + 0.25 && this.canBlock(F)) return { ...out, block: true, down: this.idleLow };
      return out;
    }
    this.cool = this.L.think + Math.floor(this.r() * this.L.think * 0.6);
    this.idleGuard = this.r() < this.L.block; this.idleLow = this.r() < (this.opLows / this.opMoves) * this.L.lowRead;
    return this.neutral(F, O, P, dist, face, out);
  }

  canBlock(F) { return ['idle', 'walkF', 'walkB', 'crouch', 'block', 'cblock', 'blockstun', 'land'].includes(F.state); }
  interruptPlan(F, P, dist) {
    // si el rival ataca de verdad, el plan de movimiento se cancela para poder defenderse
    if (P.state === 'attack' && this.plan[0] && !this.plan[0].act && dist < 2) { this.plan = []; return true; }
    return false;
  }
  bestPunish(dist, window) {
    let best = null;
    for (const k of ['g_up', 'g_fwd', 'g_tap']) {
      const m = this.me[k]; if (!m || !m.reach) continue;
      if (dist <= m.reach - 0.05 && m.startup + 2 < window) { if (!best || m.dmg > this.me[best].dmg) best = k; }
    }
    return best;
  }
  // traduce la carta a la entrada (fwd/back son relativos a hacia dónde mira)
  act(card, face, out) {
    const a = card === 'fwd' ? (face > 0 ? 'right' : 'left') : card === 'back' ? (face > 0 ? 'left' : 'right') : card === 'down' ? 'tap' : card;
    if (card === 'down') this.plan.unshift({ n: 3, down: true });
    if (card === 'grab') this.stats.grabs++;
    return { ...out, act: a, down: card === 'down' };
  }
  runPlan(F, O, out) {
    const s = this.plan[0];
    if (s.until) {   // caminar hasta tener al rival a tiro
      const dist = Math.abs(O.x - F.x);
      if (dist <= s.until || --s.max <= 0) { this.plan.shift(); if (s.then) return this.act(s.then, F.face, out); return out; }
      return { ...out, dx: F.face };
    }
    if (s.airAttack) {   // salto: atacar al caer cerca del rival
      if (F.state === 'air' && F.vy < 0 && Math.abs(O.x - F.x) < 1.1) { this.plan.shift(); return this.act(s.airAttack, F.face, out); }
      if (--s.max <= 0 || (F.state !== 'air' && F.state !== 'prejump' && s.started)) { this.plan.shift(); return out; }
      if (F.state === 'air') s.started = true;
      return out;
    }
    s.n--; if (s.n <= 0) this.plan.shift();
    if (s.act) return this.act(s.act, F.face, out);
    return { ...out, dx: s.dx === undefined ? 0 : s.dx * (s.rel ? F.face : 1), down: !!s.down, up: !!s.up, block: !!s.block };
  }
  // ---------- cartas de neutral ----------
  neutral(F, O, P, dist, face, out) {
    const L = this.L, me = this.me, r = () => this.r();
    // ejecución fallida: duda o hace otra cosa (como la CPU de SF6 bajo presión)
    if (!this.execOk()) {
      this.stats.mistakes++;
      if (r() < 0.6) { this.plan = [{ n: 6 + Math.floor(r() * 10) }]; return this.runPlan(F, O, out); }
      this.plan = [{ n: 10 + Math.floor(r() * 10), dx: -1, rel: true }]; return this.runPlan(F, O, out);
    }
    const tapR = me.g_tap?.reach || 0.8, fwdR = me.g_fwd?.reach || 1, downR = me.g_down?.reach || 1;
    const maxR = Math.max(tapR, fwdR, downR, me.g_back?.reach || 0);
    // anti-tortuga: si el jugador se cubre mucho, agarre (el agarre rompe el bloqueo)
    if (this.turtle > 60 && r() < L.antiTurtle) {
      const gr = me.grab?.reach || 0.9;
      this.turtle = 0;
      this.plan = [{ until: gr - 0.08, max: 40, then: 'grab' }]; return this.runPlan(F, O, out);
    }
    if (dist > maxR + 0.35) {
      // lejos: acercarse (dash, salto o caminar)
      if (r() < L.dash) { this.plan = [{ n: 2, dx: 1, rel: true }, { n: 2, dx: 0 }, { n: 2, dx: 1, rel: true }, { n: 14 }]; }
      else if (r() < L.jumpIn && dist < maxR + 1.6) { this.plan = [{ n: 1, up: true, dx: 1, rel: true }, { airAttack: r() < 0.5 ? 'tap' : 'fwd', max: 70 }]; }
      else this.plan = [{ until: maxR - 0.1, max: 30 + Math.floor(r() * 30) }];
      return this.runPlan(F, O, out);
    }
    // guardia preventiva: dentro del alcance del rival no se puede reaccionar a un golpe rápido,
    // así que los buenos jugadores (y la CPU de nivel alto) se cubren por adelantado y castigan después
    if (dist <= this.opMax + 0.25 && r() < L.block * 0.6) {
      const lowBias = this.opLows / this.opMoves;
      this.guard = { low: r() < lowBias * L.lowRead, n: 0, min: 10 + Math.floor(r() * 18) };
      return { ...out, block: true, down: this.guard.low };
    }
    if (r() > L.aggression) {
      // espera: retroceder un poco, quedarse quieto o cubrirse un momento
      const x = r();
      if (x < L.backoff * 2) this.plan = [{ n: 10 + Math.floor(r() * 14), dx: -1, rel: true }];
      else if (x < 0.5) this.plan = [{ n: 8 + Math.floor(r() * 10), block: L.block > 0.4 }];
      else this.plan = [{ n: 6 + Math.floor(r() * 12), dx: 1, rel: true }];
      return this.runPlan(F, O, out);
    }
    // atacar: elegir golpe según distancia y mezcla alto/bajo/agarre
    const route = ROUTES[L.combo - 1];
    let card;
    if (dist <= tapR - 0.05) {
      const x = r();
      if (x < L.mixup * 0.35 && me.grab && dist <= me.grab.reach - 0.05) card = 'grab';
      else if (x < L.mixup * 0.7 && me.g_down) card = 'down';
      else if (x < L.mixup && me.g_back?.overhead) card = 'back';
      else card = route[0];
    } else if (dist <= fwdR - 0.05 || dist <= downR - 0.05) {
      card = (r() < 0.35 + L.mixup * 0.3 && dist <= downR - 0.05) ? 'down' : dist <= fwdR - 0.05 ? 'fwd' : 'down';
    } else {
      this.plan = [{ until: tapR - 0.1, max: 30, then: route[0] }];
      this.combo = route.slice(1);
      return this.runPlan(F, O, out);
    }
    this.combo = card === route[0] ? route.slice(1) : card === 'fwd' ? route.filter(c => c !== 'tap' && c !== 'fwd') : [];
    return this.act(card, face, out);
  }
}
