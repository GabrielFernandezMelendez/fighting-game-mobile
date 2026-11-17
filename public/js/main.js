// =====================================================================
//  ORQUESTADOR: pantallas, bucle de juego, práctica, online y HUD
// =====================================================================
import { CHARS, ROSTER, WEAPONS, COMBOS, GESTURES, DT, STAT_NAMES, damageMult } from './data.js';
import { createMatch, step, NO_INPUT } from './sim.js';
import { Renderer3D } from './render.js';
import { stageArtwork } from './stage-art.js';
import { LocalInput } from './input.js';
import { Lockstep, PeerLink } from './net.js';
import { ComboPlayer } from './combo.js';
import { CpuPlayer, CPU_LEVELS } from './cpu.js';
import { STAGES, stageById } from './stages.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- Ajustes persistentes ----------
const settings = Object.assign({ quality: coarse ? 1 : 2, fps: true, vibration: true, opacity: 55, btn: 78, delay: 0, cpuLevel: 1, cpuRival: 'sombra', motion: false, stage: 'sala' }, (() => { try { return JSON.parse(localStorage.getItem('neon-settings') || '{}'); } catch { return {}; } })());
const saveSettings = () => { try { localStorage.setItem('neon-settings', JSON.stringify(settings)); } catch {} };
function applySettings() {
  document.documentElement.style.setProperty('--ctl-opacity', settings.opacity / 100);
  document.documentElement.style.setProperty('--btn-size', settings.btn + 'px');
  $('#perf').style.display = settings.fps ? 'block' : 'none';
  document.body.classList.toggle('reduce-motion', !!settings.motion);
  syncMenuMotion();
  if (R) R.applyQuality(+settings.quality);
}

// ---------- Estado global ----------
let R = null;
const input = new LocalInput();
input.bindTouch($('#touch'), { grab: $('#bGrab'), block: $('#bBlock'), trail: $('#trail') }, settings);
const app = { mode: null, M: null, ls: null, link: null, role: 0, myChar: 'aura', myWeapon: null, rivalSel: null, myReady: false, rivalReady: false, mid: 0,
  pendingNet: [], cp: null, cpEnd: 0, running: false, paused: false, boxes: false, results: false, lag: [1000, 1000], rematch: { me: false, rival: false }, stack: [] };
window.__app = app;

// ---------- Navegación entre pantallas ----------
let current = 's-menu';
function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); current = id; syncMenuMotion(); }
// Portada: el vídeo en bucle (capa aparte de los botones) solo corre con el menú visible y sin movimiento reducido
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
function syncMenuMotion() {
  const v = document.querySelector('.duel-loop'), box = document.querySelector('.duel'); if (!v) return;
  const play = current === 's-menu' && !settings.motion && !reduceMQ.matches;
  if (play) { v.play().then(() => box.classList.add('playing')).catch(() => box.classList.remove('playing')); }
  else { v.pause(); box.classList.remove('playing'); }
}
reduceMQ.addEventListener?.('change', syncMenuMotion);
function go(id) { app.stack.push(current); show(id); }
function back() {
  if (current === 's-settings' && app.returnToGame) { app.returnToGame = false; $$('.screen').forEach(s => s.classList.remove('on')); current = null; app.stack.pop(); return; }
  if (current === 's-lobby' || (current === 's-select' && app.mode === 'online')) { leaveOnline(); app.stack = []; show('s-menu'); return; }
  show(app.stack.pop() || 's-menu');
}
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', back));
$('#bAuraPreview').addEventListener('click', () => {
  // Separate preview route, leaving match data and the production renderer untouched.
  window.location.assign('./aura_preview.html');
});

function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(t._h); if (ms) t._h = setTimeout(() => t.style.display = 'none', ms); }

$$('[data-go]').forEach(b => b.addEventListener('click', () => {
  const g = b.dataset.go;
  if (g === 'online') { resetLobby(); go('s-lobby'); }
  else if (g === 'practice') { app.mode = 'practice'; buildSelect(); go('s-select'); }
  else if (g === 'cpu') { app.mode = 'cpu'; buildSelect(); go('s-select'); }
  else if (g === 'armory') { buildArmory(); go('s-armory'); }
  else if (g === 'stages') { buildStages(); go('s-stages'); }
  else go('s-' + g);
}));

