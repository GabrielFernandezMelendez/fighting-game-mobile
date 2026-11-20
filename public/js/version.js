// Versión del juego. Al desplegar, GitHub Actions sustituye __BUILD__ por el commit (ver .github/workflows/firebase.yml).
export const VERSION = '0.5.0';
export const BUILD = '__BUILD__'.startsWith('__') ? 'local' : '__BUILD__';
// Opciones de desarrollador: se activan pulsando 7 veces la versión en Ajustes (se guardan en neon-settings.dev)
export const devMode = () => { try { return !!JSON.parse(localStorage.getItem('neon-settings') || '{}').dev; } catch { return false; } };
