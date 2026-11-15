import bpy, sys, os
RAW = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets_raw")
RPG = f"{RAW}/rpg/RPG Characters - Nov 2020/Blends"
OUT = sys.argv[-1]
for n in ['Cleric', 'Warrior', 'Monk', 'Rogue', 'Ranger', 'Wizard']:
    bpy.ops.wm.open_mainfile(filepath=f"{RPG}/{n}.blend")
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    for pb in arm.pose.bones:
        for c in list(pb.constraints): pb.constraints.remove(c)
        pb.location = (0, 0, 0); pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0)
    if arm.animation_data: arm.animation_data.action = None
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and any(k in o.name for k in ('_Staff', '_Sword', '_Dagger', '_Bow')):
            bpy.data.objects.remove(o, do_unlink=True)
    TEX = RPG.replace('Blends', 'Textures')
    for im in bpy.data.images:
        if im.name.endswith('.png'): im.filepath = f"{TEX}/{im.name}"; im.reload()
    for m in bpy.data.materials:
        if not m.use_nodes: continue
        nt = m.node_tree; tex = next((x for x in nt.nodes if x.type == "TEX_IMAGE"), None)
        out = next(x for x in nt.nodes if x.type == "OUTPUT_MATERIAL")
        for nd in list(nt.nodes):
            if nd.type.startswith("BSDF"): nt.nodes.remove(nd)
        pr = nt.nodes.new('ShaderNodeBsdfPrincipled'); pr.inputs['Roughness'].default_value = 1.0
        nt.links.new(pr.outputs[0], out.inputs[0])
        if tex: nt.links.new(tex.outputs['Color'], pr.inputs['Base Color']); tex.interpolation = 'Linear'
    for o in bpy.data.objects: o.hide_set(False); o.hide_viewport = False
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/{n.lower()}.glb", use_selection=True, export_animations=False,
        export_skins=True, export_yup=True, export_image_format='WEBP', export_image_quality=85)
    print('CHAR', n)
