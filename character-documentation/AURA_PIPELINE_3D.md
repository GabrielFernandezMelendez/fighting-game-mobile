# Aura — Pipeline 3D de producción (plan v2.0)

**Fecha:** 2026-11-16 · **Estado:** plan aprobable. Fase 0 completada; fases 1–7 pendientes.
**Sustituye como método principal a:** geometría procedural en Three.js (V1–V3, V6) y relieve 2.5D (V5), que quedan como referencias históricas.

## 1. Diagnóstico

| Enfoque probado | Resultado | Por qué no sirve como personaje final |
|---|---|---|
| Geometría procedural en Three.js (V1–V3, V6) | Pila de cilindros y elipsoides | Las formas del concept (mechones, máscara, pliegues, hebillas) son escultura; no se describen bien con primitivas ni con código |
| Relieve 2.5D (V5) | Fiel en color, plano | No tiene volumen real ni se puede riggear |
| Meshy con la hoja completa | "Partes deformadas" | La hoja tiene ~20 dibujos; el generador los mezcla en un único objeto |

**Conclusión:** Three.js no es el límite. Juegos como Guilty Gear Xrd/Strive, 2XKO o Tōkon consiguen el look con (1) una malla esculpida a mano, (2) un shader toon controlado por texturas y normales editadas, (3) contornos con grosor por vértice y líneas interiores pintadas, y (4) animación pose a pose escalonada. Las cuatro cosas son reproducibles en WebGL para móvil. Lo que falla es **el origen del asset**, no el motor.

## 2. Pipeline elegido

```
Concept aprobado
  → F0 vistas aisladas (front / side / back / 3/4)          [automático, hecho]
  → F1 imagen→3D: TRELLIS.2 / TripoSG  vs  Tripo  vs  Meshy  [semiautomático, comparar]
  → F2 Blender: limpieza, remodelado de máscara/pelo, retopo  [manual + scripts]
  → F3 color plano: proyección de las vistas del concept + pintura  [script + retoque]
  → F4 shader toon NEÓN en Three.js                          [código]
  → F5 rig humanoide + huesos de pelo/bufanda                 [auto-rig + ajuste manual]
  → F6 animación: base UAL retargeteada + poses clave authored [script + manual]
  → F7 GLB → visor de Aura → combate                          [código + tests]
```

**Por qué híbrido IA + Blender:** la IA da en minutos un volumen de partida con las proporciones del concept; el modelado manual garantiza la fidelidad de lo que define la identidad (máscara, pelo, cuello). Hacerlo todo a mano es lo más fiel pero lo más lento; hacerlo todo con IA da mallas blandas, pelo empastado y topología no animable.

## 3. Fases, entregables y criterios

### F0 — Referencias aisladas ✅
- `tools/prep_concept_views.py` recorta cada vista de la hoja y quita el fondo con un modelo de segmentación anime (`isnet-anime`).
- Salida en `character-documentation/references/aura/`: `aura_{front,side,back,q34}_{1024,rgba}.png`, hoja RGB original `aura_sheet_v3_rgb.png` y `aura_views_contact.png`.
- **Limitación:** cada vista mide ~450 px de alto en la hoja (1672×941). Para F1 conviene escalar ×4 con un upscaler anime (p. ej. 4x‑AnimeSharp en ComfyUI) o, mejor, conseguir/generar la hoja a mayor resolución.
- **Mejor fuente:** la hoja de giro `aura_turnaround_v3.png` (1448×1086, vistas de ~700 px). Sus recortes están en `references/aura/turnaround/` y son la entrada recomendada para F1.
- Las vistas son coherentes en proporción (misma altura, pose A). La vista lateral mira a la izquierda; el fondo de la espalda está limpio de paneles vecinos.

### F1 — Imagen→3D: prueba comparativa
Generar **una malla por herramienta con las mismas referencias** y comparar desde la cámara de combate.

> ⚠️ **Hunyuan3D‑2 / 2.1 queda descartado.** Su licencia (Tencent Hunyuan 3D Community License) excluye expresamente la Unión Europea, Reino Unido y Corea del Sur: cualquier uso desde España, incluidas pruebas y resultados, queda sin licencia. Lo mismo aplica a otros modelos Hunyuan.

| Herramienta | Entrada | Coste / dónde | Licencia | Notas |
|---|---|---|---|---|
| **TRELLIS.2** (Microsoft) | 1 vista (front o 3/4) | Gratis; demo web en Hugging Face (24 GB+ en local, no cabe en la 4060) | MIT | Malla + textura PBR; la textura se repinta en F3 |
| **TRELLIS v1** (fork fp16) | 1 vista | Gratis, local en 8 GB | MIT (núcleo) | Alternativa local si la demo web falla |
| **TripoSG** (VAST) | 1 vista | Gratis, local (>8 GB recomendado: probar fp16/offload) | MIT | Solo forma; buena definición de bordes |
| **Tripo** (web) | multivista front/side/back | Cuota gratuita | Revisar plan | Textura y auto-rig incluidos |
| **Meshy** (web) | `aura_front_1024.png` (no la hoja) | Cuota gratuita; descarga con suscripción | Revisar plan | Repetir la prueba con la vista aislada |

