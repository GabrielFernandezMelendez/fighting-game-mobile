# Sombra · prototipo 3D

Primera malla volumétrica editable de Sombra, con capucha de rostro oculto, bufanda, bolsa asimétrica, vendaje y pantalón ancho. Referencia de forma y paleta en la [lámina de Sombra](https://chatgpt.com/library?file_id=libfile_a409e672cfa48191b5bc6bd36f43d025&account_id=personal). Se aplicaron las pautas de [NEÓN Art Style](https://github.com/GabrielFernandezMelendez/fighting-game-mobile/pull/16) para las masas de color, la silueta lateral y el cel-shading.

- `sombra_prototype.blend` contiene piezas editables, nueve colores de material y el esqueleto del juego. La base se construyó directamente en Blender. El exportador usa una sola malla con grupos de material y color plano por cara para la tinta interior. El arma se monta durante la partida.
- `public/assets/chars/sombra.glb` se activa con `index.html?sombra3d` en **Práctica → Sombra**. Comparar con una partida sin el parámetro.
- Comparación en Blender desde [tres cuartos](../../character-documentation/references/sombra/prototype/tres-cuartos.png) y [perfil](../../character-documentation/references/sombra/prototype/perfil.png). Estas capturas muestran geometría y materiales en Blender Workbench.

## Regenerar

Desde la raíz del repositorio, con Blender 4.3:

```bash
blender -b --python-exit-code 1 --python tools/bl_sombra_prototype.py
```

El script guarda la fuente antes de unir las piezas para exportar. La malla tiene 3.280 triángulos y cada vértice tiene pesos normalizados. El esqueleto comparte transformaciones de reposo con Aura y usa sus 44 clips existentes. El socket de la mano permite montar el arma seleccionada mediante el código del juego.

## Estado de revisión

Se comprobaron la carga GLB mediante Three.js, el salto, los 44 clips disponibles y el montaje de las cuatro armas. La validación visual en partida con WebGL y en móvil sigue pendiente. La malla necesita otra pasada artística para afinar pliegues, bordado, manos, botas y deformación en poses extremas. Usa el cel-shading, la tinta interior y el contorno del juego.
