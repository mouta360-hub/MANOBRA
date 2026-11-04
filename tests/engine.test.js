'use strict';
const assert = require('assert');
const E = require('../www/engine.js');
const { idx, WA, WD, BA, BD, WHITE, BLACK } = E;

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }
function mk(list, turn) {
  const st = E.createState();
  for (const [r, c, p] of list) st.b[idx(r, c)] = p;
  st.turn = turn === undefined ? WHITE : turn;
  return st;
}
const find = (moves, t, from, to) => moves.filter(m => m.t === t && m.from === idx(...from) && m.to === idx(...to));

test('tabuleiro tem 117 casas, 59 escuras, casas principais escuras', () => {
  assert.strictEqual(E.N, 117);
  let dark = 0;
  for (let i = 0; i < E.N; i++) if (E.isDarkCell(i)) dark++;
  assert.strictEqual(dark, 59);
  assert(E.isDarkCell(E.MAIN[0]) && E.isDarkCell(E.MAIN[1]));
  assert.strictEqual(E.territoryCells(WHITE).length, 25);
  assert.strictEqual(E.territoryCells(BLACK).length, 25);
});

test('ataque sozinho não se move; com peça amiga na diagonal volta a se mover', () => {
  let st = mk([[4, 4, WA]]);
  assert.strictEqual(E.generate(st, WHITE).length, 0);
  st = mk([[4, 4, WA], [6, 6, WD]]);
  assert(E.generate(st, WHITE).every(m => m.from === idx(6, 6)), 'só a defesa anda');
  // mexer a peça amiga para perto reativa o ataque
  st = mk([[4, 4, WA], [5, 5, WD]]);
  const mv = E.generate(st, WHITE).filter(m => m.from === idx(4, 4));
  assert(mv.length >= 3);
});

test('ataque elimina ocupando a casa; defesa nunca elimina', () => {
  let st = mk([[4, 4, WA], [5, 5, WD], [3, 3, BD]]);
  assert.strictEqual(find(E.generate(st, WHITE), 'k', [4, 4], [3, 3]).length, 1);
  st = mk([[4, 4, WD], [3, 3, BD]]);
  const g = E.generate(st, WHITE);
  assert(!g.some(m => m.t === 'k'));
  assert.strictEqual(find(g, 'p', [4, 4], [3, 3]).length, 1);
  assert.strictEqual(find(g, 's', [4, 4], [3, 3]).length, 1);
});

test('empurrar exige casa livre atrás; trocar sempre possível', () => {
  const st = mk([[4, 4, WD], [3, 3, BD], [2, 2, BA]]);
  const g = E.generate(st, WHITE);
  assert.strictEqual(find(g, 'p', [4, 4], [3, 3]).length, 0);
  assert.strictEqual(find(g, 's', [4, 4], [3, 3]).length, 1);
});

test('empurrar e trocar movem as peças certas', () => {
  let st = mk([[4, 4, WD], [3, 3, BD]]);
  E.apply(st, find(E.generate(st, WHITE), 'p', [4, 4], [3, 3])[0]);
  assert.strictEqual(st.b[idx(3, 3)], WD); assert.strictEqual(st.b[idx(2, 2)], BD); assert.strictEqual(st.b[idx(4, 4)], 0);
  st = mk([[4, 4, WD], [3, 3, BD]]);
  E.apply(st, find(E.generate(st, WHITE), 's', [4, 4], [3, 3])[0]);
  assert.strictEqual(st.b[idx(3, 3)], WD); assert.strictEqual(st.b[idx(4, 4)], BD);
});

test('apply/undo restauram o tabuleiro', () => {
  const st = mk([[4, 4, WD], [3, 3, BD], [5, 5, WA], [6, 6, WD]]);
  const before = Array.from(st.b);
  for (const m of E.generate(st, WHITE)) {
    const log = E.apply(st, m);
    E.undo(st, log);
    assert.deepStrictEqual(Array.from(st.b), before);
    assert.strictEqual(st.turn, WHITE);
  }
});

test('virar modo: defesa->ataque livre; ataque->defesa exige peça amiga', () => {
  let st = mk([[4, 4, WD]]);
  assert.strictEqual(find(E.generate(st, WHITE), 'f', [4, 4], [4, 4]).length, 1);
  st = mk([[4, 4, WA]]);
  assert.strictEqual(E.generate(st, WHITE).length, 0);
  st = mk([[4, 4, WA], [5, 5, WD]]);
  assert.strictEqual(find(E.generate(st, WHITE), 'f', [4, 4], [4, 4]).length, 1);
});

