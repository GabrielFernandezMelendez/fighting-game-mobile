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


## 2026-11-17 — Escenarios cel-shading: Sala de pruebas, Azotea y Mercado bajo la lluvia
- Nuevo módulo `public/js/stages.js`: cada escenario es solo decorado (`{ group, update, dispose }`); la simulación y el online no lo ven, así que el determinismo no cambia.
- **Sala de pruebas** más detallada: carril naranja con marcas por metro, emblema octogonal, pared de paneles con franjas de luz, placa NEÓN, focos, pilares con franjas de peligro y anillos holográficos.
- **Azotea** (portada): cielo violeta en bandas, luna y nubes planas, cometas en diagonal, ciudad en tres capas, barandilla, depósito, máquinas de aire y antena.
- **Mercado bajo la lluvia**: fachadas con carteles, puestos con toldos a rayas, farolillos, adoquines, charcos que reflejan luz y lluvia instanciada.
- **Contorno de tinta** (`#140f1c`, el de los personajes) en todos los objetos del escenario, con grosor que crece con la distancia para medir ≈2 px en pantalla; se oculta en calidad baja como el de los personajes.
- Pantalla **Escenarios** funcional (miniaturas renderizadas del juego); Práctica, CPU y online usan el elegido. En online lo decide quien envía `start` y viaja en ese mensaje. `?stage=<id>` lo fuerza para pruebas.

## 2026-11-17 — Bases de Vega y Kai y paleta de revisión de Aura

- [Bases 3D de Vega y Kai](VEGA_KAI_BASES.md) con archivos editables, materiales planos y el rig de Aura. Prueba con `?roster3d`.
- El taller carga la malla de combate de Aura y permite alternar los colores originales con una paleta ajustada al concept. La revisión vive en el visor.

## 2026-11-17 — Comparativa de Aura en Ajustes y revisión de escenarios

- El visor de Ajustes abre el GLB de combate de Aura. **Modelo actual** y **Comparar cambios** comparten malla, rig, pose y cámara. El segundo aspecto usa sombras propias por zona, ranuras de tinta en la máscara y un acabado metálico localizado en la hebilla. Los detalles se proyectan en la malla en reposo y siguen al skinned mesh. Los prototipos del taller dejan de aparecer en Ajustes.
- Sala de pruebas: paneles biselados dibujados en capas, marcas de pista y blancos cian. Azotea: ciudad por planos, luna, nubes angulares y cometas con cola afilada. Mercado: puestos de fruta, faroles facetados, lluvia en dos planos y charcos con reflejos gráficos y ondas. Los suelos repetidos y la fruta usan instancias. La calidad regula la densidad de lluvia y el número de ondas.

## 2026-11-17 — Fondos ilustrados y acabado limpio de Aura

- Sala, Azotea y Mercado usan las ilustraciones aprobadas como fondo 2.5D en Three.js. El encuadre evita deformar la imagen, el combate conserva su cámara 3D y la lluvia, los cometas y las ondas se dibujan en capas animadas. `?stage3d` permite comparar la versión de escenarios geométricos.
- La revisión visual de Aura limpia etiquetas de color aisladas en ropa, limita el color de pelo, máscara y piel a sus propios materiales, y aplica tinta más fina, ojos y brillo del pelo. El ajuste es reversible en el visor de Ajustes.

## 2026-11-17 — Escenarios 3D pintados y nueva geometría de la cabeza de Aura

- Sala, Azotea y Mercado vuelven a usar geometría de Three.js en partida. Paneles, pizarra, piedra, madera y tela usan texturas UV compartidas y sombras en tres bandas. Las ilustraciones siguen como miniaturas. La lluvia, los charcos y los cometas se dibujan en el espacio del mapa.
- En Ajustes se puede comparar una cabeza nueva de Aura sobre el rig actual. La máscara usa planos biselados, ojos dibujados sobre esa superficie y mechones modelados por separado. El visor permite ver cabeza y hombros o el cuerpo completo en tres ángulos. `?aurastyle` habilita la comparación experimental en combate.

## 2026-11-17 — Bufanda y hombreras de Aura

- El acabado experimental de Ajustes y `?aurastyle` incorpora una bufanda 3D con forro naranja y solapa en V, y dos hombreras con bisel y remaches. Cada pieza está anclada a su hueso de torso o clavícula y el GLB conserva las animaciones.
- El acabado experimental oculta la parte de la bufanda anterior que ocupaba el mismo volumen, también en su contorno. El encuadre de cabeza y hombros facilita comparar las tres piezas.

