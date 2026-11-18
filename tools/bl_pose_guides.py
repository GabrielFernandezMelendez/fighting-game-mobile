"""Guías de pose para dibujar sprites 2D de un personaje a partir de su modelo 3D (fase 2 de Aura 2D).

Para cada pose renderiza, con la MISMA cámara y escala que los sprites del juego (casilla 384 px, pies en
y = 323, mirando a la derecha):
  <pose>_color.png  colores planos de la paleta por zona (guía de color y forma)
  <pose>_depth.png  profundidad (ControlNet depth)
  <pose>_mask.png   silueta (para recortar y comprobar el tamaño)
Así todos los dibujos generados parten del mismo esqueleto, tamaño y pivote, y salen coherentes.

Uso: python -c "import runpy,sys; sys.argv=['x','salto','art/aura/sprites/guias']; runpy.run_path('tools/bl_pose_guides.py')"
"""
import bpy, sys, os, math
ROOT = __file__.rsplit('/tools/', 1)[0] if '/tools/' in __file__ else '.'
SET, OUT = sys.argv[-2], sys.argv[-1]
sys.path.insert(0, ROOT + '/tools')
from neon_chars import get
C = get('aura')

# poses: (nombre, clip, fracción 0..1 del clip)
SETS = {
  'salto': [
    ('salto_1_preparacion', 'NinjaJump_Start', .10),
    ('salto_2_impulso',     'NinjaJump_Start', .45),
    ('salto_3_subida',      'Jump_Loop',       .05),
    ('salto_4_cumbre',      'Jump_Loop',       .30),
    ('salto_5_caida',       'Jump_Loop',       .55),
    ('salto_6_aterrizaje',  'NinjaJump_Land',  .25),
  ],
  'guardia': [(f'guardia_{i+1}', 'Sword_Idle', i / 8) for i in range(8)],
}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ROOT + '/public/assets/chars/aura_review.glb')
bpy.ops.import_scene.gltf(filepath=ROOT + '/public/assets/chars/aura_anims.glb')
arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
arm = arms[0]
for o in list(bpy.data.objects):
    if o.type == 'MESH' and not o.name.startswith('Aura') or o.name == 'Icosphere' or (o.type == 'ARMATURE' and o is not arm):
        bpy.data.objects.remove(o)
meshes = [o for o in bpy.data.objects if o.type == 'MESH']

# color plano por zona: atributo de vista con el color final de la paleta
pal = [C['display'][n] for n in C['names']]
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
for o in meshes:
    src = o.data.color_attributes.get('Color')
    if not src: continue
    dst = o.data.color_attributes.new('Vista', 'FLOAT_COLOR', src.domain)
    for s, d in zip(src.data, dst.data):
        z = max(0, min(len(pal) - 1, round(s.color[0] * 16 - .5)))
        d.color = (*[c ** 2.2 for c in hexrgb(pal[z])], 1)
    o.data.color_attributes.active_color = dst

sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.film_transparent = True
sc.render.resolution_x = sc.render.resolution_y = 384
sh = sc.display.shading; sh.light = 'FLAT'; sh.color_type = 'VERTEX'; sh.show_object_outline = False
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
# 384 px = 2,44 u del juego = 2,44·2,76/1,78 u de Blender; pies (z = 0) en el píxel 323 desde arriba
S = 2.44 * 2.76 / 1.78
cam.data.type = 'ORTHO'; cam.data.ortho_scale = S
YAW = math.radians(38)   # tres cuartos: los sprites muestran a Aura de frente-perfil, mirando a la derecha
cam.location = (-8 * math.cos(YAW), -8 * math.sin(YAW), (323 - 192) / 384 * S)
cam.rotation_euler = (math.radians(90), 0, math.radians(-90) + YAW)

os.makedirs(OUT, exist_ok=True)
for name, clip, frac in SETS[SET]:
    act = bpy.data.actions.get(clip)
    arm.animation_data_create(); arm.animation_data.action = act
    if getattr(act, 'slots', None) and len(act.slots): arm.animation_data.action_slot = act.slots[0]
    a, b = act.frame_range; sc.frame_set(int(round(a + (b - a) * frac)))
    sh.color_type = 'VERTEX'; sh.light = 'FLAT'
    sc.render.filepath = f'{OUT}/{name}_color.png'; bpy.ops.render.render(write_still=True)
    sh.color_type = 'SINGLE'; sh.single_color = (1, 1, 1)
    sc.render.filepath = f'{OUT}/{name}_mask.png'; bpy.ops.render.render(write_still=True)
    sh.light = 'MATCAP'; sh.studio_light = 'basic_dark.exr' if 'basic_dark.exr' in [l.name for l in bpy.context.preferences.studio_lights] else sh.studio_light
    sc.render.filepath = f'{OUT}/{name}_depth.png'; bpy.ops.render.render(write_still=True)
    print('OK', name)
