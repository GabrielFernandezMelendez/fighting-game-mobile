# Historial de diseño

## 2026-11-16 — Inicialización v1.0
- Capturada la línea base del roster existente (`ROSTER.md`).
- Registrada la decisión de **un personaje y una arma fija por combate 1v1**.
- Documentado como **futuro** el combate por equipos de dos personajes, con un arma fija por personaje y mecánicas tag/assist.
- Añadida ficha `AURA.md` v1.0 con A funcional y B artístico; producción/integración pendientes.
- Establecido protocolo de archivo de versiones previas en `history/`.
- **Sin cambios al gameplay.**

## 2026-11-16 — Aura v1.1 (PR de preproducción 3D)
- Versión anterior archivada en [history/AURA-v1.0.md](history/AURA-v1.0.md).
- Se añadió una **vista previa comprimida y reducida** del turnaround aprobado en `images/aura-turnaround-preview.svg`; original de alta resolución aún pendiente de subir.
- Se añadió un script de **blockout no riggeado** de Aura en `tools/bl_aura_blockout.py`.
- Se documentó el uso previsto del cel-shading existente `MeshToonMaterial`; el juego y la simulación permanecen intactos.
- Blender y las validaciones de exportación/rig/móvil siguen pendientes.

## 2026-11-16 — Aura v1.2: visor de detalle V2
- Se archivó la [versión 1.1](history/AURA-v1.1.md).
- Se introdujo una nueva geometría procedural de revisión (pelo, máscara, ropa, correas, botas), conservando comparación con V1 y daga opcional.
- No se modificaron combate ni modelos GLB de producción.
- Requiere revisión visual y rendimiento en navegador antes de considerarlo aprobado.

## 2026-11-16 — Aura v1.3: personalidad V3
- Se archivó [AURA-v1.2.md](history/AURA-v1.2.md).
- Se añadió una capa de presentación dinámica para el visor, guardia/relajada, respiración y animación secundaria.
- Sin cambios al combate, a los archivos GLB de producción ni al sistema de armas.
- Pendiente validación visual y rigging real.

## 2026-11-16 — Aura v1.4: pipeline de modelado y revisión lateral
- Se archivó [AURA-v1.3.md](history/AURA-v1.3.md).
- Nuevo visor de cámara lateral fija, ensayo de GLB local y manifiesto para modelos publicados.
- Se congela el enfoque procedural V3 como referencia de comparación, no como asset de producción.
- Guía [Blender → GLB → Three.js](AURA_GLB_PIPELINE.md); sin GLB definitivo ni alteraciones de gameplay.

## 2026-11-16 — Aura v1.5: referencia PNG nítida y relieve 2.5D
- Archivada [v1.4](history/AURA-v1.4.md).
- Publicado PNG 1672 × 941 de concept V3 y un GLB de relieve lateral texturizado.
- El visor diferencia el **relieve de referencia** del modelo 3D riggeado, todavía inexistente.
- Se añadió generador reproducible del relieve y controles para mostrar PNG local.
- Sin alteraciones de mecánicas ni asset usado en combate.
- Ver [guía del relieve](AURA_CONCEPT_RELIEF.md).

## 2026-11-16 — Aura v1.6: malla 3D animable experimental
- Archivada [AURA-v1.5.md](history/AURA-v1.5.md).
- Primer prototipo con malla 3D, `THREE.Skeleton` y `THREE.SkinnedMesh` disponible en visor lateral.
- Añadida prueba de Idle, Guardia y ataque de daga mediante movimientos de huesos.
- Se conserva el relieve como referencia artística (no se convierte el rig en modelo jugable).
- Sin GLB riggeado exportado, ni malla esculpida en Blender, ni cambios a las armas o gameplay.
- Ver [AURA_RIG_V1.md](AURA_RIG_V1.md).

## 2026-11-16 — Aura v1.7: pipeline 3D de producción
- Estado: propuesto (plan) · F0 implementada.
- Archivada [AURA-v1.6.md](history/AURA-v1.6.md); nueva guía [AURA_PIPELINE_3D.md](AURA_PIPELINE_3D.md).
- Decisión: abandonar la geometría procedural como método del personaje final; adoptar pipeline híbrido IA + Blender + shader toon propio.
- Añadidas referencias aisladas (`references/aura/`), hoja RGB original sin paleta reducida y `tools/prep_concept_views.py`.
- Hunyuan3D descartado: su licencia excluye la UE. Candidatos F1: TRELLIS.2, TripoSG, Tripo, Meshy.
- Impacto en animaciones/balance/network: ninguno.

