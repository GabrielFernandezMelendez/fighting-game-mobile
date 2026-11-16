const button = document.querySelector('#bInstall');
const guide = document.querySelector('#installGuide');
const standalone = matchMedia('(display-mode: standalone)');
const fullscreen = matchMedia('(display-mode: fullscreen)');
const isIOS = typeof navigator.standalone === 'boolean' || /iPhone|iPad|iPod/.test(navigator.userAgent);
let installPrompt = null;

function updateButton() {
  button.hidden = navigator.standalone === true || standalone.matches ||
    (fullscreen.matches && !document.fullscreenElement);
}

addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});

addEventListener('appinstalled', () => {
  installPrompt = null;
  button.hidden = true;
});

standalone.addEventListener('change', updateButton);
fullscreen.addEventListener('change', updateButton);
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
