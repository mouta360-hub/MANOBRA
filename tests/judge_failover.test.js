'use strict';
// Juiz reserva: quando o juiz principal sai/cai, o próximo da fila assume e o campeonato continua.
const assert = require('assert');
const { makeBroker, makePhone } = require('./fakepeer.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(cond, what, ms) {
  for (let i = 0; i < (ms || 8000) / 20; i++) { if (cond()) return; await sleep(20); }
  throw new Error('tempo esgotado esperando: ' + what);
}
const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');
function randomMove(P) {
  const moves = P.app.game.cur.moves, mv = moves[Math.floor(Math.random() * moves.length)];
  if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
  else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
  else { P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) }); if (P.app.choice) P.click({ act: 'choose', v: mv.t }); }
}
async function room(n) {
  const broker = makeBroker(), ph = [];
  for (let i = 0; i < n; i++) ph.push(makePhone('P' + i, broker));
  const org = ph[0];
  org.input('nick', 'Org'); org.click({ act: 'tourOpen' }); org.click({ act: 'tourCreate' }); await sleep(60);
  for (let i = 1; i < n; i++) { const P = ph[i]; P.input('nick', 'J' + i); P.click({ act: 'tourOpen' }); P.input('tcode', org.app.tour.code); P.click({ act: 'tourJoin' }); await sleep(60); }
  ph.slice(1).forEach(P => assert.strictEqual(P.app.tour.role, 'guest'));
  return ph;
}
const link = P => P.sandbox.ManobraTourLink;
const judges = ph => ph.filter(P => P.app.tour.role === 'host');
const crash = P => link(P).leave(); // celular some (app fechado / sem internet): sem avisar ninguém

