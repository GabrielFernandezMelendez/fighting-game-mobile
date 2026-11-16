const standalone = globalThis.matchMedia?.('(display-mode: standalone)');
const fullscreen = globalThis.matchMedia?.('(display-mode: fullscreen)');
export const appDisplayModes = [standalone, fullscreen];

export function isInstalledApp() {
  return globalThis.navigator?.standalone === true || standalone?.matches === true ||
    (fullscreen?.matches === true && !globalThis.document?.fullscreenElement);
}