// =====================================================================
//  SELECCIÓN DE PERSONAJE
// =====================================================================
const WNAMES = { dagger: 'Daga', sword: 'Espada', hammer: 'Martillo', spear: 'Lanza' };
// Arte de interfaz (recortes de las láminas de concept): retrato para miniaturas y cuerpo entero para escenas
const ART = id => ({ head: `img/ui/head_${id}.jpg`, body: `img/ui/body_${id}.png` });
// Puntos que suma el arma a Fuerza y Destreza según cuánto escala su daño con cada atributo (damageMult en data.js)
const weaponBonus = w => { const S = WEAPONS[w].scale; return { fuerza: Math.round(Math.max(0, S.str - 0.5) * 2.5), destreza: Math.round(Math.max(0, S.dex - 0.5) * 2.5) }; };
const meter = (n, bonus = 0) => '<span class="meter">' + Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'f' : i < n + bonus ? 'w' : ''}"></i>`).join('') + '</span>';
function cardEl(id, onPick) {
  const C = CHARS[id], c = document.createElement('button');
  c.className = 'card'; c.dataset.id = id; c.style.setProperty('--acc', C.accent); c.setAttribute('aria-label', C.name);
  c.innerHTML = `<img src="${ART(id).head}" alt="">`; c.addEventListener('click', onPick);
  return c;
}
function showFighter(prefix, id) {
  const C = CHARS[id], scr = $(prefix === 'sel' ? '#s-select' : '#s-rival');
  scr.style.setProperty('--acc', C.accent);
  $('#' + prefix + 'Body').src = ART(id).body;
  $('#' + prefix + 'Name').innerHTML = `<h3>${C.name}</h3><span>${C.title}${prefix === 'riv' ? ' · CPU' : ''}</span>`;
}
const WKEYS = ['dagger', 'sword', 'hammer', 'spear'];
const scaleDots = v => '●'.repeat(v <= 0.35 ? 1 : v <= 0.75 ? 2 : 3).padEnd(3, '○');
function buildSelect() {
  app.myReady = false;
  const box = $('#selCards'); box.innerHTML = '';
  for (const id of ROSTER) {
    const C = CHARS[id];
    box.appendChild(cardEl(id, () => { if (!app.myReady) pickChar(id); }));
  }
  pickChar(app.myChar || 'aura', app.myWeapon);
  updateRivalSelect();
}
function pickChar(id, weapon) {
  if (id !== app.myChar || !app.myWeapon) app.myWeapon = weapon || CHARS[id].weapon;
  app.myChar = id; const C = CHARS[id];
  $$('#selCards .card').forEach(c => { c.classList.toggle('on', c.dataset.id === id); c.setAttribute('aria-selected', c.dataset.id === id); });
  showFighter('sel', id);
  const d = $('#selDetail'), wb = weaponBonus(app.myWeapon);
  const plus = Object.entries(wb).filter(([, v]) => v).map(([k, v]) => `${STAT_NAMES[k]} +${v}`).join(', ');
  d.innerHTML = `<span class="ptab">Ficha</span><p class="desc">${C.desc}</p>
    <div class="stats">${Object.entries(C.stats).map(([k, v]) => `<span>${STAT_NAMES[k]}</span>${meter(v, wb[k] || 0)}`).join('')}</div>
    <p class="wbonus">${plus ? `Con ${WEAPONS[app.myWeapon].name.toLowerCase()}: <b>${plus}</b>` : `${WEAPONS[app.myWeapon].name}: sin bonificación`}</p>
    <div class="passive"><b>${C.passive}.</b> ${C.passiveDesc}</div>
    <div class="wpick" role="radiogroup" aria-label="Arma">${WKEYS.map(w => `<button class="mbtn wchip${w === app.myWeapon ? ' on' : ''}" data-w="${w}" role="radio" aria-checked="${w === app.myWeapon}">${WSVG[w]}<b>${WEAPONS[w].name}${w === C.weapon ? ' <i title="Arma insignia">◆</i>' : ''}</b></button>`).join('')}</div>
    <button class="mbtn hot go" id="bConfirm">${app.mode === 'online' ? (app.myReady ? 'Esperando rival…' : 'Listo') : app.mode === 'cpu' ? 'Elegir rival' : 'Luchar'}</button>`;
  d.querySelectorAll('.wchip').forEach(b => b.addEventListener('click', () => { if (!app.myReady) { app.myWeapon = b.dataset.w; pickChar(id, b.dataset.w); } }));
  $('#bConfirm').addEventListener('click', confirmChar);
  if (app.mode === 'online') app.link.send({ t: 'pick', c: id, w: app.myWeapon, ready: false });
}
function confirmChar() {
  if (app.mode === 'practice') { startPractice({ c: app.myChar, w: app.myWeapon }); return; }
  if (app.mode === 'cpu') { buildRival(); go('s-rival'); return; }
  app.myReady = true; $('#bConfirm').textContent = 'Esperando rival…'; $('#bConfirm').disabled = true;
  app.link.send({ t: 'pick', c: app.myChar, w: app.myWeapon, ready: true });
  if (app.role === 0) maybeStartOnline();
}
function updateRivalSelect() {
  const pill = $('#selRival');
  if (app.mode !== 'online') { pill.style.display = 'none'; return; }
  pill.style.display = '';
  const r = app.rivalSel;
  pill.textContent = r ? `Rival: ${CHARS[r.c].name} · ${WNAMES[r.w]}${app.rivalReady ? ' ✓ listo' : ' · eligiendo'}` : 'Rival: eligiendo…';
  $$('#selCards .card').forEach(c => c.classList.toggle('rival', !!r && c.dataset.id === r.c));
}

