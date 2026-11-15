import { createMatch, checksum, serialize, restore } from '../public/js/sim.js';
import { Lockstep } from '../public/js/net.js';
// Dos clientes con red simulada: latencia 40-120 ms (en ticks de 16,7 ms) y jitter
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const queue = []; let now = 0;
const mk = (role, M) => new Lockstep({ role, delay: 5, match: M, send: m => queue.push({ to: 1 - role, at: now + 3 + Math.floor(rnd() * 5), m: JSON.parse(JSON.stringify(m)) }) });
const base = createMatch({ mode: 'online', chars: ['aura', 'kai'] });
const C = [mk(0, restore(serialize(base))), mk(1, restore(serialize(base)))];
const acts = [null, 'tap', 'left', 'right', 'up', 'down', 'grab'];
const inp = () => ({ dx: [-1, 0, 1][Math.floor(rnd() * 3)], up: rnd() < 0.04, down: rnd() < 0.1, block: rnd() < 0.15, act: rnd() < 0.12 ? acts[Math.floor(rnd() * 7)] : null });
let stalls = 0;
for (now = 0; now < 20000; now++) {
  for (let k = queue.length - 1; k >= 0; k--) if (queue[k].at <= now) { const q = queue.splice(k, 1)[0]; C[q.to].onMessage(q.m); }
  for (const c of C) { c.tick(inp()); if (c.stalled) stalls++; }
  if (now === 8000) { C[1].M.fighters[0].hp -= 37; console.log('>> desincronización forzada en el invitado'); }
}
// dejar que terminen los mensajes
for (let k = 0; k < 50; k++) { now++; for (let j = queue.length - 1; j >= 0; j--) if (queue[j].at <= now) { const q = queue.splice(j, 1)[0]; C[q.to].onMessage(q.m); } for (const c of C) c.advance(); }
const f = Math.min(C[0].M.frame, C[1].M.frame);
console.log('frames host/guest', C[0].M.frame, C[1].M.frame, 'resyncs', C[1].resyncs, 'ticks bloqueados', stalls);
console.log('ronda', C[0].M.round, C[1].M.round, 'victorias', C[0].M.wins, C[1].M.wins, 'fase', C[0].M.phase, C[1].M.phase);
console.log('checksum igual (mismo frame):', C[0].M.frame === C[1].M.frame ? checksum(C[0].M) === checksum(C[1].M) : 'frames distintos');
