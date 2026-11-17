# Genera public/assets/chars/aura_review.glb a partir de aura.glb SIN cambiar el diseño:
#  1) divide la malla en partes (pelo, máscara, piel de brazos, torso/abdomen, bufanda, chaqueta, mangas,
#     guantes, top, cinturón, pantalón, botas) según material, color de zona y hueso dominante;
#  2) alisa cada parte por separado (los bordes entre partes quedan fijos, así no se abren grietas);
#  3) cada parte lleva normales suaves propias: el sombreado no se mezcla entre partes, así los colores
#     y las bandas de luz de una zona no pisan a la vecina.
# Mismo número de huesos, pesos y clips; casi los mismos vértices (solo se duplican los bordes).
# Uso: python3 -c "import runpy,sys; sys.argv=['x','6','0.5','public/assets/chars/aura_review.glb']; runpy.run_path('tools/bl_aura_review.py')"
#      (pasadas de alisado, fuerza 0..1, salida). Si existe art/aura/aura_partes.blend, las partes salen de ahí
#      (corregidas a mano, ver character-documentation/AURA_PARTES_A_MANO.md); con salida .blend se genera ese archivo.
import bpy, bmesh, sys
from collections import defaultdict
ITER=int(sys.argv[-3]); FACT=float(sys.argv[-2]); OUT=sys.argv[-1]
SRC=__file__.rsplit('/tools/',1)[0]+'/public/assets/chars/aura.glb' if '/tools/' in __file__ else 'public/assets/chars/aura.glb'
import os
ROOT=__file__.rsplit('/tools/',1)[0] if '/tools/' in __file__ else '.'
PARTES=ROOT+'/art/aura/aura_partes.blend'     # archivo de partes que se puede corregir a mano en Blender
COLORES_VISTA={'pelo':(.85,.8,.95),'mascara':(.95,.93,.9),'bufanda':(1,.48,.1),'chaqueta':(.93,.84,.72),'mangas':(.75,.62,.5),
  'guantes':(.25,.22,.3),'top':(.12,.1,.16),'cinturon':(.55,.55,.6),'pantalon':(.55,.42,.58),'botas':(.3,.26,.34),
  'piel_brazos':(.93,.7,.6),'piel_torso':(.85,.6,.5)}
def auto_partes():
    global m, me, ca, gname, lab, props
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=SRC)
    for o in list(bpy.data.objects):
        if o.name=='Icosphere': bpy.data.objects.remove(o)
    m=bpy.data.objects['Aura']; me=m.data; arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
    ca=me.color_attributes['Color']; gname={g.index:g.name for g in m.vertex_groups}
    lab=lambda p: round(ca.data[p.loop_indices[0]].color[0]*16-0.5)
    def bone(p):
        w=defaultdict(float)
        for vi in p.vertices:
            for g in me.vertices[vi].groups: w[gname[g.group]]+=g.weight
        return max(w,key=w.get) if w else ''
    def part(p):
        mat=p.material_index; c=p.center; b=bone(p); L=lab(p)
        if mat==1: return 'pelo'
        if mat==2: return 'mascara'
        if mat==3: return 'piel_brazos' if any(k in b for k in ('Arm','Fist','Shoulder')) else 'piel_torso'
        if c.z<0.36: return 'botas'
        if 'Fist' in b or ('LowerArm' in b and c.z<1.40 and L!=0): return 'guantes'
        rad=((c.x)**2+(c.y-0.03)**2)**0.5
        # bufanda por forma: todo lo que rodea el cuello por encima de un borde en V (el escaneo mezcla capas de
        # chaqueta y bufanda ahí; por color salían islas marfil dentro y picos naranja fuera)
        if rad<0.25 and c.z>1.99+0.55*abs(c.x) + (0.08 if c.y>0.05 else 0.0): return 'bufanda'
        if L in (3,4,5) and c.z>1.98 and abs(c.x)<0.42: return 'chaqueta'   # manchas oscuras del escaneo sobre los hombros
        if 'Arm' in b: return 'mangas'
        if L==0: return 'chaqueta'
        if L==1: return 'pantalon'
        if L in (2,9) or (1.55<c.z<1.80): return 'cinturon'
        if c.z>1.80: return 'top'
        return 'pantalon'
    # 1) asignar cada cara a una parte y separar en objetos
    names=[]; idx=[]
    for p in me.polygons:
        n=part(p)
        if n not in names: names.append(n)
        idx.append(names.index(n))
    fm=me.attributes.new('parte','INT','FACE')
    for p,i in zip(me.polygons,idx): fm.data[p.index].value=i
    props={k:m[k] for k in m.keys()}
    objs=[]
    for i,n in enumerate(names):
        bpy.ops.object.select_all(action='DESELECT'); m.select_set(True); bpy.context.view_layer.objects.active=m
        if i==len(names)-1: o=m
        else:
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
            for v in me.vertices: v.select=False
            for e in me.edges: e.select=False
            for p in me.polygons:
                s=me.attributes['parte'].data[p.index].value==i; p.select=s
                if s:
                    for vi in p.vertices: me.vertices[vi].select=True
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
            o=[x for x in bpy.context.selected_objects if x!=m][0]
        o.name='Aura_'+n; objs.append(o)
    return objs, arm

