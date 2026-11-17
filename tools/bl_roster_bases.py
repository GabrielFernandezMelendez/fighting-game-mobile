"""Construye bases editables de Vega y Kai, con materiales planos y rig de Aura.

blender -b --python-exit-code 1 --python tools/bl_roster_bases.py -- vega
blender -b --python-exit-code 1 --python tools/bl_roster_bases.py -- kai
"""
import math
from pathlib import Path
import sys

import bmesh
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bl_fighter_armature import create_fighter_armature

ROOT = Path(__file__).resolve().parents[1]
character = sys.argv[sys.argv.index('--') + 1]
if character not in {'vega', 'kai'}:
    raise ValueError('Usa vega o kai')
kai = character == 'kai'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
arm = create_fighter_armature()


def material(name, color):
    rgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    linear = tuple(v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb)
    mat = bpy.data.materials.new(f'{character}_{name}')
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = mat.diffuse_color
    node.inputs['Roughness'].default_value = .86
    return mat


skin = material('piel', 'BB795C' if kai else 'ECB498')
cloth = material('grafito', '39313A' if kai else '312B3A')
trim = material('acento', 'FFA822' if kai else '20E3E3')
armor = material('metal', '766052' if kai else '605A69')
edge = material('borde', 'A48A74' if kai else '9690A0')
leather = material('cuero', '695044' if kai else '684435')
hair = material('pelo', 'DDD3CB' if kai else '312127')
black = material('negro', '201B24')
iris = material('iris', '574B55')
eye_white = material('esclerotica', 'E3C9BD')
linen = material('tela', 'B09169' if kai else '8B2D50')


def piece(name, points, faces, mat, weights, smooth=False):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    for polygon in mesh.polygons:
        polygon.use_smooth = smooth
    groups = {}
    for i, influences in enumerate(weights):
        for name, weight in influences.items():
            if weight:
                if name not in groups:
                    groups[name] = obj.vertex_groups.new(name=name)
                groups[name].add([i], weight, 'REPLACE')
    obj.parent = arm
    obj.modifiers.new('Rig NEÓN', 'ARMATURE').object = arm
    return obj


def tube(name, rings, mat, bone, sides=12, smooth=True):
    """Anillos horizontales (x, y, altura, semiancho, profundidad[, peso superior])."""
    points, weights = [], []
    for ring in rings:
        x, y, z, rx, ry, *blend = ring
        influence = {bone: 1} if isinstance(bone, str) else {bone[0]: 1 - blend[0], bone[1]: blend[0]}
        for i in range(sides):
            angle = math.tau * (i + .5) / sides
            points.append((x + rx * math.cos(angle), y + ry * math.sin(angle), z))
            weights.append(influence)
    faces = [(row*sides+i, row*sides+(i+1)%sides, (row+1)*sides+(i+1)%sides, (row+1)*sides+i)
             for row in range(len(rings)-1) for i in range(sides)]
    faces += [tuple(range(sides)), tuple(range(len(points)-sides, len(points)))]
    return piece(name, points, faces, mat, weights, smooth)


