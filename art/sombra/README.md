# Sombra — ficheros fuente 3D (para retoque)

Generados con el pipeline de [CHARACTER_PIPELINE.md](../../character-documentation/CHARACTER_PIPELINE.md) (`CHAR=sombra`), igual que Aura. Lámina: `character-documentation/references/sombra/sombra_sheet_v1_rgb.png`.

| Fichero | Qué es | Uso |
|---|---|---|
| `sombra_01_trellis2_raw.glb` | Salida directa de TRELLIS.2 desde la vista frontal (~1 M tris) | Referencia de forma; no editar |
| `sombra_02_recolor_highpoly.blend` | Alta poligonal con frente, espalda y perfil de la lámina reproyectados (`Col`) | Base para cambiar la proyección |
| `sombra_03_flat_highpoly.blend` | Alta con color plano por zonas (`Col`), original (`Col_src`) y zonas (`LblCol`) | Repintar zonas (Vertex Paint) |
| `sombra_04_lowpoly.blend` + `_color.png` | 30 k tris, zona por vértice, materiales `Sombra_ropa/piel/capucha` | **Punto de partida para retopo y retoque** |
| `sombra_05_rig.blend` | Malla baja con esqueleto del juego ajustado a sus brazos y piernas | Pintar pesos / exportar al juego |
| `sombra_prototype.blend` / `.glb` | Prototipo modelado a mano (PR #17), sustituido por la malla de TRELLIS | Referencia histórica |

En juego: `public/assets/chars/sombra.glb` y `sombra_anims.glb` (44 clips retargeteados a su esqueleto). Probar con `index.html?sombra3d` (o `?aura3d`, que activa ambas).

**Regenerar:**
```bash
VIEWS=sombra_ ORANGE_FIX=0 python tools/bl_aura_recolor.py art/sombra/sombra_01_trellis2_raw.glb character-documentation/references/sombra out/sombra_recolor
CHAR=sombra python tools/bl_aura_flatcolor.py -- out/sombra_recolor.blend out/sombra_flat.blend
CHAR=sombra RETOPO=voxel python tools/bl_aura_retopo.py -- out/sombra_flat.blend out/sombra_lo 15000 0.0025 1024
CHAR=sombra python tools/bl_aura_rig.py -- out/sombra_lo.blend out/sombra_rig
TARGET=out/sombra_rig.blend ANIMS_NAME=sombra_anims.glb python tools/bl_retarget.py out
```

**Pendiente para un artista:** la franja carmesí del pantalón se pierde en la malla de 30 k (zona demasiado fina); el hueco negro de la capucha es pequeño; el chaleco tiene algo de ruido de correas.
