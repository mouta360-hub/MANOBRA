'use strict';
const assert = require('assert');
const { makeBroker, makePhone } = require('./fakepeer.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(cond, what, ms) {
  const t = Date.now();
  while (!cond()) { if (Date.now() - t > (ms || 6000)) throw new Error('tempo esgotado esperando: ' + what); await sleep(10); }
}
const redraw = P => P.click({ act: 'avatar', v: P.app.me.av }); // no celular de verdade só as bolinhas são repintadas
const boardOf = p => Array.prototype.join.call(p.app.game.st.b, '');

(async () => {
  const broker = makeBroker();
  const A = makePhone('Ana', broker), B = makePhone('Bia', broker);
  A.app.pollMs = 100; B.app.pollMs = 100;

  // 1) perfil: código fixo e avatar
  const codeA = A.app.me.code, codeB = B.app.me.code;
  assert(/^[A-HJ-NP-Z2-9]{6}$/.test(codeA) && /^[A-HJ-NP-Z2-9]{6}$/.test(codeB) && codeA !== codeB, 'códigos pessoais');
  assert(JSON.parse(A.store['manobra.me']).code === codeA, 'perfil salvo no aparelho');
  assert(A.app.me.av && A.html().includes('avgrid'), 'o perfil tem avatar e escolha de avatar');
  A.click({ act: 'avatar', v: 'bear' });
  assert.strictEqual(A.app.me.av, 'bear'); assert.strictEqual(JSON.parse(A.store['manobra.me']).av, 'bear', 'avatar salvo');
  A.click({ act: 'avatar', v: 'hack<script>' });
  assert.strictEqual(A.app.me.av, 'bear', 'avatar inválido é ignorado');
  console.log('ok - código pessoal fixo e avatar salvo: ' + codeA + ' e ' + codeB);

  // 2) a presença liga sozinha ao abrir o app (sem entrar em Amigos)
  await waitFor(() => A.app.presence.state === 'ready' && B.app.presence.state === 'ready', 'presença ligada');
  A.click({ act: 'avatar', v: 'bear' }); // redesenha o menu
  assert(/Você está online/.test(A.html()), 'o menu mostra que está online');
  console.log('ok - o app já fica online ao abrir, sem precisar da tela Amigos');

  // 3) adicionar amigo
  A.input('nick', 'Ana'); B.input('nick', 'Bia');
  B.click({ act: 'frOpen' });
  B.input('fcode', codeB); B.input('fnick', 'Eu'); B.click({ act: 'frAdd' });
  assert(/próprio código/.test(B.toast()), 'não deixa adicionar o próprio código');
  B.input('fcode', 'ab'); B.click({ act: 'frAdd' });
  assert(/6 letras/.test(B.toast()), 'código curto');
  assert.strictEqual(B.input('fcode', ' ' + codeA.toLowerCase() + 'zz'), codeA, 'campo converte e limita a 6');
  B.input('fnick', 'Ana <b>x</b>'); B.click({ act: 'frAdd' });
  assert.strictEqual(B.app.friends.length, 1);
  assert(!B.html().includes('<b>x</b>'), 'apelido não injeta HTML');
  B.input('fcode', codeA); B.input('fnick', 'Ana'); B.click({ act: 'frAdd' });
  assert.strictEqual(B.app.friends.length, 1, 'não duplica');
  console.log('ok - adicionar amigo valida, limpa e salva');

  // 4) status do amigo na lista: online, com o avatar dele
  await waitFor(() => B.app.fstat[codeA] === 'online', 'A aparece online');
  assert.strictEqual(B.app.friends[0].av, 'bear', 'avatar do amigo chega pelo status');
  redraw(B);
  assert(/Online/.test(B.html()) && B.html().includes('🐻'));
  console.log('ok - amigo aparece como Online com o avatar dele');

  // 5) status muda: em partida, em campeonato, invisível, voltou
  A.click({ act: 'startAI' });
  await waitFor(() => B.app.fstat[codeA] === 'match', 'A em partida');
  A.click({ act: 'menu' });
  await waitFor(() => B.app.fstat[codeA] === 'online', 'A voltou a online');
  A.click({ act: 'tourOpen' }); A.click({ act: 'tourCreate' });
  await waitFor(() => B.app.fstat[codeA] === 'tour', 'A em campeonato');
  A.click({ act: 'tourExit' });
  await waitFor(() => B.app.fstat[codeA] === 'online', 'A saiu do campeonato');
  A.click({ act: 'frVisible', v: '0' });
  assert.strictEqual(A.store['manobra.visible'], '0', 'escolha de ficar invisível é salva');
  await waitFor(() => B.app.fstat[codeA] === 'offline', 'A invisível = offline');
  A.click({ act: 'frVisible', v: '1' });
  await waitFor(() => B.app.fstat[codeA] === 'online', 'A voltou a aparecer', 8000);
  assert(/ficou online/.test(B.toast()), 'B recebe aviso quando o amigo volta: ' + B.toast());
  console.log('ok - status: Online, Em partida, Em campeonato, Offline (invisível) e aviso de "ficou online"');

  // 6) convite chega em QUALQUER tela e é aceito
  A.click({ act: 'rules' });                 // A está lendo as regras
  B.click({ act: 'frInvite', v: codeA });
  await waitFor(() => A.app.inv, 'convite chegou');
  assert.strictEqual(B.app.fr.state, 'inviting');
  assert(A.inv().includes('Bia') && A.inv().includes('chamou você') && A.app.screen === 'rules', 'aparece por cima da tela atual');
  A.click({ act: 'frAccept' });
  await waitFor(() => A.app.screen === 'setup' && B.app.screen === 'setup', 'os dois na montagem');
  assert.strictEqual(A.inv(), '', 'o aviso some');
  assert.strictEqual(B.app.humanSide, 0, 'quem convida joga de Brancas');
  assert.strictEqual(A.app.humanSide, 1, 'quem aceita joga de Pretas');
  console.log('ok - convite aparece sobre outra tela (Regras) e, aceito, vira partida');

  // 7) partida sincronizada
  A.click({ act: 'setupDefault' }); A.click({ act: 'setupDone' }); await sleep(10);
  B.click({ act: 'setupDefault' }); B.click({ act: 'setupDone' });
  await waitFor(() => A.app.screen === 'game' && B.app.screen === 'game', 'jogo começou');
  assert.strictEqual(boardOf(A), boardOf(B));
  function doRandomMove(P) {
    const moves = P.app.game.cur.moves;
    const mv = moves[Math.floor(Math.random() * moves.length)];
    if (mv.t === 'x') { P.click({ act: 'purge' }); P.click({ i: String(mv.to) }); }
    else if (mv.t === 'f') { P.click({ i: String(mv.from) }); P.click({ act: 'flipMode' }); }
    else { P.click({ i: String(mv.from) }); P.click({ i: String(mv.to) }); if (P.app.choice) P.click({ act: 'choose', v: mv.t }); }
  }
  let plies = 0;
  while (plies < 80 && !A.app.game.over) {
    const P = A.app.game.st.turn === A.app.humanSide ? A : B;
    doRandomMove(P); await sleep(12);
    assert.strictEqual(boardOf(A), boardOf(B), 'tabuleiros iguais na jogada ' + (plies + 1));
    plies++;
  }
  console.log('ok - ' + plies + ' jogadas sincronizadas');

  // 8) durante a partida o status é "em partida" e convites são recusados como ocupado
  const C = makePhone('Cris', broker);
  C.app.pollMs = 100;
  await waitFor(() => C.app.presence.state === 'ready', 'C online');
  C.input('fcode', codeA); C.input('fnick', 'Ana');
  C.click({ act: 'frOpen' }); C.input('fcode', codeA); C.input('fnick', 'Ana'); C.click({ act: 'frAdd' });
  await waitFor(() => C.app.fstat[codeA] === 'match', 'C vê A em partida');
  redraw(C);
  assert(/Em partida/.test(C.html()) && /data-inv="[A-Z0-9]+" data-v="[A-Z0-9]+" disabled/.test(C.html()), 'botão Chamar fica desligado com amigo em partida');
  C.app.fstat[codeA] = 'online'; // força, para testar a recusa automática do outro lado
  C.click({ act: 'frInvite', v: codeA });
  await waitFor(() => /ocupado/.test(C.app.fr.msg), 'recusa automática: ' + C.app.fr.msg);
  assert(!A.app.inv, 'quem está em partida não é interrompido');
  assert.strictEqual(C.app.fr.state, 'idle');
  assert(/tentou chamar/.test(A.toast()), 'A fica sabendo que tentaram chamar: ' + A.toast());
  console.log('ok - em partida: status "Em partida" e convite recusado como ocupado, sem interromper');

  // 9) de volta ao menu: recusar e cancelar
  B.click({ act: 'menu' }); await sleep(30);
  if (A.app.game && A.app.game.over) A.click({ act: 'menu' });
  assert.strictEqual(A.app.screen, 'menu');
  await waitFor(() => A.app.presence.state === 'ready', 'A segue online depois da partida');
  B.click({ act: 'frOpen' });
  B.click({ act: 'frInvite', v: codeA });
  await waitFor(() => A.app.inv, 'novo convite');
  A.click({ act: 'frDecline' });
  await waitFor(() => /recusou/.test(B.app.fr.msg), 'B vê recusa');
  assert.strictEqual(B.app.fr.state, 'idle'); assert.strictEqual(A.inv(), '');
  B.click({ act: 'frInvite', v: codeA });
  await waitFor(() => A.app.inv, 'convite de novo');
  B.click({ act: 'frCancelInvite' });
  await waitFor(() => !A.app.inv, 'convite some em A');
  assert(/cancelado/.test(A.toast()));
  console.log('ok - depois da partida segue online; recusar e cancelar funcionam');

  // 10) convite simultâneo
  B.click({ act: 'frInvite', v: codeA });
  await waitFor(() => A.app.inv, 'convite de B');
  C.app.fstat[codeA] = 'online';
  C.click({ act: 'frInvite', v: codeA });
  await waitFor(() => /ocupado/.test(C.app.fr.msg), 'segundo convite recusado');
  assert(A.app.inv && A.app.inv.nick === 'Bia', 'o primeiro convite continua na tela');
  A.click({ act: 'frDecline' });
  console.log('ok - convite simultâneo recusado como ocupado sem atrapalhar o primeiro');

  // 11) amigo offline: botão desligado e aviso
  B.input('fcode', 'ZZZZZZ'); B.input('fnick', 'Fantasma'); B.click({ act: 'frAdd' });
  await waitFor(() => B.app.fstat.ZZZZZZ === 'offline', 'fantasma offline', 9000);
  redraw(B);
  assert(/Offline/.test(B.html()) && /data-inv="ZZZZZZ" data-v="ZZZZZZ" disabled/.test(B.html()));
  B.click({ act: 'frRemove', v: 'ZZZZZZ' });
  assert(!B.app.friends.some(f => f.code === 'ZZZZZZ'));
  B.click({ act: 'frBack' }); assert.strictEqual(B.app.screen, 'menu');
  console.log('ok - amigo offline: aparece como Offline e não dá para chamar');

  // 12) sem internet
  const D = makePhone('Dani', broker, { offline: true });
  D.click({ act: 'frOpen' }); await sleep(30);
  assert.strictEqual(D.app.presence.state, 'error');
  assert(/Sem conexão online/.test(D.html()) && /sem internet/.test(D.html()));
  console.log('ok - sem internet: aviso claro');

  console.log('\nAmigos simulado: tudo certo');
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e && e.stack || e); process.exit(1); });
