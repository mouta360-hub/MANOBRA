'use strict';
// Campeonato offline (só robôs) com botão Salvar + tela sempre acesa durante o jogo.
const assert = require('assert');
const { makeBroker, makePhone } = require('./fakepeer.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(cond, what, ms) {
  for (let i = 0; i < (ms || 3000) / 10; i++) { if (cond()) return; await sleep(10); }
  throw new Error('tempo esgotado esperando: ' + what);
}
function randomMove(P) {
  const moves = P.app.game.cur.moves, mv = moves[Math.floor(Math.random() * moves.length)];
  if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
  else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
  else { P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) }); if (P.app.choice) P.click({ act: 'choose', v: mv.t }); }
}
const KEY = 'manobra.tour.bot.save.v1';

(async () => {
  const phone = () => {
    const P = makePhone('Off', makeBroker(), { offline: true });
    const calls = [];
    P.sandbox.Capacitor = { isNativePlatform: () => true, Plugins: { ManobraScreen: { keepAwake: o => { calls.push(o.on); return Promise.resolve(); } } } };
    P.sandbox.__manobraBotDelay = 0;
    P.calls = calls; return P;
  };
  const S = phone();
  S.input('nick', 'Offline');
  assert.deepStrictEqual(S.calls, [], 'no menu a tela não é segurada');
  S.click({ act: 'tourOpen' }); S.click({ act: 'tourCreate' });
  await waitFor(() => S.app.tour.role === 'host', 'campeonato criado sem internet');
  assert(S.app.tour.local, 'campeonato é local'); assert(/offline/i.test(S.html()), 'avisa que é offline');
  assert(S.calls.length && S.calls[S.calls.length - 1] === true, 'tela acesa na tela do campeonato');
  S.click({ act: 'tourFmt', v: 'knockout' }); S.click({ act: 'tourAddBot' });
  await waitFor(() => S.app.tour.snap.players.length === 2, 'robô entrou');
  S.click({ act: 'tourStart' }); await waitFor(() => S.app.tour.snap.status === 'running', 'iniciou');
  S.click({ act: 'tourPlay', v: S.app.tour.snap.matches[0].id });
  await waitFor(() => S.app.screen === 'setup', 'montagem');
  assert.strictEqual(S.calls[S.calls.length - 1], true, 'tela acesa na montagem');
  S.click({ act: 'setupDefault' }); S.click({ act: 'setupDone' });
  await waitFor(() => S.app.screen === 'game', 'jogo');
  assert.strictEqual(S.calls[S.calls.length - 1], true, 'tela acesa na partida');
  for (let i = 0; i < 4; i++) { // alguns lances; o robô responde
    await waitFor(() => S.app.game.st.turn === S.app.humanSide && !S.app.animating, 'minha vez');
    randomMove(S);
  }
  await waitFor(() => S.app.game.st.turn === S.app.humanSide && !S.app.animating, 'minha vez de novo');
  await sleep(700);
  assert(!S.store[KEY], 'não salva sozinho: só quando o botão é tocado');
  assert(S.html().includes('data-act="tourSave"'), 'botão Salvar aparece durante a partida');
  S.click({ act: 'tourSave' });
  assert(S.store[KEY], 'salvou pelo botão');
  const saved = JSON.parse(S.store[KEY]);
  assert(saved.local && saved.local.game, 'salvou a partida em andamento');
  assert.strictEqual(saved.local.game.plies, S.app.game.plies, 'salvamento tem o mesmo lance do tabuleiro');
  assert.strictEqual(saved.local.game.b.join(''), Array.prototype.join.call(S.app.game.st.b, ''), 'mesmo tabuleiro');
  const boardBefore = Array.prototype.join.call(S.app.game.st.b, ''), turnBefore = S.app.game.st.turn;
  console.log('ok - offline: cria campeonato sem internet, salva pelo botão e a tela fica acesa');

  // "fecha o app" e reabre sem internet: continua de onde parou
  const S2 = phone();
  S2.store[KEY] = S.store[KEY];
  S2.input('nick', 'Offline'); S2.click({ act: 'tourOpen' });
  assert(S2.html().includes('Continuar campeonato salvo'));
  S2.click({ act: 'tourResume' });
  await waitFor(() => S2.app.screen === 'game', 'retomou direto na partida');
  assert.strictEqual(Array.prototype.join.call(S2.app.game.st.b, ''), boardBefore, 'mesmo tabuleiro depois de reabrir');
  assert.strictEqual(S2.app.game.st.turn, turnBefore);
  randomMove(S2); // continua a jogar sem W.O.
  await sleep(300);
  assert.strictEqual(S2.app.screen, 'game');
  console.log('ok - reabrir o app: campeonato continua do mesmo ponto, sem internet');

  // voltar ao menu devolve o comportamento normal da tela
  S2.click({ act: 'menu' });
  await sleep(50);
  if (S2.app.screen === 'tour') S2.click({ act: 'tourExit' });
  await sleep(50);
  console.log('   tela agora:', S2.app.screen, '| último keepAwake:', S2.calls[S2.calls.length - 1]);
  assert.strictEqual(S2.app.screen, 'menu');
  assert.strictEqual(S2.calls[S2.calls.length - 1], false, 'no menu a tela volta ao normal');
  console.log('ok - ao sair do jogo a tela volta ao comportamento normal');
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
