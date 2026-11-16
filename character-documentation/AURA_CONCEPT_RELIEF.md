# Aura V5 — Concept en PNG y relieve lateral 2.5D

**Fecha:** 2026-11-16
**Estado:** referencia visual implementada. **No es el modelo de personaje riggeado ni una animación de combate.**

## Objetivo

La vista 3D procedimental V3 no reproduce el nivel de detalle aprobado. Antes de modelar de nuevo, incorporamos **una referencia de calidad visible en el mismo visor**.

## Assets publicados

| Archivo | Función |
|---|---|
| `public/assets/previews/aura_concept_v3.png` | Concept V3 completo en PNG a **1672 × 941 px**, paleta de 256 colores optimizada (no contiene todos los bytes del original RGB) |
| `public/assets/previews/aura-concept-relief.glb` | **Relieve 2.5D** con textura de la vista lateral, sin esqueleto; se puede observar frontalmente desde la cámara lateral fija |
| `public/assets/previews/aura.json` | Manifiesto de carga: `previewType: "concept-relief"`, `productionModelUrl: null` |
| `tools/build_aura_concept_relief.py` | Script reproducible de extracción y malla con profundidad superficial a partir del PNG |

La imagen de mayor calidad se muestra en el panel **Concept aprobado** del visor. El GLB 2.5D toma la silueta lateral, pero **no debe confundirse con un modelo 3D animable**: es esencialmente arte plano sobre una superficie de profundidad reducida. Se integra a título de comparación, NO en el sistema de combate.

## Cómo se reproduce el relieve

```bash
python -m pip install numpy pillow opencv-python trimesh
python tools/build_aura_concept_relief.py \
  --source public/assets/previews/aura_concept_v3.png \
  --output public/assets/previews/aura-concept-relief.glb
```

El script usa un recorte definido para la imagen V3 aprobada y una segmentación GrabCut. Las máscaras deben validarse si cambia la imagen: no es una solución genérica de reconstrucción 3D.

## Objetivo de la siguiente fase: un modelo **real**

Para llegar al acabado cartoon de la lámina, necesitamos un artista/pipeline de Blender que genere:
1. **Topología orgánica:** rostro/máscara con forma, chaqueta y torso continuos, brazos y botas integrados, mechones de cabello moldeados, pliegues y hebillas volumétricos.
2. **Paleta y materiales authored:** marfil, blanco-lila, grafito, gris-violeta y naranja, con shading toon controlado por material y contornos de grosor seleccionados por cámara.
3. **Rig compatible con cuatro armas:** cuerpo/ropa separados de la daga; sockets para daga, espada, martillo y lanza.
4. **Animación lateral autoral:** Idle, Guard y ataque de daga con poses diseñadas para la cámara 2.5D, no movimiento por pivotes rígidos.
5. **Pruebas en móvil:** nivel de detalle, draw calls, memoria, antialiasing, silueta y lectura de hitboxes.

**Criterio de avance:** el primer GLB verdaderamente 3D debe superar al V3 en fidelidad y reconocerse desde la cámara de juego. Mientras tanto, el relieve del concept es el **objetivo visual** y no una solución para gameplay.

## Comparación y trazabilidad

En `Ajustes → Ver personaje Aura`, el visor carga inicialmente el relieve 2.5D. El botón **Comparar con V3** permite volver al antiguo blockout. También se puede cargar un GLB local para revisar una futura escultura. Para comparar detalle fino, abrir el PNG completo desde el panel de referencias.

Conservamos el historial en `character-documentation/history/`; las mecánicas y el modelo jugable no se modifican.
