"""F2a.2 — Color plano por zonas (paleta del concept) para el cel-shading.

La textura de imagen→3D trae sombras horneadas, ruido y mezclas: con toon se ven como manchas.
Este script asigna a cada vértice de la malla alta el color más cercano de la paleta oficial,
limpia las zonas con votación por vecinos y guarda:
  - "Col"     color plano (sustituye al anterior; el original queda en "Col_src")
  - "LblCol"  etiqueta de zona codificada en rojo (para separar pelo/máscara/piel en materiales)

  [CHAR=aura|sombra] python tools/bl_aura_flatcolor.py -- <entrada_recolor.blend> <salida.blend>

La paleta sale de tools/neon_chars.py; las reglas de zona de cada personaje están abajo.
"""
import bpy, sys
import numpy as np
args = sys.argv[sys.argv.index('--') + 1:]
src, out = args[0], args[1]

import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import neon_chars
C = neon_chars.get()                      # CHAR=aura|sombra (tools/neon_chars.py)
PALETTE = C['palette']
NAMES = [n for n, _ in PALETTE]
LABEL_ID = {n: i for i, n in enumerate(NAMES)}

def hex2rgb(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
def to_lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def to_srgb(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
def lab(rgb):   # sRGB 0..1 → CIELab aproximado
    l = to_lin(rgb); M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = l @ M.T / np.array([0.9505, 1.0, 1.089])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], 1)

