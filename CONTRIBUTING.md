# Cómo colaborar en NEÓN sin romper nada

Esta guía es para cualquier persona que se une al proyecto, sea de diseño, arte o código. La regla de oro: **nadie sube cambios directamente a `main`**. Todo llega mediante un **Pull Request (PR)**, el responsable lo revisa y, si está bien, lo fusiona. Al fusionar, la web https://peleasdemo.web.app se actualiza sola.

Si trabajas con Blender, lee también [docs/diseno/ARCHIVOS_BLENDER.md](docs/diseno/ARCHIVOS_BLENDER.md).

## 1. Preparar el equipo (una vez)

1. **Git**: en Windows, [Git for Windows](https://git-scm.com/download/win). Incluye **Git Bash**; todos los comandos de esta guía se escriben ahí.
2. **GitHub CLI** (`gh`): [cli.github.com](https://cli.github.com). Después ejecuta una vez `gh auth login` y elige GitHub.com → HTTPS → navegador.
3. **Python 3** ([python.org](https://www.python.org/downloads/)), para el servidor local. Al instalarlo, marca «Add Python to PATH».
4. **Blender 5.3 o superior**, si vas a tocar modelos.
5. **Node.js**, solo si vas a tocar código y quieres pasar los tests.

## 2. Copiar el proyecto (fork) a tu ordenador

Un **fork** es tu copia del proyecto en tu cuenta de GitHub. Trabajas en ella sin tocar el original, y desde ella propones los cambios.

```bash
cd ~/Documents                      # o la carpeta donde quieras el proyecto
gh repo fork GabrielFernandezMelendez/fighting-game-mobile --clone
cd fighting-game-mobile
```

Este comando crea el fork en tu cuenta, lo descarga y configura dos remotos: `origin` (tu fork) y `upstream` (el proyecto original).

## 3. Ver el juego en local

```bash
python -m http.server 8080 -d public
```

Abre **http://localhost:8080** en el navegador. Para el visor de Aura: http://localhost:8080/aura_preview.html. Para parar el servidor: **Ctrl + C**.

En el móvil, conectado a la misma wifi, abre `http://<IP-de-tu-ordenador>:8080`. La IP la ves con `ipconfig` en Windows.

## 4. Cada tarea, paso a paso

```bash
# 1) ponte al día con el proyecto original
git switch main
git fetch upstream
git merge --ff-only upstream/main
git push origin main

# 2) crea una rama para la tarea (nombre corto, sin espacios ni tildes)
git switch -c diseno/aura-pantalon

# 3) trabaja: Blender, imágenes, código… y guarda

# 4) revisa qué has cambiado
git status

# 5) guarda los cambios con un mensaje claro
git add art/aura/aura_partes.blend
git commit -m "Aura: pantalón separado en dos partes para las sombras"

# 6) súbelos a tu fork y abre el Pull Request
git push -u origin diseno/aura-pantalon
gh pr create --repo GabrielFernandezMelendez/fighting-game-mobile --fill --web
```

`gh pr create … --web` abre el navegador con el PR listo. Rellena la plantilla y pulsa **Create pull request**.

Si te piden cambios en el PR, hazlos en la misma rama, y después `git add`, `git commit` y `git push`. El PR se actualiza solo.

### Nombres de rama

| Prefijo | Para |
|---|---|
| `diseno/…` | modelos, color, partes, poses |
| `anim/…` | animaciones |
| `arte/…` | concept, ilustraciones, interfaz |
| `fix/…` | arreglos |
| `docs/…` | documentación |

## 5. Reglas para no dar problemas

1. **Una rama y un PR por tarea.** Pequeños y frecuentes: mejor tres PR de una tarde que uno de una semana.
2. **Nunca a `main`.** Ni en tu fork: trabaja siempre en una rama.
3. **Los `.blend` son de uno en uno.** Antes de tocar uno, avisa (en la pizarra de tareas o al responsable). Git no puede mezclar dos versiones de un archivo de Blender.
4. **No edites los modelos del juego** de `public/assets/chars/*.glb`. Se generan desde `art/` con los scripts de `tools/`.
5. **No cambies nombres** de huesos, materiales ni partes (`Aura_…`), ni carpetas, sin hablarlo antes.
6. **Nada con derechos de autor**: ni personajes, logos o texturas de otros juegos, ni modelos o animaciones sin licencia libre. Lo que uses de terceros va en [CREDITOS.md](CREDITOS.md).
7. **Tamaño**: imágenes en PNG, WebP o JPG a la resolución necesaria, y nada de vídeos pesados en el repositorio. Por encima de 50 MB, pregunta.
8. **Documenta lo que cambia el diseño**: una línea en [character-documentation/CHANGELOG.md](character-documentation/CHANGELOG.md). Si cambias la ficha de un personaje, guarda antes la versión anterior en `character-documentation/history/`.
9. **Capturas en el PR**: si el cambio se ve, añade una imagen del antes y otra del después.

## 6. Qué pasa con tu PR

1. GitHub pasa los tests automáticos. La primera vez, el responsable tiene que aprobar que se ejecuten.
2. El responsable revisa el PR, comenta o pide cambios.
3. Cuando está aprobado, lo fusiona. Unos minutos después el cambio está en https://peleasdemo.web.app.
4. Vuelve al paso 4.1 para ponerte al día antes de la siguiente tarea.

## 7. Si algo se tuerce

| Problema | Solución |
|---|---|
| He cambiado algo sin querer y no lo he guardado con commit | `git restore <archivo>` (vuelve a la última versión guardada) |
| He hecho commit en `main` sin querer | `git switch -c mi-rama` (te llevas el commit a una rama) y avisa |
| `git merge --ff-only upstream/main` falla | Tienes commits en `main`: avisa y lo arreglamos juntos |
| El PR dice que hay conflictos | No lo intentes a mano con archivos `.blend`: avisa |
| No sé qué archivo tocar | Pregunta antes de empezar |
