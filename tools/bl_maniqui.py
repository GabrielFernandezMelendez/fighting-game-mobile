"""Maniquíes de pruebas (opciones de desarrollador): los maniquíes CC0 de las Universal Animation Library
de Quaternius, en pose de reposo con los brazos bajados y montados sobre el ESQUELETO COMÚN de NEÓN.

Para no depender de pesos automáticos (fallan con mallas por piezas), se reutilizan los pesos
de Quaternius renombrados a los huesos de NEÓN (el femenino los copia del masculino).

  python -c "import runpy,sys; sys.argv=['x','m','public/assets/chars/maniqui_m']; runpy.run_path('tools/bl_maniqui.py')"
  python -c "import runpy,sys; sys.argv=['x','f','public/assets/chars/maniqui_f']; runpy.run_path('tools/bl_maniqui.py')"
(salida sin extensión: escribe <salida>.glb y art/comun/maniqui_<m|f>.blend)
"""
import bpy, bmesh, sys, os
import numpy as np
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bl_fighter_armature import H, create_fighter_armature, fit_joints
ROOT = __file__.rsplit('/tools/', 1)[0] if '/tools/' in __file__ else '.'
kind, dst = sys.argv[-2], sys.argv[-1]
UAL1 = ROOT + '/assets_raw/ual1/Animation Library[Standard]/Godot/AnimationLibrary_Godot_Standard.glb'
FEM = ROOT + '/assets_raw/ual/Universal Animation Library 2 [Standard]/Female Mannequin/Unreal-Godot/Mannequin_F.glb'
# pesos de Quaternius → huesos del esqueleto común (mismo reparto que usa tools/bl_retarget.py)
REN = {'pelvis': 'Body', 'spine_01': 'Hips', 'spine_02': 'Abdomen', 'spine_03': 'Torso', 'neck_01': 'Neck', 'Head': 'Head'}
for x, X in (('l', 'L'), ('r', 'R')):
    REN.update({f'clavicle_{x}': f'Shoulder.{X}', f'upperarm_{x}': f'UpperArm.{X}', f'lowerarm_{x}': f'LowerArm.{X}',
                f'hand_{x}': f'Fist.{X}', f'thigh_{x}': f'UpperLeg.{X}', f'calf_{x}': f'LowerLeg.{X}',
                f'foot_{x}': f'Foot.{X}', f'ball_{x}': f'Foot.{X}'})
# el maniquí de Quaternius usa nombres de Rigify (DEF-…)
RIGIFY = {'DEF-hips': 'Body', 'DEF-spine.001': 'Hips', 'DEF-spine.002': 'Abdomen', 'DEF-spine.003': 'Torso',
          'DEF-neck': 'Neck', 'DEF-head': 'Head'}
for X in ('L', 'R'):
    RIGIFY.update({f'DEF-shoulder.{X}': f'Shoulder.{X}', f'DEF-upper_arm.{X}': f'UpperArm.{X}', f'DEF-forearm.{X}': f'LowerArm.{X}',
                   f'DEF-hand.{X}': f'Fist.{X}', f'DEF-thigh.{X}': f'UpperLeg.{X}', f'DEF-shin.{X}': f'LowerLeg.{X}',
                   f'DEF-foot.{X}': f'Foot.{X}', f'DEF-toe.{X}': f'Foot.{X}'})
def target(name):
    if name in REN: return REN[name]
    if name in RIGIFY: return RIGIFY[name]
    for X in ('L', 'R'):
        if name.startswith('DEF-f_') and name.endswith('.' + X): return f'Fist1.{X}'     # dedos → nudillos
        if name.startswith('DEF-thumb') and name.endswith('.' + X): return f'Fist.{X}'
    for x, X in (('l', 'L'), ('r', 'R')):       # nombres estilo Unreal (por si cambia el paquete)
        if name.endswith('_' + x) and name.split('_')[0] in ('index', 'middle', 'ring', 'pinky'): return f'Fist1.{X}'
        if name.endswith('_' + x) and name.startswith('thumb'): return f'Fist.{X}'
    if name not in ('root',): print('  sin destino:', name)
    return 'Body'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=UAL1)
