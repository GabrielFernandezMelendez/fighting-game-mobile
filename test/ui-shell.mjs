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
console.log('UI shell regression checks passed');
