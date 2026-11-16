import bpy, sys
src, dst, target = sys.argv[-3], sys.argv[-2], int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in bpy.data.objects:
    if o.type != 'MESH': continue
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    n = len(o.data.polygons); m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = min(1, target / max(1, n))
    bpy.ops.object.modifier_apply(modifier='dec'); print('TRIS', n, '->', len(o.data.polygons))
bpy.ops.export_scene.gltf(filepath=dst, export_image_format='WEBP', export_image_quality=85)
