# NEÓN · Prototipo de pelea

Three.js + cel-shading. Online 1 vs 1 P2P (PeerJS / WebRTC) con lockstep determinista.

## Estructura
- `public/js/data.js`   personajes, armas, 10 ataques por arma, combos
- `public/js/sim.js`    simulación determinista a 60 Hz (rondas, reloj, bloqueo, armadura, KO)
- `public/js/net.js`    PeerJS + lockstep con retardo de entrada y resincronización
- `public/js/render.js` render 3D: escenario, partículas, cámara y armas
- `public/js/models.js` carga de modelos GLB, cel-shading y contorno con skinning
- `public/js/anims.js`  qué clip y en qué instante usa cada estado/ataque (deformado al frame data)
- `public/assets/chars/` modelos (`cleric`, `warrior`, `monk`, `rogue`, `wizard`) y `anims.glb` (44 clips)
- `tools/`              pipeline de Blender: retarget de animaciones y exportación de modelos
- `public/js/input.js`  joystick + swipes + botones, y teclado para depurar
- `public/js/main.js`   pantallas, práctica, online y HUD
- `test/`               pruebas en Node (combos, determinismo, online simulado)

## Documentación de personajes y reglas de colaboración

**Antes de cambiar personajes, armas, animaciones, balance o arte**, leer [character-documentation/README.md](character-documentation/README.md).

- [Estado actual del roster](character-documentation/ROSTER.md): estadísticas y pasivas verificadas de Aura, Vega, Kai y Sombra.
- [Ficha de Aura v1.0](character-documentation/AURA.md): diseño funcional A y dirección artística B.
- [Registro de decisiones](character-documentation/CHANGELOG.md): cambios documentados; las versiones anteriores se conservan en `character-documentation/history/` antes de cada revisión.
- **Regla actual:** 1v1; cada jugador escoge personaje y **una arma fija para todo el combate**, de entre las compatibles, no necesariamente su arma insignia.
- **Futuro, NO implementado:** modo con dos personajes por equipo, arma fija por personaje y botones de tag/assist.
- **Workflow de equipo:** cada modificación se propone en una rama y Pull Request a `main`; el responsable revisa y realiza el merge. Diferenciar lo implementado de lo propuesto; actualizar las fichas al tocar gameplay o arte.

## Desplegar
- **GitHub Pages**: automático en cada push a `main` (`.github/workflows/pages.yml`, pasa antes los tests).
- **Firebase** (opcional): `firebase deploy --only hosting`

## Ver el blockout experimental de Aura

En el menú principal, entra en **Ajustes → Ver personaje Aura · Vista 3D**. También puedes abrir directamente `aura_preview.html` una vez desplegada la web.

La vista 3D tiene giro con ratón o dedo, zoom y botones para frente, perfil y espalda. Utiliza `MeshToonMaterial` en un **modelo procedural simplificado** que representa el blockout, **no** el GLB final ni el personaje animado del juego. Este visor es independiente del renderizador de combate y no afecta a `cleric.glb`, las hitboxes ni la simulación. Código: `public/js/aura-preview.js`; estilos: `public/css/aura-preview.css`.

## Regenerar modelos y animaciones
1. Descarga RPG Characters, UAL1 y UAL2 (Standard) de Quaternius y descomprímelos en `assets_raw/rpg`, `assets_raw/ual1`, `assets_raw/ual`.
2. `pip install bpy` (Python 3.13) y ejecuta:
```bash
python tools/bl_retarget.py public/assets/chars
python tools/bl_chars.py public/assets/chars
```
3. Para revisar todos los clips: `anim_lab.html?char=warrior`. Retratos: `dev_portraits.html` + `tools/portraits.py`.

Rutas de `assets_raw` están fijadas al principio de cada script; ajústalas si cambias de carpeta.

## Probar el online sin dos móviles
Abre dos pestañas con `#mocknet` al final de la URL: una crea la sala (código TEST1) y la otra se une.

## Teclado (PC)
A/D andar · W saltar · S agacharse · J toque · flechas = swipes · K agarre · L bloqueo


## Créditos
Modelos y animaciones de Quaternius (CC0). Ver `CREDITOS.md`.
