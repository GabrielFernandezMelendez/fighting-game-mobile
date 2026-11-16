# NEÓN — Roster actual (baseline)

**Versión:** 1.0 · **Fecha:** 2026-11-16 · **Estado:** valores existentes en `public/js/data.js`, no cambios propuestos.

| Personaje | Modelo GLB actual | Arma predeterminada | Fuerza | Destreza | Defensa | Velocidad | Cadena máx. | Pasiva |
|---|---|---|---:|---:|---:|---:|---:|---|
| Aura | cleric | dagger | 3 | 8 | 4 | 7 | 5 | Doble salto y reinicio de ataques aéreos |
| Vega | warrior | sword | 5 | 6 | 5 | 6 | 6 | Cadenas de ataques más largas |
| Kai | monk | hammer | 8 | 3 | 8 | 3 | 4 | Armadura en golpes atrás y arriba |
| Sombra | rogue | spear | 5 | 7 | 4 | 6 | 5 | Golpes bajos que derriban |

Las cuatro armas seleccionables en `public/js/main.js` son `dagger`, `sword`, `hammer` y `spear`. `CHARS[id].weapon` indica el arma predeterminada, no una restricción del personaje. La selección es una pareja `{ c, w }`; se conserva durante el combate.

Datos derivados actuales: `hp = 750 + 55 * defensa`, `walkF = 1.4 + 0.15 * velocidad`, `walkB = 1.05 + 0.11 * velocidad`, `jumpV = 6.0 + 0.13 * velocidad`. El ataque y daño combinan arma y atributos mediante `damageMult`.

**Meta de diseño acordada:** conservar la compatibilidad personaje × arma y preparar la arquitectura para **dos personajes por equipo, cada uno con su arma fija, tag y assist**, en una fase posterior, sin implementarlo ahora.

La ficha aprobable de cada personaje debe reflejar diferencias respecto a este estado inicial y enlazar su versión previa en `history/`.
