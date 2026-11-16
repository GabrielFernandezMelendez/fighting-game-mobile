# NEÓN — Guía del estilo gráfico (cel-shading + tinta de cómic)

**Para quién:** diseñadores y artistas del juego (partes 1–4) y agentes de IA que creen o retoquen un personaje (parte 5).
**Estado:** estilo validado con **Aura** (noviembre 2026). Aura 3D se ve con `?aura3d`; el resto del roster sigue con los modelos anteriores.
**Documentos relacionados:**
- [CHARACTER_PIPELINE.md](CHARACTER_PIPELINE.md): comandos detallados de cada script.
- [AURA_PIPELINE_3D.md](AURA_PIPELINE_3D.md): historia y resultados del caso Aura.
- `art/aura/README.md`: ficheros fuente para retocar.

---

## 1. El estilo en una frase

**Anime de lucha 2.5D:** colores planos de paleta, dos tonos de luz duros, contorno exterior y líneas de tinta interiores, efectos dibujados a mano (no partículas realistas), todo pensado para leerse desde una **cámara lateral** en un móvil.

Referencias de dirección: Guilty Gear Xrd (técnicas de ASW, GDC 2015), 2XKO, MARVEL Tōkon. Arte siempre propio; no copiar assets ni personajes.

### Pilares (lo que nunca se rompe)
| Pilar | Qué significa | Dónde vive en el código |
|---|---|---|
| **Color plano** | Cada zona tiene **un** color de paleta. Sin degradados, sin sombras pintadas en la textura. | Atributo de color por cara del GLB (`COLOR_0`) |
| **Dos tonos de luz** | Luz y sombra con un corte duro. La sombra tiene **color propio por material** (lavanda, rosado…), nunca gris ni negro. | `makeCel` + `CEL_PRESETS` en `public/js/models.js` |
| **Tinta** | Contorno exterior grueso y líneas finas (~2 px) donde cambia el color o hay un pliegue fuerte. | Contorno: `outlineMaterial`. Tinta interior: `prepareInk` + `INK` |
| **Silueta legible** | De perfil se distinguen cabeza, torso, brazos, piernas y arma. | Diseño + contorno + tinta |
| **Efectos cartoon** | Polvo, estelas e impactos planos, de 2 tonos, con tinta, a 12 fps. | `public/js/vfx.js` |
| **Rendimiento móvil** | ≤ 30 k triángulos por personaje, sin texturas grandes y sin posprocesado. | Pipeline (F2b) |

---

## 2. Qué debe entregar el diseño (concept)

Una **hoja de personaje** como `references/aura/aura_sheet_v3_rgb.png`:

1. **Vistas de giro** en pose A, fondo liso y oscuro, sin solaparse: frente, lateral, 3/4 frente, 3/4 espalda y espalda.
   - Imprescindible: la **frontal aislada**, que es la que entra en la IA imagen→3D.
2. **Paleta de materiales** con muestras planas y su nombre (CHAQUETA, PANTALÓN, ACENTO, PRIMARIO, MÁSCARA…).
   - Las muestras **son la verdad del color**: el juego usa esos valores, no los de la ilustración.
3. **Detalles**: guantes, botas, hebillas, máscara y pelo de cerca, para resolver dudas de zona.
4. **Poses de referencia**: idle, guardia, avance (con su polvo), salto y ataque (con su estela). Definen los efectos.
5. **Color de acento** del personaje (Aura `#FF7A1A`). Se usa en la estela del arma, la estrella de impacto y el borde iluminado (rim).

### Reglas de diseño que facilitan el 3D
- **Zonas de color grandes y bien separadas.** Un detalle de menos de ~2 cm a escala real (botones, costuras) no sobrevive a 30 k triángulos: debe ir en el modelo como pieza o desaparecer.
- **Partes duras** (máscara, armadura, hebillas) con aristas limpias; **partes blandas** (pelo, bufanda, pantalón ancho) con formas grandes en punta.
- **Contraste de valor entre piezas que se tocan** (máscara clara / pelo claro → separarlos con tinta; ropa oscura junto a ropa oscura → cambiar una).
- **Manos**: decidir guante y piel por zonas (Aura: guante grafito sin dedos, acento naranja, dedos de piel).
- **Nada de texto, logos ni patrones finos** en la ropa.

