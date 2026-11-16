# NEÓN — Aura: pipeline Blender → GLB → cámara lateral

**Fecha:** 2026-11-16 · **Estado:** preparación técnica, sin nuevo modelo final publicado.

## Decisión de producción

La hoja de concepto aprobada es la referencia de identidad (cabello blanco-lila, máscara afilada, chaqueta marfil, pañuelo oscuro, pantalón gris-violeta, detalles naranja). La calidad de esta ilustración **no** se consigue añadiendo cubos y conos en Three.js. El arte definitivo debe crearse y validarse como **malla 3D estilizada, con UV, materiales y esqueleto real** en Blender.

**Se mantiene Three.js para NEÓN; no se migra el juego de motor.** Se revisará de nuevo solo si una prueba con un modelo GLB real revela límites medibles de rendimiento o animación.

## Qué existe ahora

- Visor: `public/aura_preview.html`, abierto desde **Ajustes → Ver personaje Aura**.
- Cámara: **ortográfica y lateral fija**. Ligero ángulo hacia el frente para leer máscara y pecho, sin controles orbit ni giro libre.
- Materiales del prototipo: `MeshToonMaterial`, mapa de 3 bandas, colores aproximados; no es garantía de acabado final del GLB.
- Respaldo V3: `public/js/aura-detail.js` + `public/js/aura-personality.js`. **Es provisional**, no reemplaza una malla de producción.
- GLB: `public/assets/previews/aura.json` tiene `modelUrl: null`, intencionadamente. Se puede probar un GLB **local** con el selector de archivos del visor, sin subirlo al servidor.

## Pasos concretos para la primera entrega 3D

1. **Modelar en Blender** con la silueta en perfil de juego: máscara estilizada, cara/cabello en volúmenes orgánicos, cuerpo y extremidades continuos, pantalón holgado con pliegues diseñados, botas y accesorio naranja. Reutilizar formas del concept, no las primitivas V3.
2. **Rig humanoide** compatible con la biblioteca de animaciones y las herramientas existentes `tools/bl_chars.py`, `tools/bl_retarget.py`; no cambiar nombres de huesos ni jerarquías sin un mapeo documentado. Deformaciones probadas en hombros, cadera, muñecas y rodillas.
3. **Armas separadas** del personaje; preparar sockets de mano y un clip de agarre para daga/espada/martillo/lanza. Solo un arma equipada por combate.
4. **Orientación** del GLB: Y positivo arriba y +Z hacia delante (frente de la máscara). La cámara de revisión está situada desde +X con una pequeña componente +Z; optimizar la silueta en ese ángulo. El lado opuesto del luchador se resolverá en render de combate; la cámara de revisión no rota.
5. **Exportar GLB auto-contenido:** aplicar transformaciones, mallas con UV y texturas incluidas, piel si hay rig, y clips opcionales `Idle`, `Guard`, `Attack`. Recomendar una primera entrega por debajo de **35 MB** para el visor local; el presupuesto definitivo se definirá con medidas móviles.
6. **Probar sin publicar:** abrir `aura_preview.html` desde Firebase o servidor local y pulsar **Probar GLB local**. Se muestra en la cámara lateral, normalizado a 2,76 unidades de alto; la carga local no sube archivos a GitHub ni Firebase.
7. **Publicar tras revisión:** subir `public/assets/previews/aura-production.glb` en una PR y cambiar `modelUrl` de `null` a `"assets/previews/aura-production.glb"` en `public/assets/previews/aura.json`. No enlazar archivos inexistentes. Abrir una nueva PR, revisión visual, y merge manual. El visor entonces priorizará la malla importada.
8. **Integración en combate:** solo después de aprobar silueta, paleta, articulaciones, memoria/triángulos/draw calls y clips, conectar el modelo en `models.js` y `anims.js`. Preservar simulación determinista y todas las armas.

## Criterios de aceptación visual (revisión en lateral)

- La silueta debe recordar al concept incluso sin texturas: cabello en capas volumétricas, cuello alto, chaqueta corta, ropa holgada, botas.
- La máscara debe ser reconocible de perfil; ojos negros, planos blancos, cabello blanco-lila y naranja en lugares precisos.
- No deben verse intersecciones graves entre cuello, hombros, bufanda y brazos en `Idle`, `Guard` y `Attack`.
- Distinguir con claridad silueta anatómica de prendas/armadura. No modelar la daga como pieza permanente.
- El acabado cartoon requiere animación autoral y dirección de poses; un shader toon por sí solo no crea el parecido.
- Medir FPS, draw calls y memoria en móvil antes de sustituir el GLB jugable.

## Referencias

- [Ficha del personaje](AURA.md)
- [Turnaround reducido](images/aura-turnaround-preview.svg); conservar el archivo de alta calidad fuera de la versión comprimida.
- [Three.js MeshToonMaterial](https://threejs.org/docs/#MeshToonMaterial)
- [Charla de Arc System Works sobre el arte 2D/3D de Guilty Gear Xrd](https://www.arcsystemworks.com/guilty-gear-xrds-art-style-the-x-factor-between-2d-and-3d-talk-from-gdc-2015-is-now-available-online/)
- [2XKO: proceso de desarrollo de campeones](https://2xko.riotgames.com/es-mx/news/dev/2xko-live-balance-philosophy/)

### Advertencias

- La hoja gráfica V3 dice “game ready”, pero esa frase forma parte del **concept art**; no significa que exista una malla riggeada ni assets de producción.
- La carga de un archivo local utiliza `GLTFLoader.parseAsync` y solo acepta `.glb` de hasta 35 MB, pensado para modelos con texturas embebidas.
- La comparación lateral es una prueba de arte, no un simulador de gameplay ni un sistema de animación de combate.
