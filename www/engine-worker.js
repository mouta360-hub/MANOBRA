/* Manobra: simulação de partidas robô x robô fora da tela principal (Web Worker).
 * O organizador (juiz) manda o tabuleiro inicial; aqui a partida é jogada em velocidade total
 * sem travar a tela do celular. Devolve o andamento e, no fim, o resultado.
 */
'use strict';
importScripts('engine.js');
const E = self.ManobraEngine;
const stopped = {};

function count(b) {
  const c = [0, 0];
  for (let i = 0; i < E.N; i++) { const p = b[i]; if (p) c[E.sideOf(p)]++; }
  return c;
}

self.onmessage = function (ev) {
  const d = ev.data || {};
  if (d.k === 'stop') { stopped[d.id] = true; return; }
  if (d.k !== 'sim') return;
  const g = new E.Game(Int8Array.from(d.pieces));
  let moves = 0;
  const step = function () {
    if (stopped[d.id]) { delete stopped[d.id]; return; }
    const t0 = Date.now();
    while (!g.over && Date.now() - t0 < 40) { // fatias curtas: dá tempo de receber "stop"
      if (moves >= E.SIM_MAX_PLIES) { g.over = E.adjudicate(g.st); break; } // robôs repetindo lances: decide por peças
      const mv = E.chooseMove(g.st, g.cur.moves, d.level, d.limit);
      if (!mv) { self.postMessage({ k: 'done', id: d.id, noMove: true, loser: g.st.turn, moves: moves }); return; }
      g.play(mv);
      moves++;
    }
    const b = Array.from(g.st.b);
    if (g.over) {
      self.postMessage({ k: 'done', id: d.id, winner: g.over.winner, reason: g.over.reason, moves: moves, b: b, turn: g.st.turn, pieces: count(g.st.b) });
    } else {
      self.postMessage({ k: 'p', id: d.id, moves: moves, b: b, turn: g.st.turn });
      setTimeout(step, 0);
    }
  };
  step();
};