## 2026-11-17 — Bufanda y hombreras en main; deploy solo al fusionar
- Llegan a `main` los cambios de la PR #33 (bufanda y hombreras de Aura), que se habían fusionado sobre `feat/neon-cel-3d` cuando esa rama ya estaba en `main`.
- CI: las PR solo pasan los tests; ya no crean canales de vista previa en Firebase. El deploy a https://peleasdemo.web.app sigue siendo automático al fusionar en `main`. Para deshacer, rollback desde Hosting.

## 2026-11-17 — Aura y Sombra 3D también en el navegador del ordenador
- Los modelos 3D de Aura y Sombra solo se activaban en la app instalada (o con `?aura3d`); en el navegador del ordenador y en Android (navegador) salían los muñecos antiguos, aunque el visor de Ajustes sí cargaba el GLB. Ahora se usan en todas partes. `?clasico` vuelve a los modelos antiguos para comparar.
- El acabado en revisión de Aura (cabeza, bufanda, hombreras) sigue solo en Ajustes y con `?aurastyle` hasta que se apruebe.

## 2026-11-17 — Cabeza de Aura mejorada sobre el GLB (en revisión)
- La variante de Ajustes deja de sustituir la cabeza por piezas nuevas (`aura-head.js` queda sin usar): ahora se mejora la cabeza del propio GLB en Blender (`tools/bl_aura_head_review.py` → `public/assets/chars/aura_review.glb`). El GLB de combate no cambia.
- Pelo: más volumen, puntas afiladas, copete con picos, patillas, flequillo hasta los ojos y nuca; menos masa atrás. Suavizado (subdivisión + normales suaves) para que el cel-shading dé bandas curvas.
- Pelo con contorno de grosor normal, tinta entre mechones y tres tonos (luz, medio, sombra junto a la raíz).
- Cabeza 5 cm más alta (solo malla, los huesos y clips no cambian) con un cuello corto en sombra. Máscara más estrecha, lisa y con la barbilla suavizada.
- Ojos en forma de hoja con puntas redondeadas y línea vertical de la frente, dibujados en el shader.
- Ajustes muestra `aura.glb` y `aura_review.glb` sobre el mismo rig; en combate, `?aurastyle` usa la malla en revisión.

## 2026-11-17 — Aura en revisión: mismo diseño, alisado por partes
- `tools/bl_aura_review.py` genera `aura_review.glb` a partir de `aura.glb` sin cambiar el diseño: divide la malla en partes (pelo, máscara, bufanda, chaqueta, mangas, guantes, top, cinturón, pantalón, botas y piel de brazos y torso) según material, color de zona y hueso dominante, y alisa cada parte por separado con sus bordes fijos.
- Cada parte tiene sus propias normales suaves: las bandas de luz y los colores de una zona no se mezclan con la vecina. Mismos huesos, pesos y clips; 34.500 vértices (33.600 la original, solo se duplican los bordes entre partes).
- Se descartan la cabeza elevada, la bufanda modelada y las hombreras de las propuestas anteriores. El repintado de Ajustes (paleta, ojos en forma de hoja, tres tonos de pelo con tinta) se mantiene, ajustado a la cabeza original.

## 2026-11-17 — Diseño revisado de Aura en combate y acceso directo en Android
- El combate usa ya el diseño revisado de Aura (`aura_review.glb` + repintado) en iPhone, Android y escritorio. `?auraoriginal` vuelve al de antes para comparar; `?clasico` sigue mostrando los muñecos antiguos.
- Ajustes → **Añadir NEÓN a inicio**: si Android no ofrece el aviso de instalación, la guía muestra los pasos para Chrome (⋮ → Añadir a pantalla de inicio / Instalar aplicación) y Samsung Internet. El manifiesto declara `id` y `scope` para que Chrome la instale como app.
- Coste: unas 13 llamadas de dibujo más por Aura (12 partes con su contorno).

## 2026-11-17 — Aura: chaqueta limpia y bufanda naranja
- `tools/bl_aura_review.py` admite ajustes por parte: color único (`COLOR`) y alisado extra (`ALISADO`).
- Chaqueta y mangas pasan enteras a marfil (sin manchas grises ni negras del escaneo) y se alisan el triple (chaqueta) y 2,5 veces (mangas).
- Bufanda entera en naranja, alisada el doble. Se ajusta qué es bufanda (alrededor del cuello y la caída delantera); las manchas oscuras sobre los hombros pasan a la chaqueta.
- Islas de sombra en chaqueta y bufanda: el escaneo trae triángulos con la cara del revés y, con material a doble cara, su luz se invierte. En revisión, esas dos zonas calculan la luz con |nl| y un umbral bajo: color limpio, sombra solo donde la superficie se aparta de la luz. Alisado final: chaqueta ×8, mangas ×6, bufanda ×4.
- Más sombra en la chaqueta, con formas grandes y limpias: el lado que se aparta de la luz se calcula con una normal «grande» (radial desde el eje del torso o del brazo, sigue al esqueleto) en vez de la del escaneo; más una franja en V bajo la bufanda y el bajo de las mangas.
- Bufanda delimitada por forma (alrededor del cuello, por encima de un borde en V) en vez de por el color del escaneo: sin islas marfil dentro ni manchas naranja fuera. El top bajo la chaqueta queda en negro.
- Partes corregibles a mano: `art/aura/aura_partes.blend` (las 12 partes como objetos, cada una con su color de vista) y guía [AURA_PARTES_A_MANO.md](AURA_PARTES_A_MANO.md). Si el archivo existe, `tools/bl_aura_review.py` usa esas partes tal cual en vez de calcularlas.