---

## 3. Herramientas

| Herramienta | Para qué | Licencia / nota |
|---|---|---|
| **TRELLIS.2** (Hugging Face Space) | Imagen frontal → malla 3D con color | MIT ✅. Necesita sesión de HF (cuota ZeroGPU) |
| **Blender 5.x** (sin interfaz, `bpy`) | Recolor, color plano, retopo, UV, rig, retarget, exportar GLB | GPL. Los scripts están en `tools/` |
| **Python 3** + `numpy`, `Pillow`, `onnxruntime` | Scripts de pipeline; segmentación de vistas | — |
| **isnet-anime.onnx** | Recortar las vistas del concept | Ver cabecera de `tools/prep_concept_views.py` |
| **Three.js r170** | Juego: cel shader, tinta, contorno, VFX | MIT |
| **Universal Animation Library (UAL)** | 44 clips base retargeteados | Ver `CREDITOS.md` |
| **Playwright** (opcional) | Capturas automáticas de revisión | — |

**Descartadas:**
- **Hunyuan3D**: su licencia excluye la UE.
- **Meshy gratuito**: no deja descargar y falla con hojas de varias poses.
- **QuadriFlow**: se cancela con estas mallas.

---

## 4. Pasos (visión de diseñador)

```
 Concept ─► Vistas aisladas ─► IA imagen→3D ─► Color de la hoja ─► COLOR PLANO por zonas
                                                                     │
  Juego ◄─ Cel + tinta + VFX ◄─ Animaciones ◄─ Rig ◄─ Malla de juego (30 k, color por cara, normales suaves)
```

| # | Paso | Qué revisa el diseñador | Captura de control |
|---|---|---|---|
| 1 | Vistas aisladas | Recorte limpio, sin texto | `references/<pj>/<pj>_front_1024.png` |
| 2 | Imagen→3D | Silueta, pelo, máscara, brazos separados del torso | `dev_f1_compare.html` |
| 3 | Color de la hoja | La espalda y los laterales tienen el color correcto | `references/<pj>/f2/` |
| 4 | **Color plano** | Cada zona = un color de la paleta; sin manchas ni sombras pintadas | `references/<pj>/f3/f3_color_plano.png` |
| 5 | Malla de juego | Bordes de color nítidos, sombras en manchas grandes | `anim_lab.html?…&cel=1` |
| 6 | Rig | Sin picos en rodillas, codos ni hombros al saltar o atacar | `anim_lab.html` con `Jump_Loop`, `Sword_Regular_A` |
| 7 | En partida | Lectura de perfil, tinta, polvo, estela, cámara | `index.html?aura3d` (o el flag del personaje) |

### Qué parámetros puede pedir cambiar un diseñador (sin tocar el modelo)
- **Color de sombra y dureza por material:** `CEL_PRESETS` en `models.js`.
  - `shade`: color de la sombra (se multiplica por el color base).
  - `band`: dónde corta la luz; más alto = más sombra.
  - `rim`: intensidad del borde de acento.
  - El preset se elige por el **nombre del material** del GLB: `<Pj>_pelo`, `<Pj>_mascara`, `<Pj>_piel`; el resto usa `default`.
- **Tinta:** `INK` en `models.js`.
  - `color`, `width` (px a cada lado).
  - `minLuma`: por debajo de esa luminosidad no se dibuja tinta, porque no se vería.
  - `crease`: umbral de pliegue; más alto = más líneas.
- **Contorno exterior:** campo `outline` del personaje (Aura 0,016 en `AURA3D_OVERRIDE`, `render.js`).
- **Polvo:** `DUST_LIGHT`, `DUST_SHADE`, `DUST_FPS` y la forma en `DUST_FRAG`, en `vfx.js`.
  - Revisión aislada en `public/dev_vfx.html` (parámetros `?cols=6&bg=%23…`).
