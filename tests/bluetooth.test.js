'use strict';
// Simula dois celulares (cada um com o app completo) ligados por um "Bluetooth" falso em memória.
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const www = path.join(__dirname, '..', 'www');
const engineSrc = fs.readFileSync(path.join(www, 'engine.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(www, 'app.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function makePhone(name, bus) {
  const stats = { osc: 0, noise: 0 };
  const els = { app: { innerHTML: '' }, toast: { textContent: '', classList: { add() {}, remove() {} } } };
  const listeners = {}, handlers = {};
  const phone = { name, peer: null, stats, els, sent: [] };
  phone.emit = (ev, data) => (handlers[ev] || []).forEach(f => f(data));

  class FakeAC {
    constructor() { this.currentTime = 0; this.state = 'running'; this.sampleRate = 8000; this.destination = {}; }
    createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() { stats.osc++; }, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 }, connect() {} }; }
    createBuffer(c, l) { return { getChannelData: () => new Float32Array(l) }; }
    createBufferSource() { return { connect() {}, start() { stats.noise++; } }; }
    createBiquadFilter() { return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect() {} }; }
    resume() {}
  }
  const plugin = {
    status: async () => ({ available: true, enabled: true, permission: true }),
    requestAccess: async () => ({ available: true, enabled: true, permission: true }),
    pairedDevices: async () => ({ devices: [{ name: 'Amigo <b>x</b>', address: 'AA:BB:CC' }] }),
    openSettings: async () => {},
    listen: async () => { bus.host = phone; },
    connect: async ({ address }) => {
      assert.strictEqual(address, 'AA:BB:CC');
      const host = bus.host;
      assert(host, 'o outro celular precisa ter criado a partida');
      phone.peer = host; host.peer = phone;
      setTimeout(() => { host.emit('connected', { name: 'Convidado' }); phone.emit('connected', { name: 'Anfitrião' }); }, 1);
      return { name: 'Anfitrião', address: 'XX' };
    },
    send: async ({ data }) => {
      phone.sent.push(data);
      const peer = phone.peer;
      if (peer) setTimeout(() => peer.emit('message', { data }), 2); // ordem preservada, como no RFCOMM
    },
    close: async () => {},
    addListener: (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); return Promise.resolve({ remove() {} }); }
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Float32Array, AudioContext: FakeAC,
    document: {
      querySelector: s => (s === '#app' ? els.app : s === '#toast' ? els.toast : null),
      addEventListener: (t, f) => { listeners[t] = f; }
    },
    localStorage: { getItem: () => null, setItem() {} },
    Capacitor: { isNativePlatform: () => true, Plugins: { ManobraBluetooth: plugin } }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(engineSrc, sandbox);
  vm.runInContext(appSrc, sandbox);
  phone.app = sandbox.__manobraApp;
  phone.html = () => els.app.innerHTML;
  phone.click = attrs => {
    const el = { dataset: attrs };
    listeners.click({ target: { closest: sel => (sel === '[data-i]' ? (attrs.i !== undefined ? el : null) : (attrs.act ? el : null)) } });
  };
  return phone;
}

const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');