// =====================================================================
//  ARMERÍA
// =====================================================================
const WSVG = {
  dagger: '<svg viewBox="0 0 200 110"><rect x="40" y="48" width="40" height="14" rx="4" fill="#1c1d24" stroke="#000" stroke-width="3"/><rect x="78" y="36" width="10" height="38" fill="#c9ccd6" stroke="#000" stroke-width="3"/><path d="M88 46 L160 52 L178 55 L160 58 L88 64 Z" fill="#ff9a3c" stroke="#000" stroke-width="3"/></svg>',
  sword: '<svg viewBox="0 0 200 110"><rect x="8" y="49" width="30" height="12" rx="4" fill="#1c1d24" stroke="#000" stroke-width="3"/><rect x="36" y="34" width="10" height="42" fill="#c9ccd6" stroke="#000" stroke-width="3"/><path d="M46 47 L178 50 L194 55 L178 60 L46 63 Z" fill="#46f6ff" stroke="#000" stroke-width="3"/></svg>',
  hammer: '<svg viewBox="0 0 200 110"><rect x="10" y="50" width="130" height="11" rx="4" fill="#1c1d24" stroke="#000" stroke-width="3"/><rect x="136" y="22" width="48" height="66" rx="8" fill="#646b78" stroke="#000" stroke-width="3"/><rect x="146" y="40" width="28" height="30" rx="4" fill="#ffe14a" stroke="#000" stroke-width="3"/></svg>',
  spear: '<svg viewBox="0 0 200 110"><rect x="4" y="51" width="150" height="8" rx="3" fill="#1c1d24" stroke="#000" stroke-width="3"/><path d="M150 42 L196 55 L150 68 L158 55 Z" fill="#ff2d55" stroke="#000" stroke-width="3"/><circle cx="148" cy="55" r="7" fill="none" stroke="#ff2d55" stroke-width="3"/></svg>',
};
function buildArmory() {
  const box = $('#armoryList'); box.innerHTML = '';
  for (const id of ROSTER) {
    const C = CHARS[id], W = WEAPONS[C.weapon];
    const c = document.createElement('button'); c.className = 'wcard'; c.style.setProperty('--acc', C.accent);
    c.innerHTML = `${WSVG[C.weapon]}<b>${W.name}</b><small>${W.style}</small><span class="who">${C.name} · 10 golpes · ${COMBOS[C.weapon].length} combos</span>`;
    c.addEventListener('click', () => { app.myChar = id; app.myWeapon = C.weapon; startPractice({ c: id, w: C.weapon }, true); });
    box.appendChild(c);
  }
}

// =====================================================================
//  ENTRAR / SALIR DEL COMBATE
// =====================================================================
async function ensureRenderer() {
  if (!R) { R = new Renderer3D(); await R.init($('#game')); app.R = R; }
  R.applyQuality(+settings.quality);
}
async function enterGame() {
  try { await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }); } catch {}
  try { await screen.orientation?.lock?.('landscape'); } catch {}
  $$('.screen').forEach(s => s.classList.remove('on')); current = null;
  $('#hud').style.display = 'block'; $('#touch').style.display = coarse ? 'block' : 'none';
  document.body.classList.add('playing');
  const practice = app.mode === 'practice';
  $('#bMoves').style.display = practice ? '' : 'none'; $('#bBoxes').style.display = practice ? '' : 'none';
  $('#bResetPos').style.display = practice ? '' : 'none';
  $('#pips0').style.display = $('#pips1').style.display = practice ? 'none' : '';
  app.results = false; app.paused = false; input.clear(); input.enabled = true;
  if (!app.running) { app.running = true; last = performance.now(); acc = 0; requestAnimationFrame(loop); }
}
function exitGame() {
  app.running = false; app.cp = null; input.enabled = false; closeMoves();
  $('#hud').style.display = 'none'; $('#touch').style.display = 'none'; document.body.classList.remove('playing');
  $$('.overlay').forEach(o => o.classList.remove('on'));
  try { document.fullscreenElement && document.exitFullscreen(); } catch {}
}
function toMenu() { exitGame(); leaveOnline(); app.stack = []; show('s-menu'); }

// ---------- Escenarios ----------
// ?stage=<id> en la URL fuerza uno (pruebas); si no, el elegido en la pantalla Escenarios.
const URL_STAGE = new URLSearchParams(location.search).get('stage');
const myStage = () => stageById(URL_STAGE || settings.stage).id;
function buildStages() {
  const box = $('#stageList'); box.innerHTML = '';
  for (const S of STAGES) {
    const b = document.createElement('button'); b.className = 'stage-c' + (S.id === myStage() ? ' on' : ''); b.dataset.id = S.id;
    b.setAttribute('aria-pressed', S.id === myStage()); b.style.backgroundImage = `linear-gradient(transparent 40%, rgba(12,13,20,.92)), url("${stageArtwork(S.id)}")`;
    b.innerHTML = `<b>${S.name}</b><span>${S.desc}</span>`;
    b.addEventListener('click', () => { settings.stage = S.id; saveSettings(); buildStages(); });
    box.appendChild(b);
  }
}

