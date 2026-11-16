# Aura — ficheros fuente 3D (para retoque)

Generados con el pipeline de [CHARACTER_PIPELINE.md](../../character-documentation/CHARACTER_PIPELINE.md). Todo es arte propio derivado del concept de NEÓN; TRELLIS.2 es MIT.

| Fichero | Qué es | Uso |
|---|---|---|
| `aura_01_trellis2_raw.glb` | Salida directa de TRELLIS.2 (~1 M tris, color por vértice) | Referencia de forma; no editar |
| `aura_02_recolor_highpoly.blend` | Alta poligonal con la hoja de giro reproyectada (`Col`) | Base para cambiar la proyección |
| `aura_03_flat_highpoly.blend` | Alta con color plano por paleta (`Col`), original (`Col_src`) y zonas (`LblCol`) | Repintar color plano (Vertex Paint) |
| `aura_04_lowpoly.blend` + `_color.png` | 30 k tris, UV, textura 1024, materiales `Aura_ropa/pelo/mascara/piel` | **Punto de partida para retopo, máscara y pelo** |
| `aura_05_rig.blend` | Malla baja con esqueleto del juego y pesos corregidos | Pintar pesos / exportar al juego |

En juego: `public/assets/chars/aura.glb` (= `_05_rig` exportado) y `aura_anims.glb` (44 clips). Probar con `index.html?aura3d`.

**Reglas al exportar:** conservar los nombres de hueso y de material (el material elige el preset de cel-shading), +Y arriba, escala aplicada, ≤ 30 k triángulos. Trabajar en rama + PR.
