// CPU (PvE): cada nivel debe defenderse mejor que el anterior, castigar la "tortuga" con agarres
// en niveles altos, ganar a los niveles bajos y ser determinista con la misma semilla.
// Run: node test/cpu.mjs
import assert from 'node:assert/strict';
import { createMatch, step, NO_INPUT, checksum } from '../public/js/sim.js';
import { CpuPlayer, CPU_LEVELS } from '../public/js/cpu.js';

const CH = [{ c: 'aura', w: 'dagger' }, { c: 'sombra', w: 'spear' }];
const run = (p0, p1, frames, mode = 'versus', chars = CH) => {
  const M = createMatch({ mode, chars });
  for (let i = 0; i < frames && M.phase !== 'matchEnd'; i++) step(M, [p0(M), p1(M)]);
  return M;
};
// jugador de prueba que aprieta: se acerca y ataca con golpes alternos
const presser = () => { let n = 0; return M => { const [A, B] = M.fighters; n++;
  const d = Math.abs(B.x - A.x);
  if (d > 1.3) return { ...NO_INPUT, dx: A.face };
  if (n % 28 === 0) return { ...NO_INPUT, act: (n / 28) % 2 ? 'tap' : (A.face > 0 ? 'right' : 'left') };
  return NO_INPUT; }; };
// jugador de prueba "tortuga": se acerca y se queda cubriéndose
const turtle = () => M => { const [A, B] = M.fighters; return Math.abs(B.x - A.x) > 1.2 ? { ...NO_INPUT, dx: A.face } : { ...NO_INPUT, block: true }; };

// 1) cuanto más nivel, más bloquea
const ratios = CPU_LEVELS.map((_, lv) => {
  let blocked = 0, hits = 0;
  for (const seed of [1, 2, 3]) {
    const cpu = new CpuPlayer({ level: lv, idx: 1, chars: CH, seed });
    run(presser(), M => cpu.input(M), 60 * 60 * 2, 'training');
    blocked += cpu.stats.blocked; hits += cpu.stats.hitTaken;
  }
  return blocked / Math.max(1, blocked + hits);
});
console.log('bloqueo por nivel', ratios.map(r => r.toFixed(2)).join(' · '));
for (let i = 1; i < ratios.length; i++) assert.ok(ratios[i] > ratios[i - 1] - 0.02, `el nivel ${i} debe bloquear más que el ${i - 1}`);
assert.ok(ratios[0] < 0.3, 'Aprendiz casi no bloquea');
assert.ok(ratios[3] > 0.55, 'Leyenda bloquea la mayoría');

// 2) contra un jugador que solo se cubre, los niveles altos agarran
const grabs = CPU_LEVELS.map((_, lv) => { const cpu = new CpuPlayer({ level: lv, idx: 1, chars: CH, seed: 5 }); run(turtle(), M => cpu.input(M), 60 * 40, 'training'); return cpu.stats.grabs; });
console.log('agarres contra tortuga', grabs.join(' · '));
assert.equal(grabs[0], 0, 'Aprendiz no castiga la guardia');
assert.ok(grabs[2] > 0 && grabs[3] > 0, 'Veterano y Leyenda agarran a quien se cubre');

// 3) Leyenda gana a Aprendiz (CPU contra CPU)
let wins = 0;
for (const seed of [11, 12, 13]) {
  const a = new CpuPlayer({ level: 3, idx: 0, chars: CH, seed }), b = new CpuPlayer({ level: 0, idx: 1, chars: CH, seed: seed + 100 });
  const M = run(M => a.input(M), M => b.input(M), 60 * 60 * 12);
  if (M.matchWinner === 0) wins++;
}
console.log('Leyenda vs Aprendiz', wins + '/3');
assert.ok(wins >= 2, 'Leyenda debe ganar a Aprendiz');

// 4) determinista con la misma semilla
const once = () => { const a = new CpuPlayer({ level: 2, idx: 0, chars: CH, seed: 3 }), b = new CpuPlayer({ level: 1, idx: 1, chars: CH, seed: 4 });
  return checksum(run(M => a.input(M), M => b.input(M), 60 * 30)); };
assert.equal(once(), once(), 'misma semilla → mismo combate');
console.log('cpu OK');
