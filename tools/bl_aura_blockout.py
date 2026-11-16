#!/usr/bin/env python3
"""Aura: procedural, UNRIGGED blockout for the approved NEÓN concept.
Run: blender -b --python tools/bl_aura_blockout.py -- --out aura-blockout.glb
This is a modeling STARTING POINT, not an animation-ready character.
The output is separate from public/assets/chars/cleric.glb.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

COLORS = {
    "ivory": (0.80, 0.72, 0.66, 1),
    "hair": (0.79, 0.76, 0.89, 1),
    "charcoal": (0.055, 0.055, 0.082, 1),
    "purple": (0.27, 0.23, 0.32, 1),
    "armor": (0.16, 0.15, 0.23, 1),
    "orange": (1.0, 0.34, 0.02, 1),
    "black": (0.014, 0.012, 0.024, 1),
}
def mat(name):
    m = bpy.data.materials.new("AURA_" + name.upper())
    m.diffuse_color = COLORS[name]
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = COLORS[name]
    bsdf.inputs["Roughness"].default_value = 1.0
    return m

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
mats = {k: mat(k) for k in COLORS}
root = bpy.data.objects.new("AURA_BLOCKOUT_ROOT", None)
bpy.context.collection.objects.link(root)

def attach(obj, name, material):
    obj.name = name
    obj.parent = root
    obj.data.materials.clear()
    obj.data.materials.append(mats[material])
    for f in obj.data.polygons: f.use_smooth = False
    return obj

def cube(name, loc, scale, material, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = o.modifiers.new("Large, readable bevels", 'BEVEL')
        mod.width = bevel
        mod.segments = 1
        mod.affect = 'EDGES'
        o.modifiers.new("Weighted normals", 'WEIGHTED_NORMAL')
    return attach(o, name, material)

def ico(name, loc, radius, material, scale=(1,1,1), subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=radius, location=loc)
    o = bpy.context.object
    o.scale = scale
    return attach(o, name, material)

def cone(name, loc, radius1, radius2, depth, material, vertices=6, rotation=None):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1,
                                   radius2=radius2, depth=depth, location=loc)
    o = bpy.context.object
    if rotation: o.rotation_euler = rotation
    return attach(o, name, material)

def bar(name, start, end, radius, material, vertices=8, taper=1.0):
    a, b = Vector(start), Vector(end)
    mid = (a + b) / 2
    obj = cone(name, mid, radius, radius*taper, (b-a).length, material, vertices)
    obj.rotation_euler = (b-a).to_track_quat('Z','Y').to_euler()
    return obj

# Coordinates: Blender Z up, X width, character faces -Y.
# 2.76 total reference height, matching game model reference scale.
# These shapes are placeholders for sculpt/retopo/rig.
cube("torso_inner", (0,0,1.76), (.38,.23,.48), "charcoal", .035)
cube("jacket_chest", (0,-.035,1.91), (.47,.29,.29), "ivory", .035)
cube("jacket_hem", (0,-.04,1.79), (.46,.30,.075), "armor", .012)
cube("scarf_high_collar", (0,-.025,2.14), (.47,.38,.21), "charcoal", .07)
cube("collar_orange_trim", (0,-.224,2.17), (.34,.018,.028), "orange")
cube("pelvis", (0,0,1.50), (.36,.25,.29), "purple", .04)
cube("belt", (0,-.017,1.61), (.42,.29,.09), "charcoal")
cube("buckle", (0,-.18,1.61), (.09,.025,.065), "armor", .01)
cube("buckle_light", (0,-.20,1.61), (.048,.013,.028), "orange")
cube("asymmetrical_hip_flap", (-.28,-.014,1.31), (.18,.26,.40), "armor", .022)

# Pants: angular volume, deliberately broad from knee to calf.
for side, sx in [('L',-.24),('R',.24)]:
    bar("thigh_"+side, (sx,0,1.48), (sx*1.06,0,1.04), .177, "purple", 7, .85)
    ico("pant_knee_"+side,(sx*1.06,-.01,.98),.18,"purple",(1,.78,1),1)
    bar("pant_calf_"+side, (sx*1.06,0,.99), (sx*1.16,.018,.44), .20, "purple", 7, .55)
    cube("boot_shaft_"+side,(sx*1.16,-.012,.34),(.25,.29,.39),"armor",.026)
    cube("boot_toe_"+side,(sx*1.16,-.13,.11),(.31,.48,.18),"charcoal",.03)
    cube("boot_sole_"+side,(sx*1.16,-.13,.048),(.32,.50,.075),"ivory",.02)
    cube("boot_accent_"+side,(sx*1.16,-.17,.32),(.04,.025,.19),"orange")
    # Jacket shoulders / arms / gloves; both hands unobstructed.
    cube("shoulder_plate_"+side,(sx*1.38,0,2.02),(.26,.35,.18),"armor",.045)
    bar("upper_arm_"+side,(sx*1.5,0,1.99),(sx*1.70,-.018,1.68),.115,"ivory",7,.90)
    ico("elbow_"+side,(sx*1.70,-.018,1.66),.108,"armor",(.95,.95,.95),1)
    bar("forearm_"+side,(sx*1.7,-.018,1.63),(sx*1.83,-.05,1.33),.102,"ivory",7,.78)
    cube("glove_"+side,(sx*1.86,-.08,1.22),(.14,.155,.20),"charcoal",.025)
    cube("wrist_accent_"+side,(sx*1.83,-.12,1.33),(.12,.02,.028),"orange")

# Head and faceted mask; NOT a deformable face.
bar("neck",(0,0,2.22),(0,0,2.32),.105,"charcoal")
ico("head_base",(0,0,2.49),.22,"ivory",(0.86,.75,1.20),2)
ico("mask_outer",(0,-.13,2.48),.20,"ivory",(.84,.56,1.09),1)
# Black slits read clearly in both profile and frontal camera.
for side, x in [('L',-.085),('R',.085)]:
    eye = cube("mask_eye_"+side,(x,-.249,2.50),(.105,.022,.032),"black",.006)
    eye.rotation_euler[1] = (-.18 if x<0 else .18)

# Hair represented as large triangular silhouette spikes, not individual strands.
ico("hair_crown",(0,.08,2.67),.17,"hair",(1.0,.85,.50),1)
for i in range(9):
    a=2*math.pi*i/9
    x=.15*math.cos(a); y=.08+.10*math.sin(a)
    sp=cone("hair_spike_%02d"%i,(x*1.35,y,2.71+.025*(i%3)),
            .10,0,.24+.05*(i%3),"hair",5)
    sp.rotation_euler[1]=.38*math.cos(a)
    sp.rotation_euler[0]=.30*math.sin(a)

# Reference empties; true skin/weapon sockets must be added to the final rig.
for name,loc in {
    "SOCKET_WEAPON_R_REFERENCE":(-.46,-.08,1.19),
    "SOCKET_WEAPON_L_REFERENCE":(.46,-.08,1.19),
    "VIEW_FIGHT_CAMERA_REFERENCE":(0,-8,1.40)
}.items():
    ob=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(ob)
    ob.location=loc
    ob.empty_display_size=.09

out = Path("aura-blockout.glb")
if "--" in sys.argv:
    args = sys.argv[sys.argv.index("--")+1:]
    if "--out" in args: out = Path(args[args.index("--out")+1])
out.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH': obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out.resolve()), export_format="GLB",
                          use_selection=True, export_animations=False,
                          export_skins=False, export_yup=True)
print("Aura BLOCKOUT exported (UNRIGGED):", out.resolve())
