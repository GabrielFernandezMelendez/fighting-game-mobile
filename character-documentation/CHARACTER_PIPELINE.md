# NEÓN — Pipeline de creación de personajes 3D (concept → juego)

Guía completa y reproducible del proceso usado con **Aura** (noviembre 2026). Sirve para crear los siguientes personajes y para que un artista retome cualquier paso a mano.
Estado: **prueba de producción**. Aura 3D solo se activa con `?aura3d`; sin el parámetro el juego usa el modelo anterior.

---

## 0. Resumen del flujo

```
concept (hoja de giro)                      character-documentation/references/<pj>/
  │  F0  aislar vistas (segmentación)       tools/prep_concept_views.py
  ▼
imagen → 3D (TRELLIS.2, MIT)                art/<pj>/..._01_trellis2_raw.glb
  │  F2a reproyectar color de la hoja       tools/bl_aura_recolor.py
  ▼
alta poligonal con color                    art/<pj>/..._02_recolor_highpoly.blend
  │  F3  color plano por paleta + zonas     tools/bl_aura_flatcolor.py
  ▼
alta poligonal plana + etiquetas            art/<pj>/..._03_flat_highpoly.blend
  │  F2b vóxeles → 30k tris, UV, bake,      tools/bl_aura_retopo.py
  │      materiales por zona
  ▼
baja poligonal                              art/<pj>/..._04_lowpoly.blend (+ _color.png)
  │  F5  esqueleto + pesos                  tools/bl_aura_rig.py
  ▼
modelo riggeado                             art/<pj>/..._05_rig.blend → public/assets/chars/<pj>.glb
  │  F6  44 clips UAL retargeteados         tools/bl_retarget.py → public/assets/chars/<pj>_anims.glb
  ▼
F4/F7 juego: cel shader + contorno + VFX    public/js/models.js, render.js, vfx.js
```

Otros personajes: los scripts leen `CHAR=<pj>` y `tools/neon_chars.py` (ver `art/sombra/README.md` para los comandos de Sombra).

Herramientas: Blender 4.x/5.x (`bpy`, se ejecuta sin interfaz), Python 3 con `numpy`, `onnxruntime` (solo F0), navegador para TRELLIS.2.
Licencias: TRELLIS.2 (MIT) ✅. **Hunyuan3D descartado**: su licencia excluye la UE. Meshy gratuito no permite descargar. No usar assets de otros juegos.

---

## 1. F0 — Referencias aisladas
- Entrada: hoja de giro del concept (frontal, lateral, espalda en pose A, fondo liso).
- `python tools/prep_concept_views.py --sheet <hoja.png> --model isnet-anime.onnx --out character-documentation/references/<pj> --name <pj>` recorta cada vista y quita el fondo (instrucciones de descarga del modelo en la cabecera del script).
- Criterio: cada vista centrada, sin texto, sin solaparse con otras figuras. Los generadores imagen→3D fallan con hojas de varias poses (salen "partes deformadas").

## 2. F1 — Imagen → 3D
- TRELLIS.2 en Hugging Face Spaces (requiere sesión iniciada para la cuota ZeroGPU). Subir **solo la vista frontal aislada**.
- Descargar el GLB (≈12 MB, ~1 M triángulos, color por vértice). Guardarlo en `art/<pj>/`.
- Revisar: silueta, pelo, máscara, que no haya fusiones grandes entre brazos y torso.

## 3. F2a — Reproyección de color
`python tools/bl_aura_recolor.py <raw.glb> character-documentation/references/<pj>/turnaround out/<pj>_recolor`
- TRELLIS inventa la espalda y los laterales; el script proyecta la hoja de giro sobre la malla con un z-buffer por vértice (solo colorea lo que cada cámara ve de verdad).
- Salida: atributo de color `Col` en la malla alta.

