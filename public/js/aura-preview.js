import * as THREE from 'three';
import { ModelFighter, ModelLibrary } from './models.js';
import { createAuraLook } from './aura-look.js';

const current = document.getElementById('preview-current');
const compare = document.getElementById('preview-compare');
const stage = document.getElementById('preview-stage');
const status = document.getElementById('preview-status');

async function openViewer() {
  const canvas = document.getElementById('aura-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 25);
  camera.position.set(4.2, 2.19, 6.2);
  camera.lookAt(0, 1.4, 0);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.78, 48), new THREE.MeshBasicMaterial({ color: '#211e30' }));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.y = 0.56;
  floor.position.y = -0.018;
  scene.add(floor);

  const library = new ModelLibrary();
  await library.preload(['aura']);
  const fighter = new ModelFighter(library, await library.loadChar('aura'), {
    model: 'aura', height: 2.76, outline: 0.016, doubleSide: true, cel: true, rimColor: '#FF7A1A',
  });
  fighter.turn.rotation.y = 0;
  scene.add(fighter.root);
  const setLook = createAuraLook(fighter);

  function render() {
    const width = Math.max(stage.clientWidth, 1);
    const height = Math.max(stage.clientHeight, 1);
    camera.top = Math.max(1.55, 0.82 * height / width);
    camera.bottom = -camera.top;
    camera.right = camera.top * width / height;
    camera.left = -camera.right;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    renderer.render(scene, camera);
  }
  function select(review) {
    setLook(review);
    current.setAttribute('aria-pressed', String(!review));
    compare.setAttribute('aria-pressed', String(review));
    render();
  }
  current.addEventListener('click', () => select(false));
  compare.addEventListener('click', () => select(true));
  select(false);
  if ('ResizeObserver' in window) new ResizeObserver(render).observe(stage);
  else window.addEventListener('resize', render);
  status.hidden = true;
  current.disabled = compare.disabled = false;
}

openViewer().catch(error => {
  console.error(error);
  status.textContent = 'No se pudo abrir el modelo de Aura. Comprueba que WebGL esté disponible y vuelve a cargar.';
});
