# AURA — La Centella

**Versión:** 1.1 · **Fecha:** 2026-11-16  
**Estado:** A (dirección funcional definida); B (concept visual propuesto); C (blockout Blender programado, todavía sin exportación validada); D (integración pendiente).

## 1. Línea base implementada — no confundir con propuestas

Fuente: `public/js/data.js`, `public/js/sim.js`, `public/js/main.js`.

- ID `aura`; modelo actual `cleric`; arma insignia/predeterminada `dagger`; retrato existente `public/img/aura.jpg`.
- Estadísticas: **fuerza 3, destreza 8, defensa 4, velocidad 7**; escala `0.97`; cadena máxima `5`; acento `#ff7a1a`.
- Pasiva actual: **un doble salto**, que reinicia la lista de ataques aéreos utilizados.
- Derivados actuales: **970 HP**, velocidad de avance **2.45**, retroceso **1.82** y velocidad inicial de salto **6.91**.
- Puede escoger daga, espada, martillo o lanza **antes del combate**; el arma elegida permanece fija durante la partida.
- No hay implementación propia de dash especial, teletransporte, supers o asistencias.

## 2. A — Diseño funcional

### Identidad
Arquetipo: **rushdown / presión aérea / mix-up**. Aura busca entrar en rango, forzar errores del rival y transformar pequeños aciertos en secuencias rápidas. Su fortaleza es la movilidad, no el daño por golpe ni la resistencia.

### Ventajas y limitaciones
- Ventajas: doble salto, ataques aéreos, cambios de altura, presión cercana, confirmaciones ágiles.
- Limitaciones buscadas: menor capacidad de aguantar golpes, peor alcance sin armas largas, vulnerabilidad cuando falla una entrada.
- Dificultad deseada: media-alta, accesible al comenzar y expresiva en juego avanzado.

### Pasiva y equilibrio
Conservar el doble salto y la recuperación de ataques aéreos existentes. **Propuesta sin implementar:** medir si necesita vulnerabilidad/compromiso tras el doble salto para evitar presión ilimitada. No cambiar frame data sin tests de balance.

### Expresión por arma: una única arma por combate
| Arma | Plan de juego | Riesgo principal |
|---|---|---|
| Daga | Rushdown, alcance corto y combos ágiles | Necesita acercarse |
| Espada | Presión técnica y mejor neutral | Recuperación de golpes largos |
| Martillo | Movilidad veloz con golpes contundentes | Animaciones y whiffs comprometidos |
| Lanza | Hostigamiento, spacing y ataques aéreos | Posible exceso de control del espacio |

El personaje aporta estadísticas, pasiva e identidad. El arma determina movimientos, hitboxes, alcance, timings, daño base y coreografía. **No ligar cuerpo ni vestuario a la daga.**

### Futuro tag (no implementado)
Posible personaje `point` para abrir defensas, con assist rápido y extensiones de combos. El sistema futuro previsto es 2 miembros por equipo con arma fija para cada uno y controles de tag/assist. No especificar comandos ni cooldowns todavía.

## 3. B — Diseño artístico

**Fuente original:** `public/img/aura.jpg`. **Referencia nueva:** concept sheet creado durante la planificación de Aura (vista heroica, frontal, perfil, espalda, detalles y paleta). Guardar el concept aprobado como arte de producción en una PR posterior; este archivo define sus características para modelado.

### Silueta y proporciones
- Figura esbelta, agilidad visual, cintura estrecha y piernas algo holgadas.
- Hombros marcados en forma angular y cuello/bufanda alta como rasgos inconfundibles.
- Cabeza algo estilizada para lectura a escala móvil; botas robustas que apoyen poses de lucha.
- Brazos y manos libres para sujetar correctamente armas cortas, largas o a dos manos.

### Cabeza
- **Cabello:** blanco plata con leves matices lilas, mechones marcados y volumen desordenado.
- **Máscara:** marfil-gris angular, acabado mate, grietas/planos discretos, ranuras oscuras afiladas en los ojos.
- Emoción por inclinación de cabeza, gestualidad corporal y luz; no depender de deformación facial.

### Vestuario
- Chaqueta técnica corta en color hueso con piezas rígidas en hombros/antebrazos.
- Interior oscuro; cuello alto y bufanda negra con detalles naranjas.
- Cinturones, hebillas, una tela asimétrica y pantalones amplios gris pizarra/violeta.
- Guantes articulados y botas reforzadas con discretos acentos luminosos.
- Piezas independientes del equipamiento; evitar clipping al sujetar martillo o lanza.

