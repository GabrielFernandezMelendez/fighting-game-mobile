"""F2c — Esqueleto ajustado a Aura con los mismos nombres de hueso que el rig del juego.

Entrada: .blend de bl_aura_retopo.py (malla baja de 1 unidad de alto, pies en z=-0.5, mirando a -Y).
Salida:  <salida>.blend (malla + armature, pesos automáticos) y <salida>.glb (sin animaciones).

  python tools/bl_aura_rig.py -- <entrada.blend> <salida_sin_ext>

Las articulaciones se han medido sobre la silueta frontal y lateral de la malla F1 (pose A del concept).
Se escala a 2.76 de alto, igual que los modelos RPG, para que models.js y bl_retarget.py los traten igual.
"""
import bpy, sys, os
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bl_fighter_armature import H, J, P, create_fighter_armature
args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]

bpy.ops.wm.open_mainfile(filepath=src)
mesh = next(o for o in bpy.data.objects if o.type == 'MESH'); mesh.name = 'Aura'
# escalar a la altura del rig del juego y apoyar los pies en z=0
mesh.scale = (H, H, H); mesh.location = (0, 0, 0.5 * H)
bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

arm = create_fighter_armature()

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
# Pantalón ancho: el bone heat deja parte de las perneras en Body/Hips y al levantar la pierna
# la tela se estira como una falda. Por debajo de la entrepierna, el peso del tronco pasa a las piernas,
# repartido por cercanía a cada pierna (sin cortes bruscos en la costura central).
if os.environ.get('LEG_WEIGHTS', '1') == '1':
    from mathutils.geometry import intersect_point_line
    gi = {g.name: g for g in mesh.vertex_groups}
    allleg = {'UpperLeg.L', 'LowerLeg.L', 'Foot.L', 'UpperLeg.R', 'LowerLeg.R', 'Foot.R'}
    seg = {sd: [(P(J[f'UpperLeg.{sd}'][0]), P(J[f'UpperLeg.{sd}'][1]), f'UpperLeg.{sd}'), (P(J[f'LowerLeg.{sd}'][0]), P(J[f'LowerLeg.{sd}'][1]), f'LowerLeg.{sd}')] for sd in 'LR'}
    crotch = (0.02 + 0.5) * H; ramp = 0.08 * H; moved = 0
    def dist_seg(p, a, b):
        q, f = intersect_point_line(p, a, b); f = max(0, min(1, f)); return (p - (a + (b - a) * f)).length
    for v in mesh.data.vertices:
        if v.co.z > crotch or abs(v.co.x) > 0.15 * H: continue
        t = min(1.0, (crotch - v.co.z) / ramp)
        w = {mesh.vertex_groups[g.group].name: g.weight for g in v.groups}
        trunk = sum(val for n, val in w.items() if n not in allleg)
        if trunk * t < 1e-4: continue
        best = {}
        for sd in 'LR':
            d, name = min((dist_seg(v.co, a, b), nm) for a, b, nm in seg[sd]); best[sd] = (d, name)
        inv = {sd: 1 / max(best[sd][0], 1e-3) ** 4 for sd in 'LR'}; tot = inv['L'] + inv['R']
        for n, val in w.items():
            if n not in allleg: gi[n].add([v.index], val * (1 - t), 'REPLACE')
        for sd in 'LR':
            nm = best[sd][1]; gi[nm].add([v.index], w.get(nm, 0) + trunk * t * inv[sd] / tot, 'REPLACE')
        moved += 1
    # Las manos en pose A rozan los muslos: el bone heat mezcla pesos de mano en el pantalón y de
    # pierna en la mano. Cada vértice se queda solo con el grupo (brazo o pierna) al que está más cerca.
    from mathutils.geometry import intersect_point_line as ipl
    def dseg(p, a, b):
        q, f = ipl(p, a, b); f = max(0, min(1, f)); return (p - (a + (b - a) * f)).length
    armg = {sd: [f'UpperArm.{sd}', f'LowerArm.{sd}', f'Fist.{sd}', f'Fist1.{sd}'] for sd in 'LR'}
    legg = {sd: [f'UpperLeg.{sd}', f'LowerLeg.{sd}', f'Foot.{sd}'] for sd in 'LR'}
    cleaned = 0
    for v in mesh.data.vertices:
        w = {mesh.vertex_groups[g.group].name: g.weight for g in v.groups}
        for sd in 'LR':
            ha = sum(w.get(n, 0) for n in armg[sd]); hl = sum(w.get(n, 0) for n in legg[sd])
            if ha < 0.01 or hl < 0.01: continue
            da = min(dseg(v.co, P(J[n][0]), P(J[n][1])) for n in (f'LowerArm.{sd}', f'Fist.{sd}', f'Fist1.{sd}'))
            dl = min(dseg(v.co, P(J[n][0]), P(J[n][1])) for n in legg[sd])
            drop = armg[sd] if dl < da else legg[sd]; keep = legg[sd] if dl < da else armg[sd]
            moved_w = sum(w.get(n, 0) for n in drop)
            for n in drop:
                if n in w: gi[n].add([v.index], 0.0, 'REPLACE')
            ks = sum(w.get(n, 0) for n in keep)
            for n in keep:
                if n in w: gi[n].add([v.index], w[n] + moved_w * w[n] / ks, 'REPLACE')
            cleaned += 1
    print('mano/pierna separados en', cleaned, 'vértices')
    # Reparto dentro de cada pierna por la posición a lo largo de cadera→tobillo (el bone heat ponía
    # parte del muslo en LowerLeg y, al doblar la rodilla, salían "espinas" hacia atrás).
    def ramp(x, a, b): return max(0.0, min(1.0, (x - a) / (b - a)))
    for sd in 'LR':
        hip, knee, ank = P(J[f'UpperLeg.{sd}'][0]), P(J[f'LowerLeg.{sd}'][0]), P(J[f'Foot.{sd}'][0])
        names = [f'UpperLeg.{sd}', f'LowerLeg.{sd}', f'Foot.{sd}']
        kz = (knee.z - hip.z) / (ank.z - hip.z)   # posición relativa de la rodilla
        for v in mesh.data.vertices:
            w = {mesh.vertex_groups[g.group].name: g.weight for g in v.groups}
            tot = sum(w.get(n, 0) for n in names)
            if tot < 1e-4: continue
            t = (v.co.z - hip.z) / (ank.z - hip.z)          # 0 cadera … 1 tobillo
            foot = ramp(t, 0.97, 1.03)
            # tela ancha detrás de la rodilla: si sigue a la espinilla, al doblar sale disparada hacia
            # atrás; se queda con el muslo hasta más abajo
            axis_y = hip.y + (ank.y - hip.y) * t
            back = ramp(v.co.y - axis_y, 0.01 * H, 0.05 * H)
            k0, k1 = kz - 0.07 + back * 0.12, kz + 0.07 + back * 0.25
            lower = ramp(t, k0, k1) * (1 - foot)
            upper = 1 - lower - foot
            for n, f in zip(names, (upper, lower, foot)): gi[n].add([v.index], tot * f, 'REPLACE')
    # Glúteos: la tela detrás de la articulación de la cadera debe quedarse con la pelvis; si sigue
    # al muslo, al subir la rodilla se abre hacia atrás como una aleta.
    for sd in 'LR':
        hip = P(J[f'UpperLeg.{sd}'][0]); names = [f'UpperLeg.{sd}', f'LowerLeg.{sd}', f'Foot.{sd}']
        for v in mesh.data.vertices:
            if (v.co.x > 0) != (sd == 'L'): continue
            behind = ramp(v.co.y - hip.y, 0.0 * H, 0.05 * H)
            low = ramp(hip.z - v.co.z, 0.04 * H, 0.14 * H)
            b = behind * (1 - low) * 0.85
            if b < 0.02: continue
            w = {mesh.vertex_groups[g.group].name: g.weight for g in v.groups}
            leg = sum(w.get(n, 0) for n in names)
            if leg < 1e-4: continue
            for n in names:
                if n in w: gi[n].add([v.index], w[n] * (1 - b), 'REPLACE')
            gi['Body'].add([v.index], w.get('Body', 0) + leg * b, 'REPLACE')
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
    try:
        bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
        bpy.ops.object.vertex_group_smooth(group_select_mode='ALL', factor=0.5, repeat=2)
    except Exception as e: print('sin suavizado de pesos:', e)
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
    print('perneras: vértices reasignados', moved)
bpy.ops.wm.save_as_mainfile(filepath=out + '.blend')
bpy.ops.object.select_all(action='SELECT')
has_col = any(o.type == 'MESH' and o.data.color_attributes for o in bpy.data.objects)
bpy.ops.export_scene.gltf(filepath=out + '.glb', use_selection=True, export_animations=False, export_skins=True,
                          export_image_format='WEBP', export_image_quality=90, export_vertex_color='ACTIVE' if has_col else 'MATERIAL')
print('OK')
