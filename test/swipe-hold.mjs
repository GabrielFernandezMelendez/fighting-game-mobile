// Táctil sin joystick: swipe y mantener = caminar; swipe y soltar dos veces = dash; volver al centro = parar.
// Simula los eventos táctiles sobre LocalInput y los pasa por la simulación real.
globalThis.addEventListener ??= () => {};
globalThis.performance ??= { now: () => Date.now() };
const { LocalInput } = await import('../public/js/input.js');
const { createMatch, step, NO_INPUT } = await import('../public/js/sim.js');

const listeners = {};
const root = { clientWidth: 800, clientHeight: 400, addEventListener: (t, f) => { listeners[t] = f; } };
const btn = () => ({ getBoundingClientRect: () => ({ left: -999, top: -999, width: 10, height: 10 }), classList: { toggle() {} } });
const input = new LocalInput();
input.bindTouch(root, { grab: btn(), block: btn(), trail: { getContext: () => ({}) } }, {});
input.enabled = true;
const ev = (type, id, x, y) => listeners[type]({ type, preventDefault() {}, changedTouches: [{ identifier: id, clientX: x, clientY: y }] });

const M = createMatch({ mode: 'training', chars: [{ c: 'aura', w: 'dagger' }, { c: 'dummy', w: 'none' }] });
const F = M.fighters[0];
const frames = n => { for (let i = 0; i < n; i++) step(M, [input.sample(), NO_INPUT]); };
const fail = m => { console.error('FALLO:', m); process.exit(1); };
frames(30);

// 1) swipe a la derecha y mantener: camina mientras el dedo sigue apartado
let x0 = F.x;
ev('touchstart', 1, 100, 300); ev('touchmove', 1, 140, 300);
frames(60);
if (!(F.x > x0 + 0.5)) fail('mantener el swipe no hace caminar (avance ' + (F.x - x0).toFixed(2) + ')');
if (F.state === 'dashF') fail('mantener no debe hacer dash');
// 2) volver el dedo al centro: se para
ev('touchmove', 1, 105, 300); frames(20); x0 = F.x; frames(30);
if (Math.abs(F.x - x0) > 0.05) fail('con el dedo en el centro debe pararse');
// 3) llevarlo al otro lado sin soltar: camina hacia atrás
ev('touchmove', 1, 60, 300); frames(40);
if (!(F.x < x0 - 0.3)) fail('cambiar de lado sin soltar no camina hacia atrás');
ev('touchend', 1, 60, 300); frames(30);
// 4) soltar: deja de caminar
x0 = F.x; frames(30);
if (Math.abs(F.x - x0) > 0.05) fail('al soltar debe dejar de caminar');
// 5) dos swipes rápidos y soltando = dash
let dashed = false;
ev('touchstart', 2, 100, 300); ev('touchmove', 2, 140, 300); ev('touchend', 2, 140, 300);
frames(2);
ev('touchstart', 3, 100, 300); ev('touchmove', 3, 140, 300); ev('touchend', 3, 140, 300);
for (let i = 0; i < 20; i++) { frames(1); if (F.state === 'dashF') dashed = true; }
if (!dashed) fail('dos swipes no hacen dash');
// 6) swipe abajo y mantener = agachado
frames(40);
ev('touchstart', 4, 100, 250); ev('touchmove', 4, 100, 300); frames(30);
if (!input.sample().down) fail('mantener abajo no agacha');
ev('touchend', 4, 100, 300);
// 7) swipe en diagonal arriba-derecha = salto hacia delante (como W+D)
frames(40);
const jumpX = () => { const x = F.x; let air = false; for (let i = 0; i < 60; i++) { frames(1); if (F.state === 'air') air = true; } return { air, dx: F.x - x }; };
ev('touchstart', 5, 100, 300); ev('touchmove', 5, 135, 262); ev('touchend', 5, 135, 262);
let j = jumpX();
if (!j.air) fail('el swipe en diagonal no salta');
if (!(j.dx > 0.6)) fail('el swipe en diagonal no salta hacia el lado (avance ' + j.dx.toFixed(2) + ')');
// 8) diagonal arriba-izquierda = salto hacia atrás
frames(30);
ev('touchstart', 6, 200, 300); ev('touchmove', 6, 165, 262); ev('touchend', 6, 165, 262);
j = jumpX();
if (!(j.air && j.dx < -0.6)) fail('el swipe arriba-izquierda no salta hacia la izquierda (avance ' + j.dx.toFixed(2) + ')');
// 9) swipe arriba recto sigue siendo salto vertical
frames(30);
ev('touchstart', 7, 100, 300); ev('touchmove', 7, 103, 250); ev('touchend', 7, 103, 250);
j = jumpX();
if (!(j.air && Math.abs(j.dx) < 0.1)) fail('el swipe vertical debe saltar recto (avance ' + j.dx.toFixed(2) + ')');
// 10) caminando con el dedo mantenido, subirlo = salto hacia donde caminas
frames(30);
ev('touchstart', 8, 100, 300); ev('touchmove', 8, 140, 300); frames(20);
ev('touchmove', 8, 140, 255);
j = jumpX();
if (!(j.air && j.dx > 0.6)) fail('subir el dedo mientras caminas no salta hacia delante (avance ' + j.dx.toFixed(2) + ')');
ev('touchend', 8, 140, 255);
console.log('swipe-hold OK');