#### Resultado 1 — TRELLIS.2, vista frontal de la hoja V3 (2026-11-16)
Previsualización en `references/aura/f1/trellis2_front_preview.jpg` (normales, malla blanca y textura).
- ✅ Silueta, proporciones, mechones de pelo con volumen, chaqueta corta, cuello alto, pantalón ancho, botas con suela gruesa, correas.
- ⚠️ Máscara y cara poco definidas; manos simplificadas; textura con naranja virando a amarillo; superficie facetada.
- ❌ GLB no descargado: la extracción agotó la cuota gratuita de ZeroGPU sin sesión. Repetir con sesión de Hugging Face iniciada y usando la vista de `turnaround/`.

Evaluación (en este orden, no por "más detalle"): silueta lateral → máscara → pelo → proporciones → volumen de ropa → topología. Se documentan capturas lado a lado con el concept en `references/aura/f1/`.
**Criterio de salida:** una base cuya silueta lateral y proporciones encajen con el concept; máscara y pelo se rehacen en F2 de todas formas.

### F2 — Blender: corrección y retopología
- Remodelar a mano: **máscara** (pieza dura, aristas limpias), **pelo** (mechones como piezas poligonales, 15–25 mechones), **cuello/bufanda grafito**, hebillas y correas como piezas separadas.
- Retopología animable: loops en hombros, codos, rodillas, cadera; cara/máscara sin deformar.
- Presupuesto móvil: **≤ 30 k triángulos** cuerpo + pelo, ≤ 3 materiales, armas aparte.
- Escala 1 unidad = 1 m, mirando a −Y en Blender (+Z en glTF), pose A del concept.
- Automatizable con Blender MCP / `bpy`: importación, limpieza (merge by distance, normales), decimado de prueba, escala/orientación, renders de comparación con cámara lateral fija, exportación. **No automatizable:** decisiones de forma, máscara, pelo, retopo fina.

### F3 — Color plano
- Proyectar `aura_front/side/back` sobre la malla desde cámaras ortográficas alineadas (script `bpy`) → textura base 1024 ó 2048.
- Repintar zonas mal proyectadas y separar colores por material según la paleta (marfil, lavanda, gris violeta, grafito, naranja).
- Sin iluminación horneada: el shader pone las sombras.

### F4 — Shader toon NEÓN (Three.js)
Sustituye al `MeshToonMaterial` genérico en `models.js` solo tras comparación visual y de FPS.
- Color base + **color de sombra propio por material** (no oscurecer el base).
- Umbral de sombra modulable por un canal de textura/vértice (zonas siempre en sombra bajo cuello y mangas).
- **Normales editadas** en cara/máscara y pelo (transferencia desde esfera) para sombras limpias.
- Contorno de casco invertido con **grosor por color de vértice** y escalado por distancia; líneas interiores pintadas en la textura.
- Rim light naranja tenue opcional.
- Se puede desarrollar ya con los modelos actuales.

### F5 — Rig
- Auto-rig humanoide (Mixamo o Rigify) + ajuste de pesos en hombros, cadera y mangas anchas.
- Huesos extra: 2–3 por mechón principal, 3 para la bufanda; física simple tipo muelle en Three.js.
- Socket `Weapon.R` (y `Weapon.L` para el futuro) con la orientación del contrato actual: hoja hacia delante en reposo.
- Nombres de huesos mapeados en `tools/bl_retarget.py` para reutilizar los 44 clips UAL.

### F6 — Animación
- Base: clips UAL retargeteados (ya funcionan en el juego).
- Primero, authored en Blender/Cascadeur a partir de las poses del concept: **Idle (respiración), Guardia, Avance, Salto, Ataque con daga**.
- Pose a pose, escalonada a 2 frames, exageración pensada para la cámara lateral.

### F7 — Integración
1. Visor de Aura carga el GLB (`aura.json` → `productionModelUrl`).
2. Comparativa automática: render desde la cámara de combate junto al concept.
3. `models.js`/`anims.js`: Aura usa su GLB y sus clips; la simulación, hitboxes y online no cambian.
4. Tests existentes en verde y prueba en móvil (FPS, draw calls).

## 4. Primera prueba de producción

**Objetivo:** malla 3D de Aura visible desde el lateral en el visor, sin rig, con la mejor fidelidad de forma posible.
1. ✅ F0 preparada.
2. TRELLIS.2 (demo Hugging Face) con `aura_front_1024.png` y con `aura_q34_1024.png` → GLB.
3. Tripo multivista con front/side/back; Meshy con la vista frontal aislada.
4. Render comparativo de las tres contra el concept desde cámara lateral y 3/4.
5. Elegir base y pasar a F2.

Requisitos: solo navegador. Las pruebas locales (TRELLIS v1 fp16, TripoSG) quedan como plan B si las web fallan o limitan descargas.

## 5. Reglas que se mantienen
- Ramas + PR; el merge lo hace el responsable.
- No se sustituye el personaje jugable hasta aprobar F7.
- No se presenta como resultado nada que no se haya generado y comprobado.
- Una sola arma elegida por combate; armas como objetos independientes.
