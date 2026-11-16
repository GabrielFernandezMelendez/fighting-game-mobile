"""Recorta vistas individuales de una hoja de modelo y las aísla del fondo.

Motivo: los generadores imagen→3D (Meshy, Tripo, Hunyuan3D) interpretan una hoja
con muchas vistas como un único objeto y devuelven "partes deformadas". Necesitan
UNA vista por imagen, personaje centrado, fondo limpio.

Uso:
  pip install onnxruntime pillow numpy opencv-python-headless
  # modelo de segmentación anime (CC/MIT, ~170 MB):
  curl -L -o isnet-anime.onnx https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx
  python tools/prep_concept_views.py --sheet character-documentation/references/aura/aura_sheet_v3_rgb.png \
      --model isnet-anime.onnx --out character-documentation/references/aura --name aura

Las cajas de recorte son específicas de la hoja Aura V3 (1672x941). Para otra hoja,
pasa --boxes con JSON: '{"front":[x0,y0,x1,y1], ...}'.
Salida por vista: <name>_<vista>_rgba.png (alfa) y <name>_<vista>_1024.png (fondo blanco, 1024x1024).
"""
import argparse, json
import numpy as np, cv2, onnxruntime as ort
from PIL import Image

AURA_V3 = {'front': [700, 72, 905, 528], 'side': [900, 72, 1032, 528],
           'back': [1200, 72, 1365, 528], 'q34': [462, 72, 705, 528]}

def segment(sess, crop):
    w, h = crop.size; S = 1024; sc = S / max(w, h)
    r = crop.resize((int(w * sc), int(h * sc)), Image.LANCZOS)
    can = Image.new('RGB', (S, S), (30, 28, 38)); ox, oy = (S - r.width) // 2, (S - r.height) // 2; can.paste(r, (ox, oy))
    x = (np.asarray(can).astype(np.float32) / 255.0 - 0.5).transpose(2, 0, 1)[None]
    m = sess.run(None, {sess.get_inputs()[0].name: x})[0][0, 0]
    m = ((m - m.min()) / (m.max() - m.min() + 1e-8) * 255).astype(np.uint8)
    # conservar solo los fragmentos grandes (descarta restos de vistas/paneles vecinos)
    k, lab, st, _ = cv2.connectedComponentsWithStats((m > 60).astype(np.uint8))
    keep = np.zeros_like(m, bool); big = st[1:, cv2.CC_STAT_AREA].max() if k > 1 else 0
    for i in range(1, k):
        if st[i, cv2.CC_STAT_AREA] > 0.02 * big and st[i, cv2.CC_STAT_LEFT] < S * 0.8: keep |= lab == i
    keep = cv2.dilate(keep.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    rgba = can.convert('RGBA'); rgba.putalpha(Image.fromarray(np.where(keep, m, 0).astype(np.uint8)))
    return rgba.crop(rgba.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sheet', required=True); ap.add_argument('--model', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--name', default='aura')
    ap.add_argument('--boxes', default=None); ap.add_argument('--fill', type=float, default=0.88)
    a = ap.parse_args()
    boxes = json.loads(a.boxes) if a.boxes else AURA_V3
    sheet = Image.open(a.sheet).convert('RGB'); sess = ort.InferenceSession(a.model, providers=['CPUExecutionProvider'])
    for view, b in boxes.items():
        cut = segment(sess, sheet.crop(tuple(b)))
        sc = 1024 * a.fill / cut.height; cut = cut.resize((int(cut.width * sc), int(cut.height * sc)), Image.LANCZOS)
        cut.save(f'{a.out}/{a.name}_{view}_rgba.png', optimize=True)
        bg = Image.new('RGBA', (1024, 1024), (255, 255, 255, 255)); bg.alpha_composite(cut, ((1024 - cut.width) // 2, (1024 - cut.height) // 2))
        bg.convert('RGB').save(f'{a.out}/{a.name}_{view}_1024.png', optimize=True)
        print('ok', view, cut.size)

if __name__ == '__main__':
    main()
