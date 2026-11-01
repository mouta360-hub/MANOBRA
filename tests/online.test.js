'use strict';
// Simula dois celulares (app completo + online.js) ligados por um PeerJS falso em memória.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const www = path.join(__dirname, '..', 'www');
const src = n => fs.readFileSync(path.join(www, n), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

function makePhone(name, broker) {
  const els = { app: { innerHTML: '' }, toast: { textContent: '', classList: { add() {}, remove() {} } } };
  const listeners = {};
  const phone = { name, els, toasts: [] };
  const sandbox = {
    console, setTimeout, clearTimeout, Float32Array, Uint32Array,
    Peer: broker.Peer, // a biblioteca "já carregada"
    document: {
      querySelector: s => (s === '#app' ? els.app : s === '#toast' ? els.toast : null),
      addEventListener: (t, f) => { listeners[t] = f; }
    },
    navigator: { onLine: true },
    localStorage: { getItem: () => null, setItem() {} }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src('engine.js'), sandbox);
  vm.runInContext(src('online.js'), sandbox);
  vm.runInContext(src('app.js'), sandbox);
  phone.sandbox = sandbox;
  phone.app = sandbox.__manobraApp;
  phone.html = () => els.app.innerHTML;
  phone.toast = () => els.toast.textContent;
  phone.click = attrs => {
    const el = { dataset: attrs };
    listeners.click({ target: { closest: sel => (sel === '[data-i]' ? (attrs.i !== undefined ? el : null) : (attrs.act ? el : null)) } });
  };
  phone.type = value => { const t = { id: 'code', value }; listeners.input({ target: t }); return t.value; };
  return phone;
}

const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');

(async () => {
  const broker = makeBroker();
  const A = makePhone('A', broker), B = makePhone('B', broker);

  // 1) A cria a partida e recebe um código
  assert(A.html().includes('Jogar online'), 'menu mostra o botão online');
  A.click({ act: 'onOpen' }); A.click({ act: 'onHost' }); await sleep(20);
  const code = A.app.bt.code;
  assert(/^[A-HJ-NP-Z2-9]{4}$/.test(code), 'código de 4 caracteres sem letras confusas: ' + code);
  assert(A.html().includes('bigcode') && A.html().includes(code), 'código aparece na tela');
  assert.strictEqual(A.app.bt.stage, 'listening');
  console.log('ok - anfitrião criou a partida com o código ' + code);

  // 2) código errado / curto
  const C = makePhone('C', broker);
  C.click({ act: 'onOpen' }); C.type('ab'); C.click({ act: 'onJoin' });
  assert(/4 letras/.test(C.toast()), 'código curto é recusado: ' + C.toast());
  C.type('zzzz'); C.click({ act: 'onJoin' }); await sleep(40);
  assert.strictEqual(C.app.bt.stage, 'idle');
  assert(/não encontrada/.test(C.html()), 'código inexistente mostra aviso');
  console.log('ok - código curto e código inexistente recusados com aviso');

  // 3) B entra (digitando em minúsculas e com espaço)
  B.click({ act: 'onOpen' });
  const typed = B.type(' ' + code.toLowerCase() + ' x');
  assert.strictEqual(typed, code, 'o campo converte para maiúsculas e limita a 4');
  B.click({ act: 'onJoin' }); await sleep(60);
  assert.strictEqual(A.app.screen, 'setup'); assert.strictEqual(B.app.screen, 'setup');
  assert.strictEqual(A.app.humanSide, 0); assert.strictEqual(B.app.humanSide, 1);
  console.log('ok - convidado entrou: anfitrião=Brancas, convidado=Pretas');

  // 4) um terceiro tentando entrar na sala cheia não derruba ninguém
  const D = makePhone('D', broker);
  D.click({ act: 'onOpen' }); D.type(code); D.click({ act: 'onJoin' }); await sleep(60);
  assert.strictEqual(A.app.screen, 'setup', 'anfitrião segue na montagem');
  assert.strictEqual(B.app.screen, 'setup');
  console.log('ok - terceiro celular não atrapalha a partida em andamento');

  // 5) montagem secreta e jogo
  A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); await sleep(10);
  assert(A.html().includes('Aguardando o adversário'));
  B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' }); await sleep(30);
  assert.strictEqual(A.app.screen, 'game'); assert.strictEqual(B.app.screen, 'game');
  assert.strictEqual(boardOf(A), boardOf(B));
  console.log('ok - montagem em segredo e tabuleiros iguais');

  function doRandomMove(P) {
    const moves = P.app.game.cur.moves;
    const mv = moves[Math.floor(Math.random() * moves.length)];
    if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
    else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
    else {
      P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) });
      if (P.app.choice) P.click({ act: 'choose', v: mv.t });
    }
  }
  let plies = 0;
  while (plies < 300 && !A.app.game.over) {
    const P = A.app.game.st.turn === A.app.humanSide ? A : B;
    const before = P.app.game.plies;
    doRandomMove(P);
    assert.strictEqual(P.app.game.plies, before + 1, 'jogada aplicada localmente');
    await sleep(12);
    assert.strictEqual(A.app.game.plies, B.app.game.plies);
    assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais após a jogada ' + (plies + 1));
    plies++;
  }
  assert.deepStrictEqual(!!A.app.game.over, !!B.app.game.over);
  console.log('ok - ' + plies + ' jogadas sincronizadas pela internet' + (A.app.game.over ? ' (terminou: ' + A.app.game.over.reason + ')' : ''));

  // 6) quando um lado sai, o outro volta ao menu
  B.click({ act: 'menu' }); await sleep(30);
  if (!A.app.game || !A.app.game.over || A.app.screen === 'menu') {
    assert.strictEqual(A.app.screen, 'menu');
  }
  console.log('ok - saída de um lado leva o outro ao menu');

  // 7) depois de sair dá para criar outra partida online e para o Bluetooth continuar separado
  A.click({ act: 'menu' }); A.click({ act: 'onOpen' }); A.click({ act: 'onHost' }); await sleep(20);
  assert(/^[A-HJ-NP-Z2-9]{4}$/.test(A.app.bt.code), 'nova partida criada: ' + A.app.bt.code);
  A.click({ act: 'btCancel' }); await sleep(10);
  assert.strictEqual(A.app.screen, 'online'); assert.strictEqual(A.app.bt.stage, 'idle');
  A.click({ act: 'btBack' });
  A.click({ act: 'btOpen' });
  assert(/só funciona no app Android/.test(A.html()), 'a tela de Bluetooth continua separada');
  console.log('ok - cancelar volta à tela online; Bluetooth segue separado');

  // 8) sem internet
  const E = makePhone('E', broker);
  E.sandbox.navigator.onLine = false;
  E.click({ act: 'onOpen' }); E.click({ act: 'onHost' }); await sleep(10);
  assert(/Sem internet/.test(E.html()), 'sem internet mostra aviso: ' + E.html().slice(0, 200));
  assert.strictEqual(E.app.bt.stage, 'idle');
  E.type('abcd'); E.click({ act: 'onJoin' }); await sleep(10);
  assert(/Sem internet/.test(E.html()), 'entrar sem internet também avisa');
  console.log('ok - sem internet: aviso claro, sem travar');
  console.log('\nOnline simulado: tudo certo');
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e && e.stack || e); process.exit(1); });