## 4. F3 — Color plano (sin manchas)
`python tools/bl_aura_flatcolor.py -- out/<pj>_recolor.blend out/<pj>_flat.blend`
- **Por qué**: el color proyectado trae sombras e iluminación horneadas de la ilustración. Con cel-shading encima salen "manchas" (sombra dibujada + sombra del shader).
- Cuantiza cada vértice a la **paleta del concept** en espacio Lab (luminosidad con peso 0,45 para que una sombra horneada no cambie de color).
- **Reglas por zona de diseño** (altura normalizada `zn`, posición `x`): pantalón no puede ser gris/grafito salvo la correa; chaqueta no puede ser gris; piel solo en abdomen y dedos; cabeza = pelo, cara = máscara; botas = grafito.
- 6 pasadas de votación entre vecinos para quitar islas sueltas.
- Escribe `Col` (plano), `Col_src` (original) y `LblCol` (etiqueta de zona codificada en el canal rojo, `(id+0,5)/16`).
- Para otro personaje: copiar el script, cambiar `PALETTE` y las reglas de zona. Revisar con `dev_f1_compare.html`.

Regla de manos: en la zona de la mano solo hay guante grafito, acento naranja y dedos de piel (nada gris ni beige).

Paleta de Aura: chaqueta `#E8DACB`, pantalón `#8E7686`, gris `#776471`, grafito `#3B313E`, negro `#1B171F`, naranja `#FF7A1A`, pelo `#E3D9EE`, máscara `#D5CFD3`, piel `#E2B39E`, metal `#A6A1AA`.

## 5. F2b — Malla de juego
`RETOPO=voxel python tools/bl_aura_retopo.py -- out/<pj>_flat.blend out/<pj>_lo 15000 0.0025 1024`
- Remallado por vóxeles (2,5 mm) → limpieza de islas → decimado a **30 k triángulos** (presupuesto móvil).
- QuadriFlow (cuadriláteros) se intentó también en Blender de escritorio: se cancela con esta topología. Queda como trabajo manual.
- Smart UV + bake EMIT de `Col` a una textura 1024.
- **Zona por vértice** (`COLOR=label`, por defecto): cada vértice guarda su zona en `COLOR_0.r` (`(zona+0,5)/16`) y el GLB lleva `extras.neon_palette` y `neon_zones`. En el juego, `prepareLabels` y el cel shader eligen la zona por píxel y dibujan la tinta en la frontera.
- **Color plano por cara** (`COLOR=face`, anterior): cada triángulo recibe un único color de la paleta (mayoría de las 7 etiquetas más cercanas de la malla alta), con limpieza de caras sueltas e islas pequeñas. Se exporta como `COLOR_0`: bordes duros, sin el difuminado de una textura de 1024. Los colores de pantalla son las muestras de la lámina (`DISPLAY`), más saturadas que la proyección. `COLOR=bake` vuelve a la textura horneada (que se sigue guardando para artistas).
- **Normales suavizadas** (`NORMALS=smooth`, por defecto): difusión de normales por la conectividad (12 pasadas) y normales personalizadas. Así la frontera luz/sombra del cel shader sigue los volúmenes grandes y no los triángulos (técnica habitual en anime 3D).
- **Materiales por zona**: transfiere `LblCol` por vecino más cercano y asigna cada cara por mayoría a `Aura_ropa`, `Aura_pelo`, `Aura_mascara` o `Aura_piel` (comparten textura). El nombre del material decide el preset del cel shader en el juego.

## 6. F5 — Rig y pesos
`python tools/bl_aura_rig.py -- out/<pj>_lo.blend out/<pj>_rig`
- Esqueleto con los **nombres de hueso del rig del juego** ajustado a la pose A del personaje → mismos sockets de arma y mismos clips.
- Pesos automáticos (bone heat) + reglas `LEG_WEIGHTS` (por defecto activas):
  1. El peso del tronco por debajo de la entrepierna pasa a la pierna más cercana (el pantalón ancho se estiraba como falda).
  2. **Separación mano/pierna**: cada vértice conserva solo los huesos del brazo o de la pierna, el grupo que tenga más cerca (las manos junto al muslo contaminaban los pesos → "espinas" al saltar).
  3. Rodilla: mezcla muslo/espinilla a lo largo del eje cadera→tobillo; la tela por detrás de la pierna mezcla más abajo para que no la arrastre la espinilla.
  4. Glúteos: mezcla con `Body` detrás de la cadera. Suavizado y normalización.