## 2026-11-16 — Aura F2 automatizada: malla TRELLIS riggeada y animada (prueba)
- Estado: implementado como **prueba** detrás de `?aura3d`; el personaje jugable no cambia.
- Malla de TRELLIS.2 → color corregido con la hoja de giro → 30 k triángulos con textura horneada → esqueleto propio con pesos automáticos → 44 clips UAL retargeteados.
- Scripts: `bl_aura_recolor.py`, `bl_aura_retopo.py`, `bl_aura_rig.py`; `bl_retarget.py` admite `TARGET`/`ANIMS_NAME`.
- Render: clips por modelo, doble cara opcional, contorno con offset de profundidad.
- Impacto en animaciones/balance/network: ninguno en el modo por defecto. Tests en verde.
- Pendiente: separar piernas, retopología con loops y piezas de máscara/pelo en Blender.

## Plantilla para revisiones
### FECHA — PERSONAJE vX.Y
- Estado: propuesto / aprobado / implementado
- Motivo y detalles:
- Antes: `history/PERSONAJE-vANTERIOR.md`
- Después: `PERSONAJE.md`
- Impacto en animaciones/balance/network:
- PR, commit y pruebas:

## 2026-11-16 — Aura 3D: cel-shading, color plano, dash y VFX
- **Color plano** (`tools/bl_aura_flatcolor.py`): paleta del concept + reglas por zona; elimina las sombras horneadas.
- **Materiales por zona** en la malla de juego: `Aura_ropa`, `Aura_pelo`, `Aura_mascara`, `Aura_piel`.
- **Cel shader NEÓN** (`models.js`): dos bandas, sombra con color propio por material, rim de acento. Solo con `?aura3d`.
- **Rig**: corregidos los picos de las rodillas al saltar (pesos mano/pierna y rodilla).
- **Gameplay**: dash adelante/atrás con doble toque de dirección (joystick o teclado), cancelable en ataque. Test `test/dash.mjs`. Repercusión: nuevo estado `dashF/dashB` en la simulación determinista (online compatible, sin cambio de input).
- **VFX** (`vfx.js`, solo presentación): estela del arma, estrella de impacto, polvo.
- **Cámara**: encuadra a los dos luchadores también en vertical (saltos).
- Documentación: nueva guía [CHARACTER_PIPELINE.md](CHARACTER_PIPELINE.md); fuentes 3D en `art/aura/`.
- Aura sigue usando el modelo anterior sin `?aura3d`. `AURA.md` sin cambios.

## 2026-11-16 — Aura 3D: color plano por cara y polvo cel-shading
- **Polvo** rehecho como en la lámina V3 (AVANCE/SALTO): dos tonos beige duros, sin contorno, animación a 12 fps. Revisión en `public/dev_vfx.html`.
- **Color plano por cara** en la malla de juego (`bl_aura_retopo.py`, `COLOR=face`): sin textura, sin difuminado; paleta tomada de las muestras de la lámina.
- **Normales suavizadas** para que las sombras del cel shader formen manchas grandes y limpias.
- `models.js`: usa el color por vértice del GLB cuando no hay textura. Simulación sin cambios.
- Capturas: `references/aura/f3/vfx_polvo_cel.png`, `f4_color_por_cara.png`.

## 2026-11-16 — Aura 3D: tinta de cómic
- **Líneas de tinta interiores** en el personaje (`models.js`, `prepareInk`): fronteras entre zonas de color y pliegues marcados; contorno exterior de Aura 0,012 → 0,016 para separar piernas y brazos superpuestos.
- **Manos**: el guante es grafito con dedos de piel; se quitan los grises (`bl_aura_flatcolor.py`).
- **Polvo** más en pico, con contorno de tinta y rayas de velocidad negras.
- Captura: `references/aura/f3/f4_tinta_comic.png`. Simulación sin cambios.

