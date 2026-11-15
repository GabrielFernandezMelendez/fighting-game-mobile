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

## Desplegar
- **GitHub Pages**: automático en cada push a `main` (`.github/workflows/pages.yml`, pasa antes los tests).
- **Firebase** (opcional): `firebase deploy --only hosting`

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