### Paleta preliminar
| Zona | Referencia hex | Tratamiento |
|---|---|---|
| Máscara y chaqueta | `#E7DDD5` | Mate, sombras grises cálidas |
| Cabello | `#E8E1F2` | Sombras lilas suaves |
| Cuello/armadura oscura | `#202027` | Grafito mate |
| Pantalón | `#514956` | Gris violáceo |
| Energía naranja | `#FF7A1A` | Emisión selectiva |

### Shader y cámara
- Three.js con cel-shading de **dos o tres bandas**, sombras duras y contorno controlado (silueta y planos clave).
- Materiales diferenciados para cabello, tela, máscara, metal y detalles emisivos.
- Sin brillos fotorrealistas que desdibujen la silueta; el naranja es acento, no iluminación dominante.
- Probar perfil de combate 2.5D, las dos orientaciones de personaje, fondos oscuros/claros y legibilidad en móvil.

## 4. C/D — Tareas y criterios de aceptación

1. Aprobar concept final: frontal, lateral, posterior, máscara ampliada, materiales y arma independiente.
2. Crear malla 3D con topología deformable en hombros, codos, muñecas, rodillas y cadera.
3. Mantener rig compatible con `tools/bl_retarget.py`, `models.js` y `anims.js`; conservar/ajustar sockets `WeaponR` / `FistR` y agarre a dos manos cuando proceda.
4. Preparar y validar idle, locomoción, saltos/doble salto, aterrizajes, bloqueo, daño, y ataques para las cuatro armas; los impactos visuales coinciden con los frames activos de `data.js`.
5. Exportar GLB y verificar escala, orientación, skinning, recortes, draw calls/FPS y compatibilidad con móvil.
6. Probar todas las combinaciones de Aura + arma en práctica y online. No alterar los cálculos deterministas sin tests.
7. Verificar licencias de assets en `CREDITOS.md`.

## 5. Historial

**v1.0 — 2026-11-16:** documentada línea base de Aura, dirección funcional A y propuesta artística B. Ningún cambio jugable incluido.

**v1.1 — 2026-11-16:** añadido contrato de referencia artística y generador de blockout no riggeado. v1.0 archivada en [history/AURA-v1.0.md](history/AURA-v1.0.md).

## 6. Identidad visual oficial y blockout — v1.1

**Dirección visual aprobada:** turnaround generado para Aura, con cuatro presentaciones: pose 3/4, frontal, perfil izquierdo y posterior, además de la daga insignia y paleta de colores. Archivo original: `hoja_técnica_de_giro_de_aura.png` (1448 × 1086, entregado junto a esta propuesta). **La imagen binaria debe incluirse en `character-documentation/images/aura-turnaround.png` antes de considerar cerrada la tarea documental.** Mientras no esté subida, este documento no debe anunciarla como archivo presente en GitHub.

Esta ilustración es una **referencia de dirección de arte**, no una lámina técnica perfectamente ortográfica: hay perspectivas y variaciones de pose. El modelador debe normalizar proporciones entre vistas antes de usarla como plano de modelado. La daga se presenta como arma insignia, pero su malla no debe fusionarse con el cuerpo.

### Blockout programático
- Archivo: `tools/bl_aura_blockout.py`.
- Comando: `blender -b --python tools/bl_aura_blockout.py -- --out aura-blockout.glb`.
- Genera piezas independientes de máscara, mechones, chaqueta, pantalones, botas, protección y manos, utilizando materiales planos y formas estilizadas.
- Los sockets de mano son **referencias espaciales**, no huesos de rig.
- **No es un modelo animable todavía**: no hay skinning, armature, topología final, texturas de producción ni evaluación de rendimiento real.
- No sustituir `public/assets/chars/cleric.glb` por este GLB. El juego continuará usando el modelo actual hasta superar pruebas de rig, animación y compatibilidad por arma.
- La escena define el color por material. En Three.js, el cel-shading y contorno deben aplicarse en `models.js` conforme a la versión de Three.js incluida en el proyecto.

### Criterios de aceptación de C
1. Reproducir y revisar las cuatro vistas con escala 2.76 del rig de referencia y centrarlo en X.
2. Verificar uso de máscara, mechones blancos, cuello oscuro/naranja, chaqueta crema, pantalón gris-violeta, botas oscuras.
3. Conservar ambas manos sin geometría de arma integrada y dejar clearance para lanza y martillo.
4. Después del blockout, **retopología, armature y retarget** sobre el esqueleto compartido: este paso aún no está hecho.
5. Comparar el archivo exportado con los tiempos de frames activos, y medir carga / draw calls sobre dispositivos objetivo antes de integrar.

### Estado de los ficheros
- `public/img/aura.jpg`: splash antiguo, conservar para comparar.
- `tools/bl_aura_blockout.py`: generador preliminar, no sustituye el asset que actualmente usa el juego.
- `character-documentation/images/aura-turnaround.png`: **pendiente de subir archivo original**.
