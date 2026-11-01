'use strict';
// Ferramentas de teste: um "PeerJS" falso em memória e celulares simulados (app completo + online.js).
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const www = path.join(__dirname, '..', 'www');
const src = n => fs.readFileSync(path.join(www, n), 'utf8');

function makeBroker() {
  const peers = {};
  class Emitter {
    constructor() { this.h = {}; }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); return this; }
    emit(e, d) { (this.h[e] || []).slice().forEach(f => f(d)); }
  }
  class Conn extends Emitter {
    constructor() { super(); this.open = false; this.remote = null; }
    send(d) {
      if (!this.open) throw new Error('conexão fechada');
      const r = this.remote;
      setTimeout(() => r.emit('data', d), 1); // ordem preservada
    }
    close() {
      if (!this.open) return;
      this.open = false;
      this.emit('close');
      const r = this.remote;
      if (r && r.open) setTimeout(() => { r.open = false; r.emit('close'); }, 1);
    }
  }
  class Peer extends Emitter {
    constructor(id) {
      super();
      this.id = id || ('anon-' + Math.random().toString(36).slice(2));
      this.conns = [];
      setTimeout(() => {
        if (peers[this.id]) { this.emit('error', { type: 'unavailable-id' }); return; }
        peers[this.id] = this;
        this.emit('open', this.id);
      }, 2);
    }
    connect(id) {
      const c = new Conn();
      this.conns.push(c);
      setTimeout(() => {
        const target = peers[id];
        if (!target) { this.emit('error', { type: 'peer-unavailable' }); return; }
        const r = new Conn();
        c.remote = r; r.remote = c;
        target.conns.push(r);
        target.emit('connection', r);
        c.open = true; r.open = true;
        r.emit('open'); c.emit('open');
      }, 3);
      return c;
    }
    destroy() {
      if (peers[this.id] === this) delete peers[this.id];
      this.conns.forEach(c => c.close());
    }
  }
  return { Peer, peers };
}

function makePhone(name, broker, opts) {
  const els = { app: { innerHTML: '' }, inv: { innerHTML: '' }, toast: { textContent: '', classList: { add() {}, remove() {} } } };
  const listeners = {};
  const store = {};
  const phone = { name, els, store };
  const sandbox = {
    console, setTimeout, clearTimeout, Float32Array, Uint32Array,
    Peer: broker.Peer,
    document: {
      querySelector: s => (s === '#app' ? els.app : s === '#toast' ? els.toast : s === '#inv' ? els.inv : null),
      addEventListener: (t, f) => { listeners[t] = f; }
    },
    navigator: { onLine: !(opts && opts.offline) },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src('engine.js'), sandbox);
  vm.runInContext(src('online.js'), sandbox);
  if (fs.existsSync(path.join(www, 'tournament.js'))) vm.runInContext(src('tournament.js'), sandbox);
  if (fs.existsSync(path.join(www, 'tourlink.js'))) vm.runInContext(src('tourlink.js'), sandbox);
  vm.runInContext(src('app.js'), sandbox);
  phone.sandbox = sandbox;
  phone.app = sandbox.__manobraApp;
  phone.html = () => els.app.innerHTML;
  phone.toast = () => els.toast.textContent;
  phone.inv = () => els.inv.innerHTML;
  phone.click = attrs => {
    const el = { dataset: attrs };
    listeners.click({ target: { closest: sel => (sel === '[data-i]' ? (attrs.i !== undefined ? el : null) : (attrs.act ? el : null)) } });
  };
  phone.input = (id, value) => { const t = { id, value }; listeners.input({ target: t }); return t.value; };
  return phone;
}

module.exports = { makeBroker, makePhone };