## 2026-11-17 — Salto en diagonal en móvil
- Swipe en diagonal hacia arriba (arriba-derecha / arriba-izquierda) en la mitad de movimiento = salto hacia ese lado, como W+D en el teclado. Permite saltar por encima del rival.
- Caminando con el dedo mantenido, subirlo = salto hacia donde caminas (una vez por subida; bajar el dedo rearma).
- El swipe vertical sigue siendo salto recto; los swipes horizontales con poca inclinación siguen siendo paso, dash o caminar.

## 2026-11-18 — Guías para colaboradores
- `CONTRIBUTING.md`: cómo colaborar con fork, rama y Pull Request, servidor local, reglas y solución de problemas.
- `docs/diseno/ARCHIVOS_BLENDER.md`: mapa de los archivos de Blender, qué archivo tocar según la tarea, reglas que necesita el juego y animaciones.
- Plantilla de PR (`.github/pull_request_template.md`) y `.gitignore` para las copias de seguridad de Blender (`*.blend1`).
- Esqueleto común: `art/comun/esqueleto_neon.blend` (generado con `tools/bl_esqueleto_comun.py`) con los 24 huesos de NEÓN y guías de suelo, altura (2,76 m) y caja de golpes en reposo (`REF_hurtbox`, medida en `sim.js`). Es el paso 0 de todo personaje: misma hitbox a igual escala; el tamaño se decide con `scale` en `data.js`. Aura, Vega y Kai coinciden; Sombra tiene alguna articulación hasta 12 cm más alta.

## 2026-11-18 — Aura 2D en Práctica: animación a lo Skullgirls (fase 1)
- Los dibujos ya no se funden ni se deforman entre sí (se quita el flujo óptico y su mezcla): cada dibujo se mantiene enteros sus fotogramas de simulación, el juego sigue a 60 fps y la fluidez la da el timing. Borde duro (alfa cortado al 50 %), sin halos.
- Las hojas de caminar se igualan en tamaño a las de guardia y ataque (`SHEET_SCALE`, −3 a −6 %): el personaje ya no cambia de tamaño al empezar o dejar de caminar. Pies en la misma línea de suelo en todas las hojas (comprobado: 323–324 px).
- Respiración en guardia: el torso y la cabeza suben y bajan con los pies quietos, en pasos de 6 fotogramas (como un dibujo "a seises").
- Golpe: estirón de 2 fotogramas al empezar la ventana activa (el *smear* de los dibujos a mano); aplastado de 3 fotogramas al aterrizar; vibración al recibir un golpe durante la pausa de impacto. La pausa de impacto congela el dibujo.
- Se retiran `motion-*.png/json` (flujo óptico, ya sin uso).
- Pendiente (fase 2): más dibujos (guardia 8–12, 6–10 por ataque, salto con subida/caída, golpe recibido y bloqueo), generados desde las poses del modelo 3D para que sean coherentes.

## 2026-11-20 — Vega y Kai nuevos (Tripo) y opciones de desarrollador
- **Vega y Kai**: modelos nuevos generados con Tripo, reducidos de 262 000 y 437 000 a 30 000 triángulos (UV y textura conservadas, texturas a 1024 px en WebP) y montados sobre el esqueleto común con `tools/bl_tripo_prep.py` + `tools/bl_aura_rig.py`. Se usan por defecto en todos los dispositivos (`?clasico` vuelve a los antiguos). Fuentes: `art/<vega|kai>/<p>_tripo_lowpoly.blend` y `_tripo_rig.blend`.
- **Versión en Ajustes** (`public/js/version.js`; al desplegar se añade el commit). Pulsarla 7 veces activa las **opciones de desarrollador** (`neon-settings.dev`); se pueden desactivar en su panel.
- **Dummies de pruebas** (masculino y femenino, maniquíes CC0 de Quaternius con sus propios pesos renombrados al esqueleto común, `tools/bl_maniqui.py`): seleccionables en Práctica solo con las opciones de desarrollador. Para revisar animaciones.
