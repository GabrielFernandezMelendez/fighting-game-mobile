// =====================================================================
//  RED: enlace P2P con PeerJS + lockstep con retardo de entrada y resincronización
// =====================================================================
import { step, checksum, serialize, restore } from './sim.js';

// ---------- Codificación compacta de la entrada (1 número por fotograma) ----------
const ACTS = [null, 'tap', 'left', 'right', 'up', 'down', 'grab'];
export const encode = i => (i.dx + 1) | (i.up ? 4 : 0) | (i.down ? 8 : 0) | (i.block ? 16 : 0) | (ACTS.indexOf(i.act) << 5);
export const decode = c => ({ dx: (c & 3) - 1, up: !!(c & 4), down: !!(c & 8), block: !!(c & 16), act: ACTS[c >> 5] });

// ---------- Lockstep: ambos simulan lo mismo con las entradas de los dos ----------
export class Lockstep {
  constructor({ role, delay, send, match }) {
    this.role = role; this.delay = delay; this.send = send; this.M = match;
    this.inputs = [new Map(), new Map()]; this.history = new Map(); this.localFrame = 0;
    this.mySums = new Map(); this.theirSums = new Map(); this.pendingSnap = null; this.resyncs = 0;
    for (let f = 0; f < delay; f++) { this.inputs[0].set(f, 1); this.inputs[1].set(f, 1); }   // 1 = sin entrada (dx=0)
    this.lastAdvance = 0;
  }
  // Llamar 60 veces por segundo con la entrada local
  tick(localInput) {
    if (this.localFrame - this.M.frame < this.delay + 8) {
      const f = this.localFrame + this.delay, c = encode(localInput);
      this.inputs[this.role].set(f, c); this.send({ t: 'i', f, c }); this.localFrame++;
    }
    return this.advance();
  }
  advance() {
    let n = 0;
    while (true) {
      const f = this.M.frame;
      if (this.pendingSnap && this.pendingSnap.f === f) { this.M = restore(this.pendingSnap.d); this.pendingSnap = null; this.resyncs++; }
      const a = this.inputs[0].get(f), b = this.inputs[1].get(f);
      if (a === undefined || b === undefined) break;
      step(this.M, [decode(a), decode(b)]);
      this.history.set(f, [a, b]); this.inputs[0].delete(f); this.inputs[1].delete(f); this.history.delete(f - 600);
      n++;
      const done = this.M.frame;
      if (done % 120 === 0) {
        const s = checksum(this.M); this.mySums.set(done, s);
        if (this.role === 0) this.send({ t: 'sum', f: done, s });
        else this.compare(done);
      }
    }
    if (n) this.lastAdvance = 0; else this.lastAdvance++;
    return n;
  }
  compare(f) {
    if (!this.mySums.has(f) || !this.theirSums.has(f)) return;
    if (this.mySums.get(f) !== this.theirSums.get(f)) this.send({ t: 'need' });
    this.mySums.delete(f); this.theirSums.delete(f);
  }
  onMessage(msg) {
    if (msg.t === 'i') this.inputs[1 - this.role].set(msg.f, msg.c);
    else if (msg.t === 'sum') { this.theirSums.set(msg.f, msg.s); this.compare(msg.f); }
    else if (msg.t === 'need' && this.role === 0) this.send({ t: 'snap', f: this.M.frame, d: serialize(this.M) });
    else if (msg.t === 'snap') this.applySnap(msg);
  }
  // Resincronización: el anfitrión manda el estado; el invitado lo adopta y re-simula lo que llevaba de más
  applySnap({ f, d }) {
    if (this.M.frame < f) { this.pendingSnap = { f, d }; return; }
    const target = this.M.frame; this.M = restore(d); this.resyncs++;
    for (let k = f; k < target; k++) { const h = this.history.get(k); if (!h) break; step(this.M, [decode(h[0]), decode(h[1])]); }
  }
  get stalled() { return this.lastAdvance > 20; }
}

// ---------- Enlace P2P (PeerJS, solo navegador) ----------
const PREFIX = 'neonpelea-v1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = () => Array.from({ length: 5 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

export class PeerLink {
  constructor() { this.peer = null; this.conn = null; this.handlers = new Set(); this.onClose = null; this.rtt = 120; }
  _wire(conn) {
    this.conn = conn;
    conn.on('data', m => {
      if (m && m.t === 'ping') { conn.send({ t: 'pong', ts: m.ts }); return; }
      if (m && m.t === 'pong') { this.rtt = this.rtt * 0.6 + (performance.now() - m.ts) * 0.4; return; }
      for (const h of this.handlers) h(m);
    });
    conn.on('close', () => this.onClose && this.onClose('El rival se ha desconectado'));
    conn.on('error', () => this.onClose && this.onClose('Error de conexión'));
    this.pinger = setInterval(() => { try { conn.send({ t: 'ping', ts: performance.now() }); } catch {} }, 700);
  }
  host(onCode) {
    return new Promise((resolve, reject) => {
      const tryCode = () => {
        const code = newCode();
        const peer = new window.Peer(PREFIX + code, { debug: 0 });
        this.peer = peer;
        peer.on('open', () => onCode(code));
        peer.on('connection', conn => conn.on('open', () => { this._wire(conn); resolve(); }));
        peer.on('error', e => { if (e.type === 'unavailable-id') { peer.destroy(); tryCode(); } else reject(new Error(errText(e))); });
      };
      tryCode();
    });
  }
  join(code) {
    return new Promise((resolve, reject) => {
      const peer = new window.Peer({ debug: 0 }); this.peer = peer;
      const timer = setTimeout(() => reject(new Error('No se encontró la sala. Revisa el código.')), 15000);
      peer.on('open', () => {
        const conn = peer.connect(PREFIX + code.toUpperCase().trim(), { reliable: true });
        conn.on('open', () => { clearTimeout(timer); this._wire(conn); resolve(); });
      });
      peer.on('error', e => { clearTimeout(timer); reject(new Error(errText(e))); });
    });
  }
  send(m) { try { this.conn && this.conn.open && this.conn.send(m); } catch {} }
  on(h) { this.handlers.add(h); return () => this.handlers.delete(h); }
  close() { clearInterval(this.pinger); try { this.conn && this.conn.close(); } catch {} try { this.peer && this.peer.destroy(); } catch {} this.conn = null; this.peer = null; this.handlers.clear(); }
}
function errText(e) {
  return { 'peer-unavailable': 'No existe ninguna sala con ese código.', network: 'Sin conexión con el servidor de emparejamiento.', 'browser-incompatible': 'Este navegador no soporta WebRTC.' }[e.type] || ('Error de red: ' + (e.type || e.message));
}
