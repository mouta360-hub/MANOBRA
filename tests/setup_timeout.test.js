'use strict';
// Fim do tempo de montagem: completa ao acaso e começa a partida, sem W.O.
const assert = require('assert');
const E = require('../www/engine.js');
const T = require('../www/tournament.js');

const wait = ms => new Promise(r => setTimeout(r, ms));
async function run(prep) {
  const out = [];
  const hub = new T.Hub({ engine: E, send: (id, o) => out.push([id, o]), setupTimeout: 300, entryTimeout: 60000, botDelay: 10 });
  const a = hub.join('P1', 'Ana').id, b = hub.join('P2', 'Bia').id;
  hub.setFormat('league'); hub.start();
  const m = hub.matches[0];
  hub.handle(a, { k: 'ready', m: m.id }); hub.handle(b, { k: 'ready', m: m.id });
  const relay = (id, o) => hub.handle(id, { k: 'relay', m: m.id, d: JSON.stringify(o) });
  if (prep) prep(relay, a, b);
  await wait(450);
  const rt = hub.rt[m.id];
  assert.strictEqual(m.status, 'playing', 'não pode terminar (W.O.) ao fim do tempo: ' + m.reason);
  assert(rt && rt.game, 'a partida deve ter começado');
  return { hub, m, rt, out, a, b, relay };
}
const to = (out, id, k) => out.filter(x => x[0] === id && x[1].k === k).map(x => x[1]);
const relayed = (out, id, k) => out.filter(x => x[0] === id && x[1].k === 'relay').map(x => JSON.parse(x[1].d)).filter(d => d.k === k);

(async () => {
  let r = await run(null);
  assert.strictEqual(r.rt.setups[0].length, E.PIECES); assert.strictEqual(r.rt.setups[1].length, E.PIECES);
  [r.a, r.b].forEach((id, side) => {
    const au = to(r.out, id, 'autoSetup')[0];
    assert(au, 'cada jogador recebe sua montagem'); assert.deepStrictEqual(au.p, r.rt.setups[side]); assert.deepStrictEqual(au.opp, r.rt.setups[side ^ 1]);
  });
  console.log('ok - ninguém montou: sorteia os dois lados e a partida começa');

  const mine = E.presetSetup(1).slice(0, 5).map(o => [o.i, o.p]);
  r = await run((relay, a, b) => relay(b, { k: 'setupProgress', p: mine }));
  mine.forEach(it => assert(r.rt.setups[1].some(x => x[0] === it[0] && x[1] === it[1]), 'mantém as peças já colocadas'));
  console.log('ok - montagem parcial é mantida e o resto é sorteado');

  const done = E.presetSetup(0).map(o => [o.i, o.p]);
  r = await run((relay, a) => relay(a, { k: 'setup', p: done }));
  assert.deepStrictEqual(r.rt.setups[0], done);
  assert(relayed(r.out, r.a, 'setup').length === 1, 'quem já estava pronto recebe a montagem sorteada do adversário');
  assert.deepStrictEqual(relayed(r.out, r.a, 'setup')[0].p, r.rt.setups[1]);
  console.log('ok - um pronto e outro não: o pronto também recebe as peças do adversário');

  // mensagem de montagem que chega depois do sorteio não gera W.O.
  r.relay(r.b, { k: 'setup', p: E.presetSetup(1).map(o => [o.i, o.p]) });
  r.relay(r.b, { k: 'setup', p: [] });
  assert.strictEqual(r.m.status, 'playing');
  console.log('ok - montagem tardia é ignorada, sem punir');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