- Validación: `vértices sin peso 0`, y estiramientos ≤ 8× en pose de salto (`Jump_Loop`).

## 7. F6 — Animaciones
`TARGET=out/<pj>_rig.blend ANIMS_NAME=<pj>_anims.glb python tools/bl_retarget.py out`
- Retargetea los 44 clips UAL. Si el esqueleto no cambia, `aura_anims.glb` sigue siendo válido aunque se rehaga la malla o los pesos.
- Pendiente (manual): clips propios pose a pose, a 2 frames, con poses pensadas para la cámara lateral (técnica de ASW, GDC 2015: animación limitada, deformación deliberada, orientación de cabeza/hombros por legibilidad).

## 8. F4/F7 — Integración en el juego
```bash
cp out/<pj>_rig.glb public/assets/chars/<pj>.glb
cp out/<pj>_anims.glb public/assets/chars/
```
- `render.js`: `AURA3D_OVERRIDE` (modelo, contorno 0,012, doble cara, altura, `cel: true`).
- `models.js`:
  - `MODEL_ANIMS` asocia el modelo con su juego de clips.
  - **Cel shader NEÓN** (`makeCel`, `CEL_PRESETS`): dos bandas duras con **color de sombra propio por material** (lavanda para ropa, más claro en pelo y máscara, rosado en piel), luz clave fija respecto a la cámara (sombras legibles en vista lateral) y rim con el color de acento.
  - Contorno de casco invertido con desplazamiento de profundidad (sin manchas negras en prendas finas). Aura: 0,016.
  - **Tinta interior de cómic** (`prepareInk` + `INK`): al cargar el GLB se marcan las aristas donde cambia el color plano (también entre materiales) y los pliegues de más de ~105°; el shader las dibuja a ~2 px con baricéntricas y `fwidth`. Se omiten junto a zonas casi negras (`minLuma`), donde no se verían.
- `vfx.js`: estela del arma con el color de acento, estrella de impacto plana y **polvo cel-shading** como en la lámina (dos tonos duros, corona de picos, lenguas afiladas hacia atrás, contorno de tinta y rayas de velocidad de cómic, 12 fps, se rompe en huecos). Revisión aislada: `public/dev_vfx.html`.

## 9. Revisión visual
- `public/dev_f1_compare.html?glb=<ruta>&outline=0`: 5 vistas de un GLB (color por vértice o textura).
- `public/anim_lab.html?char=aura&clips=Sword_Idle,Jump_Loop&double=1&cel=1&ol=0.012`: rejilla de clips con el shader del juego.
- `index.html?aura3d`: partida real (Práctica → Aura).
- Tests: `node test/combos.mjs && node test/moves.mjs && node test/online.mjs && node test/ui-shell.mjs && node test/dash.mjs`.

## 10. Entrega a un artista (retoque manual)
Los ficheros fuente están en `art/aura/` (ver su README). Orden recomendado de retoque, de mayor a menor impacto:
1. **Máscara y pelo como piezas** (`_04_lowpoly.blend`): ya tienen material propio; en Editar → seleccionar por material → `P` › Por selección. Remodelar la máscara con aristas limpias y el pelo en 15–25 mechones.
2. **Retopología** con loops en hombros, codos, rodillas y cadera (la malla actual es triangulada).
3. **UV limpias** y repintado plano a partir de la paleta.
4. Volver a riggear con `tools/bl_aura_rig.py` (o pintar pesos a mano conservando los nombres de hueso).
5. Exportar GLB (+Y arriba, escala aplicada, materiales `Aura_ropa/pelo/mascara/piel`) a `public/assets/chars/aura.glb` y probar con `?aura3d`.

Reglas: trabajar en rama + PR; no reemplazar el personaje jugable hasta validarlo; documentar cada cambio en `CHANGELOG.md`.
