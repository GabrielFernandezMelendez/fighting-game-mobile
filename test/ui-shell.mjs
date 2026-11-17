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
// Settings compares two looks on the same production mesh and fixed camera.
assert.deepEqual([...viewer.matchAll(/<button[^>]+id="([^"]+)"/g)].map(m => m[1]),
  ['preview-current', 'preview-compare']);
assert.ok(viewer.includes('index.html#settings'), 'Aura viewer must return to settings');
assert.ok(main.includes('aura_preview.html'), 'settings must route to the Aura viewer');
assert.ok(viewer.includes('assets/previews/aura_concept_v3.png'), 'approved concept link missing');
const conceptPNG = readFileSync(new URL('../public/assets/previews/aura_concept_v3.png', import.meta.url));
assert.equal(conceptPNG.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
assert.equal(conceptPNG.readUInt32BE(16), 1672);
assert.equal(conceptPNG.readUInt32BE(20), 941);
const preview = readFileSync(new URL('../public/js/aura-preview.js', import.meta.url), 'utf8');
assert.ok(preview.includes("loadChar('aura')"), 'viewer must open the game model');
assert.ok(preview.includes('new THREE.OrthographicCamera('), 'comparison camera missing');
assert.ok(!/createAuraDetail|createAuraSkinned3D|loadConfiguredGLB/.test(preview), 'legacy preview entered settings');
console.log('UI shell / Aura 3D comparison checks passed');
