import { createMatch, step, NO_INPUT } from '../public/js/sim.js';
import { COMBOS, ROSTER } from '../public/js/data.js';
import { ComboPlayer } from '../public/js/combo.js';
const W = ['dagger', 'sword', 'hammer', 'spear'];
const run = (c, w, steps) => { const M = createMatch({ mode: 'training', chars: [{ c, w }, { c: 'dummy', w: 'none' }] }); M.fighters[0].x = -0.45; M.fighters[1].x = 0.35;
  const cp = new ComboPlayer(steps); let h = 0, d = 0; for (let i = 0; i < 300; i++) { step(M, [cp.input(M.fighters[0]), NO_INPUT]); h = Math.max(h, M.fighters[1].comboHits); d = Math.max(d, M.fighters[1].comboDmg); } return [h, d]; };
console.log('daño del combo "al aire" de cada arma (golpes/daño)');
console.log('        ' + W.map(w => w.padEnd(12)).join(''));
for (const c of ROSTER) console.log(c.padEnd(8) + W.map(w => { const cb = COMBOS[w][1]; const [h, d] = run(c, w, cb.steps); return (h + '/' + d).padEnd(12); }).join(''));
