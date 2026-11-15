// Reproductor de combos de demostración: genera la entrada del jugador fotograma a fotograma
import { readyFor } from './sim.js';
import { WEAPONS } from './data.js';
export class ComboPlayer {
  constructor(steps) { this.steps = steps.slice(); this.i = 0; this.wait = 0; this.upHold = 0; this.holdUp = null; this.holdT = 0; this.lastKey = null; this.timeout = 0; this.done = false; }
  // devuelve la entrada para este fotograma
  input(F) {
    const inp = { dx: 0, up: false, down: false, block: false, act: null };
    if (this.done) return inp;
    // mantener arriba hasta que el salto ocurra de verdad (el hitstop congela la simulación)
    if (this.holdUp) { if (this.holdUp(F) || ++this.holdT > 40) { this.holdUp = null; this.wait = 2; } else { inp.up = true; return inp; } }
    if (this.upHold > 0) { this.upHold--; inp.up = true; return inp; }
    if (this.wait > 0) { this.wait--; return inp; }
    if (++this.timeout > 120) { this.done = true; return inp; }
    const s = this.steps[this.i];
    if (s === undefined) { this.done = true; return inp; }
    if (s === 'jump') {
      // súper salto: mantener arriba tras conectar el lanzador
      if (F.state === 'attack' && F.hitDone && WEAPONS[F.wk].moves[F.move].jumpCancel) { this.holdUp = f => f.state === 'air'; this.holdT = 0; inp.up = true; this.next(0); }
      return inp;
    }
    if (s === 'hop') {
      // salto normal desde el suelo (para mostrar los ataques aéreos)
      if (['idle', 'walkF', 'walkB', 'crouch'].includes(F.state)) { this.holdUp = f => f.state === 'air'; this.holdT = 0; inp.up = true; this.next(6); }
      return inp;
    }
    if (s === 'hopf') {
      // salto hacia el rival
      if (['idle', 'walkF', 'walkB', 'crouch'].includes(F.state)) { this.holdUp = f => f.state === 'air'; this.holdT = 0; inp.up = true; inp.dx = F.face; this.next(0); }
      return inp;
    }
    if (s === 'fall') { if (F.state === 'air' && F.vy < 0.5) this.next(0); return inp; }
    if (s === 'djump') {
      if ((F.state === 'air' || (F.state === 'attack' && F.hitDone)) && F.airJumpsLeft > 0) { const n = F.airJumpsLeft; this.holdUp = f => f.airJumpsLeft < n; this.holdT = 0; inp.up = true; this.next(0); }
      return inp;
    }
    const air = s.startsWith('a:'), a = air ? s.slice(2) : s;
    const inAir = F.state === 'air' || (F.state === 'attack' && WEAPONS[F.wk].moves[F.move]?.air);
    if (air !== inAir) return inp;
    if (readyFor(F)) { inp.act = a === 'fwd' ? (F.face > 0 ? 'right' : 'left') : a === 'back' ? (F.face > 0 ? 'left' : 'right') : a; this.next(3); }
    return inp;
  }
  next(w) { this.i++; this.wait = w; this.timeout = 0; }
}
