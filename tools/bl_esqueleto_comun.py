"""Genera art/comun/esqueleto_neon.blend: el esqueleto común de NEÓN y las guías de tamaño.

Todos los personajes usan este esqueleto (mismos nombres de hueso, mismas alturas de articulación y
2,76 m de alto en Blender). Así:
  - las animaciones sirven para todos (se retargetean por nombre de hueso);
  - el juego calcula las cajas de daño y de golpe (hurtbox/hitbox) con su propio esqueleto 2D, que tiene
    las mismas articulaciones, así que el modelo coincide con lo que golpea y recibe golpes;
  - el tamaño de cada personaje se cambia en el juego (`scale` en public/js/data.js), NO en el esqueleto.

Guías (objetos REF_*, no se exportan):
  REF_hurtbox  caja donde el juego recibe golpes en reposo (escala 1): el cuerpo debe quedar dentro;
               pelo, capucha o arma pueden salir (son solo visuales).
  REF_altura   altura de referencia (2,76 m) · REF_suelo: suelo (los pies apoyan en Z = 0).
Uso: python -c "import runpy; runpy.run_path('tools/bl_esqueleto_comun.py')"
"""
import os, sys, bpy, bmesh
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.read_factory_settings(use_empty=True)
from bl_fighter_armature import create_fighter_armature, H

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'art', 'comun', 'esqueleto_neon.blend')

arm = create_fighter_armature()
arm.name = 'Armature'; arm.show_in_front = True; arm.data.display_type = 'STICK'

# hurtbox en reposo medida en el juego (sim.js · hurtbox, escala 1): alto 1,68, delante 0,35, detrás 0,53
# (unidades del juego, modelo de 1,78) → unidades de Blender (modelo de 2,76). Delante = -Y en Blender.
K = H / 1.78
FRONT, BACK, TOP = 0.35 * K, 0.53 * K, 1.68 * K

def guide(name, verts, edges):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, edges, []); o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o); o.hide_render = True; o.display_type = 'WIRE'; o.hide_select = True
    return o

x = 0.42
box = [(sx * x, y, z) for z in (0, TOP) for y in (-FRONT, BACK) for sx in (-1, 1)]
idx = lambda z, y, sx: z * 4 + y * 2 + sx
edges = []
for z in (0, 1):
    edges += [(idx(z, 0, 0), idx(z, 0, 1)), (idx(z, 1, 0), idx(z, 1, 1)), (idx(z, 0, 0), idx(z, 1, 0)), (idx(z, 0, 1), idx(z, 1, 1))]
edges += [(idx(0, y, s), idx(1, y, s)) for y in (0, 1) for s in (0, 1)]
guide('REF_hurtbox', box, edges)
guide('REF_altura', [(-0.6, -0.6, H), (0.6, -0.6, H), (0.6, 0.6, H), (-0.6, 0.6, H)], [(0, 1), (1, 2), (2, 3), (3, 0)])
guide('REF_suelo', [(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [(0, 1), (1, 2), (2, 3), (3, 0)])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print('OK', OUT, 'huesos:', len(arm.data.bones), 'hurtbox Y', round(-FRONT, 3), round(BACK, 3), 'Z', round(TOP, 3))
