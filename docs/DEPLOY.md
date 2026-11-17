# Deploy automático en Firebase (peleasdemo)

Con `.github/workflows/firebase.yml`:
- **Merge en `main`** → tests → deploy a https://peleasdemo.web.app. Ya no hace falta `firebase deploy` desde el PC.
- **Cada PR** → solo tests (no se crea vista previa, para no agotar los canales de Hosting).
- **Volver atrás**: Firebase Console → Hosting → historial de versiones → «Revertir» en la versión buena.
- GitHub Pages (`pages.yml`) sigue funcionando igual.

## Configuración (una sola vez)

Hace falta un secreto con una cuenta de servicio de Firebase. Dos opciones:

### A. Desde el PC (la más rápida, ~2 min)
```bash
cd ~/Desktop/"Proyectos personales"/Juegos/fightinggame/fighting-game-mobile
firebase init hosting:github
```
- Repositorio: `GabrielFernandezMelendez/fighting-game-mobile`.
- Acepta que cree la cuenta de servicio y que suba el secreto (lo llamará `FIREBASE_SERVICE_ACCOUNT_PELEASDEMO`).
- A "¿build script?" responde **No**. A "¿sobrescribir workflows?" responde **No**: ya están en el repo.
- Si te pregunta por `public`/`firebase.json`, no sobrescribas nada.

### B. Desde el navegador (también desde el móvil)
1. Firebase Console → proyecto **peleasdemo** → ⚙️ Configuración del proyecto → **Cuentas de servicio** → **Generar nueva clave privada** (descarga un `.json`).
2. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**.
   - Nombre: `FIREBASE_SERVICE_ACCOUNT_PELEASDEMO`
   - Valor: el contenido completo del `.json`.
3. Borra el `.json` descargado: es una credencial.

Comprobación: en la pestaña **Actions** del repo, relanza «Desplegar en Firebase» (`Run workflow`); debe terminar en verde y la web se actualiza.

**Seguridad:** la clave solo vive como secreto de GitHub. Los PR de forks no reciben el secreto ni despliegan.
