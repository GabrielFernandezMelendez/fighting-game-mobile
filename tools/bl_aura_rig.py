"""F2c — Esqueleto ajustado a Aura con los mismos nombres de hueso que el rig del juego.

Entrada: .blend de bl_aura_retopo.py (malla baja de 1 unidad de alto, pies en z=-0.5, mirando a -Y).
Salida:  <salida>.blend (malla + armature, pesos automáticos) y <salida>.glb (sin animaciones).

  python tools/bl_aura_rig.py -- <entrada.blend> <salida_sin_ext>

Las articulaciones se han medido sobre la silueta frontal y lateral de la malla F1 (pose A del concept).
Se escala a 2.76 de alto, igual que los modelos RPG, para que models.js y bl_retarget.py los traten igual.
"""
import bpy, sys
from mathutils import Vector
args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]
H = 2.76

bpy.ops.wm.open_mainfile(filepath=src)
mesh = next(o for o in bpy.data.objects if o.type == 'MESH'); mesh.name = 'Aura'
# escalar a la altura del rig del juego y apoyar los pies en z=0
mesh.scale = (H, H, H); mesh.location = (0, 0, 0.5 * H)
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

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

# pesos automáticos (bone heat)
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active = arm
r = bpy.ops.object.parent_set(type='ARMATURE_AUTO')
empty = [g.name for g in mesh.vertex_groups if not any(g.index in [x.group for x in v.groups] for v in mesh.data.vertices[:1])]
counts = {g.name: 0 for g in mesh.vertex_groups}
for v in mesh.data.vertices:
    for x in v.groups:
        if x.weight > 0.01: counts[mesh.vertex_groups[x.group].name] += 1
print('parent', r, 'grupos', len(mesh.vertex_groups)); print('PESOS', counts)
unweighted = sum(1 for v in mesh.data.vertices if not any(x.weight > 0.01 for x in v.groups))
print('vértices sin peso', unweighted, 'de', len(mesh.data.vertices))

# Si el bone heat falla (malla no cerrada), transferir pesos desde una malla cerrada ya pesada
import os
donor_path = os.environ.get('WEIGHTS_FROM')
if donor_path and unweighted > 0.1 * len(mesh.data.vertices):
    with bpy.data.libraries.load(donor_path) as (src_data, dst_data):
        dst_data.objects = [n for n in src_data.objects if n == 'Aura']
    donor = dst_data.objects[0]; donor.name = 'Aura_donor'; bpy.context.collection.objects.link(donor)
    donor.parent = None; donor.modifiers.clear()
    for g in list(mesh.vertex_groups): mesh.vertex_groups.remove(g)
    for g in donor.vertex_groups: mesh.vertex_groups.new(name=g.name)
    dt = mesh.modifiers.new('dt', 'DATA_TRANSFER'); dt.object = donor
    dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
    dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.modifier_move_to_index(modifier='dt', index=0)
    bpy.ops.object.modifier_apply(modifier='dt')
    bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    bpy.data.objects.remove(donor, do_unlink=True)
    unweighted = sum(1 for v in mesh.data.vertices if not any(x.weight > 0.01 for x in v.groups))
    print('pesos transferidos; sin peso', unweighted)
bpy.ops.wm.save_as_mainfile(filepath=out + '.blend')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out + '.glb', use_selection=True, export_animations=False, export_skins=True,
                          export_image_format='WEBP', export_image_quality=90)
print('OK')