def panel(name, outline, mat, bone, depth=.035):
    """Placa cerrada. La cara delantera se dibuja hacia −Y."""
    n = len(outline)
    pts = outline + [(x, y + depth, z) for x, y, z in outline]
    faces = [tuple(range(n)), tuple(range(n, n*2))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    return piece(name, pts, faces, mat, [{bone: 1}] * len(pts))


def bead(name, xyz, scale, mat, bone):
    x, y, z = xyz
    rx, ry, rz = scale
    return tube(name, [(x, y, z+rz*math.cos(a), rx*math.sin(a), ry*math.sin(a))
                      for a in (.03,.42,.79,1.16,1.57,1.98,2.35,2.72,3.11)], mat, bone, 10)


# Volúmenes de torso con cintura, pecho y hombros diferenciados por personaje.
waist, chest = (.32, .43) if kai else (.215, .29)
tube('Torso', [(0,.015,1.34,waist,.15,0),(0,.018,1.52,waist,.17,0),
    (0,.02,1.69,waist*.9,.164,.25),(0,.025,1.85,chest*.96,.203,.75),
    (0,.025,2.01,chest,.22,1),(0,.04,2.13,chest*.81,.177,1),(0,.02,2.18,.12,.105,1)],
    skin if kai else cloth, ('Body','Torso'), 16)
tube('Cuello', [(0,.014,2.09,.112,.106),(0,.014,2.34,.102,.09)], skin, 'Neck')
tube('Cinturón', [(0,.005,1.42,waist*1.09,.188),(0,.005,1.53,waist*1.09,.195)], leather, 'Body', 16)
panel('Hebilla', [(-.065,-.195,1.518),(.06,-.197,1.509),(.052,-.196,1.439),(-.059,-.197,1.448)], edge, 'Body', .024)
panel('Tabardo', [(-.13,-.196,1.47),(.05,-.209,1.45),(.10,-.229,1.074),(-.10,-.244,.99),(-.16,-.222,1.26)], linen if not kai else leather, 'Body', .035)
panel('Remate de tabardo', [(-.102,-.247,1.045),(.095,-.241,1.132),(.099,-.233,1.074),(-.10,-.25,.99)], trim if kai else material('bordado','AF4268'), 'Body', .017)

for side, sign in [('L', 1), ('R', -1)]:
    def limb(name, rings, mat, bone, facets=12, smooth=True):
        tube(name+' '+side, [(x*sign,y,z,rx,ry,*rest) for x,y,z,rx,ry,*rest in rings],
             mat, bone, facets, smooth)

    limb('Pernera', [(.2,.02,.31,.096,.11,1),(.2,.019,.49,.135,.135,1),
        (.20,.018,.67,.151,.148,1),(.195,.01,.78,.132,.142,.62),
        (.18,.02,.9,.152,.16,.23),(.163,.022,1.19,.166,.157,0),(.155,.022,1.44,.155,.157,0)],
        cloth, ('UpperLeg.'+side,'LowerLeg.'+side), 12)
    limb('Bota', [(.207,-.088,.006,.119,.198),(.207,-.09,.054,.124,.205),
        (.207,-.073,.105,.108,.18),(.205,-.018,.191,.095,.118),(.205,.015,.301,.085,.103)],
        armor, 'Foot.'+side, 10)
    limb('Suela', [(.207,-.088,.001,.116,.195),(.207,-.09,.055,.128,.208)], black, 'Foot.'+side, 10, False)
    limb('Greba', [(.204,.008,.202,.101,.108),(.204,.021,.345,.124,.135),(.20,.020,.51,.157,.15),(.199,.018,.598,.159,.16)],
        armor, 'LowerLeg.'+side, 10, False)
    panel('Rodillera '+side, [(sign*x,y,z) for x,y,z in [(.095,-.103,.75),(.205,-.167,.828),(.31,-.106,.747),(.27,-.16,.606),(.20,-.174,.572),(.136,-.16,.619)]], edge, 'LowerLeg.'+side)
    panel('Acento de bota '+side, [(sign*x,y,z) for x,y,z in [(.112,-.198,.123),(.249,-.216,.141),(.274,-.188,.108),(.122,-.201,.089)]], trim, 'Foot.'+side)
    size = 1.22 if kai else 1
    limb('Brazo', [(.55,-.029,1.34,.057*size,.066*size,1),(.505,-.021,1.50,.077*size,.082*size,1),
        (.468,-.015,1.64,.092*size,.091*size,.58),(.438,-.005,1.76,.083*size,.082*size,.15),
        (.375,.014,1.94,.108*size,.107*size,0),(.305,.025,2.076,.087*size,.093*size,0)],
        skin, ('UpperArm.'+side,'LowerArm.'+side), 14)
    limb('Brazal', [(.546,-.03,1.366,.077*size,.085*size),(.51,-.021,1.49,.104*size,.111*size),
        (.472,-.015,1.615,.121*size,.122*size)], armor, 'LowerArm.'+side, 8, False)
    panel('Inserto de brazal '+side, [(sign*x,y,z) for x,y,z in [(.494,-.136*size,1.56),(.542,-.132*size,1.572),(.58,-.099*size,1.43),(.545,-.110*size,1.393)]], trim if not kai else edge, 'LowerArm.'+side)
    limb('Guante', [(.574,-.048,1.186,.059*size,.04*size),(.56,-.034,1.262,.079*size,.068*size),
        (.552,-.032,1.375,.063*size,.068*size)], black, 'Fist.'+side)
    for digit in range(4):
        x = sign*(.52 + digit*.029)
        bead('Nudillo '+side, (x,-.086,1.218), (.014,.021,.025), skin, 'Fist.'+side)
    if not kai or side == 'R':
        limb('Hombrera', [(.349,.014,1.95,.107*size,.12*size),(.331,.018,2.06,.147*size,.169*size),
            (.284,.025,2.158,.126*size,.13*size)], armor, 'UpperArm.'+side, 8, False)
        panel('Filo de hombrera '+side, [(sign*x,y,z) for x,y,z in [(.17,-.137*size,2.161),(.435*size,-.125*size,2.139),(.46*size,-.121*size,2.086),(.24,-.169*size,2.098)]], edge if kai else trim, 'UpperArm.'+side)

tube('Cabeza', [(0,-.034,2.276,.056,.092),(0,-.036,2.315,.112,.124),
    (0,-.029,2.402,.152,.151),(0,-.012,2.509,.155,.153),(0,.006,2.599,.135,.133),
    (0,.016,2.659,.087,.086),(0,.019,2.683,.018,.026)], skin, 'Head', 20)
panel('Nariz', [(-.026,-.171,2.463),(.025,-.171,2.463),(.033,-.200,2.399),
    (0,-.217 if kai else -.199,2.394),(-.029,-.198,2.404)], skin, 'Head', .045)
for sign in (-1,1):
    bead('Oreja', (sign*.149,-.012,2.422), (.033,.04,.062), skin, 'Head')
    panel('Ojo', [(sign*x,y,z) for x,y,z in [(.029,-.165,2.454),(.106,-.152,2.478),(.116,-.140,2.456),(.064,-.169,2.435)]], eye_white, 'Head', .013)
    bead('Iris', (sign*.066,-.176,2.454), (.014,.009,.016), iris, 'Head')
    panel('Ceja', [(sign*x,y,z) for x,y,z in [(.026,-.170,2.469),(.113,-.142,2.513),(.12,-.134,2.494),(.037,-.17,2.453)]], hair, 'Head', .021)

if kai:
    panel('Barba facetada', [(-.144,-.089,2.433),(-.113,-.153,2.37),(-.06,-.217,2.39),
        (0,-.227,2.373),(.063,-.219,2.392),(.113,-.157,2.37),(.143,-.09,2.43),(.163,-.114,2.318),
        (.113,-.181,2.247),(.04,-.228,2.189),(-.023,-.237,2.166),(-.106,-.187,2.22),(-.157,-.107,2.303)], hair, 'Head', .067)
    for i in range(11):
        angle = math.tau*i/11
        bead('Cuenta', (.223*math.cos(angle),.019+.236*math.sin(angle),2.097+.07*math.sin(angle)),
             (.074,.074,.074), black, 'Torso')
    sash = [(-.34,-.132,2.14),(-.174,-.188,2.013),(.01,-.215,1.865),(.259,-.166,1.64)]
    for (x,y,z), (a,b,c) in zip(sash, sash[1:]):
        panel('Banda cruzada', [(x,y,z),(x-.052,y,z-.043),
              (a-.052,b,c-.043),(a,b,c)], leather, 'Torso')
        panel('Filete dorado', [(x,y-.012,z),(x-.018,y-.012,z-.014),
              (a-.018,b-.012,c-.014),(a,b-.012,c)], trim, 'Torso', .022)
    beard_shade = material('barba_sombra', 'A79794')
    panel('Mechones de barba', [(-.106,-.169,2.291),(-.054,-.217,2.327),
          (.006,-.23,2.22),(-.019,-.251,2.183),(-.043,-.229,2.242)], beard_shade, 'Head', .026)
    tube('Fajín ancho', [(0,.01,1.516,.345,.206),(0,.014,1.57,.356,.219),
         (0,.024,1.623,.326,.204)], linen, 'Body', 16, False)
    bead('Nudo del fajín', (.065,-.203,1.565), (.077,.059,.068), linen, 'Body')
else:
    tube('Cuello alto', [(0,.013,1.968,.163,.159),(0,.026,2.073,.279,.196),(0,.03,2.159,.220,.155)], cloth, 'Neck', 12, False)
    for sign in (-1,1):
        panel('Placa del pecho', [(sign*x,y,z) for x,y,z in [(.013,-.20,1.994),(.158,-.213,2.024),(.248,-.129,1.959),(.17,-.18,1.826),(.065,-.207,1.835)]], armor, 'Torso')
    tube('Casquete de pelo', [(0,.088,2.355,.129,.095),(0,.062,2.5,.163,.117),
        (0,.029,2.626,.162,.145),(0,.018,2.704,.106,.105),(0,.018,2.728,.025,.031)], hair, 'Head', 16)
    for i in range(5):
        x = -.119+.052*i
        panel('Mechón de flequillo', [(x-.041,-.089,2.698-.014*i),(x+.034,-.132,2.665),
             (x+.056,-.159,2.50+.01*abs(i-2)),(x+.001,-.202,2.458+.014*i),(x-.031,-.174,2.558)], hair, 'Head', .029)
    bead('Lazo cian', (0,.123,2.652), (.11,.073,.074), trim, 'Head')
    tube('Coleta', [(.095,.395,1.87,.015,.021),(.077,.411,1.987,.048,.042),
        (.047,.382,2.166,.078,.062),(.021,.334,2.39,.091,.071),
        (0,.268,2.589,.088,.076),(0,.148,2.66,.05,.05)], hair, 'Head', 12)

# Se conserva la escena por piezas en el .blend y se empaqueta por material en el GLB.
target = ROOT / 'art' / character
target.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(target / f'{character}_base.blend'), compress=True)
pieces = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for obj in pieces:
    obj.select_set(True)
bpy.context.view_layer.objects.active = pieces[0]
bpy.ops.object.join()
mesh = bpy.context.object
mesh.name = character.capitalize()
mesh.data.calc_loop_triangles()
assert len(mesh.data.loop_triangles) < 30000
assert all(abs(sum(g.weight for g in v.groups) - 1) < .001 for v in mesh.data.vertices)
print(f'{character}: {len(mesh.data.loop_triangles)} triángulos con pesos normalizados')
colors = mesh.data.color_attributes.new(name='Color plano', type='FLOAT_COLOR', domain='CORNER')
mesh.data.color_attributes.active_color = colors
for face in mesh.data.polygons:
    color = mesh.data.materials[face.material_index].diffuse_color
    for index in face.loop_indices:
        colors.data[index].color = color
for mat in mesh.data.materials:
    mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (1, 1, 1, 1)
arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT / 'public/assets/chars' / f'{character}.glb'),
                         use_selection=True, export_animations=False, export_skins=True,
                         export_vertex_color='ACTIVE')
