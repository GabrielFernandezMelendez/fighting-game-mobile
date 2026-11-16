# Modo «Contra la CPU»

Menú → **Contra la CPU** → luchador y arma → **rival y dificultad** → combate al mejor de 3. Al terminar: revancha, cambiar rival o menú. La dificultad y el rival se recuerdan.

## Cómo piensa la CPU (`public/js/cpu.js`)

Basado en lo que cuentan los juegos de referencia:

- **Street Fighter 6** (Capcom, ponencia en CEDEC 2024):
  - Cada acción es una **carta**. Las cartas se agrupan en **tácticas** según la situación.
  - Cada nivel tiene más tácticas y mejor **capacidad de ejecución**.
  - Un medidor de **presión** hace que falle más cuando le aprietan, y más en los niveles bajos.
- **Skullgirls**: cada nivel tiene **puntos fuertes y débiles claros** que enseñan algo al jugador (`lesson` en cada nivel).
- **Sin lectura de botones**: la CPU nunca mira la entrada del jugador. Solo ve el combate con retraso, su tiempo de reacción. Contra golpes más rápidos que su reacción no puede reaccionar: se cubre **por adelantado** cuando está a tiro, como haría una persona, y castiga después.

### Tácticas

Por orden de prioridad en cada fotograma:

1. **Combo:** si su golpe conecta, sigue la ruta de su nivel (1 a 4 golpes).
2. **Guardia:** mantiene el bloqueo y lo suelta para castigar si el rival falla.
3. **Defensa reactiva:** ve un golpe que le alcanza, se cubre según la probabilidad del nivel y adivina alto o bajo (`lowRead`). Ante un agarre: lo rompe agarrando a la vez, se aparta o lo come.
4. **Antiaéreo:** lanzador o bloqueo ante un salto.
5. **Castigo:** el rival falló un golpe y se está recuperando. Elige el golpe que más daño hace de los que llegan a tiempo.
6. **Neutral** (una decisión cada `think` fotogramas):
   - **Anti-tortuga:** agarre si el jugador se cubre mucho, porque el agarre rompe el bloqueo.
   - **Lejos:** acercarse caminando, con dash o saltando.
   - **A tiro:** cubrirse por adelantado, esperar, retroceder o atacar con mezcla de alto, bajo, golpe por arriba y agarre.
   - **Entre decisiones:** los niveles altos se quedan en guardia en vez de «en blanco».

El **alcance real** de cada golpe se mide al empezar con la propia simulación (`moveTable`): sirve para cualquier personaje o arma sin tablas a mano.

### Niveles

| | Reacción | Bloqueo | Alto/bajo | Antiaéreo | Castigo | Anti-tortuga | Combo |
|---|---|---|---|---|---|---|---|
| Aprendiz | 28 f | 12 % | 30 % | 5 % | 10 % | — | 1 |
| Luchador | 18 f | 42 % | 50 % | 30 % | 35 % | 20 % | 2 |
| Veterano | 11 f | 70 % | 75 % | 60 % | 65 % | 60 % | 3 |
| Leyenda | 7 f | 90 % | 88 % | 85 % | 90 % | 85 % | 4 |

Ajustes en `CPU_LEVELS` (`cpu.js`).

## Pruebas (`test/cpu.mjs`, en CI)

- Contra un jugador que aprieta, el % de golpes bloqueados sube con el nivel. Última ejecución: 0,13 · 0,49 · 0,69 · 0,78.
- Contra un jugador que solo se cubre, Aprendiz no agarra y Veterano y Leyenda sí.
- Leyenda gana a Aprendiz (CPU contra CPU).
- Misma semilla, mismo combate (determinista).

## Fuentes
- Automaton: «Street Fighter 6's CPU is designed to feel "pressured" just like a human and make input mistakes» (CEDEC 2024).
- Lab Zero: «A New Perspective on Single Player AI» (Skullgirls).
