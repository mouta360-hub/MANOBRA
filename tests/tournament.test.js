'use strict';
const assert = require('assert');
const E = require('../www/engine.js');
const T = require('../www/tournament.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

// ---------- chaves ----------
test('todos contra todos: cada par joga uma vez e ninguém repete na rodada (2 a 8 jogadores)', () => {
  for (let n = 2; n <= 8; n++) {
    const ids = Array.from({ length: n }, (_, i) => i);
    const fx = T.leagueFixtures(ids);
    assert.strictEqual(fx.length, n * (n - 1) / 2, 'número de partidas com ' + n);
    const pairs = new Set();
    fx.forEach(m => { const k = [m.a, m.b].sort().join('-'); assert(!pairs.has(k), 'par repetido'); pairs.add(k); assert.notStrictEqual(m.a, m.b); });
    const rounds = {};
    fx.forEach(m => { (rounds[m.round] = rounds[m.round] || []).push(m.a, m.b); });
    Object.keys(rounds).forEach(r => assert.strictEqual(new Set(rounds[r]).size, rounds[r].length, 'jogador repetido na rodada ' + r));
    assert.strictEqual(new Set(fx.map(m => m.id)).size, fx.length, 'ids únicos');
  }
});

test('mata-mata: tamanho da chave, byes e ligações', () => {
  const sizes = { 2: 2, 3: 4, 4: 4, 5: 8, 6: 8, 7: 8, 8: 8 };
  for (let n = 2; n <= 8; n++) {
    const fx = T.knockoutFixtures(Array.from({ length: n }, (_, i) => i));
    assert.strictEqual(fx.size, sizes[n]);
    const r1 = fx.matches.filter(m => m.round === 1);
    assert.strictEqual(r1.length, fx.size / 2);
    assert.strictEqual(r1.filter(m => m.a == null || m.b == null).length, fx.size - n, 'byes = ' + (fx.size - n));
    assert(r1.every(m => m.a != null || m.b != null), 'nenhum jogo vazio');
    const placed = r1.reduce((s, m) => s + (m.a != null) + (m.b != null), 0);
    assert.strictEqual(placed, n);
    assert.strictEqual(fx.matches.length, fx.size - 1);
  }
  assert.deepStrictEqual(T.seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  assert.strictEqual(T.roundLabel('knockout', 3, 1), 'Quartas de final');
  assert.strictEqual(T.roundLabel('knockout', 3, 2), 'Semifinal');
  assert.strictEqual(T.roundLabel('knockout', 3, 3), 'Final');
  assert.strictEqual(T.roundLabel('league', 5, 2), 'Rodada 2');
});

// ---------- classificação ----------
function snapOf(players, results) {
  const matches = results.map((r, i) => ({ id: 'L' + i, round: 1, a: r[0], b: r[1], status: 'done', winner: r[2], reason: 'x', diff: [r[3] || 0, -(r[3] || 0)], ready: [false, false] }));
  return { players: players.map((n, i) => ({ id: i, nick: n })), matches };
}
test('classificação: 3 pontos por vitória e ordem por pontos', () => {
  const s = T.standings(snapOf(['A', 'B', 'C'], [[0, 1, 0, 5], [0, 2, 0, 3], [1, 2, 1, 2]]));
  assert.deepStrictEqual(s.map(r => r.nick), ['A', 'B', 'C']);
  assert.deepStrictEqual(s.map(r => r.points), [6, 3, 0]);
  assert.strictEqual(s[0].wins, 2); assert.strictEqual(s[0].played, 2);
});
test('desempate: confronto direto, depois saldo de peças', () => {
  // A e B empatam em 3 pontos; B venceu A no confronto direto
  let s = T.standings(snapOf(['A', 'B', 'C', 'D'], [[0, 1, 1, 2], [0, 2, 0, 9], [1, 3, 3, 1], [2, 3, 2, 1]]));
  // pontos: A=3(venceu C), B=3(venceu A), C=3(venceu D), D=3(venceu B)... todos 3: grupo de 4
  assert.strictEqual(s.length, 4);
  // dois empatados, saldo decide quando não há confronto direto
  s = T.standings(snapOf(['A', 'B', 'C'], [[0, 2, 0, 4], [1, 2, 1, 8], [0, 1, 1, 1]]));
  // A: venceu C (+4) e perdeu de B (-1) => 3 pts; B: venceu C (+8) e venceu A (+1) => 6 pts
  assert.deepStrictEqual(s.map(r => r.nick), ['B', 'A', 'C']);
  const t = T.standings(snapOf(['A', 'B', 'C', 'D'], [[0, 2, 0, 2], [1, 3, 1, 9], [0, 1, 1, 1], [2, 3, 3, 1]]));
  // A=3, B=6, C=0, D=3: A e D empatados em 3; sem confronto direto entre eles -> saldo: A=+2-1=+1, D=-9+1... D perdeu de B (-9) e venceu C (+1) = -8
  assert.deepStrictEqual(t.map(r => r.nick), ['B', 'A', 'D', 'C']);
  const h = T.standings(snapOf(['A', 'B', 'C'], [[0, 1, 1, 1], [1, 2, 2, 1], [2, 0, 0, 1]]));
  // ciclo: todos com 3 pontos, cada um com 1 vitória e 1 derrota; saldo 0 => ordem de entrada
  assert.deepStrictEqual(h.map(r => r.nick), ['A', 'B', 'C']);
  const byPieces = T.standings({ players: [{ id: 0, nick: 'A' }, { id: 1, nick: 'B' }], matches: [{ id: 'L0', a: 0, b: 1, status: 'done', winner: 0, reason: 'isolamento', diff: null, pieces: [8, 5], ready: [false, false] }] });
  assert.strictEqual(byPieces[0].diff, 3, 'vencedor registra três peças a mais');
  assert.strictEqual(byPieces[1].diff, -3, 'perdedor registra o saldo negativo');
});

// ---------- Hub: sala de espera ----------
function makeHub(rnd) {
  const out = [];
  const hub = new T.Hub({ engine: E, send: (id, obj) => out.push([id, obj]), rnd });
  hub.join('ORG', 'Organizador');
  return { hub, out, last: id => { const x = out.filter(o => o[0] === id && o[1].k === 'state'); return x.length ? x[x.length - 1][1].s : null; }, to: (id, k) => out.filter(o => o[0] === id && o[1].k === k).map(o => o[1]) };
}
test('sala: entrar, apelido repetido, lotação, reentrada e começar', () => {
  const { hub } = makeHub();
  const r1 = hub.join('P1', 'Ana'), r2 = hub.join('P2', 'ana');
  assert(r1.ok && r2.ok);
  assert.notStrictEqual(hub.players[1].nick.toLowerCase(), hub.players[2].nick.toLowerCase(), 'apelido repetido ganha número');
  assert.strictEqual(hub.join('P1', 'Ana').id, r1.id, 'reentrar com o mesmo código devolve a mesma vaga');
  for (let i = 3; i <= 7; i++) assert(hub.join('P' + i, 'J' + i).ok);
  assert.strictEqual(hub.players.length, 8);
  assert(!hub.join('P9', 'Extra').ok, 'lotado');
  hub.leave(r2.id);
  assert.strictEqual(hub.players.length, 7, 'quem sai da sala de espera libera a vaga');
  assert(hub.join('P9', 'Extra').ok);
  assert.strictEqual(hub.start(), true, 'organizador inicia');
  assert.strictEqual(hub.status, 'running');
  assert(!hub.join('NOVO', 'Tarde').ok, 'não entra depois de começar');
  const solo = makeHub().hub;
  assert(solo.start(), 'sozinho também inicia: entra um robô de adversário');
  assert.strictEqual(solo.players.length, 2); assert(solo.players[1].bot);
});
test('só o organizador mexe no formato e inicia', () => {
  const { hub } = makeHub();
  const a = hub.join('P1', 'Ana').id;
  hub.handle(a, { k: 'format', v: 'knockout' }); assert.strictEqual(hub.format, 'league');
  hub.handle(0, { k: 'format', v: 'knockout' }); assert.strictEqual(hub.format, 'knockout');
  hub.handle(0, { k: 'format', v: 'lixo' }); assert.strictEqual(hub.format, 'knockout');
  hub.handle(a, { k: 'start' }); assert.strictEqual(hub.status, 'lobby');
  hub.handle(0, { k: 'start' }); assert.strictEqual(hub.status, 'running');
});

// ---------- Hub: partidas jogadas de verdade (o juiz usa o motor) ----------
function setupFor(side) { return E.presetSetup(side).map(o => [o.i, o.p]); }
// Dois "celulares" jogam por dentro do Hub, cada um com o seu próprio motor.
function playMatch(h, m, wantWinnerId) {
  const { hub, out } = h;
  const sides = { [m.a]: 0, [m.b]: 1 };
  hub.ready(m.a, m.id); hub.ready(m.b, m.id);
  assert.strictEqual(hub.matches.find(x => x.id === m.id).status, 'playing');
  assert(h.to(m.a, 'start').some(s => s.m === m.id && s.side === 0));
  assert(h.to(m.b, 'start').some(s => s.m === m.id && s.side === 1));
  const relay = (id, o) => hub.handle(id, { k: 'relay', m: m.id, d: JSON.stringify(o) });
  relay(m.a, { k: 'hello' }); relay(m.b, { k: 'hello' });
  relay(m.a, { k: 'setup', p: setupFor(0) }); relay(m.b, { k: 'setup', p: setupFor(1) });
  // dois jogos locais, como nos celulares, só com jogadas legais
  const pieces = new Int8Array(E.N);
  setupFor(0).concat(setupFor(1)).forEach(it => { pieces[it[0]] = it[1]; });
  const g = new E.Game(pieces);
  let guard = 0;
  while (!g.over && guard++ < 1500) {
    const turnId = g.st.turn === 0 ? m.a : m.b;
    const mv = E.chooseMove(g.st, g.legal({ noSeventh: true }).moves.length ? g.legal({ noSeventh: true }).moves : g.cur.moves, 'easy');
    relay(turnId, { k: 'move', m: { t: mv.t, from: mv.from, to: mv.to, beyond: mv.beyond } });
    g.play(mv);
  }
  return g;
}
test('o juiz decide o vencedor sozinho, igual ao jogo local, e avisa os dois', () => {
  const h = makeHub();
  const a = h.hub.join('P1', 'Ana').id, b = h.hub.join('P2', 'Bia').id;
  h.hub.setFormat('league'); h.hub.start();
  const m = h.hub.matches[0];
  const g = playMatch(h, { id: m.id, a: m.a, b: m.b });
  const mm = h.hub.matches.find(x => x.id === m.id);
  if (g.over) {
    assert.strictEqual(mm.status, 'done');
    assert.strictEqual(mm.winner, g.over.winner === 0 ? mm.a : mm.b, 'mesmo vencedor do jogo local');
    assert(h.to(a, 'matchEnd').length === 1 && h.to(b, 'matchEnd').length === 1);
    assert.strictEqual(h.hub.status, 'running', '3 jogadores têm 3 partidas; só 1 foi jogada');
  }
  assert(g.over, 'a partida de teste terminou');
});
test('campeonato todos contra todos completo com 4 jogadores', () => {
  const h = makeHub();
  ['A', 'B', 'C'].forEach((n, i) => h.hub.join('P' + i, n));
  h.hub.start();
  assert.strictEqual(h.hub.matches.length, 6);
  let n = 0;
  h.hub.matches.slice().forEach(m => { if (h.hub.matches.find(x => x.id === m.id).status === 'pending') { playMatch(h, m); n++; } });
  assert.strictEqual(h.hub.status, 'finished', 'terminou');
  const s = T.standings(h.hub.snapshot());
  assert.strictEqual(s.reduce((x, r) => x + r.points, 0), 6 * 3, 'cada partida dá 3 pontos ao vencedor');
  assert.strictEqual(h.hub.champion, s[0].id);
  assert(s.every(r => r.played === 3));
  console.log('   classificação:', s.map(r => r.nick + ' ' + r.points + 'pts').join(', '));
});
test('mata-mata completo com 5 jogadores (3 byes): campeão sai da final', () => {
  const h = makeHub(() => 0.3);
  for (let i = 1; i <= 4; i++) h.hub.join('P' + i, 'J' + i);
  h.hub.setFormat('knockout'); h.hub.start();
  const done0 = h.hub.matches.filter(m => m.status === 'done');
  assert.strictEqual(done0.length, 3, '3 byes já resolvidos'); assert(done0.every(m => m.reason === 'bye'));
  let guard = 0;
  while (h.hub.status === 'running' && guard++ < 10) {
    const next = h.hub.matches.find(m => m.status === 'pending' && m.a != null && m.b != null);
    assert(next, 'sempre há uma partida jogável');
    playMatch(h, next);
  }
  assert.strictEqual(h.hub.status, 'finished');
  const final = h.hub.matches.find(m => m.id === 'K' + h.hub.rounds + '-1');
  assert.strictEqual(h.hub.champion, final.winner);
  console.log('   campeão:', h.hub.players.find(p => p.id === h.hub.champion).nick);
});

// ---------- Hub: trapaça, saídas e organizador ----------
function started2() {
  const h = makeHub();
  const a = h.hub.join('PA', 'Ana').id, b = h.hub.join('PB', 'Bia').id;
  h.hub.setFormat('knockout'); h.hub.start();
  const m = h.hub.matches.find(x => x.a != null && x.b != null && x.status === 'pending');
  return Object.assign(h, { a: m.a, b: m.b, m });
}
test('jogada inválida ou fora de hora = derrota por W.O. de quem tentou', () => {
  const h = started2();
  h.hub.ready(h.a, h.m.id); h.hub.ready(h.b, h.m.id);
  const relay = (id, o) => h.hub.handle(id, { k: 'relay', m: h.m.id, d: JSON.stringify(o) });
  relay(h.a, { k: 'setup', p: setupFor(0) }); relay(h.b, { k: 'setup', p: setupFor(1) });
  relay(h.b, { k: 'move', m: { t: 'm', from: 1, to: 2 } }); // pretas jogando na vez das brancas
  const mm = h.hub.matches.find(x => x.id === h.m.id);
  assert.strictEqual(mm.status, 'done'); assert.strictEqual(mm.winner, h.a); assert(/W\.O\./.test(mm.reason));
});
test('montagem inválida e mensagens quebradas', () => {
  const h = started2();
  h.hub.ready(h.a, h.m.id); h.hub.ready(h.b, h.m.id);
  const raw = (id, d) => h.hub.handle(id, { k: 'relay', m: h.m.id, d });
  raw(h.a, 'lixo{{'); raw(h.a, 123); h.hub.handle(h.a, { k: 'relay', m: 'nao-existe', d: '{}' }); h.hub.handle(99, { k: 'ready' }); h.hub.handle(h.a, null);
  assert.strictEqual(h.hub.matches.find(x => x.id === h.m.id).status, 'playing', 'lixo é ignorado sem derrubar a partida');
  raw(h.b, JSON.stringify({ k: 'setup', p: setupFor(0) })); // pretas mandando peças brancas
  assert.strictEqual(h.hub.matches.find(x => x.id === h.m.id).winner, h.a);
});
test('sair da partida atual, antes ou depois de começar, dá W.O.', () => {
  const h = started2();
  h.hub.ready(h.a, h.m.id);
  const r0 = h.hub.matches.find(x => x.id === h.m.id);
  assert.strictEqual(r0.ready[r0.a === h.a ? 0 : 1], true, 'ficou pronto');
  h.hub.leave(h.a);
  const mm = h.hub.matches.find(x => x.id === h.m.id);
  assert.strictEqual(mm.winner, h.b); assert.strictEqual(mm.status, 'done');
  assert(/W\.O\./.test(mm.reason));
});
test('queda de conexão durante a partida dá W.O. ao outro', () => {
  const h = started2();
  h.hub.ready(h.a, h.m.id); h.hub.ready(h.b, h.m.id);
  h.hub.leave(h.b);
  assert.strictEqual(h.hub.matches.find(x => x.id === h.m.id).winner, h.a);
});
test('comandos manuais de resultado são ignorados', () => {
  const h = started2();
  const mid = h.m.id;
  h.hub.handle(0, { k: 'award', m: mid, w: h.a });
  h.hub.handle(0, { k: 'reset', m: mid });
  const mm = h.hub.matches.find(x => x.id === mid);
  assert.strictEqual(mm.status, 'pending', 'resultado não pode ser alterado manualmente');
  assert.strictEqual(mm.winner, null, 'partida não recebe vencedor manual');
});
test('"pronto" em uma partida só por vez e jogador ocupado não inicia outra', () => {
  const h = makeHub();
  ['A', 'B'].forEach((n, i) => h.hub.join('P' + i, n)); // com o organizador são 3 jogadores: 2 partidas cada
  h.hub.start();
  const mine = h.hub.matches.filter(m => m.a === 1 || m.b === 1);
  assert.strictEqual(mine.length, 2);
  h.hub.ready(1, mine[0].id); h.hub.ready(1, mine[1].id);
  assert(mine[0].ready.includes(true), 'a partida atual continua pronta');
  assert(!mine[1].ready.includes(true), 'a partida futura ainda não pode ser escolhida');
  const snap = h.hub.snapshot();
  assert(snap.matches.every(m => Array.isArray(m.ready)) && !JSON.stringify(snap).includes('"pid"'), 'o código pessoal não vaza no estado público');
});

console.log('\n' + passed + ' testes do campeonato passaram');

// ---------- robôs (jogar sozinho) ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(cond, ms) { const t = Date.now(); while (!cond()) { if (Date.now() - t > (ms || 20000)) throw new Error('tempo esgotado'); await sleep(5); } }
(async () => {
  // 1) organizador sozinho: mata-mata de 2 (1 humano + 1 robô)
  const out = [];
  const hub = new T.Hub({ engine: E, send: (id, o) => out.push([id, o]), botDelay: 0 });
  hub.join('ORG', 'Solo', 'bear');
  assert.strictEqual(hub.players[0].av, 'bear', 'avatar guardado');
  hub.handle(0, { k: 'botlevel', v: 'easy' });
  assert(hub.start());
  assert.strictEqual(hub.status, 'running');
  const m = hub.matches[0];
  hub.ready(0, m.id);
  assert.strictEqual(m.status, 'playing', 'o robô está sempre pronto');
  const mine = () => out.filter(o => o[0] === 0 && o[1].k === 'relay' && o[1].m === m.id).map(o => JSON.parse(o[1].d));
  await until(() => mine().some(x => x.k === 'setup'));
  const botList = mine().find(x => x.k === 'setup').p;
  const hs = setupFor(0);
  hub.handle(0, { k: 'relay', m: m.id, d: JSON.stringify({ k: 'setup', p: hs }) });
  const pieces = new Int8Array(E.N);
  hs.concat(botList).forEach(it => { pieces[it[0]] = it[1]; });
  const g = new E.Game(pieces);
  let seen = 0, guard = 0;
  while (!g.over && m.status === 'playing' && guard++ < 800) {
    if (g.st.turn === 0) {
      const lg = g.legal({ noSeventh: true });
      const mv = E.chooseMove(g.st, lg.moves.length ? lg.moves : g.cur.moves, 'easy');
      hub.handle(0, { k: 'relay', m: m.id, d: JSON.stringify({ k: 'move', m: { t: mv.t, from: mv.from, to: mv.to, beyond: mv.beyond } }) });
      g.play(mv);
    } else {
      await until(() => m.status !== 'playing' || mine().filter(x => x.k === 'move').length > seen);
      const mvs = mine().filter(x => x.k === 'move');
      if (mvs.length > seen) {
        const q = mvs[seen++].m;
        const mv = g.cur.moves.find(x => x.t === q.t && x.from === q.from && x.to === q.to && (x.beyond | 0) === (q.beyond | 0));
        assert(mv, 'o robô só faz jogadas legais'); g.play(mv);
      }
    }
  }
  assert.strictEqual(m.status, 'done', 'a partida contra o robô terminou');
  assert.strictEqual(hub.status, 'finished'); assert(hub.champion === 0 || hub.champion === 1);
  console.log('ok - sozinho: robô monta, joga só lances legais e a partida termina');

  // 2) robôs entre si: resolvidos por sorteio; 1 humano + 3 robôs em todos contra todos
  const h2 = new T.Hub({ engine: E, send() {}, botDelay: 0 });
  h2.join('ORG', 'Solo');
  h2.handle(0, { k: 'addbot' }); h2.handle(0, { k: 'addbot' }); h2.handle(0, { k: 'addbot' });
  assert.strictEqual(h2.players.length, 4);
  assert(h2.start());
  const bb = h2.matches.filter(x => x.a !== 0 && x.b !== 0);
  assert(bb.length === 3 && bb.filter(x => x.status === 'playing' && x.sim).length === 1 && bb.filter(x => x.status === 'pending').length === 2, 'apenas um jogo de robôs simula por vez');
  // pular roda em fatias curtas (não congela a tela): repete o pedido até as três terminarem
  for (let i = 0; i < 400 && !bb.every(x => x.status === 'done'); i++) { bb.forEach(x => h2.handle(0, { k: 'skip', m: x.id })); await new Promise(r => setTimeout(r, 20)); }
  assert(bb.every(x => x.status === 'done' && Array.isArray(x.pieces) && Array.isArray(x.diff)), 'pular mantém resultado e saldo de peças');
  console.log('ok - robô contra robô simula uma partida por vez e pode ser pulado; saldo é calculado');

  // 3) só o organizador mexe nos robôs, só no lobby; lotação conta robôs
  const h3 = new T.Hub({ engine: E, send() {} });
  h3.join('ORG', 'Org'); const g1 = h3.join('P1', 'Ana').id;
  h3.handle(g1, { k: 'addbot' }); assert.strictEqual(h3.players.length, 2, 'convidado não adiciona robô');
  for (let i = 0; i < 9; i++) h3.handle(0, { k: 'addbot' });
  assert.strictEqual(h3.players.length, 8, 'máximo de 8 contando robôs');
  const botId = h3.players.find(p => p.bot).id;
  h3.handle(g1, { k: 'rmbot', id: botId }); assert.strictEqual(h3.players.length, 8);
  h3.handle(0, { k: 'rmbot', id: botId }); assert.strictEqual(h3.players.length, 7);
  h3.handle(0, { k: 'rmbot', id: 0 }); assert.strictEqual(h3.players.length, 7, 'não remove gente');
  h3.start(); h3.handle(0, { k: 'addbot' }); assert.strictEqual(h3.players.length, 7, 'depois de começar não entra robô');
  console.log('ok - controle dos robôs pelo organizador');
  console.log('\ntestes dos robôs passaram');
})().catch(e => { console.error(e); process.exit(1); });
