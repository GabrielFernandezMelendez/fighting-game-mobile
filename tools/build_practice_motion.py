#!/usr/bin/env python3
"""Regenera motion-*.png/json a partir de los atlas hd-*.webp. Requiere Node, Pillow, NumPy y SciPy."""
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates, uniform_filter

ROOT = Path(__file__).resolve().parents[1]
ATLAS = ROOT / 'public/assets/practice'
TILE, FIELD, COLS = 384, 48, 12


def clip_pairs():
    js = """
        import { PRACTICE_CLIPS, poseId } from './public/js/practice-motion.js';
        const pairs = {};
        function collect(value, set) {
          if (Array.isArray(value) && value[0]?.atlas) {
            for (let i = 1; i < value.length; i++) {
              const a = poseId(value[i - 1]), b = poseId(value[i]);
              if (a !== b) set.add(a + '>' + b);
            }
          } else if (value && typeof value === 'object') {
            for (const child of Object.values(value)) collect(child, set);
          }
        }
        for (const [wk, clips] of Object.entries(PRACTICE_CLIPS)) {
          const set = new Set();
          collect(clips, set);
          pairs[wk] = [...set];
        }
        console.log(JSON.stringify(pairs));
    """
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], cwd=ROOT))


def channels(sprite, resolution):
    pixels = np.asarray(sprite.resize((resolution, resolution), Image.Resampling.BILINEAR), dtype=np.float32) / 255
    color, mask = pixels[..., :3], pixels[..., 3]
    luminance = color @ np.array([.29, .58, .13], dtype=np.float32)
    warmth = .5 + color[..., 0] - color[..., 2]
    return np.array([mask * .8, luminance * mask, warmth * mask * .55])


def field(source, target):
    # Lucas–Kanade piramidal. La silueta y el color limitan el movimiento
    # incluso sobre zonas con pocos detalles, como los paños en cel shading.
    flow = None
    for size in [16, 32, 64, 96]:
        src, dst = channels(source, size), channels(target, size)
        y, x = np.indices((size, size), dtype=np.float32)
        if flow is None:
            flow = np.zeros((2, size, size), dtype=np.float32)
        else:
            last = flow.shape[1]
            coord = [y * (last - 1) / (size - 1), x * (last - 1) / (size - 1)]
            flow = np.array([map_coordinates(axis, coord, order=1, mode='nearest') for axis in flow]) * size / last
        grad_y, grad_x = np.gradient(dst, axis=(1, 2))
        for _ in range(8):
            coords = [y + flow[1], x + flow[0]]
            gx, gy, warped = [
                np.array([map_coordinates(plane, coords, order=1, mode='constant') for plane in img])
                for img in [grad_x, grad_y, dst]
            ]
            error = src - warped
            # Mantiene el contorno alineado y penaliza asociaciones a través de la figura.
            def mean(a):
                return uniform_filter(a.sum(axis=0), size=5)
            xx, xy, yy = mean(gx * gx) + .001, mean(gx * gy), mean(gy * gy) + .001
            xe, ye = mean(gx * error), mean(gy * error)
            det = xx * yy - xy * xy
            delta = np.array([(yy * xe - xy * ye) / det, (xx * ye - xy * xe) / det])
            flow += np.clip(delta, -1.4, 1.4)
            flow = gaussian_filter(flow, (0, .77, .77))
    y, x = np.indices((FIELD, FIELD), dtype=np.float32)
    coordinates = [y * (size-1) / (FIELD-1), x * (size-1) / (FIELD-1)]
    dx, dy = [map_coordinates(axis, coordinates, order=1) / (size - 1) for axis in flow]
    return np.uint8(np.clip(np.rint(np.stack([dx, -dy, np.zeros_like(dx)], axis=2) * (127 / .36) + 128), 1, 255))


def main():
    images, fields = {}, {}

    def sprite(key):
        name, n = key.split('/')
        if name not in images:
            images[name] = Image.open(ATLAS / ('hd-' + name + '.webp')).convert('RGBA')
        row, col = divmod(int(n), 4)
        return images[name].crop((col*TILE, row*TILE, (col+1)*TILE, (row+1)*TILE))

    def vector(a, b):
        if (a, b) not in fields:
            fields[a, b] = Image.fromarray(field(sprite(a), sprite(b)))
        return fields[a, b]

    for weapon, pairs in clip_pairs().items():
        directions = {}
        index = {'cols': COLS, 'pairs': {}}
        for pair in pairs:
            a, b = pair.split('>')
            forward = directions.setdefault((a, b), len(directions))
            backward = directions.setdefault((b, a), len(directions))
            index['pairs'][pair] = [forward, backward]
        rows = (len(directions) + COLS - 1) // COLS
        atlas = Image.new('RGB', (COLS*FIELD, rows*FIELD), (128, 128, 128))
        for (a, b), slot in directions.items():
            row, col = divmod(slot, COLS)
            atlas.paste(vector(a, b), (col*FIELD, row*FIELD))
        atlas.save(ATLAS / ('motion-' + weapon + '.png'), optimize=True)
        (ATLAS / ('motion-' + weapon + '.json')).write_text(json.dumps(index, indent=2) + '\n', encoding='utf-8')
        print(weapon, len(pairs), atlas.size, flush=True)


if __name__ == '__main__':
    main()