- **Paleta del modelo:** `DISPLAY` en `tools/bl_aura_retopo.py` (colores finales) y `PALETTE` en `tools/bl_aura_flatcolor.py` (colores para clasificar zonas).

### Valores de Aura (referencia)
| Zona | Color | Sombra (`shade`) |
|---|---|---|
| Chaqueta (marfil) | `#E7C6B3` | `#7b6d98` (default) |
| Pantalón (gris violeta) | `#8F6E89` | default |
| Acento gris / metal | `#91888E` / `#B3ABB4` | default |
| Primario grafito / negro | `#342D3A` / `#1E1A24` | default (sin tinta interior) |
| Naranja (acento) | `#FD7A02` | default |
| Pelo | `#DCCBF0` | `#9a8ac4`, band 0,22 |
| Máscara | `#D8D0D6` | `#a39db8`, band 0,28 |
| Piel | `#E7B49E` | `#c08680` |
| Tinta | `#140f1c`, 1 px por lado | — |
| Polvo | `#e2d5c5` / `#a28d82` + tinta `#0c0912` | — |

---

## 5. Guía para agentes: crear otro personaje

> Lee primero `character-documentation/README.md` (reglas del proyecto) y [CHARACTER_PIPELINE.md](CHARACTER_PIPELINE.md). Responde y documenta en español.

### 5.1 Reglas obligatorias
1. **Nunca trabajar en `main`.** Usar rama `feat/<pj>-…` y abrir un PR contra `main`. El responsable revisa y hace el merge.
2. **No sustituir al personaje jugable** hasta que el responsable lo valide. Usar un flag de URL (patrón `?aura3d` → `?<pj>3d`) con un override en `render.js`.
3. Antes de modificar una ficha (`<PJ>.md`), copiarla a `history/<PJ>-vX.Y.md`. Registrar cada cambio en `CHANGELOG.md`.
4. **No inventar resultados**: cada afirmación visual va con su captura en `references/<pj>/`. No decir que un GLB está validado si no se ha visto en partida.
5. Licencias: solo herramientas y assets compatibles (ver §3). Nada de assets de otros juegos.
6. Antes de cada PR, tests en verde:
   `node test/combos.mjs && node test/moves.mjs && node test/online.mjs && node test/ui-shell.mjs && node test/dash.mjs`
7. Antes de escribir código visual, enseñar maqueta o capturas y esperar aprobación. Los commits son checkpoints con mensaje descriptivo.

### 5.2 Checklist de producción (copiar al PR)
- [ ] **F0** Vistas aisladas en `references/<pj>/` (`tools/prep_concept_views.py`).
- [ ] **F1** GLB de TRELLIS.2 (vista frontal) en `art/<pj>/<pj>_01_trellis2_raw.glb`.
- [ ] **F2a** Recolor desde la hoja de giro (`tools/bl_aura_recolor.py` → copia como `bl_<pj>_recolor.py` si cambian las vistas).
- [ ] **F3** Color plano con `tools/bl_<pj>_flatcolor.py` (copia de la de Aura):
  - `PALETTE` = muestras de la hoja.
  - **Reglas de zona** propias: cabeza, cara, torso, piernas, botas, manos. Usan altura normalizada `zn` (0 pies, 1 cabeza) y `x`/`y` relativas a la altura.
  - Comprobar el reparto con el print `ZONAS`.
- [ ] **F2b** Malla de juego con `bl_aura_retopo.py`:
  - Ajustar `DISPLAY` (colores finales), `names` y los nombres de material `<Pj>_ropa/pelo/mascara/piel`.
  - Mantener `COLOR=face` y `NORMALS=smooth`.
  - Objetivo: **30 k triángulos**.
- [ ] **F5** Rig con `bl_aura_rig.py`:
  - **Mismos nombres de hueso** que el rig del juego.
  - Revisar `LEG_WEIGHTS` y la separación mano/pierna.
  - Validar `vértices sin peso 0` y probar `Jump_Loop` sin picos.