// ---------- Práctica ----------
async function startPractice(sel, openMovesPanel = false) {
  app.mode = 'practice'; await ensureRenderer(); R.setStage(myStage());
  const chars = [sel, { c: 'dummy', w: 'none' }];
  app.M = createMatch({ mode: 'training', chars });
  R.setFighters(chars);
  await enterGame();
  if (openMovesPanel) openMoves('moves');
}
function resetPositions(close = false) {
  const chars = app.M.chars; app.M = createMatch({ mode: 'training', chars });
  if (close) { app.M.fighters[0].x = -0.45; app.M.fighters[1].x = 0.35; }
  app.cp = null; input.enabled = true;
}

// ---------- Pantalla VS (online y CPU) ----------
function vsScreen(chars) {
  chars.forEach((sel, i) => {
    const el = $(i ? '#vsR' : '#vsL'); el.style.setProperty('--acc', CHARS[sel.c].accent);
    el.innerHTML = `<i class="band"></i><img src="${ART(sel.c).body}" alt=""><div class="vname">${CHARS[sel.c].name}<small>${WNAMES[sel.w]}</small></div>`;
  });
}

// ---------- Contra la CPU ----------
function buildRival() {
  app.cpuLevel = settings.cpuLevel ?? 1;
  const rival = ROSTER.includes(settings.cpuRival) ? settings.cpuRival : ROSTER.find(id => id !== app.myChar);
  $('#rivMe').textContent = 'Tú: ' + CHARS[app.myChar].name + ' · ' + WNAMES[app.myWeapon || CHARS[app.myChar].weapon];
  const box = $('#rivCards'); box.innerHTML = '';
  for (const id of ROSTER) {
    const C = CHARS[id];
    box.appendChild(cardEl(id, () => pickRival(id)));
  }
  pickRival(rival);
}
function pickRival(id) {
  settings.cpuRival = id; saveSettings();
  const C = CHARS[id], lv = app.cpuLevel;
  $$('#rivCards .card').forEach(c => c.classList.toggle('on', c.dataset.id === id));
  const d = $('#rivDetail'); d.style.setProperty('--acc', C.accent);
  showFighter('riv', id);
  d.innerHTML = `<span class="ptab">Dificultad</span>
    ${CPU_LEVELS.map((L, i) => `<button class="lvl${i === lv ? ' on' : ''}" data-lv="${i}" aria-pressed="${i === lv}"><span class="pips4">${[0, 1, 2, 3].map(k => `<i class="${k <= i ? 'f' : ''}"></i>`).join('')}</span><div><b>${L.name}</b><span>${L.desc}</span></div></button>`).join('')}
    <p class="lvl-lesson">${CPU_LEVELS[lv].lesson}</p>
    <button class="mbtn hot go" id="bCpuFight">Luchar</button>`;
  d.querySelectorAll('.lvl').forEach(b => b.addEventListener('click', () => { app.cpuLevel = settings.cpuLevel = +b.dataset.lv; saveSettings(); pickRival(id); }));
  $('#bCpuFight').addEventListener('click', startCpuMatch);
}
async function startCpuMatch() {
  app.mode = 'cpu';
  $$('.overlay').forEach(o => o.classList.remove('on'));
  const chars = [{ c: app.myChar, w: app.myWeapon || CHARS[app.myChar].weapon }, { c: settings.cpuRival, w: CHARS[settings.cpuRival].weapon }];
  vsScreen(chars);
  $('#vsInfo').textContent = `CPU ${CPU_LEVELS[app.cpuLevel].name} — al mejor de 3 rondas · ${stageById(myStage()).name}`;
  exitGame(); show('s-vs');
  await ensureRenderer(); R.setStage(myStage()); R.setFighters(chars);
  await new Promise(r => setTimeout(r, 1600));
  if (app.mode !== 'cpu') return;
  app.M = createMatch({ mode: 'versus', chars });
  app.cpu = new CpuPlayer({ level: app.cpuLevel, idx: 1, chars, seed: (Date.now() & 0xffff) + 1 });
  app.lag = [1000, 1000];
  await enterGame();
}

