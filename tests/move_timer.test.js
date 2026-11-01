'use strict';
// Tempo por jogada (1min30): contador, zera a cada lance; passou do tempo perde a vez (pula), sem W.O.
const assert = require('assert');
const E = require('../www/engine.js');
const T = require('../www/tournament.js');
const { makeBroker, makePhone } = require('./fakepeer.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(cond, what, ms) {
  for (let i = 0; i < (ms || 4000) / 10; i++) { if (cond()) return; await sleep(10); }
  throw new Error('tempo esgotado esperando: ' + what);
}
const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');

(async () => {
  // 1) o juiz: humano parado => lance ao acaso pelos dois celulares, sem derrota
  {
    const out = [];
    const hub = new T.Hub({ engine: E, send: (id, o) => out.push([id, o]), moveTimeout: 150, moveGrace: 0, entryTimeout: 60000 });
    const a = hub.join('P1', 'Ana').id, b = hub.join('P2', 'Bia').id;
    hub.setFormat('league'); hub.start();
    const m = hub.matches[0];
    hub.handle(a, { k: 'ready', m: m.id }); hub.handle(b, { k: 'ready', m: m.id });
    const relay = (id, o) => hub.handle(id, { k: 'relay', m: m.id, d: JSON.stringify(o) });
    relay(a, { k: 'setup', p: E.presetSetup(0).map(o => [o.i, o.p]) }); relay(b, { k: 'setup', p: E.presetSetup(1).map(o => [o.i, o.p]) });
    const g = hub.rt[m.id].game; assert(g && g.plies === 0);
    const before = Array.prototype.join.call(g.st.b, '');
    await sleep(120); assert.strictEqual(g.plies, 0, 'antes do tempo, nada acontece');
    await sleep(100);
    assert.strictEqual(g.plies, 1, 'estourou o tempo: as brancas perderam a vez');
    assert.strictEqual(g.st.turn, 1, 'a vez passou para as pretas');
    assert.strictEqual(Array.prototype.join.call(g.st.b, ''), before, 'o tabuleiro não mudou');
    const fm = out.filter(x => x[1].k === 'forcedPass');
    assert.strictEqual(fm.length, 2, 'os dois celulares são avisados');
    relay(a, { k: 'move', m: { t: 'm', from: 0, to: 1 } }); // lance que chega junto com a perda da vez: ignorado, sem W.O.
    assert.strictEqual(m.status, 'playing');
    await sleep(200); assert.strictEqual(g.plies, 2, 'o relógio recomeça: agora as pretas também perdem a vez');
    assert.strictEqual(m.status, 'playing', 'sem derrota por demora');
    // jogada normal zera o relógio
    const mv = g.cur.moves[0]; relay(b === 1 ? (g.st.turn === 0 ? a : b) : a, { k: 'move', m: { t: mv.t, from: mv.from, to: mv.to, beyond: mv.beyond | 0 } });
    assert.strictEqual(g.plies, 3);
    console.log('ok - juiz: estourou 1min30 => perde a vez nos dois celulares, sem W.O.; jogada normal zera o relógio');
    hub.leave(a); hub.leave(b);
  }
  // 2) sem juiz (mesmo celular): contador e lance automático
  {
    const P = makePhone('Pvp', makeBroker());
    P.sandbox.__manobraMoveMs = 300;
    P.click({ act: 'startPVP' });
    P.click({ act: 'setupDefault' }); P.click({ act: 'setupDone' });
    P.click({ act: 'setupDefault' }); P.click({ act: 'setupDone' });
    await waitFor(() => P.app.screen === 'game', 'jogo');
    assert(/data-mclock/.test(P.html()) && /⏱ 00:0\d/.test(P.html()), 'contador aparece na partida');
    const b0 = boardOf(P);
    await waitFor(() => P.app.game.plies >= 1, 'perder a vez ao acabar o tempo');
    assert.strictEqual(P.app.game.st.turn, 1, 'a vez passou para as pretas'); assert.strictEqual(boardOf(P), b0, 'tabuleiro igual');
    await waitFor(() => P.app.game.plies >= 2, 'o relógio recomeça a cada vez');
    console.log('ok - mesmo celular: contador na tela; ao acabar, perde a vez e o relógio recomeça');
  }
  // 3) campeonato ponta a ponta: o celular de quem demorou também recebe o lance e fica igual
  {
    const broker = makeBroker();
    const org = makePhone('P0', broker), guest = makePhone('P1', broker);
    org.sandbox.__manobraMoveMs = 400; org.sandbox.__manobraMoveGrace = 0; org.sandbox.__manobraSetupTimeout = 100000;
    guest.sandbox.__manobraMoveMs = 400;
    org.input('nick', 'Org'); org.click({ act: 'tourOpen' }); org.click({ act: 'tourCreate' }); await sleep(30);
    guest.input('nick', 'Conv'); guest.click({ act: 'tourOpen' }); guest.input('tcode', org.app.tour.code); guest.click({ act: 'tourJoin' }); await sleep(40);
    org.click({ act: 'tourFmt', v: 'league' }); await sleep(15); org.click({ act: 'tourStart' }); await sleep(30);
    const m = org.sandbox.ManobraTourLink.snapshot().matches[0];
    const by = {}; [org, guest].forEach(P => { by[P.app.tour.myId] = P; });
    const A = by[m.a], B = by[m.b];
    A.click({ act: 'tourPlay', v: m.id }); await sleep(20); B.click({ act: 'tourPlay', v: m.id });
    await waitFor(() => A.app.screen === 'setup' && B.app.screen === 'setup', 'montagem');
    A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' });
    await waitFor(() => A.app.screen === 'game' && B.app.screen === 'game', 'jogo');
    assert(/data-mclock/.test(A.html()) && /data-mclock/.test(B.html()), 'os dois veem o contador');
    await waitFor(() => A.app.game.plies >= 3 && B.app.game.plies === A.app.game.plies, 'três vezes perdidas chegarem aos dois', 6000);
    assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais');
    const hm = org.sandbox.ManobraTourLink.snapshot().matches.find(x => x.id === m.id);
    assert.strictEqual(hm.status, 'playing', 'sem W.O.: ' + hm.reason);
    console.log('ok - campeonato: ninguém joga, o juiz tira a vez de cada um e os dois celulares ficam iguais');
  }
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
