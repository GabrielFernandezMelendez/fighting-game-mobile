"""Prepara un modelo de Tripo (GLB texturizado, sin esqueleto) para el pipeline de NEÓN.

Reduce la malla a ~N triángulos (conservando UV y textura), baja las texturas a 1024 px y deja la malla
normalizada como espera tools/bl_aura_rig.py: 1 de alto, pies en z = -0.5, mirando a -Y.

  python -c "import runpy,sys; sys.argv=['x','<entrada.glb>','<salida.blend>','30000']; runpy.run_path('tools/bl_tripo_prep.py')"
Después:
  CHAR=vega python -c "import runpy,sys; sys.argv=['x','--','<salida.blend>','public/assets/chars/vega']; runpy.run_path('tools/bl_aura_rig.py')"
"""
import bpy, sys
from mathutils import Vector
src, dst, target = sys.argv[-3], sys.argv[-2], int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
n = len(o.data.polygons)
# soldar vértices duplicados de Tripo antes de reducir (si no, la reducción abre grietas)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=1e-5); bpy.ops.object.mode_set(mode='OBJECT')
m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = min(1, target / max(1, len(o.data.polygons))); m.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier='dec')
print('TRIS', n, '->', len(o.data.polygons))
# normalizar: 1 de alto, pies en -0.5, centrado en X/Y
bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
mn = Vector([min(v[i] for v in bb) for i in range(3)]); mx = Vector([max(v[i] for v in bb) for i in range(3)])
s = 1 / (mx.z - mn.z)
for v in o.data.vertices:
    v.co = Vector(((v.co.x - (mn.x + mx.x) / 2) * s, (v.co.y - (mn.y + mx.y) / 2) * s, (v.co.z - mn.z) * s - .5))
for p in o.data.polygons: p.use_smooth = True
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024 * img.size[1] // img.size[0]); img.pack()
bpy.ops.wm.save_as_mainfile(filepath=dst)
print('OK', dst)
