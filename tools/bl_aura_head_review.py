# Uso: python3 -c "import runpy,sys; sys.argv=['x','0.05','0.10','0.07','1','public/assets/chars/aura_review.glb']; runpy.run_path('tools/bl_aura_head_review.py')"  (LIFT, VOL, SPIKE, SUBDIV, salida)
# Cabeza de Aura v3 sobre el GLB de combate (sin piezas nuevas salvo el cuello):
# pelo con más volumen y puntas afiladas, menos masa atrás, máscara más larga, todo suavizado
# (subdivisión + normales suaves) para que el cel-shading dé bandas curvas en vez de facetas.
import bpy, bmesh, sys
from mathutils import Vector
LIFT,VOL,SPIKE,SUB=(float(x) for x in sys.argv[-5:-1]); OUT=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/home/claude/fighting-game-mobile/public/assets/chars/aura.glb')
for o in list(bpy.data.objects):
    if o.name=='Icosphere': bpy.data.objects.remove(o)
m=bpy.data.objects['Aura']; me=m.data
HAIR,MASK=1,2
hv=set(); mv=set()
for p in me.polygons:
    if p.material_index==HAIR: hv.update(p.vertices)
    if p.material_index==MASK: mv.update(p.vertices)
C=Vector((0.0,0.035,2.53)); ZTOP=2.74
def ss(a,b,x): t=min(1,max(0,(x-a)/(b-a))); return t*t*(3-2*t)
# --- pelo
for i in hv:
    v=me.vertices[i]; d=v.co-C; r=d.length
    k=1+VOL*(0.45+0.9*ss(0.15,0.27,r)) + SPIKE*ss(0.19,0.29,r)      # puntas: se alargan en su dirección
    d2=d*k
    d2.z += VOL*0.45*ss(0.08,0.24,d.z) + SPIKE*0.25*ss(0.16,0.26,d.z)  # copete alto y picos arriba
    if d2.y>0: d2.y*=1-0.16*ss(0.04,0.16,d2.y)*(1-ss(0.20,0.30,r))   # menos masa en la parte de atrás (no en las puntas)
    p=C+d2
    side=ss(0.09,0.20,abs(p.x)); front=ss(0.0,0.10,-p.y)*(1-ss(0.10,0.18,abs(p.x))); back=ss(0.08,0.20,p.y)
    f=1+0.55*side+0.12*front+0.22*back
    if p.z<ZTOP: p.z=ZTOP-(ZTOP-p.z)*f
    p.y-=0.025*front
    v.co=p
# --- máscara: más estrecha y con la barbilla más larga (huevo)
ZC=2.45
for i in mv:
    v=me.vertices[i]; v.co.x*=0.90
    if v.co.z<ZC: v.co.z=ZC-(ZC-v.co.z)*1.04
for i in hv|mv: me.vertices[i].co.z+=LIFT
# barbilla más suave: en el último cuarto de la máscara se ensancha un poco y la punta sube
zs=[me.vertices[i].co.z for i in mv]; zmin=min(zs); zb=zmin+0.09
for i in mv:
    v=me.vertices[i]; t=ss(zb,zmin,v.co.z)
    v.co.x*=1+0.32*t; v.co.z+=0.012*t*t
# --- cuello corto en sombra (etiqueta grafito), pesado Neck→Head
bm=bmesh.new(); r=0.066; z0=2.20; z1=2.36+LIFT
bmesh.ops.create_cone(bm, cap_ends=False, segments=16, radius1=r*1.05, radius2=r, depth=z1-z0)
bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((0,0.03,(z0+z1)/2)))
neck=bpy.data.meshes.new('neck'); bm.to_mesh(neck); bm.free()
no=bpy.data.objects.new('neck',neck); bpy.context.scene.collection.objects.link(no)
no.data.materials.append(me.materials[0])
for n in ('Neck','Head'): no.vertex_groups.new(name=n)
for v in neck.vertices:
    t=ss(z0,z1,v.co.z); no.vertex_groups['Neck'].add([v.index],1-t,'REPLACE'); no.vertex_groups['Head'].add([v.index],t,'REPLACE')
ca=neck.color_attributes.new('Color','BYTE_COLOR','CORNER')
for c in ca.data: c.color=(3.5/16,0,0,1)
for p in neck.polygons: p.use_smooth=True
# --- separar pelo y máscara, suavizar (subdivisión) y volver a unir
bpy.ops.object.select_all(action='DESELECT'); m.select_set(True); bpy.context.view_layer.objects.active=m
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
bpy.ops.object.mode_set(mode='OBJECT')
for p in me.polygons: p.select = p.material_index in (HAIR,MASK)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
head=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('Aura.')][0]
bpy.ops.object.select_all(action='DESELECT'); head.select_set(True); bpy.context.view_layer.objects.active=head
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0004); bpy.ops.object.mode_set(mode='OBJECT')
if SUB>0:
    sm=head.modifiers.new('sub','SUBSURF'); sm.levels=int(SUB); sm.render_levels=int(SUB); sm.boundary_smooth='PRESERVE_CORNERS'
    bpy.ops.object.modifier_move_to_index(modifier='sub', index=0)
    bpy.ops.object.modifier_apply(modifier='sub')
for p in head.data.polygons: p.use_smooth=True
# etiquetas: la subdivisión mezcla los colores; se vuelven a cuantizar a la zona más cercana
for c in head.data.color_attributes['Color'].data:
    z=round(c.color[0]*16-0.5); c.color=((max(0,min(15,z))+0.5)/16,0,0,1)
bpy.ops.object.select_all(action='DESELECT')
for o in (m,head,no): o.select_set(True)
bpy.context.view_layer.objects.active=m; bpy.ops.object.join()
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
bpy.ops.object.select_all(action='DESELECT'); m.select_set(True); arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_animations=False, export_skins=True, export_vertex_color='ACTIVE', export_extras=True)
print('OK', len(m.data.vertices))
