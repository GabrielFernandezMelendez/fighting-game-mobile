"""Esqueleto humanoide compartido por los prototipos Aura y Sombra."""

import bpy
from mathutils import Vector

H = 2.76

# (cabeza, cola, padre) en coordenadas de la malla original (1 de alto, pies en -0.5)
J = {
  'Root':      ((0, 0, -0.50), (0, 0, -0.45), None),
  'Body':      ((0, 0, 0.00), (0, 0, 0.04), 'Root'),
  'Hips':      ((0, 0, 0.04), (0, 0, 0.10), 'Body'),
  'Abdomen':   ((0, 0, 0.10), (0, 0, 0.18), 'Hips'),
  'Torso':     ((0, 0, 0.18), (0, 0, 0.30), 'Abdomen'),
  'Neck':      ((0, 0, 0.30), (0, 0, 0.345), 'Torso'),
  'Head':      ((0, 0, 0.345), (0, 0, 0.48), 'Neck'),
}
for s, k in (('L', 1), ('R', -1)):
    J.update({
      f'Shoulder.{s}': ((0.02 * k, 0, 0.28), (0.10 * k, 0, 0.275), 'Torso'),
      f'UpperArm.{s}': ((0.10 * k, 0, 0.275), (0.165 * k, 0.0, 0.13), f'Shoulder.{s}'),
      f'LowerArm.{s}': ((0.165 * k, 0.0, 0.13), (0.198 * k, -0.01, -0.015), f'UpperArm.{s}'),
      f'Fist.{s}':     ((0.198 * k, -0.01, -0.015), (0.205 * k, -0.015, -0.07), f'LowerArm.{s}'),
      f'Fist1.{s}':    ((0.205 * k, -0.015, -0.07), (0.207 * k, -0.017, -0.09), f'Fist.{s}'),
      f'UpperLeg.{s}': ((0.06 * k, 0, -0.01), (0.07 * k, -0.005, -0.24), 'Body'),
      f'LowerLeg.{s}': ((0.07 * k, -0.005, -0.24), (0.075 * k, 0.0, -0.43), f'UpperLeg.{s}'),
      f'Foot.{s}':     ((0.075 * k, 0.0, -0.43), (0.075 * k, -0.07, -0.49), f'LowerLeg.{s}'),
    })
J['Weapon.R'] = ((-0.203, -0.013, -0.045), (-0.203, -0.06, -0.045), 'Fist.R')   # socket: hacia delante

P = lambda p: Vector((p[0] * H, p[1] * H, (p[2] + 0.5) * H))


def fit_joints(co):
    """Ajusta brazos y piernas del esqueleto a una malla en pose A (coordenadas normalizadas: 1 de alto,
    pies en -0.5), midiendo cortes horizontales. Mismas alturas de articulación que Aura, así los
    clips UAL se retargetean igual; cambian las posiciones X/Y de codo, muñeca, mano, rodilla y tobillo."""
    import numpy as np
    co = np.asarray(co); zn = co[:, 2] + 0.5
    def mean(mask, what):
        if mask.sum() < 15: print('  fit: sin puntos para', what); return None
        return co[mask].mean(0)
    for s, k in (('L', 1), ('R', -1)):
        side = co[:, 0] * k > 0; ax = np.abs(co[:, 0])
        elbow = mean(side & (ax > 0.10) & (np.abs(zn - 0.63) < 0.012), 'codo ' + s)
        wrist = mean(side & (ax > 0.115) & (np.abs(zn - 0.50) < 0.012), 'muñeca ' + s)
        armpts = side & (ax > 0.115) & (zn > 0.40) & (zn < 0.52)
        if armpts.sum() > 15:
            zlow = np.percentile(zn[armpts], 2); tip = co[armpts & (zn < zlow + 0.02)].mean(0)
        else: tip = None
        knee = mean(side & (ax < 0.2) & (np.abs(zn - 0.26) < 0.012), 'rodilla ' + s)
        ankle = mean(side & (ax < 0.2) & (np.abs(zn - 0.07) < 0.012), 'tobillo ' + s)
        if elbow is not None and wrist is not None and tip is not None:
            e = (elbow[0], elbow[1], 0.13); w = (wrist[0], wrist[1], wrist[2]); t = (tip[0], tip[1], tip[2])
            m = tuple(w[i] + (t[i] - w[i]) * 0.65 for i in range(3))
            J[f'UpperArm.{s}'] = (J[f'UpperArm.{s}'][0], e, f'Shoulder.{s}')
            J[f'LowerArm.{s}'] = (e, w, f'UpperArm.{s}')
            J[f'Fist.{s}'] = (w, m, f'LowerArm.{s}')
            J[f'Fist1.{s}'] = (m, t, f'Fist.{s}')
            if s == 'R':
                c = tuple((w[i] + m[i]) / 2 for i in range(3))
                J['Weapon.R'] = (c, (c[0], c[1] - 0.047, c[2]), 'Fist.R')
        if knee is not None and ankle is not None:
            kn = (knee[0], knee[1], -0.24); an = (ankle[0], ankle[1], -0.43)
            J[f'UpperLeg.{s}'] = (J[f'UpperLeg.{s}'][0], kn, 'Body')
            J[f'LowerLeg.{s}'] = (kn, an, f'UpperLeg.{s}')
            J[f'Foot.{s}'] = (an, (an[0], an[1] - 0.07, -0.49), f'LowerLeg.{s}')
    print('  fit: muñeca R', tuple(round(v, 3) for v in J['LowerArm.R'][1]), 'tobillo R', tuple(round(v, 3) for v in J['LowerLeg.R'][1]))
    return J


def create_fighter_armature():
    arm_data = bpy.data.armatures.new('Armature'); arm = bpy.data.objects.new('Armature', arm_data)
    bpy.context.collection.objects.link(arm); bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    for name, (h, t, par) in J.items():
        b = eb.new(name); b.head = P(h); b.tail = P(t)
    for name, (h, t, par) in J.items():
        if par:
            b = eb[name]; b.parent = eb[par]
            b.use_connect = (eb[par].tail - b.head).length < 1e-4 and name not in ('Body',)
    eb['Weapon.R'].use_deform = False; eb['Root'].use_deform = False
    bpy.ops.object.mode_set(mode='OBJECT')

    return arm
