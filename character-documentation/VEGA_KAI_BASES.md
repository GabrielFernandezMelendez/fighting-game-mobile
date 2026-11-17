# Bases 3D de Vega y Kai

Primera pasada de volumen y materiales para probar la lectura lateral de ambos luchadores. La referencia visual son sus láminas de concept. Las bases ya tienen esqueleto, pesos normalizados y el punto de anclaje del arma del juego.

| Base | Rasgos trasladados | Triángulos | Vista de Blender |
|---|---|---:|---|
| Vega | Coleta, flequillo oscuro, acentos cian, placas angulares y tabardo granate | 4.964 | [Vega](references/vega/base.png) |
| Kai | Cabeza rapada, barba clara, collar de cuentas, hombrera asimétrica, fajín y filete dorado | 6.596 | [Kai](references/kai/base.png) |

## Prueba en Three.js

Abre `index.html?roster3d` y selecciona Vega o Kai en **Campo de práctica**. El parámetro activa las bases de ambos. El juego sigue montando el arma elegida en su socket y aplica los clips de Aura como pruebas de deformación. Ninguna de las dos bases contiene un arma fija ni cambios de sim, daño o hitboxes.

Compartir el esqueleto de reposo permite revisar clips existentes. La siguiente revisión de arte debe afinar caras, pliegues, manos y piezas de armadura. La coleta de Vega todavía sigue el hueso de la cabeza. Queda comprobar visualmente en partida las deformaciones y los agarres, sobre todo las poses de martillo a dos manos.

## Fuentes editables

- [Vega](../art/vega/vega_base.blend)
- [Kai](../art/kai/kai_base.blend)

Desde la raíz del repositorio:

```bash
blender -b --python-exit-code 1 --python tools/bl_roster_bases.py -- vega
blender -b --python-exit-code 1 --python tools/bl_roster_bases.py -- kai
```

Se exportan modelos GLB con colores planos por cara para el cel-shading y la tinta de Three.js.

## Aura en el taller

En `aura_preview.html`, pulsa **Aura del juego** para cargar la malla de combate con su esqueleto y sus clips. **Ver colores del juego** alterna con la paleta de revisión sin cambiar el modelo. La revisión separa el marfil cálido de la chaqueta de la máscara, aclara el pelo hacia lavanda y distingue el gris violeta del pantalón del grafito y de los acentos naranja. Aplica dos bandas de luz, sombra por zona, tinta y un contorno de 0,012. Las poses y el ataque son referencias de animación del cuerpo; el taller no monta la daga en esta vista.