- [ ] **F6** Clips con `bl_retarget.py` (`TARGET=…`, `ANIMS_NAME=<pj>_anims.glb`); registrar en `MODEL_ANIMS` (`models.js`).
- [ ] **F7** Integración:
  - `public/assets/chars/<pj>.glb`.
  - Override en `render.js` con `{ model, outline: ~0.016, doubleSide: true, modelHeight, cel: true }` y el flag.
  - `CEL_PRESETS`: añadir presets si el personaje tiene zonas nuevas (p. ej. `armadura`).
- [ ] **VFX** Color de acento en `CHARS.<pj>.accent` (estela, impacto, rim); si el concept pide otro polvo o estela, ajustar `vfx.js` y revisar en `dev_vfx.html`.
- [ ] **Revisión** Capturas en `references/<pj>/f3/`:
  - `dev_f1_compare.html` (5 vistas).
  - `anim_lab.html?char=<pj>&clips=Sword_Idle,Sword_Regular_A,Jump_Loop&cel=1&double=1&ol=0.016`.
  - En partida con el flag.
- [ ] **Docs** CHANGELOG, `art/<pj>/README.md` con los ficheros fuente (raw, recolor, flat, lowpoly, rig).
- [ ] Tests en verde y PR con capturas.

### 5.3 Errores ya resueltos (no repetirlos)
| Síntoma | Causa | Solución |
|---|---|---|
| Manchas y colores sucios | Sombras de la ilustración dentro de la textura | Color plano por zonas (F3) + color por cara (`COLOR=face`) |
| Colores difuminados entre zonas | Textura de 1024 con UV automáticas | Color por cara, sin textura |
| Sombras en dientes de sierra | Normales de malla decimada | `NORMALS=smooth` (difusión de normales) |
| Manchas negras en prendas finas | El contorno atraviesa capas finas | Doble cara + `polygonOffset` y desplazamiento z en el contorno |
| Picos en rodillas o muslos al saltar | Pesos de la mano en el muslo; tela trasera siguiendo a la espinilla | Separación mano/pierna + mezcla de rodilla desplazada (`bl_aura_rig.py`) |
| Pantalón como falda | Pesos del pantalón en Body/Hips | `LEG_WEIGHTS` |
| Gris en la mano | Proyección mal clasificada | Regla de manos en F3 |
| Efectos más oscuros de lo esperado | `ShaderMaterial` sin conversión de color | `#include <colorspace_fragment>` |
| Tinta invisible o sucia en zonas negras | Línea oscura sobre color oscuro | `INK.minLuma` |

### 5.4 Límites conocidos (trabajo para un artista)
- La malla es triangulada (vóxeles + decimado): las líneas de color y tinta se ven algo dentadas de cerca. La solución es retopología a mano con loops en articulaciones.
- Máscara y pelo tienen material propio, pero son la misma malla: separarlos (Editar → por material → `P`) y remodelarlos.
- Animación: los clips UAL son genéricos. El estilo final pide poses clave propias a 2 frames, pensadas para la cámara lateral (deformación deliberada, orientación de cabeza y hombros por legibilidad, arcos del arma cuidados).
- Los scripts `bl_aura_*` llevan reglas propias de Aura. Para el siguiente personaje se copian y adaptan; generalizarlos (paleta y zonas en un JSON por personaje) es una mejora pendiente.

---

## 6. Glosario
- **Cel-shading:** sombreado en bandas duras, como dibujo animado.
- **Inverted hull:** contorno hecho con una copia de la malla, inflada y con las caras invertidas, en negro.
- **Tinta interior:** líneas dentro de la silueta. Aquí se calculan con coordenadas baricéntricas en el shader.
- **Color por cara:** cada triángulo tiene un color fijo; no hay textura.
- **Rim:** borde iluminado con el color de acento en el contorno del volumen.
- **Animación limitada:** cambiar el dibujo a 12 fps (o mantener poses) en lugar de interpolar a 60.
