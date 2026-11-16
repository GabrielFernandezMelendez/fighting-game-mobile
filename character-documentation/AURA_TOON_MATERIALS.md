# NEÓN — Materiales toon para Aura (propuesta técnica)

## Punto de partida real
El proyecto **ya utiliza** `THREE.MeshToonMaterial` en `public/js/models.js` con `gradientMap` generado mediante `THREE.DataTexture` (tres valores: 125/195/255), `NearestFilter`, y contorno de malla invertida en `outlineMaterial()`. No sustituirlo sin una comparación visual y de rendimiento.

Referencia oficial: https://threejs.org/docs/#MeshToonMaterial

## Modelo de materiales
| Parte | Color conceptual | Toon |
|---|---|---|
| Máscara / chaqueta | #E7DDD5 | mate, sombras grises cálidas |
| Cabello | #E8E1F2 | sombra lila |
| Cuello / protección | #202027 | casi negro |
| Pantalón | #514956 | sombra gris púrpura |
| Acentos | #FF7A1A | color naranja; emisión limitada |

Las muestras son dirección de arte; no son nuevos valores obligatorios del runtime.

## Implementación recomendada (sin cambiar gameplay)
1. Reutilizar el material toon actual para la **primera comparativa visual**; controlar las bandas con `gradientMap` y filtrado `NearestFilter`.
2. Gradientes para pelo, máscara y ropa separados por material según la iluminación deseada.
3. Respetar `map.colorSpace = THREE.SRGBColorSpace` cuando se carguen texturas de color; mantener geometrías y mallas de contorno compatibles con skinning.
4. Evitar multiplicar materiales/objetos por cada mechón en el producto final; consolidar geometría o atlas cuando esté aprobado el diseño.
5. Evaluar en plano frontal, cámara de combate, giro de personaje y resoluciones móviles. No valorar shader solo por una captura con luz fija.
6. El blockout en Blender se exporta con colores mate/PBR. El aspecto toon final se aplica en Three.js; un GLB aislado no garantiza ese resultado visual.

## Validación
- Lectura de máscara/ojos y cuello oscuro a tamaño de juego.
- Tres zonas legibles por cada material, si iluminación lo permite.
- Contornos sin crecimiento irregular ni desalineación al animar.
- No introducir cambios en hitboxes ni simulación determinista.
- Capturar FPS y draw calls antes/después y fijar presupuesto de rendimiento tras medir en dispositivos reales.

**Estado:** guía de implementación; no se ha implementado un nuevo shader de Aura ni ejecutado Blender en esta PR.
