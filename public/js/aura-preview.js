// NEÓN · Taller de Aura — revisión lateral 2.5D, SIN tocar el combate.
// La malla final se modela en Blender y se importa como GLB; las primitivas V3
// quedan solo de referencia hasta contar con un asset real aprobado.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { createAuraDetail } from './aura-detail.js';
import { installAuraPersonality } from './aura-personality.js';

const get = (id) => document.getElementById(id);
const stage = get('preview-stage');
const canvas = get('aura-canvas');
const status = get('preview-status');
const assetStatus = get('preview-asset-status');
const fallbackButton = get('preview-fallback');
const poseButton = get('preview-pose');
const motionButton = get('preview-motion');
const weaponButton = get('preview-weapon');
const zoomIn = get('preview-zoom-in');
const zoomOut = get('preview-zoom-out');
const fileInput = get('preview-upload');

function notice(message, error = false) {
  status.textContent = message;
  status.dataset.error = String(error);
}
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
  });
} catch (error) {
  notice('No se pudo iniciar WebGL. Comprueba la aceleración gráfica del navegador.', true);
  throw error;
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 50);
const focus = new THREE.Vector3(0, 1.39, 0);
// Vista lateral 2.5D: sin orbit controls ni giro del avatar.
// Pequeña componente frontal para leer la máscara y pecho en combate.
const sideDirection = new THREE.Vector3(6.5, 2.35, 0.85).sub(new THREE.Vector3(0, 1.39, 0)).normalize();
camera.position.copy(focus).addScaledVector(sideDirection, 8);
camera.lookAt(focus);
let zoom = 1;
function updateCamera() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const visibleHeight = 3.70 / zoom;
  const aspect = width / height;
  camera.left = -visibleHeight * aspect * 0.5;
  camera.right = visibleHeight * aspect * 0.5;
  camera.top = visibleHeight * 0.5;
  camera.bottom = -visibleHeight * 0.5;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
function changeZoom(delta) {
  zoom = THREE.MathUtils.clamp(zoom + delta, 0.7, 1.8);
  updateCamera();
}
zoomIn.addEventListener('click', () => changeZoom(0.15));
zoomOut.addEventListener('click', () => changeZoom(-0.15));
get('preview-reset').addEventListener('click', () => {
  zoom = 1;
  updateCamera();
});
window.addEventListener('resize', updateCamera);
if ('ResizeObserver' in window) new ResizeObserver(updateCamera).observe(stage);

scene.add(new THREE.HemisphereLight(0xf9edf3, 0x393346, 1.45));
const keyLight = new THREE.DirectionalLight(0xfff4ed, 2.9);
keyLight.position.set(2.0, 5.0, 3.5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xff9947, 1.3);
rimLight.position.set(-4.0, 3.0, -2.0);
scene.add(rimLight);
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(0.76, 48),
  new THREE.MeshBasicMaterial({color:0x30283b})
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.026;
scene.add(floor);

// Material toon para el prototipo. GLB conserva materiales/UV propios;
// los shaders definitivos del modelo importado se aprobarán por separado.
const ramp = new THREE.DataTexture(new Uint8Array([
  88, 88, 88, 255, 169, 169, 169, 255, 255, 255, 255, 255
]), 3, 1, THREE.RGBAFormat);
ramp.magFilter = ramp.minFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
const colors = {
  ivory:'#e7ddd5', hair:'#e8e1f2', charcoal:'#202027',
  purple:'#514956', armor:'#393640', orange:'#ff7a1a', black:'#080810',
  skin:'#bf907f', purpleLight:'#74677c', darkMetal:'#302c3a', hairShade:'#c4b6d2'
};
const materials = Object.fromEntries(Object.entries(colors).map(([key, color]) =>
  [key, new THREE.MeshToonMaterial({color, gradientMap:ramp})]
));
const fallback = createAuraDetail(THREE, materials);
scene.add(fallback.root);
const personality = installAuraPersonality(THREE, fallback);
fallback.weapon.visible = false;
let dagger = false;

// GLB cargado desde public/assets/previews/ o arrastrado por el usuario.
let imported = null;
let referenceOnly = false;
let importedMixer = null;
let clips = [];
let activeAction = null;
let currentPose = 'idle';
let motion = true;
let showingFallback = true;
const loader = new GLTFLoader();

