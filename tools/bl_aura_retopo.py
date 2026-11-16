"""F2b — Retopología automática + UV + horneado de color.

Entrada: .blend de bl_aura_recolor.py (malla alta con atributo de color "Col").
Salida:  <salida>.blend y <salida>.glb con malla baja en quads, UV propias y textura de color plano.

  python tools/bl_aura_retopo.py <entrada.blend> <salida_sin_ext> [caras_quad=15000] [voxel=0.0035] [tex=1024]

Pasos: remallado por vóxeles (cierra la malla) → QuadriFlow → Smart UV → bake Cycles
(emisión del color de la malla alta sobre la baja, selected-to-active).
"""
import bpy, sys
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[-5:]
src, out = args[0], args[1]
faces = int(args[2]) if len(args) > 2 else 15000
voxel = float(args[3]) if len(args) > 3 else 0.0035
texsz = int(args[4]) if len(args) > 4 else 1024

bpy.ops.wm.open_mainfile(filepath=src)
hi = next(o for o in bpy.data.objects if o.type == 'MESH'); hi.name = 'Aura_high'
ctx = bpy.context
for o in bpy.data.objects: o.select_set(False)
lo = hi.copy(); lo.data = hi.data.copy(); lo.name = 'Aura'; ctx.collection.objects.link(lo)
ctx.view_layer.objects.active = lo; lo.select_set(True)

MODE = __import__('os').environ.get('RETOPO', 'voxel')   # 'voxel' (QuadriFlow/decimado) o 'decimate' (conserva piezas y UV de TRELLIS)
if MODE == 'decimate':
    m = lo.modifiers.new('dec', 'DECIMATE'); m.ratio = (faces * 2) / len(lo.data.polygons)
    bpy.ops.object.modifier_apply(modifier='dec'); print('decimado directo', len(lo.data.polygons))
    bpy.ops.object.shade_smooth()
    for a in list(lo.data.color_attributes): lo.data.color_attributes.remove(a)
# 1) malla cerrada por vóxeles
if MODE == 'voxel':
    lo.data.remesh_voxel_size = voxel; lo.data.use_remesh_fix_poles = True
    bpy.ops.object.voxel_remesh()
    import bmesh
    bm = bmesh.new(); bm.from_mesh(lo.data)
    # quedarse con la pieza conexa más grande y normales coherentes (requisito de QuadriFlow)
    islands = []; seen = set()
    for f in bm.faces:
        if f.index in seen: continue
        stack = [f]; isl = []; seen.add(f.index)
        while stack:
            g = stack.pop(); isl.append(g)
            for e in g.edges:
                for h in e.link_faces:
                    if h.index not in seen: seen.add(h.index); stack.append(h)
        islands.append(isl)
    islands.sort(key=len, reverse=True)
    small = [f for isl in islands[1:] for f in isl if len(isl) < 200]
    bmesh.ops.delete(bm, geom=small, context='FACES')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    print('islas', len(islands), [len(i) for i in islands[:6]], 'no-manifold', sum(1 for e in bm.edges if not e.is_manifold))
    bm.to_mesh(lo.data); bm.free(); lo.data.update()
    print('voxel', len(lo.data.polygons))
    # 2) quads con flujo (QuadriFlow)
    r = bpy.ops.object.quadriflow_remesh(target_faces=faces, use_preserve_sharp=False, use_preserve_boundary=False, use_mesh_symmetry=False, seed=0)
    print('quadriflow', r, len(lo.data.polygons))
    if 'FINISHED' not in r:
        # en bpy sin interfaz QuadriFlow se cancela (no-manifold de vértice o jobs). Plan B: decimado por colapso
        # sobre la malla de vóxeles (uniforme) hasta ~2*faces triángulos.
        m = lo.modifiers.new('dec', 'DECIMATE'); m.ratio = (faces * 2) / len(lo.data.polygons) / 2 * 2 * 0.5 if False else (faces * 2) / (len(lo.data.polygons) * 2)
        bpy.ops.object.modifier_apply(modifier='dec')
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode='OBJECT')
        print('decimado', len(lo.data.polygons))
    bpy.ops.object.shade_smooth()
    for a in list(lo.data.color_attributes): lo.data.color_attributes.remove(a)
    # 3) UV
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')

# 4) textura destino + material
img = bpy.data.images.new('Aura_color', texsz, texsz, alpha=False); img.colorspace_settings.name = 'sRGB'
mat = bpy.data.materials.new('Aura'); mat.use_nodes = True; nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']; bsdf.inputs['Roughness'].default_value = 1
tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img; nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
nt.nodes.active = tn
lo.data.materials.clear(); lo.data.materials.append(mat)
# material de la malla alta: emisión = color de vértice
hm = hi.data.materials[0]; hn = hm.node_tree
em = hn.nodes.new('ShaderNodeEmission'); vc = hn.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
hn.links.new(vc.outputs['Color'], em.inputs['Color']); hn.links.new(em.outputs[0], hn.nodes['Material Output'].inputs['Surface'])
# 5) bake selected → active
sc = ctx.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 1
hi.select_set(True); lo.select_set(True); ctx.view_layer.objects.active = lo
bpy.ops.object.bake(type='EMIT', use_selected_to_active=True, cage_extrusion=0.02, max_ray_distance=0.08, margin=4)
img.filepath_raw = out + '_color.png'; img.file_format = 'PNG'; img.save()
print('bake ok')
# limpiar y exportar
bpy.data.objects.remove(hi, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=out + '.blend')
bpy.ops.object.select_all(action='DESELECT'); lo.select_set(True)
bpy.ops.export_scene.gltf(filepath=out + '.glb', use_selection=True, export_image_format='WEBP', export_image_quality=90)
print('OK tris', sum(len(p.vertices) - 2 for p in lo.data.polygons))
