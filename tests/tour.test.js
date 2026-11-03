'use strict';
// Campeonato de ponta a ponta: vários celulares simulados (app completo) + PeerJS falso.
const assert = require('assert');
const { makeBroker, makePhone } = require('./fakepeer.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
// espera uma condição ficar verdadeira (até 2 s), em vez de torcer para um tempo fixo bastar
async function waitFor(cond, what) {
  for (let i = 0; i < 1000; i++) { if (cond()) return; await sleep(10); }
  throw new Error('tempo esgotado esperando: ' + what);
}
const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');

function doRandomMove(P) {
  const moves = P.app.game.cur.moves;
  const mv = moves[Math.floor(Math.random() * moves.length)];
  if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
  else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
  else { P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) }); if (P.app.choice) P.click({ act: 'choose', v: mv.t }); }
}

async function create(n, format) {
  const broker = makeBroker();
  const phones = [];
  for (let i = 0; i < n; i++) phones.push(makePhone('P' + i, broker));
  const org = phones[0];
  org.input('nick', 'Org'); org.click({ act: 'tourOpen' }); org.click({ act: 'tourCreate' }); await sleep(30);
  const code = org.app.tour.code;
  assert(/^[A-HJ-NP-Z2-9]{4}$/.test(code), 'código do campeonato: ' + code);
  assert(org.html().includes(code) && org.html().includes('Jogadores (1/8)'));
  for (let i = 1; i < n; i++) {
    const P = phones[i];
    P.input('nick', 'J' + i); P.click({ act: 'tourOpen' });
    assert.strictEqual(P.input('tcode', ' ' + code.toLowerCase() + 'zz'), code, 'campo do código converte e limita');
    P.click({ act: 'tourJoin' }); await sleep(40);
    assert.strictEqual(P.app.tour.role, 'guest', 'entrou: ' + P.app.tour.msg);
  }
  await sleep(20);
  const byId = {};
  phones.forEach(P => { byId[P.app.tour.myId] = P; });
  assert.strictEqual(org.app.tour.snap.players.length, n);
  phones.forEach(P => assert.strictEqual(P.app.tour.snap.players.length, n, 'todos veem a sala de espera'));
  org.click({ act: 'tourFmt', v: format }); await sleep(15);
  phones.forEach(P => assert.strictEqual(P.app.tour.snap.format, format, 'formato aparece para todos'));
  return { broker, phones, org, byId, code };
}

const hubSnap = org => org.sandbox.ManobraTourLink.snapshot();

async function playMatch(T, m) {
  const { byId } = T;
  const A = byId[m.a], B = byId[m.b];
  assert(A.html().includes('data-act="tourPlay" data-v="' + m.id + '"'), 'botão Jogar aparece para quem tem a partida');
  A.click({ act: 'tourPlay', v: m.id });
  await waitFor(() => A.html().includes('tourUnready') && B.html().includes('já está pronto'), 'os dois verem o "pronto" de A');
  assert(A.html().includes('ficar pronto') && A.html().includes('tourUnready'),
    'A espera o adversário. Partida ' + m.id + ' a=' + m.a + ' b=' + m.b + ' tela=' + A.app.screen + ' hub=' + JSON.stringify(hubSnap(T.org).matches.find(x => x.id === m.id)) +
    ' minhas=' + JSON.stringify((A.app.tour.snap || {}).matches && A.app.tour.snap.matches.find(x => x.id === m.id)));
  assert(B.html().includes('já está pronto'), 'B vê que o adversário está pronto');
  B.click({ act: 'tourPlay', v: m.id });
  await waitFor(() => A.app.screen === 'setup' && B.app.screen === 'setup', 'a partida começar para os dois');
  assert.strictEqual(A.app.screen, 'setup', 'A foi para a montagem'); assert.strictEqual(B.app.screen, 'setup');
  assert.strictEqual(A.app.humanSide, 0); assert.strictEqual(B.app.humanSide, 1);
  A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); await sleep(15);
  assert(A.html().includes('Aguardando o adversário'));
  B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' });
  await waitFor(() => A.app.screen === 'game' && B.app.screen === 'game', 'a partida começar depois das montagens');
  assert.strictEqual(boardOf(A), boardOf(B));
  let plies = 0;
  while (plies < 1500 && !A.app.game.over) {
    const P = A.app.game.st.turn === A.app.humanSide ? A : B;
    doRandomMove(P);
    await waitFor(() => A.app.game && B.app.game && A.app.game.plies === B.app.game.plies, 'a jogada chegar ao adversário (telas: ' + A.app.screen + '/' + B.app.screen + ', partida: ' + m.id + ', plies: ' + (A.app.game && A.app.game.plies) + '/' + (B.app.game && B.app.game.plies) + ', over: ' + !!(A.app.game && A.app.game.over) + '/' + !!(B.app.game && B.app.game.over) + ', anim: ' + A.app.animating + '/' + B.app.animating + ', queue: ' + A.app.btQueue.length + '/' + B.app.btQueue.length + ')' );
    assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais na jogada ' + (plies + 1) + ' de ' + m.id);
    plies++;
  }
  assert(A.app.game.over && B.app.game.over, 'a partida terminou');
  const winSide = A.app.game.over.winner;
  await waitFor(() => hubSnap(T.org).matches.find(x => x.id === m.id).status === 'done', 'o juiz encerrar a partida');
  const hm = hubSnap(T.org).matches.find(x => x.id === m.id);
  assert.strictEqual(hm.status, 'done', 'o juiz encerrou');
  assert.strictEqual(hm.winner, winSide === 0 ? m.a : m.b, 'o juiz decidiu igual ao jogo local');
  assert(A.html().includes('Voltar ao campeonato') && !A.html().includes('Jogar de novo'), 'fim de partida volta ao campeonato');
  A.click({ act: 'tourBack' }); B.click({ act: 'tourBack' });
  await waitFor(() => A.app.screen === 'tour' && B.app.screen === 'tour', 'voltar ao campeonato');
  await sleep(20);
  return plies;
}