(async () => {
  const bus = {};
  const A = makePhone('A', bus), B = makePhone('B', bus);

  // 1) A cria a partida, B entra
  A.click({ act: 'btOpen' }); A.click({ act: 'btHost' }); await sleep(10);
  assert(A.html().includes('Aguardando o outro celular'), 'A deve estar aguardando');
  B.click({ act: 'btOpen' }); B.click({ act: 'btJoin' }); await sleep(10);
  assert(B.html().includes('Amigo &lt;b&gt;x&lt;/b&gt;'), 'nome do aparelho deve ser escapado');
  assert(!B.html().includes('<b>x</b>'), 'sem HTML injetado pelo nome do aparelho');
  B.click({ act: 'btConnect', v: 'AA:BB:CC' }); await sleep(30);
  assert.strictEqual(A.app.screen, 'setup'); assert.strictEqual(B.app.screen, 'setup');
  assert.strictEqual(A.app.humanSide, 0); assert.strictEqual(B.app.humanSide, 1);
  console.log('ok - conexão: A=Brancas (anfitrião), B=Pretas (convidado)');

  // 2) montagem em segredo
  A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); await sleep(10);
  assert(A.html().includes('Aguardando o adversário'), 'A espera B');
  assert(A.app.screen === 'setup', 'A ainda não começou');
  assert.strictEqual(Array.prototype.filter.call(A.app.pieces, x => x).length, 20, 'A só vê as próprias peças');
  B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' }); await sleep(30);
  assert.strictEqual(A.app.screen, 'game'); assert.strictEqual(B.app.screen, 'game');
  assert.strictEqual(boardOf(A), boardOf(B));
  assert.strictEqual(Array.prototype.filter.call(A.app.game.st.b, x => x).length, 40);
  console.log('ok - montagem secreta e início da partida com tabuleiros iguais');

  // 3) jogadas alternadas, sempre conferindo se os dois tabuleiros ficam iguais
  function doRandomMove(P) {
    const g = P.app.game, moves = g.cur.moves;
    const mv = moves[Math.floor(Math.random() * moves.length)];
    if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
    else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
    else {
      P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) });
      if (P.app.choice) P.click({ act: 'choose', v: mv.t });
    }
  }
  let plies = 0;
  while (plies < 500 && !A.app.game.over) {
    const P = A.app.game.st.turn === A.app.humanSide ? A : B;
    const before = P.app.game.plies;
    doRandomMove(P);
    assert.strictEqual(P.app.game.plies, before + 1, 'jogada aplicada localmente');
    await sleep(12);
    assert.strictEqual(A.app.game.plies, B.app.game.plies, 'mesmo número de jogadas nos dois');
    assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais após a jogada ' + (plies + 1));
    plies++;
  }
  assert.deepStrictEqual(!!A.app.game.over, !!B.app.game.over);
  if (A.app.game.over) assert.deepStrictEqual(JSON.parse(JSON.stringify(A.app.game.over)), JSON.parse(JSON.stringify(B.app.game.over)));
  console.log('ok - ' + plies + ' jogadas sincronizadas' + (A.app.game.over ? ' (partida terminou: ' + A.app.game.over.reason + ')' : ''));
  assert(A.stats.osc > 0 && B.stats.osc > 0, 'sons tocaram nos dois celulares');
  console.log('ok - sons tocados (A: ' + A.stats.osc + ' tons, B: ' + B.stats.osc + ' tons)');

  // 4) mudo não toca nada; ligar de novo toca
  A.click({ act: 'sound', v: '0' });
  const n0 = A.stats.osc;
  A.click({ act: 'sound', v: '0' });
  assert.strictEqual(A.stats.osc, n0, 'mudo não gera som');
  A.click({ act: 'sound', v: '1' });
  assert(A.stats.osc > n0, 'som volta ao ligar');
  console.log('ok - mudo e ligar o som');

  // 5) revanche: A volta para a montagem antes de B e o "Pronto" de A não se perde
  if (!A.app.game.over) { // força o fim para testar o botão "jogar de novo"
    B.click({ act: 'menu' }); await sleep(20);
    assert.strictEqual(A.app.screen, 'menu', 'A volta ao menu quando B sai no meio da partida');
    console.log('ok - saída do adversário no meio da partida leva ao menu');
  } else {
    A.click({ act: 'again' }); A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); await sleep(10);
    B.click({ act: 'again' }); B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' }); await sleep(30);
    assert.strictEqual(A.app.screen, 'game'); assert.strictEqual(B.app.screen, 'game');
    assert.strictEqual(boardOf(A), boardOf(B)); assert.strictEqual(A.app.game.plies, 0);
    console.log('ok - revanche começou com tabuleiros iguais');
    A.click({ act: 'menu' }); await sleep(20);
    assert.strictEqual(B.app.screen, 'menu');
    console.log('ok - saída de um lado leva o outro ao menu');
  }

  // 6) montagem inválida do adversário é recusada e a conexão cai para o menu
  const bus2 = {};
  const H = makePhone('H', bus2), G = makePhone('G', bus2);
  H.click({ act: 'btOpen' }); H.click({ act: 'btHost' }); await sleep(10);
  G.click({ act: 'btOpen' }); G.click({ act: 'btJoin' }); await sleep(10);
  G.click({ act: 'btConnect', v: 'AA:BB:CC' }); await sleep(30);
  assert.strictEqual(H.app.screen, 'setup');
  // G (pretas) manda peças fora do próprio terreno
  const cheat = JSON.stringify({ k: 'setup', p: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1]] });
  H.emit('message', { data: cheat });
  assert.strictEqual(H.app.screen, 'menu', 'montagem inválida derruba a partida');
  console.log('ok - montagem inválida do adversário foi recusada');
  H.emit('message', { data: 'lixo{{' }); // mensagem quebrada não derruba o app
  console.log('ok - mensagem quebrada ignorada');
  console.log('\nBluetooth simulado: tudo certo');
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e && e.stack || e); process.exit(1); });