if os.path.exists(PARTES) and not OUT.endswith('.blend') and '--auto' not in sys.argv:
    # partes corregidas a mano: se usan tal cual
    bpy.ops.wm.open_mainfile(filepath=PARTES)
    objs=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('Aura_')]
    arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
    props={k:objs[0][k] for k in objs[0].keys() if k.startswith('neon_')}
    print('partes desde', PARTES)
else:
    objs, arm = auto_partes()
if OUT.endswith('.blend'):
    # archivo para trabajar a mano: cada parte con un color de vista distinto (Sombreado sólido → Objeto)
    for o in objs:
        o.color=(*COLORES_VISTA.get(o.name[5:],(.5,.5,.5)),1)
        if 'parte' in o.data.attributes: o.data.attributes.remove(o.data.attributes['parte'])
    for scr in bpy.data.screens:
        for area in scr.areas:
            if area.type=='VIEW_3D':
                for sp in area.spaces:
                    if sp.type=='VIEW_3D': sp.shading.type='SOLID'; sp.shading.color_type='OBJECT'
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT)
    print('OK partes guardadas en', OUT); raise SystemExit
# Ajustes por parte (se trabajan por separado sin tocar a las vecinas):
#  COLOR: la parte entera pasa a una sola zona de color (adiós a manchas de otras zonas del escaneo)
#  ALISADO: pasadas extra para las partes con la superficie más irregular
ZONAS=dict(chaqueta=0,pantalon=1,gris=2,grafito=3,negro=4,naranja=5,pelo=6,mascara=7,piel=8,metal=9)
COLOR={'Aura_chaqueta':'chaqueta','Aura_mangas':'chaqueta','Aura_bufanda':'naranja','Aura_top':'negro'}
ALISADO={'Aura_chaqueta':4.0,'Aura_mangas':3.0,'Aura_bufanda':3.0}
# 2) alisado por parte con el borde fijo  3) normales suaves por parte
for o in objs:
    if o.name in COLOR:
        z=ZONAS[COLOR[o.name]]; caP=o.data.color_attributes['Color']
        for c in caP.data: c.color=((z+0.5)/16,0,0,1)
    for k,v in props.items(): o[k]=v
    bm=bmesh.new(); bm.from_mesh(o.data)
    inner=[v for v in bm.verts if not v.is_boundary]
    for _ in range(int(ITER*ALISADO.get(o.name,1))): bmesh.ops.smooth_vert(bm, verts=inner, factor=FACT, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(o.data); bm.free()
    for p in o.data.polygons: p.use_smooth=True
    if 'parte' in o.data.attributes: o.data.attributes.remove(o.data.attributes['parte'])
    print(o.name, len(o.data.vertices))
bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.select_set(True)
arm.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_animations=False, export_skins=True, export_vertex_color='ACTIVE', export_extras=True)
print('OK', sum(len(o.data.vertices) for o in objs))