async function runAll(T) {
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    const s = hubSnap(T.org);
    if (s.status !== 'running') break;
    const m = s.matches.find(x => x.status === 'pending' && x.a != null && x.b != null);
    assert(m, 'sempre há uma partida jogável');
    await playMatch(T, m);
    n++;
  }
  return n;
}

(async () => {
  // 1) todos contra todos com 4 celulares
  let T = await create(4, 'league');
  T.org.click({ act: 'tourStart' }); await sleep(30);
  T.phones.forEach(P => { assert.strictEqual(P.app.tour.snap.status, 'running'); assert.strictEqual(P.app.tour.snap.matches.length, 6); });
  assert(T.org.html().includes('Classificação') && T.org.html().includes('Todas as partidas'));
  console.log('ok - campeonato criado, 3 jogadores entraram pelo código, formato e início chegam a todos');

  // quem tenta entrar depois que começou é recusado
  const late = makePhone('Atrasado', T.broker);
  late.input('nick', 'Tarde'); late.click({ act: 'tourOpen' }); late.input('tcode', T.code); late.click({ act: 'tourJoin' }); await sleep(50);
  assert.strictEqual(late.app.tour.role, null); assert(/já começou/.test(late.html()), 'recusado: ' + late.app.tour.msg);
  late.input('tcode', 'ZZZZ'); late.click({ act: 'tourJoin' }); await sleep(50);
  assert(/não encontrado/.test(late.html()), 'código inexistente avisa');
  console.log('ok - entrada tardia e código errado são recusados com aviso');

  const n1 = await runAll(T);
  const s1 = hubSnap(T.org);
  assert.strictEqual(n1, 6); assert.strictEqual(s1.status, 'finished'); assert.notStrictEqual(s1.champion, null);
  T.phones.forEach(P => {
    assert.strictEqual(P.app.tour.snap.status, 'finished'); assert.strictEqual(P.app.tour.snap.champion, s1.champion);
    assert(P.html().includes('Campeão'));
  });
  const rows = T.org.sandbox.ManobraTournament.standings(s1);
  assert.strictEqual(rows.reduce((x, r) => x + r.points, 0), 18);
  assert.strictEqual(rows[0].id, s1.champion);
  console.log('ok - todos contra todos: 6 partidas jogadas pelas telas, campeão ' + rows[0].nick + ' (' + rows.map(r => r.nick + ' ' + r.points).join(', ') + ')');

  // 2) mata-mata com 5 celulares (byes)
  T = await create(5, 'knockout');
  T.org.click({ act: 'tourStart' }); await sleep(30);
  const k0 = hubSnap(T.org);
  assert.strictEqual(k0.matches.filter(m => m.reason === 'bye').length, 3, '3 byes com 5 jogadores');
  assert(T.org.html().includes('Chaveamento') && T.org.html().includes('Quartas de final'));
  const n2 = await runAll(T);
  const k1 = hubSnap(T.org);
  assert.strictEqual(n2, 4, '4 partidas reais (1 de quartas, 2 semis, 1 final)');
  assert.strictEqual(k1.status, 'finished');
  assert.strictEqual(k1.champion, k1.matches.find(m => m.id === 'K3-1').winner);
  T.phones.forEach(P => assert(P.html().includes('Campeão')));
  console.log('ok - mata-mata: ' + n2 + ' partidas jogadas, campeão ' + T.byId[k1.champion].app.me.nick + ' (' + T.org.sandbox.ManobraTournament.nickOf(k1, k1.champion) + ')');

  // 3) sair no meio da partida = W.O. automático; resultado não é editável
  T = await create(3, 'league');
  T.org.click({ act: 'tourStart' }); await sleep(30);
  const m = hubSnap(T.org).matches.find(x => x.a != null && x.b != null);
  const A = T.byId[m.a], B = T.byId[m.b];
  A.click({ act: 'tourPlay', v: m.id }); B.click({ act: 'tourPlay', v: m.id }); await sleep(50);
  A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' }); await sleep(50);
  assert.strictEqual(A.app.screen, 'game');
  A.click({ act: 'menu' }); await sleep(40); // sai da partida (confirm não existe no teste: conta como "sim")
  assert.strictEqual(A.app.screen, 'tour', 'quem saiu volta ao campeonato');
  assert.strictEqual(B.app.screen, 'tour', 'o adversário também volta ao campeonato');
  const hm = hubSnap(T.org).matches.find(x => x.id === m.id);
  assert.strictEqual(hm.winner, m.b); assert(/W\.O\./.test(hm.reason));
  assert(B.html().includes('Você venceu'));
  assert(!/Refazer|tourAward|Vitória /.test(T.org.html()), 'não há alteração manual do resultado');
  console.log('ok - sair da partida dá W.O. automático, sem refazer ou decisão manual');

  // 4) queda de internet de um jogador no meio da partida
  T = await create(3, 'league');
  T.org.click({ act: 'tourStart' }); await sleep(30);
  const m2 = hubSnap(T.org).matches.find(x => x.a != null && x.b != null && x.a !== 0 && x.b !== 0) || hubSnap(T.org).matches[0];
  const P1 = T.byId[m2.a], P2 = T.byId[m2.b];
  P1.click({ act: 'tourPlay', v: m2.id }); P2.click({ act: 'tourPlay', v: m2.id }); await sleep(50);
  const dropped = P1 === T.org ? P2 : P1, stays = dropped === P1 ? P2 : P1;
  dropped.sandbox.ManobraTourLink.leave(); await sleep(40); // some da rede
  const hm2 = hubSnap(T.org).matches.find(x => x.id === m2.id);
  assert.strictEqual(hm2.status, 'done'); assert.strictEqual(hm2.winner, T.byId[stays.app.tour.myId] === stays ? stays.app.tour.myId : -1);
  assert.strictEqual(stays.app.screen, 'tour', 'quem ficou volta ao campeonato');
  console.log('ok - queda de internet no meio da partida dá W.O. ao outro jogador');

  // 5) organizador fecha o campeonato: os outros voltam ao menu
  T.org.click({ act: 'tourExit' }); await sleep(40);
  assert.strictEqual(T.org.app.screen, 'menu');
  T.phones.filter(P => P !== T.org).forEach(P => {
    if (P === dropped) return;
    assert.strictEqual(P.app.screen, 'menu', 'convidado volta ao menu quando o organizador sai');
  });
  console.log('ok - organizador encerra o campeonato e os convidados voltam ao menu');

  // 5b) jogando sozinho: o organizador inicia sem ninguém e enfrenta um robô
  {
    const S = makePhone('Solo', makeBroker());
    S.sandbox.__manobraBotDelay = 0;
    S.input('nick', 'Sozinho'); S.click({ act: 'avatar', v: 'avatar-8' });
    S.click({ act: 'tourOpen' }); S.click({ act: 'tourCreate' }); await waitFor(() => S.app.tour.role === 'host', 'campeonato criado');
    assert(S.html().includes('Jogadores (1/8)') && S.html().includes(String.fromCodePoint(0x1F308)) && /sozinho/.test(S.html()), 'avisa que está sozinho e mostra o avatar');
    S.click({ act: 'tourFmt', v: 'knockout' });
    S.click({ act: 'tourAddBot' }); await waitFor(() => S.app.tour.snap.players.length === 2, 'robô entrou');
    S.click({ act: 'tourBotLevel', v: 'easy' }); await waitFor(() => S.app.tour.snap.botLevel === 'easy', 'nível do robô');
    S.click({ act: 'tourRmBot', v: '1' }); await waitFor(() => S.app.tour.snap.players.length === 1, 'robô saiu');
    S.click({ act: 'tourStart' }); await waitFor(() => S.app.tour.snap.status === 'running', 'iniciou sozinho');
    assert.strictEqual(S.app.tour.snap.players.length, 2, 'entrou um robô sozinho');
    const m = S.app.tour.snap.matches[0];
    S.click({ act: 'tourPlay', v: m.id });
    await waitFor(() => S.app.screen === 'setup', 'montagem contra o robô');
    S.click({ act: 'setupDefault' }); S.click({ act: 'setupDone' });
    await waitFor(() => S.app.screen === 'game', 'jogo contra o robô');
    let plies = 0;
    while (plies < 250 && S.app.game && !S.app.game.over && S.app.screen === 'game') {
      if (S.app.game.st.turn === S.app.humanSide && !S.app.animating) { doRandomMove(S); plies++; }
      await sleep(15);
    }
    console.log('ok - sozinho no campeonato: robô montou e jogou (' + plies + ' jogadas minhas)');
    await waitFor(() => S.app.tour.snap.status === 'finished' || (S.app.game && S.app.game.over), 'fim');
    console.log('ok - campeonato solo chegou ao fim');
  }

  // 6) sem internet
  const off = makePhone('Offline', makeBroker());
  off.sandbox.navigator.onLine = false;
  off.click({ act: 'tourOpen' }); off.click({ act: 'tourCreate' }); await sleep(10);
  assert(/Sem internet/.test(off.html()));
  console.log('ok - sem internet: aviso claro');

  console.log('\nCampeonato simulado: tudo certo');
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e && e.stack || e); process.exit(1); });
