'use strict';
// Partidas robô x robô fora da tela principal (Web Worker): integração do juiz + o próprio script do worker.
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('../www/engine.js');
const T = require('../www/tournament.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(cond, ms, what) { const t = Date.now(); while (!cond()) { if (Date.now() - t > (ms || 15000)) throw new Error('tempo esgotado: ' + what); await sleep(5); } }

// Worker "de mentira": carrega engine-worker.js de verdade num contexto isolado, como o navegador faria
function fakeWorker(opts) {
  const posted = [];
  let toPage = null;
  const sandbox = { self: null, importScripts: f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8'), ctx), setTimeout, Date, Int8Array, Array };
  sandbox.self = sandbox;
  sandbox.postMessage = d => { if (opts && opts.dieAfter != null && posted.length >= opts.dieAfter) return; posted.push(d); setTimeout(() => toPage(JSON.parse(JSON.stringify(d))), 0); };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'www', 'engine-worker.js'), 'utf8'), ctx);
  const jobs = {};
  toPage = d => { const j = jobs[d.id]; if (!j) return; if (d.k === 'p') j.progress(d); else if (d.k === 'done') { delete jobs[d.id]; j.done(d); } };
  return {
    posted, stops: [],
    run(job, progress, done, fail) {
      jobs[job.id] = { progress, done, fail };
      if (opts && opts.fail) { setTimeout(() => { delete jobs[job.id]; fail(); }, 20); return; }
      sandbox.onmessage({ data: Object.assign({ k: 'sim' }, JSON.parse(JSON.stringify(job))) });
    },
    stop(id) { delete jobs[id]; this.stops.push(id); sandbox.onmessage({ data: { k: 'stop', id } }); },
    terminate() {}
  };
}

async function run(workerOpts, label) {
  const w = workerOpts === null ? null : fakeWorker(workerOpts);
  const out = [];
  const hub = new T.Hub({ engine: E, send: (id, o) => out.push([id, o]), simWorker: w, simFast: true, botDelay: 0, simWatchdog: 300 });
  hub.join('ORG', 'Eu'); for (let i = 0; i < 3; i++) hub.handle(0, { k: 'addbot' });
  hub.botLevel = 'medium';
  assert(hub.start());
  const bb = hub.matches.filter(x => x.a !== 0 && x.b !== 0);
  assert.strictEqual(bb.length, 3);
  await until(() => bb.every(x => x.status === 'done'), 60000, label + ': as 3 partidas entre robôs terminarem');
  bb.forEach(x => {
    assert(Array.isArray(x.pieces) && x.pieces.length === 2 && Array.isArray(x.diff), label + ': resultado e saldo de peças');
    assert(x.winner === x.a || x.winner === x.b);
    assert.strictEqual(x.diff[0], -x.diff[1]);
  });
  return { hub, w, bb };
}

(async () => {
  // robôs que repetem lances para sempre: decide por peças no limite de lances
  const pcs = new Int8Array(E.N); [0, 1].forEach(s => E.presetSetup(s).forEach(o => { pcs[o.i] = o.p; }));
  const g0 = new E.Game(pcs); g0.st.b[E.territoryCells(1).find(i => g0.st.b[i])] = 0; // as pretas ficam com uma peça a menos
  const adj = E.adjudicate(g0.st);
  assert.strictEqual(adj.reason, 'empate_limite_seguranca');
  assert.strictEqual(adj.winner, null, 'limite técnico não pode declarar vencedor');
  console.log('ok - limite de lances: partida que não acaba termina em empate técnico');
  let r = await run({}, 'com worker');
  assert(r.w.posted.some(d => d.k === 'p') && r.w.posted.some(d => d.k === 'done'), 'o worker trabalhou (progresso e resultado)');
  assert(r.w.stops.length >= 3, 'o juiz manda parar o worker ao encerrar cada partida');
  console.log('ok - robô x robô roda no worker e o juiz recebe resultado e saldo de peças');

  r = await run({ fail: true }, 'worker falha');
  console.log('ok - se o worker falhar, o juiz continua sozinho na tela principal (plano B)');

  r = await run({ dieAfter: 3 }, 'worker mudo'); // para de responder sem dar erro: o vigia faz o juiz assumir
  console.log('ok - worker que fica mudo no meio da partida: o vigia entrega a partida ao juiz, sem travar o campeonato');
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e.message || e); process.exit(1); });