test('7ª peça em defesa permite ao adversário eliminar uma defesa', () => {
  const list = [];
  for (let k = 0; k < 7; k++) list.push([0, 2 * k, BD]);
  let st = mk(list.concat([[8, 2, WD]]));
  assert.strictEqual(E.generate(st, WHITE).filter(m => m.t === 'x').length, 7);
  st = mk(list.slice(0, 6).concat([[8, 2, WD]]));
  assert.strictEqual(E.generate(st, WHITE).filter(m => m.t === 'x').length, 0);
});

test('vitórias: casa principal, eliminação, isolamento', () => {
  let st = mk([[1, 5, WD], [8, 2, BD]]);
  E.apply(st, find(E.generate(st, WHITE), 'm', [1, 5], [0, 6])[0]);
  assert.strictEqual(E.winner(st, WHITE), 'principal');
  st = mk([[4, 4, WA], [5, 5, WD], [3, 3, BD]]);
  E.apply(st, find(E.generate(st, WHITE), 'k', [4, 4], [3, 3])[0]);
  assert.strictEqual(E.winner(st, WHITE), 'eliminacao');
  st = mk([[4, 4, WD], [0, 2, BA], [0, 10, BA], [2, 6, BA]]);
  assert.strictEqual(E.winner(st, WHITE), 'isolamento');
  st = mk([[4, 4, WD], [0, 2, BA], [1, 3, BA], [2, 6, BA]]);
  assert.strictEqual(E.winner(st, WHITE), null);
  st = mk([[4, 4, WD], [0, 2, BA], [0, 10, BA], [2, 6, BD]]); // defesa pode reconectar
  assert.strictEqual(E.winner(st, WHITE), null);
});

test('não é possível empurrar/trocar peça para uma casa principal', () => {
  const st = mk([[7, 5, WD], [8, 6, BD]]); // trocar jogaria a inimiga em (7,5) ok; mas a branca sai de... teste de troca saindo da principal:
  const st2 = mk([[8, 6, WD], [7, 5, BD]]);
  assert(!E.generate(st2, WHITE).some(m => m.t === 's' && m.from === E.MAIN[0]));
});

test('efeito looping: dono do terreno leva vantagem e o outro precisa mudar', () => {
  // Brancas têm menos peças (2 x 3): desempate 1 favorece as brancas, pretas devem mudar.
  const pieces = new Int8Array(E.N);
  pieces[idx(6, 6)] = WD; pieces[idx(8, 2)] = WD;
  pieces[idx(2, 6)] = BD; pieces[idx(0, 2)] = BD; pieces[idx(0, 10)] = BD;
  const g = new E.Game(pieces);
  const pick = (from, to) => g.cur.moves.find(m => m.t === 'm' && m.from === idx(...from) && m.to === idx(...to));
  let sawBlackBlocked = false;
  for (let k = 0; k < 8 && !g.over; k++) {
    let m = pick([6, 6], [5, 5]) || pick([5, 5], [6, 6]);
    assert(m, 'brancas sempre conseguem repetir (têm vantagem)');
    g.play(m);
    m = pick([2, 6], [3, 5]) || pick([3, 5], [2, 6]);
    if (!m) { sawBlackBlocked = g.cur.blocked > 0; break; }
    g.play(m);
  }
  assert(sawBlackBlocked, 'pretas foram obrigadas a mudar de lance');
});

test('partidas IA x IA terminam sem erro', () => {
  const levels = ['easy', 'medium'];
  const results = { 0: 0, 1: 0, draw: 0 };
  const reasons = {};
  for (let n = 0; n < 6; n++) {
    const pieces = new Int8Array(E.N);
    for (const s of [WHITE, BLACK]) for (const o of (n % 2 ? E.randomSetup(s) : E.presetSetup(s, Math.random))) pieces[o.i] = o.p;
    assert.strictEqual(pieces.filter(x => x).length, E.PIECES * 2);
    const g = new E.Game(pieces);
    let guard = 0;
    while (!g.over && guard++ < 300) {
      const lvl = levels[g.st.turn];
      let l = g.legal({ noSeventh: true });
      if (!l.moves.length) l = g.cur;
      const mv = E.chooseMove(g.st, l.moves, lvl);
      assert(mv, 'IA escolheu lance');
      g.play(mv);
    }
    if (g.over) { results[g.over.winner]++; reasons[g.over.reason] = (reasons[g.over.reason] || 0) + 1; } else results.draw++;
  }
  console.log('   resultados', JSON.stringify(results), JSON.stringify(reasons));
});

console.log('\n' + passed + ' testes passaram');
