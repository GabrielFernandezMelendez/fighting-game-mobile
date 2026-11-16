"""F2a — Corrige el color de la malla imagen→3D de Aura.

TRELLIS solo ve la vista frontal: inventa espalda y laterales y vira el naranja a amarillo.
Este script, por vértice:
  1. muestrea la textura original (válida sobre todo en el frente),
  2. proyecta las vistas BACK y LEFT de la hoja de giro (y LEFT en espejo para el lado derecho)
     según la normal y comprobando visibilidad con raycast,
  3. corrige los amarillos de la textura original hacia el naranja #FF7A1A,
y guarda el resultado como atributo de color "Col" en un .blend + un GLB de previsualización.

Uso:
  python tools/bl_aura_recolor.py <entrada.glb> <vistas_dir> <salida_sin_ext>
  vistas_dir debe contener aura_t_front_rgba.png, aura_t_back_rgba.png, aura_t_side_rgba.png

Otros personajes: VIEWS=sombra_ (prefijo de las vistas: <prefijo>front/back/side_rgba.png) y
ORANGE_FIX=0 para no tocar los amarillos (la corrección naranja es propia de Aura).
"""
import bpy, bmesh, sys, colorsys, os
import numpy as np
from mathutils import Vector

src, views_dir, out = sys.argv[-3], sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
obj = next(o for o in bpy.data.objects if o.type == 'MESH')
me = obj.data

# soldar costuras de UV para tener normales continuas (las UV de cada esquina se conservan)
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.to_mesh(me); bm.free(); me.update()
print('verts', len(me.vertices))

def img_np(img):
    w, h = img.size
    a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)                     # fila 0 = abajo (convención Blender)

# 1) color original por vértice desde la textura base
base = next(n.image for n in me.materials[0].node_tree.nodes if n.type == 'TEX_IMAGE' and n.image.name == 'Image_0')
tex = img_np(base); th, tw = tex.shape[:2]
uv = np.empty(len(me.loops) * 2, np.float32); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2)
lv = np.empty(len(me.loops), np.int32); me.loops.foreach_get('vertex_index', lv)
px = np.clip((uv[:, 0] % 1) * tw, 0, tw - 1).astype(int); py = np.clip((uv[:, 1] % 1) * th, 0, th - 1).astype(int)
lc = tex[py, px, :3]
nv = len(me.vertices)
orig = np.zeros((nv, 3), np.float32); cnt = np.zeros(nv, np.float32)
np.add.at(orig, lv, lc); np.add.at(cnt, lv, 1); orig /= np.maximum(cnt, 1)[:, None]

# corrección amarillo → naranja (trabajando en sRGB)
def to_srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.clip(c, 0, 1), 1 / 2.4) - 0.055)
def to_lin(c): return np.where(c <= 0.04045, c / 12.92, np.power((c + 0.055) / 1.055, 2.4))
s = orig.copy()   # img.pixels de imágenes de 8 bits ya están en sRGB
hsv = np.array([colorsys.rgb_to_hsv(*c) for c in s])
mask = (os.environ.get('ORANGE_FIX', '1') == '1') & (hsv[:, 0] > 30 / 360) & (hsv[:, 0] < 62 / 360) & (hsv[:, 1] > 0.45) & (hsv[:, 2] > 0.35)
hsv[mask, 0] = 24 / 360; hsv[mask, 1] = np.maximum(hsv[mask, 1], 0.85)
s = np.array([colorsys.hsv_to_rgb(*c) for c in hsv]); orig = to_lin(s).astype(np.float32)
print('naranja corregido en', int(mask.sum()), 'vértices')

# 2) proyección de las vistas dibujadas
co = np.empty(nv * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
nr = np.empty(nv * 3, np.float32); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
zmin, zmax = co[:, 2].min(), co[:, 2].max(); H = zmax - zmin

def load_view(name):
    im = bpy.data.images.load(f'{views_dir}/{name}'); a = img_np(im)[::-1]   # fila 0 = arriba
    al = a[:, :, 3]; ys, xs = np.where(al > 0.5)
    return a, (xs.min(), ys.min(), xs.max(), ys.max())


def project(view, horiz, depth, weight_axis, bin_px=4, tol=0.012):
    """Proyección ortográfica de una vista dibujada.
    depth: coordenada hacia la cámara (mayor = más cerca); visibilidad por z-buffer de vértices."""
    a, (x0, y0, x1, y1) = view
    sc = (y1 - y0) / H
    hc = (horiz.min() + horiz.max()) / 2
    uf = (x0 + x1) / 2 + (horiz - hc) * sc; vf = y0 + (zmax - co[:, 2]) * sc
    u, v = uf.astype(int), vf.astype(int)
    ok = (u >= 0) & (u < a.shape[1]) & (v >= 0) & (v < a.shape[0])
    uu, vv = np.clip(u, 0, a.shape[1] - 1), np.clip(v, 0, a.shape[0] - 1)
    col = a[vv, uu, :3]; al = a[vv, uu, 3] * ok
    # z-buffer por celdas
    bu, bv = uu // bin_px, vv // bin_px; key = bv * 10000 + bu
    front = {}
    order = np.argsort(key); ks = key[order]; ds = depth[order]
    uniq, idx = np.unique(ks, return_index=True)
    mx = np.maximum.reduceat(ds, idx)
    zb = dict(zip(uniq.tolist(), mx.tolist()))
    zmaxcell = np.array([zb[k] for k in key.tolist()], np.float32)
    vis = depth >= zmaxcell - tol
    facing = np.clip(weight_axis, 0, 1) ** 2 * al * vis
    print('  vista: mirando', int((weight_axis > 0.22).sum()), 'visibles', int(((weight_axis > 0.22) & vis).sum()))
    return to_lin(col).astype(np.float32), facing

VP = os.environ.get('VIEWS', 'aura_t_')
front_v = load_view(VP + 'front_rgba.png'); back_v = load_view(VP + 'back_rgba.png'); side_v = load_view(VP + 'side_rgba.png')
# el personaje mira a -Y; su izquierda es +X
cb, wb = project(back_v, -co[:, 0], co[:, 1], nr[:, 1])
cl, wl = project(side_v, co[:, 1], co[:, 0], nr[:, 0])
cr, wr = project(side_v, co[:, 1], -co[:, 0], -nr[:, 0])
wo = np.clip(-nr[:, 1], 0, 1) ** 2 + 0.03
W = wo + wb * 1.4 + (wl + wr) * 0.8
final = (orig * wo[:, None] + cb * (wb * 1.4)[:, None] + cl * (wl * 0.8)[:, None] + cr * (wr * 0.8)[:, None]) / W[:, None]
print('vértices con espalda proyectada', int((wb > 0.05).sum()), 'laterales', int(((wl + wr) > 0.05).sum()))

attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
attr.data.foreach_set('color', np.hstack([final, np.ones((nv, 1), np.float32)]).ravel())
me.color_attributes.active_color = attr
# material de previsualización que usa el color de vértice
mat = bpy.data.materials.new('AuraVC'); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']; ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Col'
nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 1
me.materials.clear(); me.materials.append(mat)
bpy.ops.wm.save_as_mainfile(filepath=out + '.blend')
bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=out + '.glb', use_selection=True, export_vertex_color='ACTIVE')
print('OK')