// ---------- Panel de movimientos y combos ----------
function openMoves(tab = 'moves') { $('#movesPanel').classList.add('on'); renderMoves(tab); }
function closeMoves() { $('#movesPanel').classList.remove('on'); }
function renderMoves(tab) {
  $$('.tab').forEach(t => t.classList.toggle('on', t.dataset.tab === tab));
  const sel = app.M.chars[0], C = CHARS[sel.c], W = WEAPONS[sel.w], body = $('#mpBody');
  const dmg = (key, m) => Math.round(m.dmg * damageMult(sel.c, sel.w, key));
  if (tab === 'moves') {
    const row = (g, label, key, steps) => { const m = W.moves[key]; if (!m) return '';
      return `<div class="mv"><span class="g">${label}</span><span class="n">${m.name}<small>arranque ${m.active[0]} · daño ${dmg(key, m)}${m.low ? ' · bajo' : ''}${m.overhead ? ' · alto' : ''}${m.react === 'launch' ? ' · lanza' : ''}${m.armor ? ' · armadura' : ''}</small></span><button data-demo='${JSON.stringify(steps)}' data-name="${m.name}">▶</button></div>`; };
    body.innerHTML = `<h4>${C.name} · ${W.name} · suelo</h4>` + GESTURES.map(([g, l]) => row(g, l, 'g_' + g, [g])).join('')
      + `<h4>En el aire (la demo lanza al muñeco y salta detrás)</h4>` + GESTURES.map(([g, l]) => row(g, l, 'a_' + g, ['up', 'jump', 'a:' + g])).join('')
      + `<h4>Otros</h4><p class="hint">En la mitad izquierda, desliza y mantén el dedo para caminar (vuelve al punto de inicio para pararte), desliza arriba para saltar y abajo para agacharte. Desliza y suelta dos veces en la misma dirección para hacer dash. Usa la mitad derecha para atacar.</p><div class="mv"><span class="g">Botón</span><span class="n">Agarre<small>rompe el bloqueo · daño 120</small></span><button data-demo='["grab"]' data-name="Agarre">▶</button></div>`
      + `<div class="mv"><span class="g">Pasiva</span><span class="n">${C.passive}<small>${C.passiveDesc}</small></span></div>`;
  } else {
    body.innerHTML = `<h4>Combos de ${W.name}</h4>` + COMBOS[W.key].filter(c => !c.requires || c.requires === sel.c).map(c => `<div class="cb"><b>${c.name}</b><p>${c.notation}</p><button class="mbtn sm" data-demo='${JSON.stringify(c.steps)}' data-name="${c.name}">▶ Ver combo</button></div>`).join('')
      + `<p class="hint">Regla general: al conectar un golpe puedes encadenar otro distinto. Tras el lanzador (↑ en la mitad derecha), desliza arriba en la mitad izquierda para el súper salto y sigue en el aire con hasta 3 ataques distintos.</p>`;
  }
  body.querySelectorAll('[data-demo]').forEach(b => b.addEventListener('click', () => playDemo(JSON.parse(b.dataset.demo), b.dataset.name)));
}
$$('.tab').forEach(t => t.addEventListener('click', () => renderMoves(t.dataset.tab)));
$('#bMoves').addEventListener('click', () => $('#movesPanel').classList.contains('on') ? closeMoves() : openMoves('moves'));
$('#bMovesClose').addEventListener('click', closeMoves);
function playDemo(steps, name) {
  resetPositions(true);
  app.cp = new ComboPlayer(steps); app.cpEnd = 0; input.enabled = false;
  $('#moveName').dataset.demo = '▶ ' + name;
}

