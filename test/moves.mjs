import { createMatch, step, NO_INPUT } from '../public/js/sim.js';
import { CHARS, ROSTER, GESTURES, COMBOS } from '../public/js/data.js';
import { ComboPlayer } from '../public/js/combo.js';
const run = (id, steps) => { const M = createMatch({ mode: 'training', chars: [{ c: id, w: CHARS[id].weapon }, { c: 'dummy', w: 'none' }] }); M.fighters[0].x = -0.45; M.fighters[1].x = 0.35;
  const cp = new ComboPlayer(steps); let hits = 0, dmg = 0; for (let i = 0; i < 300; i++) { step(M, [cp.input(M.fighters[0]), NO_INPUT]); hits = Math.max(hits, M.fighters[1].comboHits); dmg = Math.max(dmg, M.fighters[1].comboDmg); } return [hits, dmg]; };
for (const id of ROSTER) {
  const g = GESTURES.map(([k]) => run(id, [k])[0]).join(''), a = GESTURES.map(([k]) => run(id, ['hop', 'a:' + k])[0]).join(''), gr = run(id, ['grab'])[1];
  const c = COMBOS[CHARS[id].weapon].map(cb => cb.name + ':' + run(id, cb.steps).join('/')).join('  ');
  console.log(id.padEnd(7), 'suelo', g, 'aire', a, 'agarre', gr, '|', c);
}
