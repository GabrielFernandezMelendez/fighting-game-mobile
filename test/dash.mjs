// Dash por doble pulsación: 66 → dashF, 44 → dashB, una sola pulsación → andar.
// Run: node test/dash.mjs
import assert from 'node:assert/strict';
import { createMatch, step, NO_INPUT, DASH } from '../public/js/sim.js';

function run(seq) {
  const M = createMatch({ mode: 'training', chars: [{ c: 'aura', w: 'dagger' }, { c: 'dummy', w: 'none' }] });
  const A = M.fighters[0], states = [], x0 = A.x;
  for (const dx of seq) { step(M, [{ ...NO_INPUT, dx }, NO_INPUT]); states.push(A.state); }
  return { states, dx: A.x - x0, A };
}
const tap = (dx, on = 3, off = 3) => [...Array(on).fill(dx), ...Array(off).fill(0)];
const idle = n => Array(n).fill(0);

// Aura empieza a la izquierda mirando a la derecha (+1)
let r = run([...idle(5), ...tap(1), ...tap(1, 2, 0), ...idle(25)]);
assert.ok(r.states.includes('dashF'), 'doble toque adelante debe hacer dashF');
assert.ok(r.dx > 0.6, 'el dash adelante debe avanzar (avanzó ' + r.dx.toFixed(2) + ')');

r = run([...idle(5), ...tap(-1), ...tap(-1, 2, 0), ...idle(25)]);
assert.ok(r.states.includes('dashB'), 'doble toque atrás debe hacer dashB');
assert.ok(r.dx < -0.5, 'el backdash debe retroceder');

r = run([...idle(5), ...tap(1, 3, DASH.window + 4), ...tap(1, 2, 0), ...idle(10)]);
assert.ok(!r.states.includes('dashF'), 'dos toques demasiado separados no hacen dash');

r = run([...idle(5), ...Array(20).fill(1)]);
assert.ok(!r.states.includes('dashF') && r.states.includes('walkF'), 'mantener la dirección es andar');

// determinismo: misma secuencia → mismo resultado
const a = run([...idle(3), ...tap(1), ...tap(1), ...idle(30)]), b = run([...idle(3), ...tap(1), ...tap(1), ...idle(30)]);
assert.equal(a.dx, b.dx);
console.log('dash OK');
