import { appDisplayModes, isInstalledApp } from './app-mode.js';

const button = document.querySelector('#bInstall');
const guide = document.querySelector('#installGuide');
const isIOS = typeof navigator.standalone === 'boolean' || /iPhone|iPad|iPod/.test(navigator.userAgent);
let installPrompt = null;

function updateButton() {
  button.hidden = isInstalledApp();
}

addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});

addEventListener('appinstalled', () => {
  installPrompt = null;
  button.hidden = true;
});

for (const mode of appDisplayModes) mode?.addEventListener('change', updateButton);
addEventListener('fullscreenchange', updateButton);
updateButton();

button.addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') button.hidden = true;
      return;
    } catch { /* El menú del navegador sigue siendo una opción. */ }
  }

  document.querySelector('#installStepsIOS').hidden = !isIOS;
  document.querySelector('#installStepsBrowser').hidden = isIOS;
  guide.showModal();
});