## 2026-11-16 — Guía de estilo y Aura 3D: zonas por píxel, sombra por zona, polvo ondulado
- Nueva guía [NEON_ART_STYLE.md](NEON_ART_STYLE.md) (PR #16).
- **Zonas por píxel** (`COLOR=label` en `bl_aura_retopo.py` + `prepareLabels` en `models.js`): la zona de color se guarda por vértice y el shader la resuelve por píxel. Fronteras y tinta suaves en lugar de dientes de sierra. La paleta viaja en el GLB (`extras`).
- **Sombra por zona** (`ZONE_SHADE`): la chaqueta oscurece a beige y el pantalón a violeta, así no se confunden.
- Normales más suaves (30 pasadas) y tinta algo más gruesa (1,3 px por lado).
- **Polvo** rehecho sin tinta ni picos: cuerpo pegado al suelo, volutas onduladas y volumen cel de tres tonos, como en la lámina.
- Captura: `references/aura/f3/f4_zonas_por_pixel.png`. Simulación sin cambios.

## 2026-11-16 — Primer prototipo 3D de Sombra

- [Fuente editable y notas de revisión](../art/sombra/README.md). Malla propia de Blender con materiales planos y pesos, basada en la lámina de Sombra.
- Prueba experimental con `?aura3d` en el modo Práctica para Aura y Sombra. `?sombra3d` activa solo el prototipo de Sombra. Comparte esqueleto y clips con Aura. La selección de arma sigue pasando por el socket de la mano.
- Capturas de Blender en `references/sombra/prototype/`. Pendiente de revisión visual en partida con WebGL y en un móvil real.

## 2026-11-16 — Sombra 3D por el pipeline de Aura (F0–F7)
- **F0** lámina y vistas aisladas (`references/sombra/`). **F1** malla de TRELLIS.2 desde la vista frontal.
- **F2a–F3** recolor con la hoja (`VIEWS=sombra_ ORANGE_FIX=0`) y color plano con paleta y reglas de zona propias (capucha, hueco negro, vendas en antebrazos, piel en hombros, guantes, botas).
- **Scripts generalizados**: `tools/neon_chars.py` (paleta, colores finales y materiales por personaje, `CHAR=`); `bl_fighter_armature.fit_joints` ajusta codos, muñecas, rodillas y tobillos a la malla (`FIT_JOINTS`); el rig quita pesos de brazo a la bolsa/correas lejos de la mano y borra los puentes mano-muslo que deja el remallado.
- **F6** clips UAL retargeteados a su esqueleto (`sombra_anims.glb`; antes usaba los de Aura).
- **F7** `sombra.glb` nuevo con zonas por píxel, tinta y sombra por zona (`ZONE_SHADE` con tonos vino/ciruela). Contorno 0,016, doble cara. El prototipo hecho a mano (PR #17) queda en `art/sombra/` como referencia.
- Capturas: `references/sombra/f1–f3/`. Simulación sin cambios. Sigue detrás de `?sombra3d` / `?aura3d`.
- Pendiente: franja carmesí del pantalón (se pierde a 30 k), hueco de la capucha, prueba en móvil.

## 2026-11-16 — Controles táctiles: caminar manteniendo el swipe
- Sin joystick, la mitad izquierda vuelve a permitir caminar: **swipe y mantener** = caminar mientras el dedo siga apartado de donde empezó (volver al centro = parar; cruzar al otro lado = caminar hacia atrás). **Swipe abajo mantenido** = agacharse.
- El dash no cambia: dos swipes soltando entre ellos. Mantener no genera dash (no hay flanco de subida).
- Test nuevo `test/swipe-hold.mjs` (en CI). Ayuda de controles actualizada. Simulación y online sin cambios: solo cambia cómo se genera `dx`/`down` en `input.js`.

## 2026-11-16 — Modo contra la CPU (PvE)
- Botón **Contra la CPU** en el menú; pantalla **Elige rival** con 4 dificultades (Aprendiz, Luchador, Veterano, Leyenda); combate al mejor de 3 con revancha y cambio de rival.
- `public/js/cpu.js`: CPU por cartas/tácticas con capacidad de ejecución y presión (modelo de Street Fighter 6), niveles con puntos débiles claros (Skullgirls) y sin lectura de botones. Ver `docs/CPU.md`.
- Test `test/cpu.mjs` (en CI). La simulación y el online no cambian.

## 2026-11-17 — Interfaz NEÓN (guía de estilo aplicada)
- Nueva interfaz en todas las pantallas según la guía aprobada: Megrim (logo), Zalando Sans Expanded (interfaz), paleta fija, botones con chaflán, paneles con pestaña, octógonos y franja diagonal con el acento de cada luchador. Maquetas: lienzo «NEÓN · Interfaz».
- Portada: capa animada en vídeo (`img/ui/duel.mp4`, bucle de 6 s) separada de los botones; imagen fija con movimiento reducido (sistema o Ajustes › Movimiento reducido).
- Selección: los puntos que suma el arma a Fuerza/Destreza se ven en **cian (foco)**; la regla sale de cómo escala el daño de cada arma (`damageMult`).
- Controles táctiles: Agarre y Bloqueo **a la misma altura que antes** (42 %), ahora octogonales. Pendiente: que el jugador los mueva y escale (estilo COD Mobile).
- Estados de botón: borde iluminado al pasar el ratón, anillo cian con teclado, escala 0,97 al pulsar, gris al desactivar, «Conectando…» sin cambiar de tamaño.
- Sin cambios en simulación, online ni CPU (salvo textos más cortos de las dificultades).