// =====================================================================
//  ONLINE
// =====================================================================
function resetLobby() {
  leaveOnline();
  $('#hostCode').textContent = '— — — — —'; $('#bCopy').disabled = true; $('#bHost').disabled = false; setBusy('#bJoin', null);
  $('#lobbyStatus').textContent = (typeof window.Peer === 'function' || location.hash.includes('mocknet')) ? '' : 'No se pudo cargar PeerJS (¿sin internet?).';
}
$('#bHost').addEventListener('click', async () => {
  leaveOnline(); app.link = makeLink(); $('#bHost').disabled = true; $('#lobbyStatus').textContent = 'Creando sala…';
  try {
    await app.link.host(code => { $('#hostCode').textContent = code; $('#bCopy').disabled = false; $('#lobbyStatus').textContent = 'Esperando a que tu amigo se conecte…'; app.code = code; });
    onConnected(0);
  } catch (e) { $('#lobbyStatus').textContent = e.message; $('#bHost').disabled = false; }
});
$('#bCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(app.code); toast('Código copiado'); } catch { toast('Código: ' + app.code); } });
$('#joinCode').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
// Acción que tarda: el botón conserva su tamaño y muestra un rótulo de espera
function setBusy(sel, label) {
  const b = $(sel);
  if (label) { b.dataset.label ??= b.textContent; b.style.minWidth = b.offsetWidth + 'px'; b.classList.add('busy'); b.disabled = true; b.innerHTML = `<i class="spin" aria-hidden="true"></i>${label}`; }
  else { b.classList.remove('busy'); b.disabled = false; if (b.dataset.label) b.textContent = b.dataset.label; b.style.minWidth = ''; }
}
$('#bJoin').addEventListener('click', async () => {
  const code = $('#joinCode').value.trim(); if (code.length !== 5) { $('#lobbyStatus').textContent = 'El código tiene 5 caracteres.'; return; }
  leaveOnline(); app.link = makeLink(); setBusy('#bJoin', 'Conectando…'); $('#lobbyStatus').textContent = '';
  try { await app.link.join(code); onConnected(1); }
  catch (e) { $('#lobbyStatus').textContent = e.message; setBusy('#bJoin', null); }
});
// Enlace de pruebas sin internet: dos pestañas del mismo navegador (añade #mocknet a la URL)
class MockLink {
  constructor() { this.ch = new BroadcastChannel('neon-mock'); this.handlers = new Set(); this.rtt = 40; this.onClose = null;
    this.ch.onmessage = e => { const m = e.data; if (m.__from === this.id) return; if (m.__hello && this.hostWait) { this.hostWait(); this.hostWait = null; return; }
      if (m.__ack && this.joinWait) { this.joinWait(); this.joinWait = null; return; } for (const h of this.handlers) h(m); };
    this.id = Math.random().toString(36).slice(2); }
  host(onCode) { onCode('TEST1'); return new Promise(r => { this.hostWait = () => { this.ch.postMessage({ __ack: 1, __from: this.id }); r(); }; }); }
  join() { return new Promise(r => { this.joinWait = r; this.ch.postMessage({ __hello: 1, __from: this.id }); }); }
  send(m) { this.ch.postMessage({ ...m, __from: this.id }); }
  on(h) { this.handlers.add(h); } close() { this.ch.close(); this.handlers.clear(); }
}
const makeLink = () => location.hash.includes('mocknet') ? new MockLink() : new PeerLink();
function onConnected(role) {
  app.role = role; app.mode = 'online'; app.rivalSel = null; app.rivalReady = false; app.myReady = false;
  app.link.onClose = msg => { if (app.mode === 'online') { toast(msg, 3500); toMenu(); } };
  app.link.on(onNetMessage);
  toast('¡Conectado!'); buildSelect(); show('s-select');
}
function onNetMessage(m) {
  if (!m || !m.t) return;
  switch (m.t) {
    case 'pick': app.rivalSel = { c: m.c, w: m.w }; app.rivalReady = m.ready; updateRivalSelect(); if (app.role === 0) maybeStartOnline(); return;
    case 'start': beginOnlineMatch(m.chars, m.delay, m.mid, m.stage); return;
    case 'rematch': app.rematch.rival = true; updateResultsHint(); if (app.role === 0) maybeRematch(); return;
    case 'reselect': app.results = false; exitGame(); app.myReady = false; app.rivalReady = false; buildSelect(); show('s-select'); return;
    case 'leave': toast('El rival ha salido', 3000); toMenu(); return;
  }
  if (m.mid !== undefined && m.mid !== app.mid) return;            // mensajes de una partida anterior
  if (app.ls) app.ls.onMessage(m); else app.pendingNet.push(m);
}
function maybeStartOnline() {
  if (!(app.myReady && app.rivalReady)) return;
  const auto = Math.max(3, Math.min(10, Math.round(app.link.rtt / 2 / 16.7) + 2));
  const delay = +settings.delay || auto, mid = app.mid + 1, chars = [{ c: app.myChar, w: app.myWeapon }, app.rivalSel], stage = myStage();
  app.link.send({ t: 'start', chars, delay, mid, stage }); beginOnlineMatch(chars, delay, mid, stage);
}
// El escenario lo elige quien envía 'start' (solo es decorado: no afecta a la simulación ni al determinismo)
async function beginOnlineMatch(chars, delay, mid, stage = 'sala') {
  stage = stageById(stage).id; app.stage = stage;
  app.mid = mid; app.ls = null; app.pendingNet = app.pendingNet.filter(m => m.mid === mid); app.rematch = { me: false, rival: false };
  $$('.overlay').forEach(o => o.classList.remove('on'));
  // pantalla VS
  vsScreen(chars);
  $('#vsInfo').textContent = `Online — al mejor de 3 rondas · ${stageById(stage).name} · retardo ${delay} f`;
  show('s-vs');
  await ensureRenderer(); R.setStage(stage); R.setFighters(chars);
  await new Promise(r => setTimeout(r, 2200));
  if (app.mode !== 'online' || app.mid !== mid) return;
  app.M = createMatch({ mode: 'online', chars });
  app.ls = new Lockstep({ role: app.role, delay, match: app.M, send: m => app.link.send({ ...m, mid }) });
  for (const m of app.pendingNet.splice(0)) app.ls.onMessage(m);
  app.lag = [1000, 1000];
  await enterGame();
}
function maybeRematch() {
  if (app.rematch.me && app.rematch.rival && app.role === 0) {
    const mid = app.mid + 1, chars = app.M.chars, delay = app.ls.delay, stage = app.stage;
    app.link.send({ t: 'start', chars, delay, mid, stage }); beginOnlineMatch(chars, delay, mid, stage);
  }
}
function leaveOnline() {
  if (app.link) { try { app.link.send({ t: 'leave' }); } catch {} app.link.close(); }
  app.link = null; app.ls = null; app.pendingNet = []; if (app.mode === 'online') app.mode = null;
}

// =====================================================================
//  BUCLE PRINCIPAL
// =====================================================================
let last = 0, acc = 0, fpsN = 0, fpsT = 0, worst = 0;
function loop(now) {
  if (!app.running) return;
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; worst = Math.max(worst, dt);
  acc += dt; let n = 0;
  while (acc >= DT && n < 5) {
    acc -= DT; n++;
    if (app.mode === 'cpu') {
      if (app.paused) continue;
      step(app.M, [input.sample(), app.cpu.input(app.M)]);
    } else if (app.mode === 'practice') {
      if (app.paused) continue;
      const F = app.M.fighters[0];
      const inp = app.cp ? app.cp.input(F) : input.sample();
      step(app.M, [inp, NO_INPUT]);
      if (app.cp && app.cp.done && ++app.cpEnd > 70) { app.cp = null; input.enabled = true; delete $('#moveName').dataset.demo; }
    } else if (app.mode === 'online' && app.ls) {
      app.ls.tick(input.sample()); app.M = app.ls.M;
    }
  }
  const M = app.M; if (!M) return;
  R.consumeEvents(M.events);
  if (M.events.some(e => e.type === 'hit')) input.haptic(18);
  M.events.length = 0;
  R.render(M, dt, { boxes: app.boxes });
  updateHUD(M);
  input.drawTrails && input.drawTrails();
  fpsN++; fpsT += dt;
  if (fpsT >= 0.5) {
    let t = `${Math.round(fpsN / fpsT)} fps · peor ${Math.round(worst * 1000)} ms · ${R.drawCalls} draw calls · ${R.useModels ? "modelos v3" : "SIN MODELOS: " + (R.modelError || "?")}`;
    if (app.mode === 'online' && app.ls && app.link) t += ` · ping ${Math.round(app.link.rtt)} ms · retardo ${app.ls.delay} f · resync ${app.ls.resyncs}`;
    $('#perf').textContent = t; fpsN = 0; fpsT = 0; worst = 0;
  }
}

// ---------- HUD ----------
function updateHUD(M) {
  const local = app.mode === 'online' ? app.role : 0;
  M.fighters.forEach((F, i) => {
    $('#hp' + i).style.width = (F.hp / F.maxHp * 100) + '%';
    if (F.comboHits === 0) app.lag[i] = F.hp;
    $('#lag' + i).style.width = (app.lag[i] / F.maxHp * 100) + '%';
    const nm = CHARS[F.charId].name + (app.mode === 'online' && i === local ? ' (TÚ)' : '') + (app.mode === 'cpu' && i === 1 ? ' · CPU' : '');
    if ($('#nm' + i).textContent !== nm) $('#nm' + i).textContent = nm;
    const pips = '<i class="' + (M.wins[i] >= 1 ? 'w' : '') + '"></i><i class="' + (M.wins[i] >= 2 ? 'w' : '') + '"></i>';
    if ($('#pips' + i).innerHTML !== pips) $('#pips' + i).innerHTML = pips;
    const D = M.fighters[1 - i], c = D.comboHits > 1 ? `${D.comboHits} HITS<small>${D.comboDmg} daño</small>` : '';
    const el = $('#combo' + i); if (el.innerHTML !== c) el.innerHTML = c;
  });
  const t = M.mode === 'training' ? '∞' : (s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)(Math.ceil(M.timer / 60));
  if ($('#timer').textContent !== t) $('#timer').textContent = t;
  // carteles
  let b = '';
  if (M.phase === 'intro') b = M.phaseT < 55 ? (M.wins[0] === 1 && M.wins[1] === 1 ? 'RONDA FINAL' : 'RONDA ' + M.round) : '¡LUCHA!';
  else if (M.phase === 'ko') b = 'K.O.';
  else if (M.phase === 'timeup') b = '¡TIEMPO!';
  else if (M.phase === 'matchEnd') b = M.matchWinner === local ? '¡VICTORIA!' : 'DERROTA';
  const ban = $('#banner'); if (ban.textContent !== b) ban.textContent = b; ban.classList.toggle('on', !!b);
  // nombre del movimiento local / estado de red
  const F = M.fighters[local], mv = $('#moveName');
  let txt = mv.dataset.demo || (F.state === 'attack' ? WEAPONS[F.wk].moves[F.move].name : '');
  if (app.mode === 'online' && app.ls && app.ls.stalled) txt = 'Esperando al rival… (conexión lenta)';
  if (mv.textContent !== txt) mv.textContent = txt;
  // resultados
  if (M.phase === 'matchEnd' && M.phaseT > 110 && !app.results) showResults(M, local);
}
function showResults(M, local) {
  app.results = true;
  const won = M.matchWinner === local, W = M.fighters[M.matchWinner >= 0 ? M.matchWinner : local];
  $('#resTitle').textContent = won ? 'Victoria' : 'Derrota';
  $('#resScore').textContent = `${M.wins[local]} — ${M.wins[1 - local]}`;
  $('#resChars').style.setProperty('--acc', CHARS[W.charId].accent);
  $('#resChars').innerHTML = `<i class="band"></i><img src="${ART(W.charId).body}" alt="">`;
  $('#bReselect').textContent = app.mode === 'cpu' ? 'Cambiar rival' : 'Cambiar luchador';
  updateResultsHint();
  $('#s-results').classList.add('on');
}
function updateResultsHint() {
  if (app.mode === 'cpu') { const O = app.M.fighters[1]; $('#resHint').textContent = `Contra ${CHARS[O.charId].name} — CPU ${CPU_LEVELS[app.cpuLevel].name}`; return; }
  $('#resHint').textContent = app.rematch.rival ? 'Tu rival quiere la revancha' : app.rematch.me ? 'Esperando a tu rival…' : '';
}
$('#bRematch').addEventListener('click', () => { if (app.mode === 'cpu') { startCpuMatch(); return; } if (app.rematch.me) return; app.rematch.me = true; app.link.send({ t: 'rematch' }); updateResultsHint(); maybeRematch(); });
$('#bReselect').addEventListener('click', () => { if (app.mode === 'cpu') { exitGame(); buildRival(); app.stack = ['s-menu', 's-select']; show('s-rival'); return; } app.link.send({ t: 'reselect' }); app.rivalSel = null; exitGame(); app.myReady = false; app.rivalReady = false; buildSelect(); show('s-select'); });
$('#bResMenu').addEventListener('click', toMenu);

// ---------- Pausa ----------
$('#bPause').addEventListener('click', () => {
  app.paused = app.mode === 'practice' || app.mode === 'cpu';
  $('#pauseHint').textContent = app.mode === 'online' ? 'La partida sigue en curso: salir cuenta como rendición.' : '';
  $('#s-pause').classList.add('on');
});
$('#bResume').addEventListener('click', () => { app.paused = false; $('#s-pause').classList.remove('on'); });
$('#bResetPos').addEventListener('click', () => { resetPositions(); app.paused = false; $('#s-pause').classList.remove('on'); });
$('#bPauseSettings').addEventListener('click', () => { $('#s-pause').classList.remove('on'); app.paused = false; exitGameKeep(); go('s-settings'); });
$('#bQuit').addEventListener('click', toMenu);
// Los ajustes desde la pausa vuelven al combate al pulsar atrás
function exitGameKeep() { app.returnToGame = true; }
$('#bBoxes').addEventListener('click', e => { app.boxes = !app.boxes; e.currentTarget.classList.toggle('on', app.boxes); });

// ---------- Ajustes ----------
$('#setQuality').value = settings.quality; $('#setMotion').checked = !!settings.motion; $('#setFps').checked = settings.fps; $('#setVib').checked = settings.vibration;
$('#setOpacity').value = settings.opacity; $('#setBtn').value = settings.btn; $('#setDelay').value = settings.delay;
for (const [id, key, conv] of [['#setQuality', 'quality', Number], ['#setMotion', 'motion', null], ['#setFps', 'fps', null], ['#setVib', 'vibration', null], ['#setOpacity', 'opacity', Number], ['#setBtn', 'btn', Number], ['#setDelay', 'delay', Number]]) {
  $(id).addEventListener('input', e => { settings[key] = e.target.type === 'checkbox' ? e.target.checked : conv(e.target.value); saveSettings(); applySettings(); });
}

// ---------- Maquetas: tienda ----------
(() => {
  const skins = [['aura', 'Original', ['#f2f2f6', '#ff7a1a', '#2f3342'], 'EQUIPADA'], ['aura', 'Ártica', ['#e8f6ff', '#46c8ff', '#1d2a3a'], '◆ 800'],
    ['vega', 'Original', ['#d93a9e', '#20e3e3', '#16171e'], 'EQUIPADA'], ['vega', 'Sakura', ['#ffc2dc', '#ff5a8a', '#2a1a24'], '◆ 800'],
    ['kai', 'Original', ['#646b78', '#ffc21a', '#24272e'], 'EQUIPADA'], ['kai', 'Volcán', ['#3a1a14', '#ff5a1a', '#120a08'], '◆ 1.200'],
    ['sombra', 'Original', ['#2a2b33', '#d4203f', '#121318'], 'EQUIPADA'], ['sombra', 'Fantasma', ['#e8e8f0', '#7a5aff', '#3a3a48'], 'PASE nv. 30']];
  $('#shopSkins').innerHTML = skins.map(([c, n, cols, p]) => `<div class="skin"><div class="sw">${cols.map(x => `<i style="background:${x}"></i>`).join('')}</div><b>${CHARS[c].name} · ${n}</b><small>Skin</small><span class="price">${p}</span></div>`).join('');
  $('#passTrack').innerHTML = Array.from({ length: 14 }, (_, i) => `<div class="${i < 7 ? 'got' : ''}"><b>${i + 1}</b>${['◆50', 'Icono', 'Color', '◆50', 'Pose', 'Efecto', 'Skin', '◆100', 'Marco', 'Color', '◆50', 'Arma', 'Pose', 'Skin'][i]}</div>`).join('');
})();

applySettings();
if (window.location.hash === '#settings') {
  show('s-settings');
  history.replaceState(null, '', window.location.pathname + window.location.search);
} else show('s-menu');