bpy.ops.wm.open_mainfile(filepath=src)
obj = next(o for o in bpy.data.objects if o.type == 'MESH'); me = obj.data
nv = len(me.vertices)
col = np.empty(nv * 4, np.float32); me.color_attributes['Col'].data.foreach_get('color', col); col = col.reshape(-1, 4)[:, :3]
srgb = to_srgb(col)
co = np.empty(nv * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
zmin, zmax = co[:, 2].min(), co[:, 2].max(); zn = (co[:, 2] - zmin) / (zmax - zmin)   # 0 pies … 1 cabeza

pal = np.array([hex2rgb(h) for _, h in PALETTE]); pal_lab = lab(pal); v_lab = lab(srgb)
# la luminosidad pesa menos: la textura trae sombras horneadas que no deben cambiar de material
d = (((v_lab[:, None, :] - pal_lab[None]) * np.array([0.45, 1.0, 1.0])) ** 2).sum(-1)
# reglas de zona: pelo y máscara solo en la cabeza; piel no en la cabeza (la máscara la cubre)
ID = LABEL_ID; x, y = co[:, 0] / (zmax - zmin), co[:, 1] / (zmax - zmin)   # coordenadas relativas a la altura
def setw(mask, to): lbl[mask] = ID[to]
def ban(mask, names, cost=2e3):            # prohíbe zonas en una parte del cuerpo antes de clasificar
    for n in names: d[mask, LABEL_ID[n]] += cost
if C['name'] == 'aura':
    head = zn > 0.83
    d[~head, LABEL_ID['pelo']] += 2e3; d[~head, LABEL_ID['mascara']] += 2e3
    d[head, LABEL_ID['piel']] += 400; d[head, LABEL_ID['chaqueta']] += 300
    lbl = d.argmin(1)
    # reglas por zona del diseño (medidas sobre la hoja de giro)
    pants = (zn < 0.53) & (zn > 0.13)
    setw(pants & (lbl == ID['gris']), 'pantalon')                      # el pantalón es un solo tono
    setw(pants & (lbl == ID['metal']), 'pantalon')
    strap = (np.abs(x + 0.075) < 0.03) & (zn > 0.3)                    # correa colgante del muslo derecho
    setw((zn < 0.47) & (zn > 0.13) & ~strap & np.isin(lbl, [ID['grafito'], ID['negro']]), 'pantalon')  # pliegues oscuros = sombra horneada
    jacket = (zn > 0.56) & (zn < 0.83) & (np.abs(x) > 0.05)
    setw(jacket & np.isin(lbl, [ID['gris'], ID['metal']]), 'chaqueta')
    abdomen = (zn > 0.55) & (zn < 0.67) & (np.abs(x) < 0.08) & (y < 0.02)
    fingers = (np.abs(x) > 0.16) & (zn > 0.38) & (zn < 0.5)
    setw((lbl == ID['piel']) & ~abdomen & ~fingers, 'chaqueta')       # piel solo en abdomen y dedos
    face = head & (y < -0.01) & (zn < 0.935) & (np.abs(x) < 0.06)
    setw(head & ~face & np.isin(lbl, [ID['metal'], ID['gris'], ID['mascara'], ID['chaqueta']]), 'pelo')
    setw(face & np.isin(lbl, [ID['pelo'], ID['metal'], ID['chaqueta']]), 'mascara')
    # manos: guante sin dedos grafito (con acento naranja) + dedos de piel; nada gris/beige/violeta en la mano
    hand = (np.abs(x) > 0.158) & (zn > 0.37) & (zn < 0.47)
    setw(hand & np.isin(lbl, [ID['gris'], ID['metal'], ID['pantalon'], ID['chaqueta'], ID['negro']]), 'grafito')
    boots = zn < 0.13; soles = zn < 0.03
    setw(boots & ~soles & np.isin(lbl, [ID['chaqueta'], ID['piel'], ID['pantalon']]), 'grafito')
    setw(soles & np.isin(lbl, [ID['piel'], ID['pantalon'], ID['gris']]), 'chaqueta')


elif C['name'] == 'sombra':
    # medidas sobre la hoja de modelo de Sombra (zn 0 pies … 1 punta de la capucha)
    head = zn > 0.80
    face = head & (y < -0.03) & (np.abs(x) < 0.055) & (zn < 0.935) & (zn > 0.845)  # hueco negro de la capucha
    arms = (np.abs(x) > 0.115) & (zn > 0.42)                    # por debajo, lo ancho es el pantalón bombacho
    hands = arms & (zn < 0.50)
    bandage = arms & (zn >= 0.46) & (zn < 0.60)
    upperarm = arms & (zn >= 0.56)
    boots = zn < 0.13
    ban(head, ['piel', 'vendas', 'cuero', 'correa', 'tela', 'granate', 'metal', 'grafito'])
    ban(~(zn > 0.70), ['capucha'], 300)                         # la capucha/bufanda solo arriba
    ban(~bandage, ['vendas'], 250); ban(~(upperarm | hands), ['piel'], 400)
    lbl = d.argmin(1)
    setw(face & np.isin(lbl, [ID['negro'], ID['grafito'], ID['granate'], ID['tela']]), 'negro')
    setw(head & ~face & np.isin(lbl, [ID['negro'], ID['carmesi']]), 'capucha')
    pants = (zn > 0.13) & (zn < 0.52) & ~arms
    setw(pants & np.isin(lbl, [ID['granate'], ID['grafito'], ID['negro']]), 'tela')   # pliegues = sombra horneada
    torso = (zn >= 0.52) & (zn < 0.74) & ~arms
    setw(torso & np.isin(lbl, [ID['granate'], ID['negro']]), 'tela')
    setw(arms & ~bandage & ~hands & np.isin(lbl, [ID['tela'], ID['granate'], ID['negro']]), 'grafito')   # manguito oscuro
    setw(hands & ~np.isin(lbl, [ID['piel'], ID['vendas']]), 'grafito')                                  # guante sin dedos
    setw(bandage & np.isin(lbl, [ID['correa'], ID['piel']]), 'vendas')                                  # antebrazo vendado
    setw(upperarm & ~bandage & np.isin(lbl, [ID['correa'], ID['vendas'], ID['cuero']]), 'piel')        # hombro descubierto
    setw(boots & np.isin(lbl, [ID['tela'], ID['granate'], ID['negro'], ID['cuero']]), 'grafito')

# votación por vecinos para quitar manchas (6 pasadas)
E = np.empty(len(me.edges) * 2, np.int32); me.edges.foreach_get('vertices', E); E = E.reshape(-1, 2)
K = len(PALETTE)
for it in range(6):
    votes = np.zeros((nv, K), np.float32)
    np.add.at(votes, (E[:, 0], lbl[E[:, 1]]), 1); np.add.at(votes, (E[:, 1], lbl[E[:, 0]]), 1)
    votes[np.arange(nv), lbl] += 1.5            # el propio vértice pesa algo más
    lbl = votes.argmax(1)
counts = np.bincount(lbl, minlength=K)
print('ZONAS', {NAMES[i]: int(counts[i]) for i in range(K)})

flat = to_lin(pal[lbl])
if 'Col_src' not in me.color_attributes:
    src_attr = me.color_attributes.new('Col_src', 'FLOAT_COLOR', 'POINT')
    src_attr.data.foreach_set('color', np.hstack([col, np.ones((nv, 1), np.float32)]).ravel())
me.color_attributes['Col'].data.foreach_set('color', np.hstack([flat, np.ones((nv, 1), np.float32)]).ravel())
la = me.color_attributes.get('LblCol') or me.color_attributes.new('LblCol', 'FLOAT_COLOR', 'POINT')
enc = np.zeros((nv, 4), np.float32); enc[:, 0] = (lbl + 0.5) / 16; enc[:, 3] = 1
la.data.foreach_set('color', enc.ravel())
me.color_attributes.active_color = me.color_attributes['Col']
bpy.ops.wm.save_as_mainfile(filepath=out)
print('OK')
