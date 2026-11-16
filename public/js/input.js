// =====================================================================
//  ENTRADA LOCAL: teclado (depuración en PC) y táctil (móvil)
//  Mitad izquierda: swipes de movimiento + Agarre | Mitad derecha: ataques + Bloqueo
//  Movimiento: swipe y SOLTAR = paso corto; dos swipes seguidos = dash; swipe y MANTENER = caminar
//  (como el antiguo joystick: mientras el dedo siga apartado del punto de inicio). Abajo mantenido = agacharse.
// =====================================================================
const HOLD_DEAD = 18;   // px: zona muerta al mantener (volver el dedo al centro = parar)
const swipeMotion = {
  left: { dx: -1, frames: 6 }, right: { dx: 1, frames: 6 },
  up: { up: true, frames: 12 }, down: { down: true, frames: 12 },
};

export class LocalInput {
  constructor() {
    this.dx = 0; this.up = false; this.down = false; this.block = false; this.queue = [];
    this.keys = new Set(); this.touches = new Map(); this.trails = [];
    this.swipes = []; this.motion = null; this.motionSampled = false; this.touchBlock = false;
    this.enabled = false;
    this.bindKeyboard();
  }
  // Una entrada por fotograma de simulación (las acciones se consumen de una en una)
  sample() {
    if (!this.enabled) return { dx: 0, up: false, down: false, block: false, act: null };
    if (this.swipes.length) {
      // El dash necesita un fotograma neutro entre dos swipes, aunque lleguen juntos.
      this.motion = this.motionSampled ? null : { ...this.swipes.shift() };
    }
    const motion = this.motion;
    this.motionSampled = !!motion;
    if (motion && --motion.frames === 0) this.motion = null;
    const hold = this.heldMotion();
    return {
      dx: motion?.dx ?? (hold.dx || this.dx), up: !!motion?.up || this.up, down: !!motion?.down || hold.down || this.down,
      block: this.block || this.touchBlock, act: this.queue.shift() || null,
    };
  }
  // Swipe mantenido en la mitad izquierda: dirección según lo lejos que esté el dedo de donde empezó
  heldMotion() {
    let dx = 0, down = false;
    for (const s of this.touches.values()) {
      if (s.zone !== 'move' || !s.hold) continue;
      const ox = s.x - s.x0, oy = s.y - s.y0;
      if (s.hold === 'h' && Math.abs(ox) >= HOLD_DEAD) dx = Math.sign(ox);
      if (s.hold === 'down' && oy >= HOLD_DEAD) down = true;
    }
    return { dx, down };
  }
  push(a) { if (this.enabled) { this.queue.push(a); if (this.queue.length > 3) this.queue.shift(); } }
  clear() {
    this.queue = []; this.dx = 0; this.up = this.down = this.block = false;
    this.swipes = []; this.motion = null; this.motionSampled = false;
    this.touches.clear(); this.syncTouchButtons?.();
  }

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
    this.dx = (this.keys.has('d') ? 1 : 0) - (this.keys.has('a') ? 1 : 0);
    this.up = this.keys.has('w'); this.down = this.keys.has('s'); this.block = this.keys.has('l');
  }

  bindTouch(root, { grab, block, trail }, settings) {
    this.settings = settings;
    const tctx = trail.getContext('2d');
    const hitBtn = (el, x, y) => { const r = el.getBoundingClientRect(); return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < r.width * 0.58; };
    this.syncTouchButtons = () => {
      const touches = [...this.touches.values()];
      this.touchBlock = touches.some(t => t.zone === 'block');
      block.classList.toggle('on', this.touchBlock);
      grab.classList.toggle('on', touches.some(t => t.zone === 'grab'));
    };

    const trackSwipe = (s, x, y) => {
      if (s.zone === 'grab') return;
      s.pts.push([x, y]); s.x = x; s.y = y;
      if (s.swiped) return;
      const dx = x - s.x0, dy = y - s.y0;
      const movement = s.zone === 'move';
      const horizontal = Math.abs(dx) >= Math.abs(dy) * (movement ? 0.8 : 1);
      const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
      const threshold = movement ? (horizontal ? 22 : 30) : 38;
      if (distance < threshold) return;

      s.swiped = true;
      const direction = horizontal ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      if (movement) {
        if (this.swipes.length < 3) this.swipes.push(swipeMotion[direction]);
        s.hold = horizontal ? 'h' : direction === 'down' ? 'down' : null;   // mantener = caminar / agacharse
      } else {
        s.zone = 'attack';
        this.syncTouchButtons();
        this.push(direction);
      }
      this.haptic(6);
    };

    root.addEventListener('touchstart', e => {
      if (!this.enabled) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        const x = t.clientX, y = t.clientY;
        if (hitBtn(grab, x, y)) {
          this.touches.set(t.identifier, { zone: 'grab' });
          this.push('grab'); this.haptic(8);
          continue;
        }
        const zone = hitBtn(block, x, y) ? 'block' : (x < root.clientWidth / 2 ? 'move' : 'attack');
        this.touches.set(t.identifier, { zone, x0: x, y0: y, x, y, t0: performance.now(), swiped: false, hold: null, pts: [[x, y]] });
      }
      this.syncTouchButtons();
    }, { passive: false });
    root.addEventListener('touchmove', e => {
      if (!this.enabled) return;
      e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier);
        if (s) trackSwipe(s, t.clientX, t.clientY);
      }
    }, { passive: false });
    const end = e => {
      if (this.enabled) e.preventDefault();
      for (const t of e.changedTouches) {
        const s = this.touches.get(t.identifier);
        if (!s) continue;
        if (this.enabled && e.type === 'touchend') {
          trackSwipe(s, t.clientX, t.clientY);
          if (s.zone === 'attack' && !s.swiped && performance.now() - s.t0 < 300 &&
              Math.hypot(t.clientX - s.x0, t.clientY - s.y0) < 12) {
            this.push('tap'); this.haptic(5);
          }
        }
        if (s.pts?.length > 1 && s.zone !== 'block') this.trails.push({ pts: s.pts, life: 1 });
        this.touches.delete(t.identifier);
      }
      this.syncTouchButtons();
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
      const live = [...this.touches.values()].filter(s => s.zone === 'move' || s.zone === 'attack').map(s => ({ pts: s.pts, life: 1 }));
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
