// =====================================================================
//  ESTADO DE LA SIMULACIÓN -> CLIP DE ANIMACIÓN
//  Cada ataque usa un clip retargeteado y lo deforma en el tiempo para
//  que el impacto del clip (h) caiga en los frames activos del frame data.
//  a/h/b = fracciones del clip: inicio, impacto y final.
// =====================================================================
import { getMove } from './sim.js';

// Clips por arma (toque, →, ←, ↑, ↓) en suelo y aire
const S = (clip, a, h, b, extra = {}) => ({ clip, a, h, b, ...extra });
export const MOVE_CLIPS = {
  dagger: {
    g_tap: S('Punch_Jab', 0.08, 0.36, 0.75), g_fwd: S('Sword_Regular_A', 0.15, 0.62, 1), g_back: S('Sword_Regular_C', 0.05, 0.42, 0.8),
    g_up: S('Melee_Hook', 0.1, 0.55, 1), g_down: S('Slide_Start', 0.2, 0.55, 1),
    a_tap: S('Punch_Cross', 0.1, 0.4, 0.75), a_fwd: S('Sword_Regular_B', 0.2, 0.6, 1), a_back: S('Sword_Regular_A', 0.15, 0.62, 1),
    a_up: S('Melee_Hook', 0.1, 0.55, 1), a_down: S('Jump_Loop', 0.5, 0.5, 0.5),
  },
  sword: {
    g_tap: S('Sword_Regular_A', 0.15, 0.62, 1), g_fwd: S('Sword_Dash_RM', 0.08, 0.5, 0.85), g_back: S('Sword_Attack', 0.1, 0.42, 0.85),
    g_up: S('Melee_Hook', 0.1, 0.55, 1), g_down: S('Sword_Regular_B', 0.2, 0.62, 1),
    a_tap: S('Sword_Regular_A', 0.15, 0.62, 1), a_fwd: S('Sword_Regular_B', 0.2, 0.6, 1), a_back: S('Sword_Attack', 0.1, 0.42, 0.85),
    a_up: S('Melee_Hook', 0.1, 0.55, 1), a_down: S('Jump_Loop', 0.5, 0.5, 0.5),
  },
  hammer: {
    g_tap: S('Shield_OneShot', 0.05, 0.4, 0.9), g_fwd: S('Sword_Regular_B', 0.1, 0.62, 1), g_back: S('Sword_Attack', 0.05, 0.42, 0.9),
    g_up: S('Melee_Hook', 0.05, 0.55, 1), g_down: S('OverhandThrow', 0.05, 0.42, 0.85),
    a_tap: S('Punch_Cross', 0.1, 0.4, 0.75), a_fwd: S('Sword_Regular_B', 0.2, 0.6, 1), a_back: S('OverhandThrow', 0.1, 0.42, 0.7),
    a_up: S('Melee_Hook', 0.1, 0.55, 1), a_down: S('Jump_Loop', 0.5, 0.5, 0.5),
  },
  spear: {
    g_tap: S('Punch_Jab', 0.08, 0.36, 0.75), g_fwd: S('Shield_Dash_RM', 0.1, 0.4, 0.85), g_back: S('Sword_Attack', 0.1, 0.42, 0.85),
    g_up: S('Melee_Hook', 0.1, 0.55, 1), g_down: S('Sword_Regular_C', 0.05, 0.42, 0.8),
    a_tap: S('Punch_Jab', 0.08, 0.36, 0.75), a_fwd: S('Sword_Regular_B', 0.2, 0.6, 1), a_back: S('OverhandThrow', 0.1, 0.42, 0.7),
    a_up: S('Melee_Hook', 0.1, 0.55, 1), a_down: S('Jump_Loop', 0.5, 0.5, 0.5),
  },
  none: {},
};
const COMMON_MOVES = {
  grab: S('Interact', 0.15, 0.38, 0.6),
  throw: S('OverhandThrow', 0.0, 0.42, 1),
};

const STEP = 2;                                   // animación limitada: pose nueva cada 2 frames
const q = n => Math.floor(n / STEP) * STEP;
const loop = (clip, frames, meta) => ({ clip, t: ((frames / 60) % meta[clip].dur) });
const frac = (clip, x, meta) => ({ clip, t: Math.max(0, Math.min(1, x)) * meta[clip].dur });

export function clipFor(F, meta) {
  const st = F.state, f = F.f;
  switch (st) {
    case 'idle': return { ...loop('Sword_Idle', q(F.t), meta), blend: 6 };
    case 'walkF': return { ...loop('Walk_Loop', q(F.t) * 1.15, meta), blend: 5 };
    case 'walkB': { const d = meta.Walk_Loop.dur; return { clip: 'Walk_Loop', t: d - ((q(F.t) / 60 * 0.95) % d) - 1e-3, blend: 5 }; }
    case 'crouch': return { ...loop('Crouch_Idle_Loop', q(F.t), meta), blend: 4 };
    case 'cblock': return { ...frac('Crouch_Idle_Loop', 0.1, meta), blend: 3 };
    case 'block': case 'blockstun': return { ...frac('Sword_Block', st === 'blockstun' ? 0.3 : 0.38, meta), blend: 3 };
    case 'prejump': return frac('NinjaJump_Start', 0.05 + q(f) * 0.02, meta);
    case 'air': return { ...frac('Jump_Loop', Math.min(1, Math.max(0, (6 - F.vy) / 14)) * 0.5, meta), blend: 4 };
    case 'land': return frac('NinjaJump_Land', 0.25 + q(f) * 0.03, meta);
    case 'hit': return frac(F.react === 'body' ? 'Hit_Chest' : 'Hit_Head', q(f) / Math.max(1, F.stun || 16), meta);
    case 'launched': case 'thrown': return frac('Hit_Knockback', 0.18 + Math.min(0.12, Math.max(0, -F.vy) * 0.015), meta);
    case 'down': return frac('Death01', 1, meta);
    case 'getup': return frac('LayToIdle', 0.1 + q(f) / 30 * 0.9, meta);
    case 'win': return { ...loop('Yes', q(F.t), meta), blend: 8 };
    case 'lose': return frac('Death01', Math.min(1, q(f) / 60), meta);
    case 'attack': return attackClip(F, meta);
  }
  return loop('Sword_Idle', q(F.t), meta);
}

function attackClip(F, meta) {
  const m = getMove(F); if (!m) return loop('Sword_Idle', F.t, meta);
  const spec = COMMON_MOVES[F.move] || (MOVE_CLIPS[F.wk] || {})[F.move] || COMMON_MOVES.grab;
  const total = m.total || 30, a0 = m.active ? m.active[0] : (m.release || total * 0.4), a1 = m.active ? Math.min(m.active[1], a0 + 6) : a0 + 2;
  const f = F.f >= a0 && F.f <= a1 ? F.f : q(F.f);   // los frames activos van a 60 fps
  let x;
  if (f <= a0) x = spec.a + (spec.h - spec.a) * (f / Math.max(1, a0));
  else if (f <= a1) x = spec.h + 0.05 * (f - a0) / Math.max(1, a1 - a0);
  else x = spec.h + 0.05 + (spec.b - spec.h - 0.05) * ((f - a1) / Math.max(1, total - a1));
  if (m.dive) x = 0.45;
  return frac(spec.clip, x, meta);
}
