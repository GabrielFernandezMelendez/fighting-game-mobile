import { createMatch, step, NO_INPUT, checksum, serialize, restore } from '../public/js/sim.js';
import { COMBOS, CHARS, ROSTER } from '../public/js/data.js';
import { ComboPlayer } from '../public/js/combo.js';
for (const id of ROSTER) {
  const C = CHARS[id];
  for (const combo of COMBOS[C.weapon]) {
    const M = createMatch({ mode: 'training', chars: [{ c: id, w: CHARS[id].weapon }, { c: 'dummy', w: 'none' }] });
    M.fighters[0].x = 0; M.fighters[1].x = 0.75;
    for (let i = 0; i < 10; i++) step(M, [NO_INPUT, NO_INPUT]);
    const cp = new ComboPlayer(combo.steps); let maxHits = 0, maxDmg = 0; const trace = [];
    for (let i = 0; i < 400; i++) {
      const inp = cp.input(M.fighters[0]);
      const prev = M.fighters[0].move;
      step(M, [inp, NO_INPUT]);
      if (M.fighters[0].move !== prev && M.fighters[0].move) trace.push(M.fighters[0].move);
      maxHits = Math.max(maxHits, M.fighters[1].comboHits); maxDmg = Math.max(maxDmg, M.fighters[1].comboDmg);
    }
    console.log(id.padEnd(7), combo.name.padEnd(16), 'pasos', combo.steps.length, 'golpes', maxHits, 'daño', maxDmg, '|', trace.join(' '));
  }
}
// determinismo: dos simulaciones con las mismas entradas
const A = createMatch({ mode: 'online', chars: ['kai', 'sombra'] }), B = restore(serialize(A));
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const acts = [null, 'tap', 'left', 'right', 'up', 'down', 'grab'];
for (let i = 0; i < 6000; i++) {
  const ins = [0, 1].map(() => ({ dx: [-1, 0, 1][Math.floor(rnd() * 3)], up: rnd() < 0.05, down: rnd() < 0.1, block: rnd() < 0.1, act: rnd() < 0.15 ? acts[Math.floor(rnd() * 7)] : null }));
  step(A, ins); step(B, ins);
}
console.log('determinista:', checksum(A) === checksum(B), 'ronda', A.round, 'victorias', A.wins, 'fase', A.phase, 'hp', A.fighters.map(f => f.hp));