function normalizeModel(group) {
  const bounds = new THREE.Box3().setFromObject(group);
  if (bounds.isEmpty()) throw new Error('El GLB no contiene geometría visible');
  const size = bounds.getSize(new THREE.Vector3());
  if (!(size.y > 0.001) || size.y > 10000) throw new Error('Altura de modelo no válida');
  const center = bounds.getCenter(new THREE.Vector3());
  const factor = 2.76 / size.y;
  const wrapper = new THREE.Group();
  wrapper.name = 'AuraGLBPreviewNormalized';
  wrapper.add(group);
  group.scale.setScalar(factor);
  group.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor);
  return wrapper;
}
function findClip(pose) {
  const matchers = pose === 'guard'
    ? [/guard/i, /block/i, /combat.*idle/i, /fight.*idle/i]
    : [/^idle$/i, /idle/i, /breath/i, /stand/i];
  for (const rx of matchers) {
    const clip = clips.find(c => rx.test(c.name));
    if (clip) return clip;
  }
  return pose === 'idle' ? (clips[0] || null) : null;
}
function applyClip() {
  if (!importedMixer) return;
  const clip = findClip(currentPose);
  if (activeAction) activeAction.fadeOut(0.12);
  if (!clip) {
    activeAction = null;
    notice('El GLB no contiene un clip compatible con esta pose; revisión estática.');
    return;
  }
  activeAction = importedMixer.clipAction(clip);
  activeAction.reset().fadeIn(0.12).play();
  activeAction.paused = !motion;
}
function syncControls() {
  fallback.root.visible = showingFallback;
  if (imported) imported.visible = !showingFallback;
  fallbackButton.disabled = !imported;
  fallbackButton.textContent = showingFallback
    ? (referenceOnly ? 'Ver relieve de Aura' : 'Mostrar modelo GLB')
    : 'Comparar con V3';
  weaponButton.disabled = !showingFallback;
  poseButton.disabled = !showingFallback && referenceOnly;
  motionButton.disabled = !showingFallback && referenceOnly;
  fallback.weapon.visible = showingFallback && dagger;
  weaponButton.setAttribute('aria-pressed', String(dagger && showingFallback));
  poseButton.textContent = currentPose === 'guard' ? 'Pose relajada' : 'Pose de combate';
  motionButton.textContent = motion ? 'Pausar movimiento' : 'Reanudar movimiento';
}
function setPose(next) {
  currentPose = next;
  personality.setPose(next);
  if (!showingFallback) applyClip();
  syncControls();
}
poseButton.addEventListener('click', () => setPose(currentPose === 'guard' ? 'idle' : 'guard'));
motionButton.addEventListener('click', () => {
  motion = !motion;
  personality.setPlaying(motion);
  if (activeAction) activeAction.paused = !motion;
  syncControls();
});
weaponButton.addEventListener('click', () => { dagger = !dagger; syncControls(); });
fallbackButton.addEventListener('click', () => {
  if (!imported) return;
  showingFallback = !showingFallback;
  if (!showingFallback) applyClip();
  syncControls();
  assetStatus.textContent = showingFallback
    ? 'Comparación: prototipo 3D V3 (no es malla de producción)'
    : (referenceOnly
      ? 'Relieve 2.5D de referencia · es una ilustración con profundidad, sin rigging'
      : 'Modelo GLB cargado — cámara lateral fija');
});
// Render review: convert standard PBR GLB materials into a readable 3-band
// toon preview, preserving base color, texture, alpha and emissive maps.
// Final authored materials/shading still require separate art approval.
function applyToonReview(model) {
  const cache = new Map();
  model.traverse(object => {
    if (!object.isMesh || !object.material) return;
    const convert = original => {
      if (original.isMeshToonMaterial) return original;
      if (cache.has(original)) return cache.get(original);
      const shaded = new THREE.MeshToonMaterial({
        color: original.color ? original.color.clone() : new THREE.Color(0xffffff),
        map: original.map || null,
        gradientMap: ramp,
        emissive: original.emissive ? original.emissive.clone() : new THREE.Color(0x000000),
        emissiveMap: original.emissiveMap || null,
        transparent: original.transparent === true,
        opacity: original.opacity ?? 1,
        alphaTest: original.alphaTest ?? 0,
        side: original.side ?? THREE.FrontSide,
        vertexColors: original.vertexColors === true
      });
      cache.set(original, shaded);
      return shaded;
    };
    object.material = Array.isArray(object.material)
      ? object.material.map(convert)
      : convert(object.material);
  });
}
// A concept relief has a color texture that must be preserved without changing
// its painted shadows. Only actual 3D models get the basic toon test shader.
function preserveReferenceColors(root) {
  root.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;
    const convert = old => new THREE.MeshBasicMaterial({
      color: old.color ? old.color.clone() : new THREE.Color(0xffffff),
      map: old.map || null,
      transparent: true, opacity: old.opacity ?? 1,
      alphaTest: 0.1, side: THREE.DoubleSide,
      depthWrite: false, toneMapped: false
    });
    obj.material = Array.isArray(obj.material) ? obj.material.map(convert) : convert(obj.material);
  });
}
function acceptGLTF(gltf, label, {conceptRelief = false} = {}) {
  referenceOnly = conceptRelief;
  if (conceptRelief) {
    // The source texture is projected toward +X; flip Z so it reads correctly
    // from the established camera on +X, without allowing free rotation.
    gltf.scene.rotation.y = Math.PI;
    gltf.scene.updateMatrixWorld(true);
    preserveReferenceColors(gltf.scene);
  } else {
    applyToonReview(gltf.scene);
  }
  const normalized = normalizeModel(gltf.scene);
  if (imported) scene.remove(imported);
  if (importedMixer) importedMixer.stopAllAction();
  imported = normalized;
  scene.add(imported);
  clips = gltf.animations || [];
  importedMixer = clips.length ? new THREE.AnimationMixer(gltf.scene) : null;
  activeAction = null;
  showingFallback = false;
  currentPose = 'idle';
  applyClip();
  syncControls();
  assetStatus.textContent = label + ' · ' + clips.length + ' animaciones';
  notice(conceptRelief
    ? 'Referencia 2.5D cargada: imagen del concept sobre un relieve superficial. No es el personaje 3D definitivo.'
    : 'GLB 3D cargado. Revisa silueta, rigging y fidelidad al concept desde el lateral.');
}
// File input requires a self-contained GLB (embedded textures).
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.glb') || file.size > 35 * 1024 * 1024) {
    notice('Selecciona un archivo .glb de máximo 35 MB.', true);
    return;
  }
  notice('Cargando modelo local…');
  try {
    const buffer = await file.arrayBuffer();
    const gltf = await loader.parseAsync(buffer, '');
    acceptGLTF(gltf, 'GLB local: ' + file.name);
  } catch (error) {
    notice('No se pudo abrir el GLB: ' + error.message, true);
  } finally {
    fileInput.value = '';
  }
});
// Full-resolution concept reference. Prefer a published PNG, but never hide
// a missing asset: let the user load the original PNG locally without upload.
const conceptImage = get('aura-concept-image');
const conceptLink = get('aura-concept-open');
const conceptStatus = get('preview-concept-status');
const conceptInput = get('preview-concept-upload');
const conceptZoom = get('preview-concept-zoom');
const conceptPath = './assets/previews/aura_concept_v3.png';
const conceptFallback = './img/aura.jpg';
let localConceptUrl = null;
let conceptFailed = false;
conceptImage.addEventListener('error', () => {
  if (conceptFailed) return;
  conceptFailed = true;
  conceptImage.src = conceptFallback;
  conceptLink.href = conceptFallback;
  conceptStatus.textContent = 'Falta el PNG original en GitHub. Selecciona «Ver PNG original» para usar la versión de alta resolución de tu ordenador.';
});
conceptImage.addEventListener('load', () => {
  if (!conceptFailed) conceptStatus.textContent = 'Referencia PNG de alta resolución cargada.';
});
conceptInput.addEventListener('change', () => {
  const image = conceptInput.files?.[0];
  if (!image) return;
  if (image.type !== 'image/png' || image.size > 15 * 1024 * 1024) {
    conceptStatus.textContent = 'Selecciona un archivo PNG de menos de 15 MB.';
    conceptInput.value = '';
    return;
  }
  if (localConceptUrl) URL.revokeObjectURL(localConceptUrl);
  localConceptUrl = URL.createObjectURL(image);
  conceptFailed = false;
  conceptImage.src = localConceptUrl;
  conceptLink.href = localConceptUrl;
  conceptStatus.textContent = 'Concept original: ' + image.name + ' — visualización local a resolución completa.';
  conceptInput.value = '';
});
conceptZoom.addEventListener('click', () => {
  if (conceptLink.href) window.open(conceptLink.href, '_blank', 'noopener');
});
window.addEventListener('pagehide', () => {
  if (localConceptUrl) URL.revokeObjectURL(localConceptUrl);
});

