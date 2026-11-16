# Aura V6 — Primer modelo 3D animable con skinning

**Estado:** prototipo técnico de deformación. **No es la escultura final aprobada ni el GLB de producción.**

## Qué se ha implementado

- `public/js/aura-skinned3d.js`: malla de vértices 3D con secciones elípticas ajustadas y triángulos de superficie, no una imagen proyectada en relieve.
- **17 huesos** mediante `THREE.Bone`, `THREE.Skeleton` y `THREE.SkinnedMesh`. Los vértices llevan índices de huesos y pesos de skinning para deformarse alrededor de hombros, codos, pelvis, rodillas y cuello.
- Volúmenes tridimensionales para torso, chaqueta, cuello, brazos, pantalón, botas, máscara, pelo y daga visual independiente.
- **Pose relajada:** respiración, cambios de peso, cabeza y brazos.
- **Guardia:** postura de brazos y torso.
- **Ataque de daga:** animación de prueba con anticipación, ataque y recuperación sobre huesos.
- El visor sigue utilizando la **misma cámara lateral fija** y permite alternar entre el relieve del concept (calidad visual de referencia) y el rig V1 (deformación técnica).

## Cómo probar

1. Revisar y fusionar la PR.
2. Desplegar `public` con Firebase.
3. Abrir **Ajustes → Ver personaje Aura**.
4. Pulsar **Probar 3D con esqueleto**.
5. Alternar **Pose de combate**, **Pausar movimiento**, **Mostrar daga** y **Animar ataque**.
6. Volver al concept con **Volver al concept 2.5D** para identificar qué anatomía, máscara, ropa y proporciones hay que corregir.

## Limitaciones importantes

- La geometría es **un primer personaje 3D realmente volumétrico y deformable**, generado con Three.js, pero **no está retopologizado ni esculpido en Blender**, no tiene UV artísticas ni mapas pintados, y el modelado aún no reproduce el detalle del concept.
- Las poses se calculan con transformaciones de huesos en el visor. **No se ha exportado un GLB con esqueleto ni clips**; por tanto este prototipo no puede sustituir el GLB jugable.
- El ataque no aplica hitboxes, daño ni frame data. Es únicamente una prueba de animación.
- El cuerpo no está preparado todavía para intercambiar las cuatro armas. La daga visual es un test; se mantiene la regla de una sola arma elegida por combate.
- No se han realizado pruebas visuales de browser, rendimiento móvil ni deformaciones extremas: se deben comprobar antes de considerar aprobado el rig.

## Próximo trabajo de modelado

1. Trasladar **mascara, cabello, ropa, anatomía y silueta fieles al concept** a un editor de escultura como Blender sobre una malla con buena retopología.
2. Sustituir superficies sencillas por anatomía estilizada y prendas esculpidas. Establecer UV/materiales específicos por zona.
3. Ajustar y exportar un **rig humanoide Blender → GLB** en `public/assets/previews/`, con clips `Idle`, `Guard`, `DaggerSlash`.
4. Validar deformaciones y distinguir claramente el GLB final del relieve 2.5D y de este primer rig técnico.
5. Una vez aprobado, integrar el personaje en combate sin modificar la simulación ni sus armas.

## Estado funcional

| Sistema | Estado |
|---|---|
| Visor lateral y concept HD | Implementado |
| Malla tridimensional con skinning | Implementado en visor de prueba |
| Guardia, idle y ataque básico | Implementados como pruebas |
| Escultura 3D de calidad final | Pendiente |
| GLB con rig + clips exportados | Pendiente |
| Ataques/armas dentro del combate | Sin cambios |
