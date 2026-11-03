/* Runtime balanceado das peças especiais: tanques, atacantes e suporte. */
(function () {
  'use strict';
  const run = () => window.RoguelikeRun;
  const E = () => window.ManobraEngine;
  const catalog = () => (typeof SPECIAL_PIECES_CATALOG !== 'undefined' ? SPECIAL_PIECES_CATALOG : (window.SPECIAL_PIECES_CATALOG || {}));
  const deployedAt = (i, enemy) => { const r = run(); if (!r) return null; const bag = enemy ? r.enemyDeployed : r.deployed; return bag ? bag[String(i)] : null; };
  const rc = i => ({ r: Math.floor(i / 13), c: i % 13 });
  const idx = (r, c) => r >= 0 && r < 9 && c >= 0 && c < 13 ? r * 13 + c : -1;
  const distance = (a, b) => { const x = rc(a), y = rc(b); return Math.abs(x.r - y.r) + Math.abs(x.c - y.c); };
  const sideAt = (board, i) => board && board[i] && E() ? E().sideOf(board[i]) : -1;
  const enemyOf = side => side === E().WHITE ? E().BLACK : E().WHITE;
  function announce(text) { if (typeof window.showRoguelikeToast === 'function') window.showRoguelikeToast(text); }
  function state() { const r = run(); if (!r) return null; r.abilityState ||= { shield: {}, cooldown: {}, used: {}, captured: [0, 0], stun: {} }; return r.abilityState; }
  function specialAtBoard(board, i) {
    const side = sideAt(board, i), human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
    return deployedAt(i, side >= 0 && side !== human) || deployedAt(i, false);
  }
  function specialEntry(board, i) { const key = specialAtBoard(board, i); return key ? { key, side: sideAt(board, i), piece: catalog()[key] } : null; }
  function allEntries(board) { const out = []; const r = run(); if (!r || !board) return out; for (let i = 0; i < E().N; i++) { const e = specialEntry(board, i); if (e) out.push({ i, ...e }); } return out; }
  function isDiagonal(a, b) { const x = rc(a), y = rc(b); return Math.abs(x.r - y.r) === 1 && Math.abs(x.c - y.c) === 1; }
  function isBackRow(i) { return rc(i).r === 0 || rc(i).r === 8; }
  function isCapture(mv, board) { return mv && (mv.t === 'k' || mv.t === 'x' || (mv.t === 'p' && board[mv.to])); }

  function cellMarkup(i) {
    const key = specialAtBoard((window.__manobraApp && window.__manobraApp.game && window.__manobraApp.game.st.b) || (window.__manobraApp && window.__manobraApp.pieces), i), piece = key && catalog()[key];
    if (!piece) return '';
    return ` data-special-piece="${key}" data-symbol="${piece.symbol || '★'}"`;
  }

  function beforeMove(game, mv) {
    if (!run() || !run().active || !mv || mv.from < 0) return true;
    const board = game.st.b, mover = sideAt(board, mv.from), target = mv.to >= 0 ? specialEntry(board, mv.to) : null;
    const moving = specialEntry(board, mv.from);
    // Escudeiro: o primeiro ataque é absorvido; não perde a peça nem permite combo.
    if (target && target.key === 'escudeiro' && isCapture(mv, board)) {
      const s = state(), key = `${mv.to}`;
      if (!s.shield[key]) { s.shield[key] = 1; announce('🛡️ Escudeiro absorveu o primeiro impacto.'); return false; }
    }
    // Sentinela: bloqueia a entrada do adversário nas casas adjacentes.
    for (const e of allEntries(board)) if (e.key === 'sentinela' && e.side !== mover && mv.to >= 0 && distance(e.i, mv.to) === 1) {
      announce('🏰 Sentinela: zona adjacente bloqueada.'); return false;
    }
    // Bastião/Titã/Baluarte: uma proteção por combate para um aliado adjacente.
    if (isCapture(mv, board) && target && target.side === mover) {
      for (const e of allEntries(board)) if (['bastiao', 'tita_de_aco', 'baluarte'].includes(e.key) && e.side === mover && distance(e.i, mv.to) === 1) {
        const s = state(), k = `${e.key}:${e.i}`;
        if (!s.used[k]) { s.used[k] = 1; announce(`🧱 ${e.piece.name}: captura aliada bloqueada.`); return false; }
      }
    }
    // Muralha: não pode ser capturada lateralmente na fileira de defesa.
    if (target && target.key === 'muralha' && isCapture(mv, board) && isBackRow(mv.to) && rc(mv.from).r === rc(mv.to).r) {
      announce('🏯 Muralha: ataque lateral bloqueado.'); return false;
    }
    // Rebatedor: primeiro ataque diagonal é repelido.
    if (target && target.key === 'rebatedor' && isCapture(mv, board) && isDiagonal(mv.from, mv.to)) {
      const s = state(), k = `rebatedor:${mv.to}`;
      if (!s.used[k]) { s.used[k] = 1; announce('🪞 Rebatedor desviou o ataque diagonal.'); return false; }
    }
    // Guardião Rúnico: uma vez por combate, paralisa o próximo turno inimigo.
    const s = state();
    if (s.stun[mover] && s.stun[mover] > 0) { s.stun[mover] = 0; game.pass(); announce('☸️ Guardião Rúnico: turno perdido.'); return false; }
    return true;
  }

  function addMove(out, seen, mv, board) {
    if (mv.to < 0 || mv.to >= E().N || board[mv.to] && E().sideOf(board[mv.to]) === E().sideOf(board[mv.from])) return;
    const k = `${mv.t}:${mv.from}:${mv.to}:${mv.beyond == null ? '' : mv.beyond}`;
    if (!seen.has(k)) { seen.add(k); out.push(mv); }
  }
  function specialMoves(game, base) {
    if (!run() || !run().active) return base;
    const board = game.st.b, side = game.st.turn, out = base.slice(), seen = new Set(out.map(m => `${m.t}:${m.from}:${m.to}:${m.beyond == null ? '' : m.beyond}`));
    for (const e of allEntries(board)) {
      if (e.side !== side) continue;
      const { r, c } = rc(e.i);
      if (e.key === 'lancer') {
        [[2,0],[-2,0],[0,2],[0,-2]].forEach(([dr,dc]) => { const mid = idx(r+dr/2,c+dc/2), to = idx(r+dr,c+dc); if (mid >= 0 && to >= 0 && !board[mid] && !board[to]) addMove(out, seen, {t:'m', from:e.i, to}, board); });
      }
      if (e.key === 'assassino_sombras') {
        [[2,0],[-2,0],[0,2],[0,-2]].forEach(([dr,dc]) => { const mid = idx(r+dr/2,c+dc/2), to = idx(r+dr,c+dc); if (mid >= 0 && to >= 0 && board[mid] && sideAt(board,mid) !== side && !board[to]) addMove(out, seen, {t:'m', from:e.i, to}, board); });
      }
      if (e.key === 'cavaleiro_errante') {
        [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc]) => { const to=idx(r+dr,c+dc); if(to>=0) addMove(out,seen,{t:board[to]?'k':'m',from:e.i,to},board); });
      }
      if (e.key === 'ceifador') {
        [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc]) => { const to=idx(r+dr,c+dc); if(to>=0 && board[to] && sideAt(board,to)!==side) addMove(out,seen,{t:'k',from:e.i,to},board); });
      }
      if (e.key === 'vento_cortante') {
        [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => { let rr=r+dr,cc=c+dc; while(idx(rr,cc)>=0) { const to=idx(rr,cc); if(!board[to]) addMove(out,seen,{t:'m',from:e.i,to},board); else { if(sideAt(board,to)!==side) addMove(out,seen,{t:'k',from:e.i,to},board); break; } rr+=dr;cc+=dc; } });
      }
    }
    return { moves: out, blocked: base.blocked || 0 };
  }

  function patchLegal() {
    const Game = E() && E().Game;
    if (!Game || Game.prototype.__roguelikePatched) return;
    const original = Game.prototype.legal;
    Game.prototype.legal = function (opts) { const base = original.call(this, opts); return specialMoves(this, base); };
    Game.prototype.__roguelikePatched = true;
  }

  function afterMove(game, mv, captured) {
    if (!run() || !run().active || !mv) return;
    const board = game.st.b;
    const destinationAfter = mv.t === 'p' ? mv.beyond : mv.to;
    const movedSide = mv.t === 'f' ? sideAt(board, mv.from) : sideAt(board, destinationAfter);
    const humanSide = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
    const enemy = movedSide >= 0 && movedSide !== humanSide;
    const bag = enemy ? run().enemyDeployed : run().deployed, key = mv.from >= 0 ? deployedAt(mv.from, enemy) : null, piece = key && catalog()[key];
    if (key && bag) {
      delete bag[String(mv.from)];
      const destination = destinationAfter;
      if (destination >= 0 && mv.t !== 'x' && mv.t !== 'f') bag[String(destination)] = key;
      else if (mv.t === 'f') bag[String(mv.from)] = key;
    }
    if (mv.to >= 0 && run().enemyDeployed) delete run().enemyDeployed[String(mv.to)];
    if (!piece) return;
    const s = state();
    if (key === 'javali_de_ferro' && mv.t === 'k' && captured) { game.st.b[mv.to] = 0; game.refresh(); announce('🐗 Javali de Ferro: contra-ataque destruiu o atacante.'); }
    if (key === 'colosso' && mv.to >= 0 && (mv.t === 'm' || mv.t === 'k')) {
      const {r,c}=rc(mv.to); for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) { const near=idx(r+dr,c+dc), far=idx(r+2*dr,c+2*dc); if(near>=0&&far>=0&&board[near]&&sideAt(board,near)!==sideAt(board,mv.to)&&!board[far]) { board[far]=board[near]; board[near]=0; announce('🗿 Colosso empurrou uma peça inimiga.'); break; } }
      game.refresh();
    }
    if (key === 'guardiao_runico' && mv.to >= 0) { for (const e of allEntries(board)) if (e.side !== sideAt(board,mv.to) && e.key === 'guardiao_runico' && distance(e.i,mv.to) === 1) s.stun[sideAt(board,mv.to)] = 1; }
    if (key === 'executor' && mv.t === 'k' && captured && !s.used[`executor:${sideAt(board,mv.to)}`]) { s.used[`executor:${sideAt(board,mv.to)}`] = 1; game.st.turn ^= 1; game.refresh(); announce('⚔️ Executor: movimento bônus único neste combate.'); }
    if (key === 'berserker' && mv.t === 'k' && captured) { s.captured[sideAt(board,mv.to)]++; if (s.captured[sideAt(board,mv.to)] % 3 === 0) announce('🪓 Berserker: fúria acumulada após três eliminações.'); }
    if (key === 'alquimista' && !enemy && (mv.t === 'k' || mv.t === 'x') && captured) { run().gold += 20; announce('🧪 Alquimista: +20 moedas.'); }
    if (key === 'lancer' && mv.t === 'm') announce('🗡️ Lancer: carga linear executada.');
    if (key === 'ceifador' && mv.t === 'k') announce('💀 Ceifador: captura diagonal especial.');
    if (key === 'cavaleiro_errante' && mv.t === 'm') announce('♞ Cavaleiro Errante: salto em L.');
  }

  function renderBoardState() {
    document.querySelectorAll('[data-special-piece]').forEach((el) => {
      const key = el.dataset.specialPiece, piece = catalog()[key];
      el.classList.add('special-piece', `category-${piece && piece.category || 'support'}`);
      el.dataset.symbol = piece && piece.symbol || '★';
      el.title = `${piece && piece.name || key}: ${piece && piece.description || 'Efeito especial'}`;
      if (!el.querySelector('.rogue-special-badge') && el.querySelector('.pc')) {
        const badge = document.createElement('div'); badge.className = `rogue-special-badge rogue-special-badge-${piece && piece.category || 'support'}`;
        badge.innerHTML = `<span>${piece && piece.symbol || '★'}</span><small>${piece && piece.name || key}: ${piece && piece.description || 'Efeito especial'}</small>`;
        badge.onclick = ev => { ev.stopPropagation(); announce(`${piece && piece.name || key}: ${piece && piece.description || 'Efeito especial'}`); };
        el.appendChild(badge);
      }
    });
  }

  patchLegal();
  window.RoguelikeRuntime = { cellMarkup, beforeMove, afterMove, renderBoardState, patchLegal };
  window.addEventListener('DOMContentLoaded', () => { patchLegal(); setInterval(renderBoardState, 700); });
}());
