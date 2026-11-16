# NEÓN — Documentación de personajes

Esta carpeta es la referencia de diseño para los integrantes del proyecto. Mantener separado lo **implementado**, lo **aprobado como diseño**, lo **propuesto** y lo **futuro**.

## Reglas globales de combate
- **Ahora:** 1v1. Se elige un personaje y **una sola arma** antes de cada combate. El arma no se cambia durante la partida. Cualquier personaje puede elegir cualquiera de las cuatro armas compatibles; el arma insignia es solo el valor predeterminado.
- **Futuro (no implementado):** dos personajes por equipo, cada uno con una única arma elegida, botones de *tag* y *assist*, inspirado en 2XKO. No asumir reglas de tag hasta que estén especificadas.
- **Responsabilidad personaje:** identidad visual, estadísticas, movilidad, pasiva.
- **Responsabilidad arma:** modelo independiente, alcance, animaciones de ataques, hitboxes y frame data; el daño se combina con las estadísticas del luchador.
- **Estética:** 3D estilizado con cel-shading, siluetas claras, sombras marcadas y contornos selectivos. Referencias de dirección: 2XKO y MARVEL Tōkon; crear arte propio.

## Ficheros
- [ROSTER.md](ROSTER.md): estado actual verificado de Aura, Vega, Kai y Sombra.
- [AURA.md](AURA.md): diseño funcional A y diseño visual B de Aura, junto a la línea base implementada.
- [Referencia de alta resolución y relieve 2.5D](AURA_CONCEPT_RELIEF.md): archivos de arte, generación de GLB de comparación y limitaciones.
- **[Guía del estilo gráfico NEÓN](NEON_ART_STYLE.md)**: cel-shading, tinta de cómic, VFX, herramientas, pasos para diseñadores y checklist para agentes.
- **[Pipeline de creación de personajes (guía completa)](CHARACTER_PIPELINE.md)**: pasos, scripts, comandos y entrega a artistas. Fuentes 3D en `art/<pj>/`.
- **[Pipeline 3D de producción de Aura](AURA_PIPELINE_3D.md): plan vigente para llevar el concept a un modelo 3D jugable.**
- `references/aura/`: vistas aisladas del concept para imagen→3D y hoja RGB original.
- [Rig técnico V1 de Aura](AURA_RIG_V1.md): nueva malla volumétrica con skinning y pruebas de animación, todavía sin escultura final.
- [Preview del turnaround de Aura](images/aura-turnaround-preview.svg): referencia visual aprobada (versión reducida); conservar el original de alta resolución para el modelado.
- [Guía MeshToonMaterial de Aura](AURA_TOON_MATERIALS.md): bandas toon, materiales y validación visual.
- `tools/bl_aura_blockout.py`: generador Blender para un primer blockout **no riggeado**, todavía sin validar en Blender.
- [CHANGELOG.md](CHANGELOG.md): registro de decisiones y cambios.
- `history/`: versiones anteriores de cada ficha, cuando existan revisiones.

Pendientes de creación tras su revisión individual: `VEGA.md`, `KAI.md` y `SOMBRA.md`.

## Versionado y colaboración
1. **Antes de modificar** una ficha, crear una copia íntegra de su versión vigente en `history/NOMBRE-vX.Y.md` (ejemplo: `history/AURA-v1.0.md`).
2. Actualizar la ficha viva con número de versión, estado y fecha; registrar los cambios en `CHANGELOG.md`. No borrar versiones anteriores. El historial Git complementa las copias explícitas.
3. Mantener valores implementados contrastados con `public/js/data.js`, `sim.js`, `main.js`, `anims.js` y `models.js`. No presentar una idea como mecánica ya programada.
4. Documentar las repercusiones de cada cambio de diseño: balance, compatibilidad de armas, rig, animaciones, multiplayer y rendimiento móvil.
5. Trabajar en **ramas y Pull Requests** contra `main`, con revisión y merge realizado por el responsable del proyecto.
6. Los cambios funcionales requieren pruebas de los scripts en `test/`; los cambios de arte requieren vistas de referencia, comprobación GLB/rig, y prueba visual en navegador/móvil.
7. Los assets externos requieren comprobar sus licencias e incorporar atribuciones necesarias en `CREDITOS.md`.

## Flujo de producción por personaje
A. Diseño jugable → B. Diseño artístico (concept, vistas, materiales) → C. Modelado/rigging/animación → D. Integración y pruebas en Three.js. Completar uno antes de pasar al siguiente.
