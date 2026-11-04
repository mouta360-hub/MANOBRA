/* Manobra 1.0 – motor de regras e IA
 * Tabuleiro 13 colunas x 9 linhas = 117 casas. Só as casas escuras (r+c par) são jogáveis.
 * Brancas ficam embaixo (linhas 5..8), Pretas em cima (linhas 0..3), linha 4 = terreno neutro.
 */
(function (root) {
  'use strict';

  const COLS = 13, ROWS = 9, N = COLS * ROWS;
  const EMPTY = 0, WA = 1, WD = 2, BA = 3, BD = 4; // A = ataque, D = defesa
  const WHITE = 0, BLACK = 1;
  const MAX_DEF = 6, PIECES = 13;
  const WIN = 100000;

  const idx = (r, c) => r * COLS + c;
  const rowOf = i => (i / COLS) | 0;
  const colOf = i => i % COLS;
  const isDarkCell = i => ((rowOf(i) + colOf(i)) & 1) === 0;
  const sideOf = p => (p === 0 ? -1 : p <= 2 ? 0 : 1);
  const isAttack = p => p === 1 || p === 3;
  const makePiece = (side, attack) => (side === WHITE ? (attack ? WA : WD) : (attack ? BA : BD));

  // Casa principal de cada jogador (a própria casa).
  const MAIN = [idx(8, 6), idx(0, 6)];
  const isMain = i => i === MAIN[0] || i === MAIN[1];
  // Dono do terreno por linha: topo = pretas, base = brancas, linha 4 = neutro.
  const terrainOwner = r => (r <= 3 ? BLACK : r >= 5 ? WHITE : -1);

  // Vizinhos diagonais (NB) e casas a duas diagonais de distância (FAR)
  const DR = [-1, -1, 1, 1], DC = [-1, 1, -1, 1];
  const NB = new Int16Array(N * 4).fill(-1);
  const FAR = new Int16Array(N * 4).fill(-1);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (((r + c) & 1) !== 0) continue;
      const i = idx(r, c);
      for (let d = 0; d < 4; d++) {
        const r1 = r + DR[d], c1 = c + DC[d];
        if (r1 >= 0 && r1 < ROWS && c1 >= 0 && c1 < COLS) NB[i * 4 + d] = idx(r1, c1);
        const r2 = r + 2 * DR[d], c2 = c + 2 * DC[d];
        if (r2 >= 0 && r2 < ROWS && c2 >= 0 && c2 < COLS) FAR[i * 4 + d] = idx(r2, c2);
      }
    }
  }

  function createState() {
    return { b: new Int8Array(N), turn: WHITE };
  }

  function hasFriendAdj(b, i, s) {
    for (let d = 0; d < 4; d++) {
      const j = NB[i * 4 + d];
      if (j >= 0 && sideOf(b[j]) === s) return true;
    }
    return false;
  }

  /* ---------- Geração de lances ----------
   * t: 'm' mover | 'k' eliminar (só ataque) | 'p' empurrar | 's' trocar de lugar (só defesa)
   *    'f' virar modo | 'x' eliminar peça de defesa do adversário (regra da 7ª peça de defesa)
   */
  function generate(st, s, opts) {
    const b = st.b, out = [];
    const noSeventh = !!(opts && opts.noSeventh);
    let defCount = 0;
    const enemyDefs = [];
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (!p) continue;
      if (sideOf(p) === s) { if (!isAttack(p)) defCount++; }
      else if (!isAttack(p)) enemyDefs.push(i);
    }
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (!p || sideOf(p) !== s) continue;
      const friend = hasFriendAdj(b, i, s);
      if (isAttack(p)) {
        if (!friend) continue; // modo ataque só se move com peça amiga por perto (e só vira defesa com ela)
        for (let d = 0; d < 4; d++) {
          const j = NB[i * 4 + d];
          if (j < 0) continue;
          const q = b[j];
          if (q === 0) out.push({ t: 'm', from: i, to: j });
          else if (sideOf(q) !== s) out.push({ t: 'k', from: i, to: j });
        }
        if (!(noSeventh && defCount >= MAX_DEF)) out.push({ t: 'f', from: i, to: i });
      } else {
        for (let d = 0; d < 4; d++) {
          const j = NB[i * 4 + d];
          if (j < 0) continue;
          const q = b[j];
          if (q === 0) out.push({ t: 'm', from: i, to: j });
          else if (sideOf(q) !== s) {
            const f = FAR[i * 4 + d];
            if (f >= 0 && b[f] === 0 && !isMain(f)) out.push({ t: 'p', from: i, to: j, beyond: f });
            if (!isMain(i)) out.push({ t: 's', from: i, to: j });
          }
        }
        out.push({ t: 'f', from: i, to: i });
      }
    }
    if (enemyDefs.length > MAX_DEF) {
      for (const e of enemyDefs) out.push({ t: 'x', from: -1, to: e });
    }
    return out;
  }

  // Aplica o lance e passa a vez. Retorna o log para desfazer.
  function apply(st, mv) {
    const b = st.b, log = [];
    const save = i => { log.push(i, b[i]); };
    switch (mv.t) {
      case 'm': case 'k':
        save(mv.from); save(mv.to);
        b[mv.to] = b[mv.from]; b[mv.from] = 0;
        break;
      case 'p':
        save(mv.from); save(mv.to); save(mv.beyond);
        b[mv.beyond] = b[mv.to]; b[mv.to] = b[mv.from]; b[mv.from] = 0;
        break;
      case 's': {
        save(mv.from); save(mv.to);
        const e = b[mv.to];
        b[mv.to] = b[mv.from]; b[mv.from] = e;
        break;
      }
      case 'f':
        save(mv.from);
        b[mv.from] = (b[mv.from] % 2) ? b[mv.from] + 1 : b[mv.from] - 1;
        break;
      case 'x':
        save(mv.to); b[mv.to] = 0;
        break;
    }
    st.turn ^= 1;
    return log;
  }
  function undo(st, log) {
    for (let k = log.length - 2; k >= 0; k -= 2) st.b[log[k]] = log[k + 1];
    st.turn ^= 1;
  }

  /* ---------- Vitória (checada depois do lance de `mover`) ---------- */
  function winner(st, mover) {
    const b = st.b, enemy = mover ^ 1;
    if (sideOf(b[MAIN[enemy]]) === mover) return 'principal'; // alcançou a casa principal do oponente
    let count = 0, atk = 0, def = 0;
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (p && sideOf(p) === enemy) { count++; if (isAttack(p)) atk++; else def++; }
    }
    if (count === 0) return 'eliminacao';
    // Todas as peças de ataque do oponente separadas, sem peça amiga que possa reconectá-las
    if (atk > 0 && def === 0) {
      for (let i = 0; i < N; i++) {
        const p = b[i];
        if (p && sideOf(p) === enemy && isAttack(p) && hasFriendAdj(b, i, enemy)) return null;
      }
      return 'isolamento';
    }
    return null;
  }

  /* ---------- Efeito looping ---------- */
  function hashOf(st) { return st.turn + ':' + Array.prototype.join.call(st.b, ''); }

  // Quem perde o desempate (quem é obrigado a mudar o lance). -1 = empate total.
  function loopLoser(st, mv) {
    const b = st.b;
    const cnt = [0, 0], atk = [0, 0];
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (!p) continue;
      const s = sideOf(p);
      cnt[s]++;
      if (isAttack(p)) atk[s]++;
    }
    if (cnt[0] !== cnt[1]) return cnt[0] < cnt[1] ? BLACK : WHITE;    // 1) menos peças leva vantagem
    if (atk[0] !== atk[1]) return atk[0] > atk[1] ? BLACK : WHITE;    // 2) mais peças em ataque
    const o = terrainOwner(rowOf(mv.to));                              // 3) dono do terreno
    if (o >= 0) return o ^ 1;
    return -1;
  }

  class Game {
    constructor(pieces) {
      this.st = createState();
      if (pieces) this.st.b.set(pieces);
      this.hist = new Map();
      this.over = null;     // { winner, reason }
      this.last = null;
      this.plies = 0;
      this.cur = null;
      this.record();
      this.refresh();
    }
    record() {
      const h = hashOf(this.st);
      this.hist.set(h, (this.hist.get(h) || 0) + 1);
    }
    legal(opts) {
      const st = this.st, s = st.turn;
      const raw = generate(st, s, opts);
      if (!raw.length) return { moves: raw, blocked: 0 };
      const out = [];
      let blocked = 0;
      for (const m of raw) {
        const log = apply(st, m);
        const cnt = this.hist.get(hashOf(st)) || 0;
        undo(st, log);
        let ban = false;
        if (cnt >= 2) { // repetiria a posição pela 3ª vez
          let loser = loopLoser(st, m);
          if (loser < 0) loser = s;
          ban = loser === s;
        }
        if (ban) blocked++; else out.push(m);
      }
      if (!out.length) return { moves: raw, blocked: 0, forced: true };
      return { moves: out, blocked };
    }
    refresh() {
      const l = this.legal();
      this.cur = l;
      if (!l.moves.length) { this.over = { winner: this.st.turn ^ 1, reason: 'sem_movimentos' }; }
    }
    // Perder a vez (estourou o tempo da jogada): o tabuleiro não muda, a vez passa ao outro.
    // Não entra no histórico de repetições, para não gerar "looping" à toa.
    pass() {
      if (this.over) return;
      this.st.turn ^= 1;
      this.last = null;
      this.plies++;
      this.refresh();
    }
    play(mv) {
      const mover = this.st.turn;
      if (mv.rogueExecution && mv.t === 'k') {
        const back = mv.rogueExecution.back, b = this.st.b;
        const dr = rowOf(mv.to) - rowOf(mv.from), dc = colOf(mv.to) - colOf(mv.from);
        const valid = Math.abs(dr) === 1 && Math.abs(dc) === 1 &&
          back === idx(rowOf(mv.to) + dr, colOf(mv.to) + dc) &&
          back >= 0 && back < N && isDarkCell(back) &&
          sideOf(b[mv.from]) === mover && isAttack(b[mv.from]) &&
          sideOf(b[mv.to]) === (mover ^ 1) && sideOf(b[back]) === (mover ^ 1) &&
          this.legal().moves.some(x => x.t === 'k' && x.from === mv.from && x.to === mv.to);
        if (!valid) return;
        // Executa a peça de trás e empurra a da frente, sem avançar.
        b[back] = b[mv.to];
        b[mv.to] = 0;
        this.st.turn ^= 1;
        this.record();
        this.last = mv;
        this.plies++;
        const w = winner(this.st, mover);
        if (w) { this.over = { winner: mover, reason: w }; this.cur = null; return; }
        this.refresh();
        return;
      }
      if (mv.rogueWind && mv.t === 'k') {
        const w = mv.rogueWind, b = this.st.b;
        const valid = this.legal().moves.some(x => x.t === 'k' && x.from === mv.from && x.to === mv.to) &&
          sideOf(b[mv.from]) === mover && sideOf(b[mv.to]) === (mover ^ 1) &&
          w.target >= 0 && w.target < N && w.landing >= 0 && w.landing < N &&
          Math.max(Math.abs(rowOf(w.target)-rowOf(mv.to)),Math.abs(colOf(w.target)-colOf(mv.to))) === 1 &&
          w.landing === idx(rowOf(w.target)+Math.sign(rowOf(w.target)-rowOf(mv.to)),
                            colOf(w.target)+Math.sign(colOf(w.target)-colOf(mv.to))) &&
          isDarkCell(w.landing) && !isMain(w.landing) && !b[w.landing] && sideOf(b[w.target]) === (mover ^ 1);
        if (!valid) return;
        apply(this.st,mv);
        if (!w.blocked) { b[w.landing] = b[w.target]; b[w.target] = 0; }
        this.record(); this.last=mv; this.plies++;
        const result=winner(this.st,mover);
        if (result) { this.over={winner:mover,reason:result};this.cur=null;return; }
        this.refresh();return;
      }
      if (mv.rogueCavalry && mv.t === 'k') {
        const landing = mv.rogueCavalry.landing, b = this.st.b;
        const dr = rowOf(mv.to) - rowOf(mv.from), dc = colOf(mv.to) - colOf(mv.from);
        const valid = Math.abs(dr) === 1 && Math.abs(dc) === 1 &&
          landing === idx(rowOf(mv.to) + dr, colOf(mv.to) + dc) &&
          landing >= 0 && landing < N && isDarkCell(landing) && !isMain(landing) && !b[landing] &&
          sideOf(b[mv.from]) === mover && isAttack(b[mv.from]) && sideOf(b[mv.to]) === (mover ^ 1) &&
          this.legal().moves.some(x => x.t === 'k' && x.from === mv.from && x.to === mv.to);
        if (!valid) return;
        apply(this.st, mv);
        b[landing] = b[mv.to]; b[mv.to] = 0;
      } else {
        apply(this.st, mv);
      }
      this.record();
      this.last = mv;
      this.plies++;
      const w = winner(this.st, mover);
      if (w) { this.over = { winner: mover, reason: w }; this.cur = null; return; }
      this.refresh();
    }
  }

  /* ---------- Montagem ---------- */
  function territoryCells(side) {
    const r0 = side === WHITE ? 5 : 0, r1 = side === WHITE ? 8 : 3;
    const out = [];
    for (let r = r0; r <= r1; r++) for (let c = 0; c < COLS; c++) {
      const i = idx(r, c);
      if (isDarkCell(i) && !isMain(i)) out.push(i);
    }
    return out;
  }
  const inTerritory = (i, side) => territoryCells(side).indexOf(i) >= 0;

  // Posição padrão (desenhada para as pretas, espelhada para as brancas). [linha, coluna, ataque?]
  const PRESET = [
    [0, 4, 0], [0, 8, 0],
    [1, 3, 1], [1, 5, 1], [1, 7, 1], [1, 9, 1],
    [2, 2, 0], [2, 4, 1], [2, 6, 1], [2, 8, 1], [2, 10, 0],
    [3, 5, 1], [3, 7, 1]
  ];
  function presetSetup(side, rnd) {
    const out = PRESET.map(([r, c, a]) => ({ i: idx(side === BLACK ? r : 8 - r, c), a: !!a }));
    if (rnd) { // pequena variação: troca o modo de até 2 peças, respeitando o limite de defesa
      for (let k = 0; k < 2; k++) {
        const x = out[Math.floor(rnd() * out.length)];
        const defs = out.filter(o => !o.a).length;
        if (x.a && defs < MAX_DEF) x.a = false; else if (!x.a && rnd() < 0.5) x.a = true;
      }
    }
    return out.map(o => ({ i: o.i, p: makePiece(side, o.a) }));
  }
  function randomSetup(side, rnd) {
    rnd = rnd || Math.random;
    const cells = new Set(territoryCells(side));
    const list = [...cells];
    const set = new Set([list[Math.floor(rnd() * list.length)]]);
    while (set.size < PIECES) {
      const cand = [];
      for (const i of set) for (let d = 0; d < 4; d++) {
        const j = NB[i * 4 + d];
        if (j >= 0 && cells.has(j) && !set.has(j)) cand.push(j);
      }
      set.add(cand[Math.floor(rnd() * cand.length)]);
    }
    const arr = [...set];
    const nd = 2 + Math.floor(rnd() * (MAX_DEF - 1)); // 2..6 peças em defesa
    const defs = new Set();
    while (defs.size < nd) defs.add(arr[Math.floor(rnd() * arr.length)]);
    return arr.map(i => ({ i, p: makePiece(side, !defs.has(i)) }));
  }

  /* ---------- IA ---------- */
  function evaluate(st) { // do ponto de vista das brancas
    const b = st.b;
    let total = 0;
    const best = [99, 99], defN = [0, 0];
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (!p) continue;
      const s = p <= 2 ? 0 : 1, atk = (p === 1 || p === 3);
      const r = (i / COLS) | 0, c = i - r * COLS;
      const tr = s === 0 ? 0 : 10;
      const d = Math.max(Math.abs(r - tr), Math.abs(c - 6)); // passos até a casa principal inimiga
      let v = atk ? 110 : 90;
      v += (9 - d) * 3;
      let friend = false;
      for (let k = 0; k < 4; k++) {
        const j = NB[i * 4 + k];
        if (j >= 0 && b[j] && ((b[j] <= 2 ? 0 : 1) === s)) { friend = true; break; }
      }
      if (atk) v += friend ? 8 : -25; else v += friend ? 2 : 0;
      if (!atk) defN[s]++;
      if (d < best[s]) best[s] = d;
      total += s === 0 ? v : -v;
    }
    for (let s = 0; s < 2; s++) {
      if (best[s] <= 3) { const bonus = (4 - best[s]) * 40; total += s === 0 ? bonus : -bonus; }
      if (defN[s] > MAX_DEF) { const pen = (defN[s] - MAX_DEF) * 70; total += s === 0 ? -pen : pen; }
    }
    return total;
  }

  function order(moves, s) {
    for (const m of moves) {
      let sc = 0;
      if (m.to === MAIN[s ^ 1] && m.t !== 'f' && m.t !== 'x') sc = 10000;
      else if (m.t === 'k') sc = 1000;
      else if (m.t === 'x') sc = 900;
      else if (m.t === 'p' || m.t === 's') sc = 300;
      else if (m.t === 'm') sc = 100 + (s === 0 ? rowOf(m.from) - rowOf(m.to) : rowOf(m.to) - rowOf(m.from)) * 10;
      m.o = sc;
    }
    moves.sort((a, b) => b.o - a.o);
  }

  function negamax(ctx, st, depth, alpha, beta, ply) {
    if ((++ctx.nodes & 1023) === 0 && Date.now() > ctx.deadline) ctx.abort = true;
    if (ctx.abort) return 0;
    const s = st.turn;
    if (depth === 0) return (s === 0 ? 1 : -1) * evaluate(st);
    const moves = generate(st, s, ctx.opts);
    if (!moves.length) return -WIN + ply;
    order(moves, s);
    let best = -Infinity;
    for (const mv of moves) {
      const log = apply(st, mv);
      const w = winner(st, s);
      const score = w ? WIN - ply : -negamax(ctx, st, depth - 1, -beta, -alpha, ply + 1);
      undo(st, log);
      if (ctx.abort) return 0;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  const LEVELS = {
    easy: { depth: 1, ms: 300, noise: 70 },
    medium: { depth: 3, ms: 800, noise: 12 },
    hard: { depth: 8, ms: 2000, noise: 0 }
  };

  // limit = { ms, depth } opcional: reduz a busca (usado nas partidas simuladas, para o celular não travar)
  function chooseMove(st, rootMoves, level, limit) {
    const cfg = Object.assign({}, LEVELS[level] || LEVELS.medium);
    if (limit) { if (limit.ms) cfg.ms = Math.min(cfg.ms, limit.ms); if (limit.depth) cfg.depth = Math.min(cfg.depth, limit.depth); }
    const s = st.turn;
    const moves = rootMoves.slice();
    order(moves, s);
    for (const m of moves) { // vitória imediata
      const log = apply(st, m);
      const w = winner(st, s);
      undo(st, log);
      if (w) return m;
    }
    const ctx = { nodes: 0, abort: false, deadline: Date.now() + cfg.ms, opts: { noSeventh: true } };
    let best = moves[0];
    for (let depth = 1; depth <= cfg.depth; depth++) {
      let alpha = -Infinity, bestScore = -Infinity, bestMv = null, done = true;
      for (const m of moves) {
        const log = apply(st, m);
        const a = cfg.noise ? -Infinity : alpha;
        let sc = -negamax(ctx, st, depth - 1, -Infinity, -a, 1);
        undo(st, log);
        if (ctx.abort) { done = false; break; }
        if (cfg.noise) sc += (Math.random() - 0.5) * cfg.noise * 2;
        if (sc > bestScore) { bestScore = sc; bestMv = m; }
        if (sc > alpha) alpha = sc;
      }
      if (!done) break;
      best = bestMv;
      moves.splice(moves.indexOf(bestMv), 1);
      moves.unshift(bestMv);
      if (Math.abs(bestScore) > WIN - 100) break;
    }
    return best;
  }

  // Limite técnico de segurança: empate, nunca vitória ou derrota por contagem de peças.
  const SIM_MAX_PLIES = 240;
  function adjudicate() { return { winner: null, reason: 'empate_limite_seguranca' }; }

  const api = {
    SIM_MAX_PLIES, adjudicate,
    COLS, ROWS, N, EMPTY, WA, WD, BA, BD, WHITE, BLACK, MAX_DEF, PIECES, MAIN,
    idx, rowOf, colOf, isDarkCell, sideOf, isAttack, makePiece, isMain, terrainOwner,
    NB, createState, generate, apply, undo, winner, hashOf, loopLoser, Game,
    territoryCells, inTerritory, presetSetup, randomSetup, evaluate, chooseMove, LEVELS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ManobraEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
