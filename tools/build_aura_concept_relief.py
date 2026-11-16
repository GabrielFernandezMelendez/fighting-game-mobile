#!/usr/bin/env python3
"""Experimental Aura SIDE-VIEW CONCEPT RELIEF — NOT A RIGGED 3D CHARACTER.

This projects the approved side-view concept onto a shallow curved mesh. It is
a fidelity reference for comparing Blender work, NOT a production model.
Requires: pip install numpy pillow opencv-python trimesh
Run:
 python tools/build_aura_concept_relief.py \
   --source public/assets/previews/aura_concept_v3.png \
   --output public/assets/previews/aura-concept-relief.glb

The source must be the 1672x941 V3 concept sheet. Model points toward +Z,
the viewing camera is on +X and the model is about 2.76 units tall.
"""
from pathlib import Path
import argparse
import numpy as np
import cv2
import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals


def make_relief(source: Path, output: Path):
    image = Image.open(source).convert("RGB")
    if image.size != (1672, 941):
        raise ValueError(f"Expected approved 1672×941 V3 sheet; found {image.size}")
    sheet = np.asarray(image)
    # Review side-profile region from the approved V3 sheet. Adjust only after
    # reviewing a new source image; this crop is NOT a generic segmentation tool.
    x0, y0, x1, y1 = 891, 79, 1008, 512
    crop = sheet[y0:y1, x0:x1].copy()
    h, w = crop.shape[:2]

    mask = np.full((h, w), cv2.GC_PR_BGD, dtype=np.uint8)
    mask[:7, :] = cv2.GC_BGD
    mask[-5:, :] = cv2.GC_BGD
    mask[:, :5] = cv2.GC_BGD
    mask[:, -5:] = cv2.GC_BGD
    for x, y, r in [(64,46,16), (61,101,14), (65,157,19),
                    (55,233,14), (55,307,18), (60,365,18)]:
        cv2.circle(mask, (x, y), r, cv2.GC_FGD, -1)
    outline = np.array([
        [42,22],[60,7],[82,18],[101,37],[92,94],[85,124],
        [100,156],[94,206],[92,258],[105,306],[100,371],
        [85,418],[32,425],[18,392],[35,315],[30,236],
        [34,153],[26,114],[41,70]
    ], dtype=np.int32)
    cv2.fillPoly(mask, [outline], cv2.GC_PR_FGD)
    cv2.grabCut(cv2.cvtColor(crop, cv2.COLOR_RGB2BGR), mask, None,
                np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 9, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
                     255, 0).astype("uint8")
    num, labels, stats, _ = cv2.connectedComponentsWithStats(alpha, 8)
    filtered = np.zeros_like(alpha)
    for n in range(1, num):
        if stats[n, cv2.CC_STAT_AREA] > 90:
            filtered[labels == n] = 255
    alpha = cv2.GaussianBlur(filtered, (3, 3), 0.65)
    rgba = np.dstack([crop, alpha])
    texture = Image.fromarray(rgba, "RGBA")

    # Curved relief: subtle convex X-depth from silhouette distance.
    step = 4  # reviewed preview quality; fewer triangles, same full-res texture
    grid_w = (w - 1) // step + 1
    grid_h = (h - 1) // step + 1
    xs = np.linspace(0, w - 1, grid_w)
    ys = np.linspace(0, h - 1, grid_h)
    dist = cv2.distanceTransform((alpha > 100).astype("uint8"),
                                 cv2.DIST_L2, 3)
    height = 2.76
    width = height * w / h
    vertices, uvs, faces = [], [], []
    for back in (False, True):
        for py in ys:
            for px in xs:
                depth = 0.035 + 0.135 * np.tanh(dist[int(py),int(px)] / 10.0)
                vertices.append([
                    depth if not back else -0.8 * depth,
                    height * (1 - py / h),
                    width * (px / w - 0.5),
                ])
                uvs.append([px/(w - 1), 1 - py/(h - 1)])
    layer = grid_w * grid_h
    for row in range(grid_h - 1):
        for col in range(grid_w - 1):
            a = row*grid_w+col
            b, c, d = a+1, a+grid_w, a+grid_w+1
            faces.extend([[a,b,c],[b,d,c],
                          [layer+a,layer+c,layer+b],
                          [layer+b,layer+c,layer+d]])
    mesh = trimesh.Trimesh(
        vertices=np.array(vertices, dtype=np.float32),
        faces=np.array(faces, dtype=np.int32),
        process=False,
    )
    mesh.visual = TextureVisuals(
        uv=np.array(uvs, dtype=np.float32),
        material=PBRMaterial(
            baseColorTexture=texture,
            alphaMode="BLEND",
            doubleSided=True,
            roughnessFactor=1,
            metallicFactor=0,
        ),
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(output)
    print(f"Created {output} ({len(vertices)} vertices); NOT a rigged character")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path,
                        default=Path("public/assets/previews/aura_concept_v3.png"))
    parser.add_argument("--output", type=Path,
                        default=Path("public/assets/previews/aura-concept-relief.glb"))
    args = parser.parse_args()
    make_relief(args.source, args.output)
