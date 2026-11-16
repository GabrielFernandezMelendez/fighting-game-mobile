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
assert.equal(config.modelUrl, null, 'no GLB should be claimed as deployed before review');
assert.ok(preview.includes('new THREE.OrthographicCamera('), 'side orthographic camera missing');
assert.ok(!preview.includes('canvas.addEventListener(\'pointermove\''), 'orbit dragging must be disabled');
assert.ok(preview.includes('new GLTFLoader()'), 'GLB loader missing');
assert.ok(preview.includes("URL.createObjectURL(image)"), 'local hi-res image support missing');
assert.ok(preview.includes('loader.parseAsync(buffer'), 'local GLB test path missing');
assert.ok(preview.includes('createAuraDetail(THREE, materials)'), 'V3 fallback must remain available');
assert.ok(preview.includes('installAuraPersonality(THREE, fallback)'), 'V3 fallback idle missing');
assert.ok(personality.includes('export function installAuraPersonality'), 'personality factory missing');
assert.ok(detail.includes('AURA_SIGNATURE_DAGGER'), 'signature dagger must remain separate');
console.log('UI shell / Aura sideview GLB preview checks passed');
