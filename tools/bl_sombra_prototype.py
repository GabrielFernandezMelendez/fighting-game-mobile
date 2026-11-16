"""Malla editable de Sombra, con el mismo esqueleto de reposo que Aura.

blender -b --python-exit-code 1 --python tools/bl_sombra_prototype.py
"""

import math
from pathlib import Path
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bl_fighter_armature import create_fighter_armature


ROOT = Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
arm = create_fighter_armature()
bpy.ops.object.select_all(action='DESELECT')

def flat_material(name, hex_color):
    rgb = [int(hex_color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = tuple(v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb)
    material = bpy.data.materials.new('Sombra_' + name)
    material.diffuse_color = (*linear, 1)
    material.use_nodes = True
    material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (*linear, 1)
    return material


cloth = flat_material('borgona', '68283e')
deep = flat_material('granate', '451e30')
accent = flat_material('carmesi', 'b91d43')
dark = flat_material('grafito', '312937')
void = flat_material('vacio', '100b15')
skin = flat_material('piel', 'c88e78')
wrap = flat_material('vendas', 'd5b8a8')
leather = flat_material('cuero', '634435')
metal = flat_material('metal', 'a09395')


def mesh(name, points, faces, material, weights, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(points, [], faces)
    data.update()
    bm = bmesh.new()
    bm.from_mesh(data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(data)
    bm.free()

    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for face in data.polygons:
        face.use_smooth = smooth
    if isinstance(weights, str):
        obj.vertex_groups.new(name=weights).add(list(range(len(points))), 1, 'REPLACE')
    else:
        for bone, influences in weights.items():
            group = obj.vertex_groups.new(name=bone)
            for idx, weight in influences:
                if weight > 0:
                    group.add([idx], weight, 'REPLACE')
    obj.parent = arm
    obj.modifiers.new('Rig NEÓN', 'ARMATURE').object = arm
    return obj


def loft(name, rings, material, bones, sides=12, angular=0, smooth=True, stretch=None):
    """Anillos horizontales: (x, y, z, semiancho, profundidad)."""
    pts = []
    for row, (x, y, z, rx, ry) in enumerate(rings):
        for i in range(sides):
            angle = math.tau * (i + 0.5) / sides
            wobble = 1 + angular * math.sin(i * 2.6 + row * 2)
            pts.append((x + rx * math.cos(angle) * wobble,
                        y + ry * math.sin(angle) * wobble,
                        z))
    faces = bridge(len(rings), sides)
    faces += [tuple(reversed(range(sides))), tuple(range(len(pts) - sides, len(pts)))]
    weights = bones
    if stretch:
        weights = {bone: [(row * sides + i, amount if bone == bones[1] else 1 - amount)
                          for row, amount in enumerate(stretch) for i in range(sides)]
                   for bone in bones}
    return mesh(name, pts, faces, material, weights, smooth)


def bridge(rows, sides):
    return [(row * sides + i, row * sides + (i + 1) % sides,
             (row + 1) * sides + (i + 1) % sides, (row + 1) * sides + i)
            for row in range(rows - 1) for i in range(sides)]


def panel(name, edge, material, bone, depth=0.020):
    """Pieza cerrada de tejido o cuero, con el frontal en −Y."""
    n = len(edge)
    back = [(x, y + depth, z) for x, y, z in edge]
    faces = [tuple(range(n)), tuple(range(n, n * 2)), *bridge(2, n)]
    return mesh(name, [*edge, *back], faces, material, bone)


def front_panel(name, outline, y, material, bone, depth=0.025):
    return panel(name, [(x, y, z) for x, z in outline], material, bone, depth)


# Prenda de torso, faja y cinturón. Las superficies quedan físicamente separadas.
loft('Cuerpo entallado', [
    (0, .01, 1.31, .23, .155), (0, .01, 1.47, .285, .175),
    (0, .015, 1.66, .245, .153), (0, .012, 1.84, .285, .179),
    (0, .025, 2.02, .317, .198), (0, .032, 2.10, .284, .145),
    (0, .014, 2.17, .134, .102),
], deep, ('Body', 'Torso'), 16, stretch=[0, 0, .16, .72, 1, 1, 1])
for sign in (-1, 1):
    panel('Solapa', [(sign*x,y,z) for x,y,z in [
        (.255,-.103,2.11),(.095,-.178,2.13),(.049,-.192,1.99),
        (.085,-.177,1.86),(.225,-.127,1.92),(.283,-.089,2.03)]], cloth, 'Torso')
    panel('Tirante de cuero', [(sign*x,y,z) for x,y,z in [
        (.15,-.100,2.13),(.195,-.084,2.13),(.16,-.178,1.96),
        (.105,-.185,1.89),(.071,-.190,1.915),(.12,-.193,1.995)]], leather, 'Torso', .01)

loft('Faja granate', [(0,.01,1.50,.289,.176),(0,.015,1.57,.278,.173),
    (0,.015,1.65,.257,.161)], cloth, 'Body', 16, angular=.025)
loft('Cuero del cinturón', [(0,.01,1.45,.304,.194),(0,.01,1.54,.296,.197),
    (0,.01,1.57,.281,.18)], leather, 'Body', 16)
front_panel('Hebilla', [(-.07,1.468),(.066,1.471),(.068,1.559),(-.07,1.563)], -.197, metal, 'Body')
front_panel('Interior de hebilla', [(-.046,1.485),(.048,1.488),(.047,1.54),(-.047,1.543)], -.203, leather, 'Body', .01)
front_panel('Pasador de hebilla', [(-.013,1.506),(.065,1.506),(.065,1.522),(-.013,1.522)], -.209, metal, 'Body', .01)
front_panel('Pico del fajín', [(-.102,1.49),(.087,1.48),(.045,1.29),(-.04,1.218)], -.191, cloth, 'Body', .055)

# Bolsa asimétrica en el lado derecho del personaje.
panel('Bolsa lateral', [(-.365,-.076,1.467),(-.216,-.213,1.478),
    (-.166,-.250,1.224),(-.385,-.179,1.184),(-.422,-.076,1.226)], leather, 'Body', .115)
panel('Solapa de la bolsa', [(-.375,-.082,1.456),(-.225,-.225,1.475),
    (-.174,-.254,1.324),(-.291,-.236,1.296),(-.415,-.108,1.316)], leather, 'Body', .018)
panel('Cierre de la bolsa', [(-.322,-.215,1.346),(-.29,-.239,1.36),
    (-.272,-.252,1.306),(-.306,-.235,1.295)], metal, 'Body', .01)

for side, sign in (('L', 1), ('R', -1)):
    def limbs(name, rings, material, bone, **kwargs):
        return loft(name + '.' + side, [(x*sign, y, z, a, b) for x,y,z,a,b in rings],
                    material, bone, **kwargs)

    trousers = limbs('Pernera', [
        (.204,.022,.304,.100,.099),(.205,.017,.395,.120,.129),
        (.211,.023,.552,.177,.156),(.218,.033,.70,.180,.187),
        (.207,.006,.84,.14,.161),(.177,.016,1.026,.149,.161),
        (.144,.026,1.23,.163,.173),(.147,.021,1.40,.175,.175),
        (.15,.024,1.47,.136,.136),
    ], cloth, ('UpperLeg.'+side, 'LowerLeg.'+side), sides=14, angular=.105,
        stretch=[1,1,1,.96,.67,.24,0,0,0])
    trousers.data.materials.append(deep)
    trousers.data.materials.append(accent)
    for face in trousers.data.polygons:
        first = min(face.vertices)
        row, segment = divmod(first, 14)
        if row == 0:
            face.material_index = 1
        elif side == 'L' and (row, segment) in {(4, 10), (5, 11), (6, 12)}:
            face.material_index = 2
    boot = limbs('Bota', [
        (.208,-.089,.001,.115,.192),(.208,-.095,.039,.126,.204),
        (.208,-.094,.071,.122,.195),(.208,-.074,.12,.11,.189),
        (.206,-.022,.179,.098,.122),(.206,.009,.252,.085,.095),
    ], dark, 'Foot.'+side, sides=14)
    boot.data.materials.append(deep)
    for face in boot.data.polygons:
        if min(face.vertices) < 28:
            face.material_index = 1
    limbs('Polaina', [(.205,.005,.178,.095,.101),(.205,.011,.24,.097,.106),
          (.205,.011,.315,.096,.098)], dark, 'LowerLeg.'+side)
    limbs('Correa de bota', [(.205,.007,.204,.101,.106),(.205,.008,.243,.102,.109)],
          cloth, 'LowerLeg.'+side)

    limbs('Bíceps descubierto', [
        (.421,0,1.746,.070,.071),(.387,.003,1.871,.093,.087),
        (.338,.015,2.020,.112,.108),(.287,.028,2.104,.077,.077)
    ], skin, 'UpperArm.'+side, sides=14)
    limbs('Brazo y antebrazo', [
        (.553,-.027,1.347,.058,.063),(.531,-.020,1.439,.074,.076),
        (.505,-.015,1.548,.081,.087),(.470,-.003,1.652,.088,.092),
        (.441,.001,1.746,.081,.079),(.413,.008,1.833,.076,.079),
    ], dark, ('UpperArm.'+side,'LowerArm.'+side), sides=14,
        stretch=[1,1,1,.73,.23,0])
    limbs('Guante', [
        (.566,-.047,1.185,.061,.042),(.558,-.036,1.253,.074,.070),
        (.546,-.028,1.331,.064,.063),(.547,-.025,1.373,.064,.069),
    ], dark, 'Fist.'+side, sides=12)
    for digit in range(4):
        x = .515 + .028 * digit
        z = 1.194 + .009 * abs(digit-1)
        limbs('Nudillo '+str(digit), [(x,-.077,z,.013,.015),
            (x,-.082,z+.036,.015,.018)], skin, 'Fist.'+side, sides=6)
    if side == 'R':
        rings = []
        for i in range(13):
            z = 1.374 + .017 * i
            x = .547 - .0045 * i
            radius = .075 + .002 * i + (.004 if i % 2 else 0)
            rings.append((x,-.022,z,radius,radius+.004))
        limbs('Vendaje', rings, wrap, 'LowerArm.'+side, sides=14, angular=.01)
    else:
        limbs('Guardabrazo', [(.548,-.026,1.378,.071,.072),(.524,-.022,1.477,.081,.086),
              (.492,-.015,1.567,.089,.092)], deep, 'LowerArm.'+side, angular=.04)
    limbs('Correa de brazo', [(.403,.002,1.801,.093,.094),(.393,.005,1.853,.101,.102)],
          deep, 'UpperArm.'+side)

# Bufanda: los grandes pliegues afilados se leen incluso en la cámara de juego.
loft('Cuello de la bufanda', [(0,.014,2.036,.19,.164),(0,.025,2.106,.275,.222),
    (.014,.035,2.183,.248,.216),(.026,.034,2.25,.217,.181)], deep, 'Neck',
    sides=12, angular=.075, smooth=False)
panel('Pliegue de bufanda', [(-.263,-.079,2.154),(-.181,-.171,2.205),
    (.023,-.207,2.164),(.229,-.165,2.222),(.272,-.078,2.147),
    (.072,-.236,2.018),(-.169,-.187,2.057)], cloth, 'Neck', .035)
panel('Pico de bufanda', [(-.16,.143,2.151),(.121,.172,2.185),
    (.28,.195,2.071),(.20,.258,1.862),(-.054,.261,1.952),(-.196,.195,2.038)],
    deep, 'Neck', .048)

# Capucha de volumen real. El borde del hueco frontal retrocede hacia una
# cavidad cerrada oscura, sin ojos ni máscara y sin depender de una textura.
rim = [(-.172,-.151,2.222),(-.216,-.205,2.338),(-.156,-.250,2.499),
       (0,-.274,2.603),(.156,-.250,2.499),(.216,-.205,2.338),
       (.172,-.151,2.222),(0,-.169,2.189)]
crown = [(-.199,-.006,2.212),(-.251,-.035,2.355),(-.195,-.044,2.558),
         (0,-.075,2.76),(.195,-.044,2.558),(.251,-.035,2.355),
         (.199,-.006,2.212),(0,.029,2.161)]
rear = [(-.126,.169,2.254),(-.175,.173,2.368),(-.137,.159,2.527),
        (0,.11,2.66),(.137,.159,2.527),(.175,.173,2.368),
        (.126,.169,2.254),(0,.19,2.225)]
lining = [(x*.84,y+.082,2.37+(z-2.37)*.82) for x,y,z in rim]
bottom = [(x*.51,.075,2.38+(z-2.38)*.54) for x,y,z in lining]
hood = mesh('Capucha y forro', [*bottom,*lining,*rim,*crown,*rear],
            [tuple(range(8)), *bridge(5,8), tuple(range(32,40))],
            cloth, 'Head')
for mat in (void, deep):
    hood.data.materials.append(mat)
for p in hood.data.polygons:
    ring = min(p.vertices)//8
    p.material_index = 1 if ring <= 1 else (2 if ring >= 3 else 0)
    if ring == 2 and min(p.vertices) % 8 in (1, 2, 3, 4):
        p.material_index = 2

# Marca geométrica: trazo ancho sobre los dos planos superiores, separado del forro.
for i in (2, 3):
    near_a, near_b = map(Vector, (rim[i], rim[i+1]))
    far_a, far_b = map(Vector, (crown[i], crown[i+1]))
    def on_hood(u, v):
        point = near_a.lerp(near_b, u).lerp(far_a.lerp(far_b, u), v)
        return tuple(point + Vector((-.004 if i == 2 else .004, -.026, .009)))
    panel('Marca carmesí de la capucha', [on_hood(u,v) for u,v in
          [(.15,.22),(.51,.65),(.85,.24),(.69,.22),(.50,.48),(.29,.22)]],
          accent, 'Head', .011)

# Exportar una sola malla de skin con primitivas de materiales separados.
# El .blend conserva las piezas para editar silueta y paneles sin reconstruirlas.
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = arm
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'art/sombra/sombra_prototype.blend'), compress=True)
pieces = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
for obj in pieces:
    obj.select_set(True)
bpy.context.view_layer.objects.active = pieces[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Sombra'
body.data.calc_loop_triangles()
assert len(body.data.loop_triangles) <= 30000
assert all(abs(sum(g.weight for g in v.groups) - 1) < .001 for v in body.data.vertices)
print(f'Sombra: {len(body.data.loop_triangles)} triángulos; todos con pesos normalizados a nivel de vértice')
arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'public/assets/chars/sombra.glb'),
                         use_selection=True, export_animations=False, export_skins=True)
