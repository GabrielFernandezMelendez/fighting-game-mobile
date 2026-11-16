// Dash por doble pulsación: 66 → dashF, 44 → dashB, una sola pulsación → andar.
// Run: node test/dash.mjs
import assert from 'node:assert/strict';
import { createMatch, step, NO_INPUT, DASH } from '../public/js/sim.js';
import { LocalInput } from '../public/js/input.js';
import { encode, decode } from '../public/js/net.js';

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
// Swipes through the real touch handlers and network input encoding.
globalThis.addEventListener = () => {};
const handlers = new Map();
const touch = new LocalInput();
touch.enabled = true;
const button = left => ({
  getBoundingClientRect: () => ({ left, top: 115, width: 60, height: 60 }),
  classList: { toggle() {} },
});
touch.bindTouch({ clientWidth: 800, addEventListener: (name, fn) => handlers.set(name, fn) },
  { grab: button(40), block: button(700), trail: { getContext: () => ({}) } }, {});
const send = (type, identifier, clientX, clientY) =>
  handlers.get(type)({ type, changedTouches: [{ identifier, clientX, clientY }], preventDefault() {} });
function swipe(x, y, dx, dy) {
  send('touchstart', 1, x, y);
  // Some phones coalesce very short gestures into the start and end events.
  send('touchend', 1, x + dx, y + dy);
}
for (const face of [1, -1]) {
  for (const [relative, expected] of [[1, 'dashF'], [-1, 'dashB']]) {
    touch.clear();
    const M = createMatch();
    const player = face === 1 ? 0 : 1;
    const A = M.fighters[player];
    const states = [];
    const advance = (n) => {
      for (let f = 0; f < n; f++) {
        const inputs = [NO_INPUT, NO_INPUT];
        inputs[player] = decode(encode(touch.sample()));
        step(M, inputs);
        states.push(A.state);
      }
    };
    swipe(170, 210, 25 * face * relative, 16);
    advance(18);
    assert.ok(states.includes(relative > 0 ? 'walkF' : 'walkB'));
    assert.ok(!states.some(s => s.startsWith('dash')));
    swipe(170, 210, 25 * face * relative, 16);
    advance(12);
    assert.ok(states.includes(expected), `swipes cortos separados por 300 ms: ${expected} mirando ${face}`);
  }
}

touch.clear();
swipe(170, 210, 25, 0);
swipe(170, 210, 25, 0);
assert.deepEqual([touch.sample().dx, touch.sample().dx, touch.sample().dx], [1, 0, 1]);
touch.clear();
swipe(170, 210, 0, -35);
assert.equal(touch.sample().up, true);
touch.clear();
swipe(170, 210, 0, 35);
assert.equal(touch.sample().down, true);
touch.clear();
swipe(550, 210, -45, 0);
assert.deepEqual(touch.sample(), { ...NO_INPUT, act: 'left' });
swipe(550, 210, 0, 0);
assert.equal(touch.sample().act, 'tap');
send('touchstart', 1, 550, 210);
send('touchcancel', 1, 550, 210);
assert.deepEqual(touch.sample(), NO_INPUT);
send('touchstart', 1, 730, 145);
assert.equal(touch.sample().block, true);
send('touchcancel', 1, 730, 145);
assert.equal(touch.sample().block, false);
swipe(70, 145, 0, 0);
assert.equal(touch.sample().act, 'grab');
console.log('dash y controles por swipe OK');