// Deployable config: modelUrl is null until an authored/rigged file is supplied.
// No intentional 404s or fake production assets.
async function loadConfiguredGLB() {
  try {
    const response = await fetch('./assets/previews/aura.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Configuración de preview no disponible');
    const config = await response.json();
    if (!config.modelUrl) {
      assetStatus.textContent = 'Pendiente de modelo Blender/GLB · mostrando prototipo V3';
      notice('Todavía no hay GLB definitivo. Puedes cargar uno con «Probar GLB local».');
      return;
    }
    if (!/^assets\/previews\/[\w./-]+\.glb$/.test(config.modelUrl) || config.modelUrl.includes('..')) {
      throw new Error('Ruta GLB no autorizada en configuración');
    }
    notice('Cargando modelo 3D desde el repositorio…');
    const gltf = await loader.loadAsync('./' + config.modelUrl);
    acceptGLTF(gltf, config.previewType === 'concept-relief'
      ? 'Relieve de concept 2.5D' : 'Asset del repositorio: ' + config.modelUrl,
      {conceptRelief: config.previewType === 'concept-relief'});
  } catch (error) {
    assetStatus.textContent = 'Modo de reserva: prototipo V3';
    notice('No hay GLB utilizable. Se conserva la vista V3: ' + error.message, true);
  }
}
syncControls();
updateCamera();
loadConfiguredGLB();
const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (showingFallback) personality.update(dt);
  else if (importedMixer && motion) importedMixer.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
