'use strict';
// Ponta a ponta: o tempo de montagem acaba, o computador completa as peças e o jogo começa (sem W.O.).
const assert = require('assert');
const { makeBroker, makePhone } = require('./fakepeer.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(cond, what, ms) {
  for (let i = 0; i < (ms || 3000) / 10; i++) { if (cond()) return; await sleep(10); }
  throw new Error('tempo esgotado esperando: ' + what);
}
const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');
function randomMove(P) {
  const moves = P.app.game.cur.moves, mv = moves[Math.floor(Math.random() * moves.length)];
  if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
  else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
  else { P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) }); if (P.app.choice) P.click({ act: 'choose', v: mv.t }); }
}

async function scenario(label, prep) {
  const broker = makeBroker();
  const org = makePhone('P0', broker), guest = makePhone('P1', broker);
  org.sandbox.__manobraSetupTimeout = 600;
  org.input('nick', 'Org'); org.click({ act: 'tourOpen' }); org.click({ act: 'tourCreate' }); await sleep(30);
  const code = org.app.tour.code;
  guest.input('nick', 'Convidado'); guest.click({ act: 'tourOpen' }); guest.input('tcode', code); guest.click({ act: 'tourJoin' }); await sleep(40);
  assert.strictEqual(guest.app.tour.role, 'guest');
  org.click({ act: 'tourFmt', v: 'league' }); await sleep(15);
  org.click({ act: 'tourStart' }); await sleep(30);
  const m = org.sandbox.ManobraTourLink.snapshot().matches[0];
  const byId = {}; [org, guest].forEach(P => { byId[P.app.tour.myId] = P; });
  const A = byId[m.a], B = byId[m.b];
  A.click({ act: 'tourPlay', v: m.id }); await sleep(20); B.click({ act: 'tourPlay', v: m.id });
  await waitFor(() => A.app.screen === 'setup' && B.app.screen === 'setup', 'montagem começar');
  prep(A, B);
  await waitFor(() => A.app.screen === 'game' && B.app.screen === 'game', label + ': jogo começar ao fim do tempo');
  assert.strictEqual(boardOf(A), boardOf(B), label + ': tabuleiros iguais');
  const total = P => Array.prototype.filter.call(P.app.game.st.b, x => x).length;
  assert.strictEqual(total(A), 26, label + ': 13 peças de cada lado');
  for (let i = 0; i < 12; i++) { // joga alguns lances: nada de W.O. por tabuleiros diferentes
    const P = A.app.game.st.turn === A.app.humanSide ? A : B;
    randomMove(P);
    await waitFor(() => A.app.game.plies === B.app.game.plies, label + ': lance chegar ao adversário');
    assert.strictEqual(boardOf(A), boardOf(B), label + ': tabuleiros iguais no lance ' + (i + 1));
  }
  const hm = org.sandbox.ManobraTourLink.snapshot().matches.find(x => x.id === m.id);
  assert.strictEqual(hm.status, 'playing', label + ': partida segue valendo (' + hm.reason + ')');
  console.log('ok -', label);
}


async function vsBot() {
  const S = makePhone('Solo', makeBroker());
  S.sandbox.__manobraBotDelay = 0; S.sandbox.__manobraSetupTimeout = 600;
  S.input('nick', 'Sozinho'); S.click({ act: 'tourOpen' }); S.click({ act: 'tourCreate' });
  await waitFor(() => S.app.tour.role === 'host', 'campeonato criado');
  S.click({ act: 'tourFmt', v: 'knockout' }); S.click({ act: 'tourStart' });
  await waitFor(() => S.app.tour.snap.status === 'running', 'iniciou');
  const m = S.app.tour.snap.matches[0];
  S.click({ act: 'tourPlay', v: m.id });
  await waitFor(() => S.app.screen === 'setup', 'montagem');
  S.click({ i: String(require('../www/engine.js').territoryCells(S.app.humanSide)[0]) }); // só 1 peça colocada
  await waitFor(() => S.app.screen === 'game', 'jogo contra o robô começar ao fim do tempo');
  assert.strictEqual(Array.prototype.filter.call(S.app.game.st.b, x => x).length, 26);
  for (let i = 0; i < 30 && S.app.screen === 'game' && S.app.game && !S.app.game.over; i++) {
    if (S.app.game.st.turn === S.app.humanSide) randomMove(S);
    await sleep(60);
  }
  const hm = S.sandbox.ManobraTourLink.snapshot().matches.find(x => x.id === m.id);
  assert(S.app.screen === 'game' || (hm.status === 'done' && !/W\.O\./.test(hm.reason || '')), 'foi expulso da partida: ' + hm.status + ' / ' + hm.reason);
  assert(hm.status === 'playing' || !/W\.O\./.test(hm.reason || ''), 'sem W.O.: ' + hm.reason);
  console.log('ok - contra o robô: tempo acaba, completa ao acaso e joga normalmente');
}

(async () => {
  await vsBot();
  await scenario('ninguém terminou a montagem', () => {});
  await scenario('só um terminou (o outro tem 4 peças)', (A, B) => {
    A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' });
    const cells = require('../www/engine.js').territoryCells(B.app.humanSide).slice(0, 4);
    cells.forEach(i => B.click({ i: String(i) }));
  });
  await scenario('os dois com montagem pela metade', (A, B) => {
    const E = require('../www/engine.js');
    E.territoryCells(A.app.humanSide).slice(0, 3).forEach(i => A.click({ i: String(i) }));
    E.territoryCells(B.app.humanSide).slice(0, 7).forEach(i => B.click({ i: String(i) }));
  });
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