(async () => {
  // 1) saguão: organizador sai => J1 assume, os outros seguem o novo juiz, e ele consegue iniciar
  {
    const ph = await room(4);
    ph[0].click({ act: 'tourExit' });
    await waitFor(() => judges(ph.slice(1)).length === 1, 'um reserva assumir');
    const J = judges(ph.slice(1))[0];
    assert.strictEqual(J, ph[1], 'o 2º jogador (primeiro da fila) assume');
    const snap = link(J).snapshot();
    assert.strictEqual(snap.judge.id, 1); assert(snap.judge.epoch >= 2);
    assert(!snap.players.some(p => p.id === 0), 'o juiz que saiu some da lista do saguão');
    await waitFor(() => [ph[2], ph[3]].every(P => P.app.tour.snap && P.app.tour.snap.judge && P.app.tour.snap.judge.id === 1), 'os outros verem o novo juiz');
    J.click({ act: 'tourFmt', v: 'knockout' }); await waitFor(() => link(J).snapshot().format === 'knockout', 'formato atualizado');
    assert.strictEqual(link(J).snapshot().format, 'knockout', 'o novo juiz escolhe o formato');
    assert(J.html().includes('data-act="tourStart"'), 'o novo juiz vê o botão Iniciar');
    J.click({ act: 'tourStart' }); await waitFor(() => link(J).snapshot().status === 'running', 'o novo juiz iniciar o campeonato');
    await waitFor(() => ph[2].app.tour.snap.status === 'running' && ph[3].app.tour.snap.status === 'running', 'os outros verem o campeonato iniciado');
    console.log('ok - saguão: o 2º jogador vira juiz, escolhe o formato e inicia; os outros acompanham');
    ph.forEach(P => { try { crash(P); } catch (e) {} });
  }
  // 2) campeonato em andamento: o "Jogar" dos outros celulares chega ao novo juiz e a partida começa
  {
    const ph = await room(3);
    ph[0].click({ act: 'tourFmt', v: 'league' }); await sleep(30); ph[0].click({ act: 'tourStart' }); await sleep(120);
    ph[0].click({ act: 'tourExit' });
    await waitFor(() => ph[1].app.tour.role === 'host', 'J1 assumir');
    await sleep(300);
    const snap = link(ph[1]).snapshot();
    const m = snap.matches.find(x => x.status === 'pending' && x.a !== 0 && x.b !== 0 && x.a != null && x.b != null);
    assert(m, 'há partida entre os convidados');
    const byId = {}; [ph[1], ph[2]].forEach(P => { byId[P.app.tour.myId] = P; });
    const A = byId[m.a], B = byId[m.b];
    A.click({ act: 'tourPlay', v: m.id }); await sleep(120); B.click({ act: 'tourPlay', v: m.id });
    await waitFor(() => A.app.screen === 'setup' && B.app.screen === 'setup', 'os dois entrarem na montagem depois da troca de juiz');
    A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' });
    await waitFor(() => A.app.screen === 'game' && B.app.screen === 'game', 'a partida começar');
    for (let i = 0; i < 10; i++) {
      const P = A.app.game.st.turn === A.app.humanSide ? A : B;
      await waitFor(() => !P.app.animating, 'animação'); randomMove(P);
      await waitFor(() => A.app.game.plies === B.app.game.plies, 'o lance chegar ao outro');
      assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais no lance ' + (i + 1));
    }
    assert.strictEqual(link(ph[1]).snapshot().matches.find(x => x.id === m.id).status, 'playing');
    console.log('ok - em andamento: "Jogar" chega ao novo juiz, a partida começa e as jogadas sincronizam');
    ph.forEach(P => { try { crash(P); } catch (e) {} });
  }
  // 3) vários reservas caem juntos: assume o próximo da fila (3º jogador), sem travar
  {
    const ph = await room(4);
    await sleep(300);
    crash(ph[0]); crash(ph[1]); // juiz e 1º reserva somem ao mesmo tempo
    await waitFor(() => ph[2].app.tour.role === 'host' || ph[3].app.tour.role === 'host', 'o próximo da fila assumir', 12000);
    assert.strictEqual(ph[2].app.tour.role, 'host', 'o 3º jogador (próximo da fila) assume');
    assert.notStrictEqual(ph[3].app.tour.role, 'host', 'só um juiz');
    await waitFor(() => ph[3].app.tour.snap.judge.id === 2, 'o 4º jogador seguir o novo juiz');
    console.log('ok - juiz e 1º reserva caem juntos: o próximo da fila assume (em cascata)');
    // 4) segunda queda: o novo juiz cai e o seguinte assume
    crash(ph[2]);
    await waitFor(() => ph[3].app.tour.role === 'host', 'o 4º jogador assumir na segunda queda', 12000);
    assert(ph[3].app.tour.snap.judge.epoch >= 3);
    console.log('ok - segunda queda: o seguinte da fila assume de novo');
    ph.forEach(P => { try { crash(P); } catch (e) {} });
  }
  // 5) partida humano x humano em andamento: o juiz cai e o jogo continua do mesmo ponto (sem W.O.)
  {
    const ph = await room(4);
    ph[0].click({ act: 'tourFmt', v: 'league' }); await sleep(30); ph[0].click({ act: 'tourStart' }); await sleep(120);
    const snap0 = link(ph[0]).snapshot();
    const m = snap0.matches.find(x => x.round === 1 && x.a !== 0 && x.b !== 0);
    assert(m, 'há partida entre dois convidados na rodada 1');
    const byId = {}; ph.forEach(P => { byId[P.app.tour.myId] = P; });
    const A = byId[m.a], B = byId[m.b];
    A.click({ act: 'tourPlay', v: m.id }); await sleep(100); B.click({ act: 'tourPlay', v: m.id });
    await waitFor(() => A.app.screen === 'setup' && B.app.screen === 'setup', 'montagem');
    A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' });
    await waitFor(() => A.app.screen === 'game' && B.app.screen === 'game', 'partida');
    for (let i = 0; i < 4; i++) {
      const P = A.app.game.st.turn === A.app.humanSide ? A : B;
      await waitFor(() => !P.app.animating, 'animação'); randomMove(P);
      await waitFor(() => A.app.game.plies === B.app.game.plies, 'lance chegar');
    }
    await sleep(1400); // o reserva recebe uma cópia atualizada do jogo
    crash(ph[0]); // o juiz principal cai no meio da partida
    await waitFor(() => judges(ph.slice(1)).length === 1, 'um reserva assumir no meio da partida', 12000);
    await sleep(800);
    for (let i = 0; i < 6; i++) {
      const P = A.app.game.st.turn === A.app.humanSide ? A : B;
      await waitFor(() => !P.app.animating, 'animação'); randomMove(P);
      await waitFor(() => A.app.game.plies === B.app.game.plies, 'lance chegar ao outro depois da troca de juiz');
      assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais depois da troca de juiz');
    }
    assert(A.app.screen === 'game' && B.app.screen === 'game', 'ninguém foi expulso da partida (W.O.)');
    const J = judges(ph.slice(1))[0];
    assert.strictEqual(link(J).snapshot().matches.find(x => x.id === m.id).status, 'playing', 'sem W.O. na troca de juiz');
    console.log('ok - partida humano x humano continua do mesmo ponto quando o juiz cai');
    ph.forEach(P => { try { crash(P); } catch (e) {} });
  }
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
