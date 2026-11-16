// Regression test: main menu must be able to initialize after navigation listeners are bound.
// Run: node test/ui-shell.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const main = readFileSync(new URL('../public/js/main.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const viewer = readFileSync(new URL('../public/aura_preview.html', import.meta.url), 'utf8');
assert.ok(html.includes('id="s-menu"'), 'main menu missing from HTML');
assert.ok(html.includes('id="bAuraPreview"'), 'Aura preview button missing from HTML');
assert.ok(html.includes('id="s-settings"'), 'settings screen missing');
assert.ok(
  main.includes("document.querySelectorAll('[data-back]').forEach") ||
  main.includes("$$('[data-back]').forEach"),
  'back buttons must be selected with querySelectorAll / $$, not querySelector / $'
);
assert.ok(main.includes("show('s-menu')"), 'main menu initialization missing');
assert.ok(viewer.includes('id="aura-canvas"'), 'Aura 3D viewer canvas missing');
// The side-view preview is intentionally not an orbit/3D blockout editor.
for (const id of ['preview-fallback','preview-weapon','preview-pose','preview-motion',
  'preview-reset','preview-zoom-in','preview-zoom-out','preview-upload','preview-asset-status']) {
  assert.ok(viewer.includes('id="' + id + '"'), 'missing sideview control ' + id);
}
for (const retired of ['preview-front','preview-side','preview-back','preview-mode']) {
  assert.ok(!viewer.includes('id="' + retired + '"'), 'retired orbit control ' + retired + ' remains');
}
for (const id of ['aura-concept-image','aura-concept-open','preview-concept-upload',
  'preview-concept-zoom','preview-concept-status']) {
  assert.ok(viewer.includes('id="' + id + '"'), 'missing high-res concept control '+id);
}
assert.ok(viewer.includes('assets/previews/aura_concept_v3.png'),
  'PNG reference path not used by the visor');
const preview = readFileSync(new URL('../public/js/aura-preview.js', import.meta.url), 'utf8');
const personality = readFileSync(new URL('../public/js/aura-personality.js', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../public/js/aura-detail.js', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../public/assets/previews/aura.json', import.meta.url),'utf8'));
assert.equal(config.modelUrl, 'assets/previews/aura-concept-relief.glb',
  'approved concept relief should load by default');
assert.equal(config.previewType, 'concept-relief',
  'reference-only preview must not be labeled as production model');
assert.equal(config.productionModelUrl, null,
  'the production rigged model has not been delivered');
const conceptPNG = readFileSync(new URL('../public/assets/previews/aura_concept_v3.png', import.meta.url));
assert.equal(conceptPNG.subarray(0,8).toString('hex'), '89504e470d0a1a0a',
  'Aura concept must be a real PNG (not an SVG preview)');
assert.equal(conceptPNG.readUInt32BE(16),1672,'Aura concept must preserve original width');
assert.equal(conceptPNG.readUInt32BE(20),941,'Aura concept must preserve original height');
const reliefGLB = readFileSync(new URL('../public/assets/previews/aura-concept-relief.glb', import.meta.url));
assert.equal(reliefGLB.subarray(0,4).toString('ascii'),'glTF','reference must be a binary GLB');
assert.equal(reliefGLB.readUInt32LE(4),2,'reference GLB version must be 2');
assert.ok(preview.includes('new THREE.OrthographicCamera('), 'side orthographic camera missing');
assert.ok(!preview.includes('canvas.addEventListener(\'pointermove\''), 'orbit dragging must be disabled');
assert.ok(preview.includes('new GLTFLoader()'), 'GLB loader missing');
assert.ok(preview.includes("URL.createObjectURL(image)"), 'local hi-res image support missing');
assert.ok(preview.includes('loader.parseAsync(buffer'), 'local GLB test path missing');
assert.ok(preview.includes('preserveReferenceColors(gltf.scene)'),
  'reference paint colors must not be overwritten by toon shader');
assert.ok(preview.includes("config.previewType === 'concept-relief'"),
  '3D concept relief should be distinguished from rigged production GLB');
assert.ok(preview.includes('createAuraDetail(THREE, materials)'), 'V3 fallback must remain available');
assert.ok(preview.includes('installAuraPersonality(THREE, fallback)'), 'V3 fallback idle missing');
assert.ok(personality.includes('export function installAuraPersonality'), 'personality factory missing');
assert.ok(detail.includes('AURA_SIGNATURE_DAGGER'), 'signature dagger must remain separate');
const rigFile = readFileSync(new URL('../public/js/aura-skinned3d.js', import.meta.url), 'utf8');
for (const id of ['preview-rig','preview-slash']) {
  assert.ok(viewer.includes('id="' + id + '"'), 'skinned 3D control missing: ' + id);
}
assert.ok(rigFile.includes('new THREE.SkinnedMesh('), '3D rig must use real SkinnedMesh');
assert.ok(rigFile.includes('new THREE.Skeleton('), '3D rig must have a Skeleton');
assert.ok(rigFile.includes('new THREE.Bone('), '3D rig must define bones');
assert.ok(rigFile.includes("m.setAttribute('skinIndex'") === false,
  'rig should define skin attributes on geometry, not attach them to mesh');
assert.ok(rigFile.includes("g.setAttribute('skinIndex'"), 'rig skinIndex buffer missing');
assert.ok(rigFile.includes("g.setAttribute('skinWeight'"), 'rig skinWeight buffer missing');
assert.ok(rigFile.includes('triggerSlash()'), 'test attack animation missing');
assert.ok(preview.includes('createAuraSkinned3D(THREE, ramp)'), 'skinned rig not wired to viewer');
assert.ok(preview.includes('rigged.update(dt)'), 'rigged animation update missing');
console.log('UI shell / Aura sideview / V6 skinned 3D checks passed');
