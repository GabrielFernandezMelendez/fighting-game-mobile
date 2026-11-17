import { WEAPONS } from './data.js';

export const ATTACK_KEYS = ['g_tap', 'g_fwd', 'g_back', 'g_up', 'g_down', 'a_tap', 'a_fwd', 'a_back', 'a_up', 'a_down'];
const DAGGER = [
  ['dagger', [4,5,6,7,8,9,10,11]], ['dagA', [0,1,2,3]], ['dagA', [4,5,6,7]], ['dagA', [8,9,10,11]],
  ['dagB', [0,1,2,3]], ['dagB', [4,5,6,7]], ['dagB', [8,9,10,11]],
  ['dagC', [0,1,2,3]], ['dagC', [4,5,6,7]], ['dagC', [8,9,10,11]],
];

const frame = (atlas, id, tick = 0) => ({ atlas, id, tick });
const guard = wk => frame(wk, 0);
const aerial = wk => wk === 'dagger' ? frame('common', 5) : frame(wk, 11);
const timed = (pose, tick) => ({ ...pose, tick });
const common = id => frame('common', id);
const walk = wk => Array.from({ length: 9 }, (_, i) => frame(wk + '-walk', i % 8, i / 8));

function attacks(wk, moveKey, move) {
  const ready = move.air ? aerial(wk) : guard(wk);
  if (moveKey === 'grab') {
    const contact = move.active[0];
    return [ready, timed(common(8), contact), timed(common(8), 15), timed(ready, move.total - 1)];
  }
  if (moveKey === 'throw') {
    return [common(8), timed(common(9), 10), timed(common(9), move.release - 5),
      timed(common(10), move.release), timed(common(10), move.release + 4), timed(ready, move.total - 2)];
  }
  const i = ATTACK_KEYS.indexOf(moveKey);
  const [start, end] = move.active;
  const finish = move.total - 1;
  if (wk !== 'dagger') {
    const peak = frame(wk, i + 1);
    const halfway = frame(wk + '-mid', i + 1);
    // El contacto sigue a la ventana activa. El avance y regreso tienen su propio ritmo.
    const hold = move.dive ? finish : start + (end - start) * .64;
    return [ready, timed(halfway, start * .65), timed(peak, start), timed(peak, hold),
      ...(!move.dive ? [timed(halfway, hold + (finish - hold) * .37), timed(ready, finish)] : [])];
  }
  const [atlas, poses] = DAGGER[i];
  if (poses.length === 8) {
    const ticks = [1.2, 2.3, 3.1, start, end, end + 1.4, 10, 12];
    return [ready, ...poses.map((id, j) => frame(atlas, id, ticks[j])), timed(ready, finish)];
  }
  const follow = move.dive ? finish : end + (finish - end) * .28;
  return [ready, frame(atlas, poses[0], start * .22), frame(atlas, poses[1], start * .62),
    frame(atlas, poses[2], start), frame(atlas, poses[2], move.dive ? finish : end),
    ...(!move.dive ? [frame(atlas, poses[3], follow), timed(ready, finish)] : [])];
}

function clipsFor(wk) {
  const ready = guard(wk), inAir = aerial(wk);
  const low = wk === 'dagger' ? common(4) : ready;
  const settle = wk === 'dagger' ? common(7) : ready;
  const steps = walk(wk);
  return {
    guard: wk === 'dagger' ? [ready, frame(wk, 1, 13), frame(wk, 2, 27),
      frame(wk, 3, 42), timed(ready, 58)] : [ready],
    walk: steps,
    walkIn: [ready, timed(steps[0], 4)],
    walkOut: steps.slice(0, 8).map(step => [timed(step, 0), timed(ready, 4)]),
    attacks: Object.fromEntries(Object.entries(WEAPONS[wk].moves).map(([key, move]) => [key, attacks(wk, key, move)])),
    air: [inAir],
    land: [settle, timed(ready, 4)],
    crouch: [ready, timed(low, 4)],
    hit: [ready, timed(common(6), 2)],
    down: [common(11)],
    getup: [common(11), timed(settle, 18), timed(ready, 26)],
    dashF: wk === 'dagger' ? [ready, timed(common(2), 3), timed(common(2), 7), timed(ready, 14)] : [ready],
    dashB: wk === 'dagger' ? [ready, timed(common(3), 3), timed(common(3), 7), timed(ready, 14)] : [ready],
  };
}

export const PRACTICE_WEAPONS = ['dagger', 'sword', 'hammer', 'spear'];
export const PRACTICE_CLIPS = Object.fromEntries(PRACTICE_WEAPONS.map(wk => [wk, clipsFor(wk)]));

export const poseId = pose => pose.atlas + '/' + pose.id;
export const pairId = (a, b) => poseId(a) + '>' + poseId(b);
export function sampleClip(clip, tick) {
  for (let i = 1; i < clip.length; i++) {
    const b = clip[i];
    if (tick < b.tick) {
      const a = clip[i - 1];
      return [a, b, Math.max(0, (tick - a.tick) / (b.tick - a.tick))];
    }
  }
  const last = clip.at(-1);
  return [last, last, 0];
}

export const isWalking = state => state === 'walkF' || state === 'walkB';
const cycle = phase => ((phase % 1) + 1) % 1;

export function practicePose(F, tick, guardTime, walkPhase, exitStep) {
  const clips = PRACTICE_CLIPS[F.wk];
  switch (F.state) {
    case 'attack': return sampleClip(clips.attacks[F.move] ?? clips.guard, tick);
    case 'walkF': case 'walkB':
      return tick < 4 ? sampleClip(clips.walkIn, tick) : sampleClip(clips.walk, cycle(walkPhase));
    case 'air': return sampleClip(clips.air, tick);
    case 'prejump': case 'crouch': case 'cblock': return sampleClip(clips.crouch, tick);
    case 'land': case 'getup': case 'dashF': case 'dashB': return sampleClip(clips[F.state], tick);
    case 'hit': case 'launched': case 'thrown': return sampleClip(clips.hit, tick);
    case 'down': case 'lose': return sampleClip(clips.down, tick);
    default: return exitStep !== null && tick < 4 ? sampleClip(clips.walkOut[exitStep], tick)
      : sampleClip(clips.guard, guardTime % 58);
  }
}
