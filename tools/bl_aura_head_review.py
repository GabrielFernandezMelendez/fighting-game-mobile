# Uso: python3 -c "import runpy,sys; sys.argv=['x','0.05','0.10','public/assets/chars/aura_review.glb']; runpy.run_path('tools/bl_aura_head_review.py')"  (LIFT, VOL, salida)
# Cabeza de Aura v1 sobre el GLB de combate: más volumen de pelo, cabeza más alta y cuello.
import bpy, bmesh, sys, math
from mathutils import Vector
LIFT=float(sys.argv[-3]); VOL=float(sys.argv[-2]); OUT=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/home/claude/fighting-game-mobile/public/assets/chars/aura.glb')
for o in list(bpy.data.objects):
    if o.name=='Icosphere': bpy.data.objects.remove(o)
m=bpy.data.objects['Aura']; me=m.data
HAIR,MASK,SKIN=1,2,3
hv=set(); mv=set()
for p in me.polygons:
    if p.material_index==HAIR: hv.update(p.vertices)
    if p.material_index==MASK: mv.update(p.vertices)
C=Vector((0.0,0.035,2.53))
def ss(a,b,x): t=min(1,max(0,(x-a)/(b-a))); return t*t*(3-2*t)
# 1) volumen: todo el pelo crece desde el centro de la cabeza; las puntas (lejos del centro) se estiran más
ZTOP=2.74
for i in hv:
    v=me.vertices[i]; d=v.co-C; r=d.length
    k=1+VOL*(0.45+0.9*ss(0.15,0.27,r))
    d2=d*k
    d2.z += VOL*0.35*ss(0.10,0.25,d.z)          # copete más alto
    p=C+d2
    # mechones que bajan: patillas a los lados, flequillo sobre la frente de la máscara y nuca
    side=ss(0.09,0.20,abs(p.x)); front=ss(0.0,0.10,-p.y)*(1-ss(0.10,0.18,abs(p.x))); back=ss(0.08,0.20,p.y)
    f=1+0.55*side+0.40*front+0.35*back
    if p.z<ZTOP: p.z=ZTOP-(ZTOP-p.z)*f
    p.y-=0.035*front                              # el flequillo queda delante de la máscara
    v.co=p
# máscara algo más estrecha (forma de huevo, como en el concept)
for i in mv:
    v=me.vertices[i]; v.co.x*=0.90
# 2) cabeza más alta (pelo + máscara); los huesos no se tocan
for i in hv|mv: me.vertices[i].co.z+=LIFT
# 3) cuello: cilindro corto de piel entre la bufanda y la barbilla, pesado a Neck→Head
bm=bmesh.new()
r=0.066; z0=2.20; z1=2.36+LIFT
bmesh.ops.create_cone(bm, cap_ends=False, segments=12, radius1=r*1.05, radius2=r, depth=z1-z0)
bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0,0.03,(z0+z1)/2)))
neck=bpy.data.meshes.new('neck'); bm.to_mesh(neck); bm.free()
no=bpy.data.objects.new('neck',neck); bpy.context.scene.collection.objects.link(no)
no.data.materials.append(me.materials[0])   # con la ropa: así usa la etiqueta grafito
ng={n:no.vertex_groups.new(name=n) for n in ('Neck','Head')}
for v in neck.vertices:
    t=ss(z0,z1,v.co.z); ng['Neck'].add([v.index],1-t,'REPLACE'); ng['Head'].add([v.index],t,'REPLACE')
ca=neck.color_attributes.new('Color','BYTE_COLOR','CORNER')
for c in ca.data: c.color=(3.5/16,0,0,1)   # grafito: cuello en sombra bajo la máscara
bpy.ops.object.select_all(action='DESELECT'); no.select_set(True); m.select_set(True); bpy.context.view_layer.objects.active=m
bpy.ops.object.join()
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
bpy.ops.object.select_all(action='DESELECT'); m.select_set(True); arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_animations=False, export_skins=True, export_vertex_color='ACTIVE', export_extras=True)
print('OK', len(me.vertices))