for o in list(bpy.data.objects):
    if o.name == 'Icosphere': bpy.data.objects.remove(o)
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
pose = bpy.data.actions.get('Idle_Loop')
if kind == 'f':
    # el maniquí femenino viene sin pesos: se copian del masculino (misma pose T y proporciones) y se monta en su esqueleto
    bpy.ops.import_scene.gltf(filepath=FEM)
    fem = next(o for o in bpy.data.objects if o.type == 'MESH' and o.name.startswith('Mannequin_F'))
    for o in list(bpy.data.objects):
        if o.type == 'ARMATURE' and o is not arm or o.name in ('Icosphere', 'Cube', 'Camera', 'Light'): bpy.data.objects.remove(o)
    for vg in mesh.vertex_groups: fem.vertex_groups.new(name=vg.name)
    bpy.ops.object.select_all(action='DESELECT'); fem.select_set(True); bpy.context.view_layer.objects.active = fem
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    from mathutils.kdtree import KDTree
    src = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    kd = KDTree(len(src)); [kd.insert(c, i) for i, c in enumerate(src)]; kd.balance()
    for v in fem.data.vertices:                     # cada vértice copia los pesos de los 4 más cercanos del masculino
        near = kd.find_n(fem.matrix_world @ v.co, 4); acc = {}
        for _, j, d in near:
            w0 = 1 / (d + 1e-4)
            for g in mesh.data.vertices[j].groups:
                acc[g.group] = acc.get(g.group, 0) + g.weight * w0
        tot = sum(acc.values()) or 1
        for gi, w in acc.items(): fem.vertex_groups[mesh.vertex_groups[gi].name].add([v.index], w / tot, 'REPLACE')
    fem.parent = arm; fem.modifiers.new('arm', 'ARMATURE').object = arm
    bpy.data.objects.remove(mesh); mesh = fem
arm.animation_data_create(); arm.animation_data.action = pose
if getattr(pose, 'slots', None) and len(pose.slots): arm.animation_data.action_slot = pose.slots[0]
bpy.context.scene.frame_set(int(pose.frame_range[0]))
# congelar la pose de reposo (brazos bajados) y renombrar los pesos al esqueleto común
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
for m in list(mesh.modifiers):
    if m.type == 'ARMATURE' and m.object: bpy.ops.object.modifier_apply(modifier=m.name)
    else: mesh.modifiers.remove(m)
mesh.parent = None; bpy.data.objects.remove(arm)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
W = {}
for v in mesh.data.vertices:
    acc = {}
    for g in v.groups:
        t = target(mesh.vertex_groups[g.group].name); acc[t] = acc.get(t, 0) + g.weight
    W[v.index] = acc
mesh.vertex_groups.clear()
# colores: gris neutro y articulaciones en cian (el acento del muñeco de práctica)
for s in mesh.material_slots:
    s.material.use_nodes = True
    c = (0.03, 0.55, 0.85, 1) if 'Joint' in s.material.name else (0.30, 0.32, 0.38, 1)
    s.material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = c
    s.material.diffuse_color = c
# normalizar como bl_tripo_prep: 1 de alto, pies en -0.5, centrado
bb = [Vector(c) for c in mesh.bound_box]
mn = Vector([min(v[i] for v in bb) for i in range(3)]); mx = Vector([max(v[i] for v in bb) for i in range(3)])
s = 1 / (mx.z - mn.z)
for v in mesh.data.vertices:
    v.co = Vector(((v.co.x - (mn.x + mx.x) / 2) * s, (v.co.y - (mn.y + mx.y) / 2) * s, (v.co.z - mn.z) * s - .5))
for p in mesh.data.polygons: p.use_smooth = True
# esqueleto común: brazos y piernas ajustados a la malla (las alturas de articulación no cambian)
fit_joints(np.array([tuple(v.co) for v in mesh.data.vertices]))
for v in mesh.data.vertices: v.co = Vector((v.co.x * H, v.co.y * H, (v.co.z + .5) * H))
arm = create_fighter_armature()
groups = {b.name: mesh.vertex_groups.new(name=b.name) for b in arm.data.bones if b.use_deform}
for i, acc in W.items():
    tot = sum(acc.values()) or 1
    for n, w in acc.items(): groups[n].add([i], w / tot, 'REPLACE')
mesh.parent = arm; mesh.modifiers.new('Rig NEÓN', 'ARMATURE').object = arm
os.makedirs(ROOT + '/art/comun', exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=f'{ROOT}/art/comun/maniqui_{kind}.blend')
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst + '.glb', use_selection=True, export_animations=False, export_skins=True)
print('OK', kind, len(mesh.data.polygons), 'pose', pose.name)
