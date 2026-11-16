// =====================================================================
//  ENTRADA LOCAL: teclado (depuración en PC) y táctil (móvil)
//  Mitad izquierda: joystick flotante + Agarre | Mitad derecha: swipes + Bloqueo
// =====================================================================
export class LocalInput {
  constructor() {
    this.dx = 0; this.up = false; this.down = false; this.block = false; this.queue = [];
    this.keys = new Set(); this.touchActive = false; this.touches = new Map(); this.trails = [];
    this.enabled = false;
    this.bindKeyboard();
  }
  // Una entrada por fotograma de simulación (las acciones se consumen de una en una)
  sample() {
    if (!this.enabled) return { dx: 0, up: false, down: false, block: false, act: null };
    return { dx: this.dx, up: this.up, down: this.down, block: this.block, act: this.queue.shift() || null };
  }
  push(a) { if (this.enabled) { this.queue.push(a); if (this.queue.length > 3) this.queue.shift(); } }
  clear() { this.queue = []; this.dx = 0; this.up = this.down = this.block = false; }

  bindKeyboard() {
    const map = { j: 'tap', ' ': 'tap', arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', k: 'grab' };
    addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'j', 'k', 'l', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && this.enabled) e.preventDefault();
      if (this.keys.has(k)) return; this.keys.add(k);
      if (map[k]) this.push(map[k]);
      this.syncKeys();
    });
    addEventListener('keyup', e => { this.keys.delete(e.key.toLowerCase()); this.syncKeys(); });
    addEventListener('blur', () => { this.keys.clear(); this.syncKeys(); });
  }
  syncKeys() {
    if (this.touchActive) return;
    this.dx = (this.keys.has('d') ? 1 : 0) - (this.keys.has('a') ? 1 : 0);
    this.up = this.keys.has('w'); this.down = this.keys.has('s'); this.block = this.keys.has('l');
  }

  bindTouch(root, { base, knob, grab, block, trail }, settings) {
    this.settings = settings;
    const tctx = trail.getContext('2d');
    const hitBtn = (el, x, y) => { const r = el.getBoundingClientRect(); return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width * 0.75; };
    root.addEventListener('touchstart', e => {
      e.preventDefault(); this.touchActive = true;
      for (const t of e.changedTouches) {
        const x = t.clientX, y = t.clientY;
        if (hitBtn(grab, x, y)) { this.push('grab'); grab.classList.add('on'); this.touches.set(t.identifier, { zone: 'grab' }); this.haptic(8); continue; }
        if (hitBtn(block, x, y)) { this.block = true; block.classList.add('on'); this.touches.set(t.identifier, { zone: 'block', x0: x, y0: y }); continue; }
        if (x < root.clientWidth / 2) {
          this.touches.set(t.identifier, { zone: 'stick', x0: x, y0: y });
          base.style.display = knob.style.display = 'block'; base.style.left = knob.style.left = x + 'px'; base.style.top = knob.style.top = y + 'px';
        } else this.touches.set(t.identifier, { zone: 'swipe', x0: x, y0: y, t0: performance.now(), swiped: false, pts: [[x, y]] });
      }
    }, { passive: false });
    root.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier); if (!s) continue;
        const x = t.clientX, y = t.clientY;
        if (s.zone === 'stick') {
          let dx = x - s.x0, dy = y - s.y0; const d = Math.hypot(dx, dy), max = 55;
          if (d > max) { s.x0 += dx * (1 - max / d) * 0.5; s.y0 += dy * (1 - max / d) * 0.5; dx = x - s.x0; dy = y - s.y0; }
          base.style.left = s.x0 + 'px'; base.style.top = s.y0 + 'px';
          knob.style.left = (s.x0 + Math.max(-max, Math.min(max, dx))) + 'px'; knob.style.top = (s.y0 + Math.max(-max, Math.min(max, dy))) + 'px';
          this.dx = dx > 18 ? 1 : dx < -18 ? -1 : 0; this.up = dy < -32; this.down = dy > 30;
        } else if (s.zone === 'swipe' || s.zone === 'block') {
          if (s.zone === 'swipe') s.pts.push([x, y]);
          const dx = x - s.x0, dy = y - s.y0;
          if (!s.swiped && Math.hypot(dx, dy) > 38) {
            s.swiped = true;
            const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
            if (s.zone === 'block') { this.block = false; block.classList.remove('on'); s.zone = 'swipe'; s.pts = [[s.x0, s.y0], [x, y]]; }
            this.push(d); this.haptic(6);
          }
        }
      }
    }, { passive: false });
    const end = e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier); if (!s) continue;
        if (s.zone === 'stick') { this.dx = 0; this.up = false; this.down = false; base.style.display = knob.style.display = 'none'; }
        if (s.zone === 'swipe' && !s.swiped && performance.now() - s.t0 < 300) { this.push('tap'); this.haptic(5); s.pts.push([s.x0 + 1, s.y0 + 1]); }
        if (s.zone === 'block') { this.block = false; block.classList.remove('on'); }
        if (s.zone === 'grab') grab.classList.remove('on');
        if (s.pts) this.trails.push({ pts: s.pts, life: 1 });
        this.touches.delete(t.identifier);
      }
    };
    root.addEventListener('touchend', end, { passive: false });
    root.addEventListener('touchcancel', end, { passive: false });
    this.drawTrails = () => {
      const dpr = devicePixelRatio || 1;
      const w = root.clientWidth, h = root.clientHeight;
      const pixelWidth = Math.round(w * dpr), pixelHeight = Math.round(h * dpr);
      if (trail.width !== pixelWidth || trail.height !== pixelHeight) {
        trail.width = pixelWidth; trail.height = pixelHeight;
      }
      tctx.setTransform(dpr, 0, 0, dpr, 0, 0); tctx.clearRect(0, 0, w, h);
      const live = [...this.touches.values()].filter(s => s.zone === 'swipe').map(s => ({ pts: s.pts, life: 1 }));
      for (const tr of [...this.trails, ...live]) {
        if (tr.pts.length < 2) continue;
        tctx.strokeStyle = `rgba(255,154,60,${0.7 * tr.life})`; tctx.lineWidth = 10 * tr.life; tctx.lineCap = 'round'; tctx.lineJoin = 'round';
        tctx.beginPath(); tctx.moveTo(...tr.pts[0]); for (const p of tr.pts) tctx.lineTo(...p); tctx.stroke();
      }
      for (let i = this.trails.length - 1; i >= 0; i--) { this.trails[i].life -= 0.08; if (this.trails[i].life <= 0) this.trails.splice(i, 1); }
    };
  }
  haptic(ms) { try { if (this.settings && this.settings.vibration && navigator.vibrate) navigator.vibrate(ms); } catch {} }
}
