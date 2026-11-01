/* Manobra: campeonato (lógica pura, sem tela e sem rede).
 * - Todos contra todos (pontos corridos) e mata-mata (chaveamento, com "byes" quando não fecha 4 ou 8).
 * - Hub: o "juiz" que roda no celular do organizador. Recebe as jogadas, confere com o motor do jogo
 *   e decide sozinho quem venceu cada partida.
 */
(function (root) {
  'use strict';

  const WIN_POINTS = 3, MAX_PLAYERS = 8, MIN_PLAYERS = 2;
  const BOT_PROFILES = [
    { nick: 'Rafael', av: 'eagle' }, { nick: 'Camila', av: 'owl' },
    { nick: 'Bruno', av: 'bear' }, { nick: 'Juliana', av: 'cat' },
    { nick: 'Diego', av: 'wolf' }, { nick: 'Larissa', av: 'fox' },
    { nick: 'Mateus', av: 'panda' }, { nick: 'Beatriz', av: 'tiger' }
  ];

  const cleanAv = s => String(s == null ? '' : s).replace(/[^a-z0-9]/gi, '').slice(0, 12);
  const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);

  function shuffle(arr, rnd) {
    const a = arr.slice();
    const r = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- Chaves ---------- */
  // Todos contra todos pelo método do círculo: cada par joga uma vez, ninguém joga duas vezes na mesma rodada.
  function leagueFixtures(ids) {
    const arr = ids.slice();
    if (arr.length % 2) arr.push(null);
    const n = arr.length, out = [];
    let cur = arr.slice();
    for (let r = 0; r < n - 1; r++) {
      let k = 0;
      for (let i = 0; i < n / 2; i++) {
        let a = cur[i], b = cur[n - 1 - i];
        if (a == null || b == null) continue;
        if (r % 2 === 1 && i === 0) { const t = a; a = b; b = t; } // alterna quem joga de Brancas
        out.push({ id: 'L' + (r + 1) + '-' + (++k), round: r + 1, a: a, b: b });
      }
      cur = [cur[0], cur[n - 1]].concat(cur.slice(1, n - 1));
    }
    return out;
  }

  function seedOrder(size) {
    if (size === 2) return [1, 2];
    const prev = seedOrder(size / 2), out = [];
    prev.forEach(s => { out.push(s); out.push(size + 1 - s); });
    return out;
  }

  // ids em ordem de sorteio (cabeça de chave 1, 2, ...). Quem não tem adversário na 1ª rodada passa direto (bye).
  function knockoutFixtures(ids) {
    let size = 2;
    while (size < ids.length) size *= 2;
    const order = seedOrder(size);
    const slots = order.map(s => (s <= ids.length ? ids[s - 1] : null));
    const rounds = Math.round(Math.log(size) / Math.log(2));
    const matches = [];
    for (let i = 0; i < size / 2; i++) matches.push({ id: 'K1-' + (i + 1), round: 1, a: slots[2 * i], b: slots[2 * i + 1] });
    for (let r = 2; r <= rounds; r++) {
      for (let i = 0; i < size / Math.pow(2, r); i++) matches.push({ id: 'K' + r + '-' + (i + 1), round: r, a: null, b: null });
    }
    return { matches: matches, rounds: rounds, size: size };
  }

  function roundLabel(format, rounds, round) {
    if (format !== 'knockout') return 'Rodada ' + round;
    const left = rounds - round;
    return left === 0 ? 'Final' : left === 1 ? 'Semifinal' : left === 2 ? 'Quartas de final' : 'Rodada ' + round;
  }

  /* ---------- Classificação (todos contra todos) ---------- */
  function standings(snap) {
    const rows = {};
    snap.players.forEach(p => { rows[p.id] = { id: p.id, nick: p.nick, played: 0, wins: 0, losses: 0, points: 0, diff: 0 }; });
    const real = snap.matches.filter(m => m.status === 'done' && m.a != null && m.b != null && m.reason !== 'bye');
    real.forEach(m => {
      const A = rows[m.a], B = rows[m.b];
      if (!A || !B) return;
      A.played++; B.played++;
      if (m.winner === m.a) { A.wins++; B.losses++; A.points += WIN_POINTS; } else { B.wins++; A.losses++; B.points += WIN_POINTS; }
      A.diff += (m.diff && m.diff[0]) || 0;
      B.diff += (m.diff && m.diff[1]) || 0;
    });
    const list = Object.keys(rows).map(k => rows[k]);
    const order = {};
    snap.players.forEach((p, i) => { order[p.id] = i; });
    // empate em pontos: 1) confronto direto entre os empatados, 2) saldo de peças, 3) vitórias, 4) ordem de entrada
    const byPoints = {};
    list.forEach(r => { (byPoints[r.points] = byPoints[r.points] || []).push(r); });
    const result = [];
    Object.keys(byPoints).map(Number).sort((x, y) => y - x).forEach(pts => {
      const group = byPoints[pts];
      if (group.length > 1) {
        const ids = group.map(r => r.id);
        group.forEach(r => {
          r.h2h = real.filter(m => m.winner === r.id && ids.indexOf(m.a) >= 0 && ids.indexOf(m.b) >= 0).length * WIN_POINTS;
        });
        group.sort((x, y) => (y.h2h - x.h2h) || (y.diff - x.diff) || (y.wins - x.wins) || (order[x.id] - order[y.id]));
      }
      group.forEach(r => result.push(r));
    });
    result.forEach((r, i) => { r.pos = i + 1; });
    return result;
  }

  const nickOf = (snap, id) => { const p = snap.players.find(x => x.id === id); return p ? p.nick : '?'; };

  /* ---------- Hub (o juiz) ---------- */
  class Hub {
    // opts: { engine, send(playerId, obj), rnd }
    constructor(opts) {
      this.E = opts.engine;
      this._send = opts.send || function () {};
      this.rnd = opts.rnd || Math.random;
      this.status = 'lobby'; // lobby | running | finished
      this.format = 'league';
      this.players = [];
      this.matches = [];
      this.rounds = 0;
      this.champion = null;
      this.rt = {};
      this._next = 0;
      this.botLevel = 'medium';
      this.botDelay = opts.botDelay == null ? 900 : opts.botDelay; // "pensando" do robô (ms)
      this._botN = 0;
      this._auto = false;
    }

    _p(id) { return this.players.find(p => p.id === id) || null; }
    _m(mid) { return this.matches.find(m => m.id === mid) || null; }
    send(id, obj) { const p = this._p(id); if (p && p.connected && !p.bot) this._send(id, obj); }
    busy(id) { return this.matches.some(m => m.status === 'playing' && (m.a === id || m.b === id)); }
    isBot(id) { const p = id == null ? null : this._p(id); return !!(p && p.bot); }

    snapshot() {
      return {
        status: this.status, format: this.format, rounds: this.rounds, champion: this.champion, botLevel: this.botLevel,
        players: this.players.map(p => ({ id: p.id, nick: p.nick, av: p.av || '', bot: !!p.bot, connected: p.connected, busy: this.busy(p.id) })),
        matches: this.matches.map(m => ({
          id: m.id, round: m.round, a: m.a, b: m.b, status: m.status, winner: m.winner,
          reason: m.reason, diff: m.diff.slice(), ready: m.ready.slice()
        }))
      };
    }
    broadcast() {
      const s = this.snapshot();
      this.players.forEach(p => { if (p.connected && !p.bot) this._send(p.id, { k: 'state', s: s }); });
    }

    /* --- entrada e saída --- */
    join(pid, nick, avatar) {
      const av = cleanAv(avatar);
      const old = this.players.find(p => p.pid === pid);
      if (old) { old.connected = true; if (av) old.av = av; this.broadcast(); return { ok: true, id: old.id }; }
      if (this.status !== 'lobby') return { ok: false, why: 'O campeonato já começou.' };
      if (this.players.length >= MAX_PLAYERS) return { ok: false, why: 'O campeonato está cheio (máximo ' + MAX_PLAYERS + ' jogadores).' };
      let name = clean(nick) || 'Jogador';
      const base = name;
      for (let n = 2; this.players.some(p => p.nick.toLowerCase() === name.toLowerCase()); n++) name = base.slice(0, 13) + ' ' + n;
      const p = { id: this._next++, pid: String(pid), nick: name, av: av, connected: true };
      this.players.push(p);
      this.broadcast();
      return { ok: true, id: p.id };
    }
    _addBot() {
      if (this.status !== 'lobby' || this.players.length >= MAX_PLAYERS) return false;
      const n = ++this._botN;
      const profile = BOT_PROFILES[(n - 1) % BOT_PROFILES.length];
      this.players.push({ id: this._next++, pid: 'bot-' + n, nick: profile.nick, av: profile.av, connected: true, bot: true });
      return true;
    }
    _removeBot(id) {
      const p = this._p(id);
      if (this.status !== 'lobby' || !p || !p.bot) return false;
      this.players = this.players.filter(x => x.id !== id);
      return true;
    }
    leave(id) {
      const p = this._p(id);
      if (!p || p.bot) return;
      if (this.status === 'lobby') {
        if (id === 0) return;
        this.players = this.players.filter(x => x.id !== id);
      } else {
        p.connected = false;
        this.matches.forEach(m => {
          if (m.status === 'pending') { const i = m.a === id ? 0 : m.b === id ? 1 : -1; if (i >= 0) m.ready[i] = false; }
        });
        const live = this.matches.find(m => m.status === 'playing' && (m.a === id || m.b === id));
        if (live) this._forfeit(live, id, 'saiu da partida');
      }
      this.broadcast();
    }

    handle(id, msg) {
      if (!msg || typeof msg !== 'object' || !this._p(id)) return;
      const org = id === 0;
      switch (msg.k) {
        case 'ready': this.ready(id, msg.m); break;
        case 'unready': this.unready(id); break;
        case 'relay': this.relay(id, msg.m, msg.d); break;
        case 'format': if (org) this.setFormat(msg.v); break;
        case 'start': if (org) this.start(); break;
        case 'addbot': if (org && this._addBot()) this.broadcast(); break;
        case 'rmbot': if (org && this._removeBot(msg.id)) this.broadcast(); break;
        case 'botlevel': if (org && this.status === 'lobby' && this.E.LEVELS[msg.v]) { this.botLevel = msg.v; this.broadcast(); } break;
        case 'award': if (org) this.award(msg.m, msg.w); break;
        case 'reset': if (org) this.reset(msg.m); break;
      }
    }

    /* --- organização --- */
    setFormat(v) {
      if (this.status !== 'lobby' || (v !== 'league' && v !== 'knockout')) return false;
      this.format = v;
      this.broadcast();
      return true;
    }
    start() {
      if (this.status !== 'lobby') return false;
      while (this.players.length < MIN_PLAYERS) this._addBot(); // sozinho: entra um robô para ter adversário
      let ids = this.players.map(p => p.id);
      let fx;
      if (this.format === 'knockout') {
        ids = shuffle(ids, this.rnd); // sorteio das chaves
        fx = knockoutFixtures(ids);
        this.rounds = fx.rounds;
      } else {
        fx = { matches: leagueFixtures(ids) };
        this.rounds = fx.matches.reduce((mx, m) => Math.max(mx, m.round), 0);
      }
      this.matches = fx.matches.map(m => ({
        id: m.id, round: m.round, a: m.a, b: m.b, status: 'pending', winner: null, reason: null, diff: [0, 0], ready: [false, false]
      }));
      this.status = 'running';
      this.matches.filter(m => m.round === 1 && (m.a == null || m.b == null) && this.format === 'knockout').forEach(m => {
        this._finish(m, m.a != null ? m.a : m.b, 'bye', [0, 0], true);
      });
      this._autoBots();
      this._checkFinished();
      this.broadcast();
      return true;
    }

    /* --- iniciar partidas --- */
    ready(id, mid) {
      const m = this._m(mid), p = this._p(id);
      if (!m || !p || this.status !== 'running' || m.status !== 'pending' || m.a == null || m.b == null) return false;
      const i = m.a === id ? 0 : m.b === id ? 1 : -1;
      if (i < 0 || this.busy(id)) return false;
      this.matches.forEach(x => { // só dá para estar "pronto" em uma partida por vez
        if (x !== m && x.status === 'pending') { const j = x.a === id ? 0 : x.b === id ? 1 : -1; if (j >= 0) x.ready[j] = false; }
      });
      m.ready[i] = true;
      const oi = 1 - i;
      if (this.isBot(i === 0 ? m.b : m.a)) m.ready[oi] = true; // o robô está sempre pronto
      if (m.ready[0] && m.ready[1] && this._p(m.a).connected && this._p(m.b).connected) this._startMatch(m);
      else this.broadcast();
      return true;
    }
    unready(id) {
      this.matches.forEach(m => {
        if (m.status === 'pending') { const i = m.a === id ? 0 : m.b === id ? 1 : -1; if (i >= 0) m.ready[i] = false; }
      });
      this.broadcast();
    }
    _startMatch(m) {
      m.status = 'playing';
      m.ready = [false, false];
      const rt = { setups: [null, null], game: null, botSide: null, pending: false };
      this.rt[m.id] = rt;
      this.send(m.a, { k: 'start', m: m.id, side: 0, opp: this._p(m.b).nick, oppAv: this._p(m.b).av || '' });
      this.send(m.b, { k: 'start', m: m.id, side: 1, opp: this._p(m.a).nick, oppAv: this._p(m.a).av || '' });
      this.broadcast();
      if (this.isBot(m.a) || this.isBot(m.b)) {
        const bs = this.isBot(m.a) ? 0 : 1, human = bs === 0 ? m.b : m.a;
        rt.botSide = bs;
        const list = this.E.presetSetup(bs, this.rnd).map(o => [o.i, o.p]);
        rt.setups[bs] = list;
        const talk = d => this.send(human, { k: 'relay', m: m.id, d: JSON.stringify(d) });
        const bot = this._p(bs === 0 ? m.a : m.b);
        setTimeout(() => { if (this.rt[m.id] === rt) { talk({ k: 'hello', v: 1, nick: bot.nick, av: bot.av }); talk({ k: 'setup', p: list }); } }, Math.min(this.botDelay, 400));
      }
    }
    // Vez do robô: pensa um pouco e joga
    _botMaybeMove(m) {
      const rt = this.rt[m.id];
      if (!rt || rt.botSide == null || !rt.game || rt.pending) return;
      const g = rt.game;
      if (g.over || g.st.turn !== rt.botSide) return;
      rt.pending = true;
      setTimeout(() => {
        rt.pending = false;
        if (this.rt[m.id] !== rt || m.status !== 'playing' || g.over || g.st.turn !== rt.botSide) return;
        const mv = this.E.chooseMove(g.st, g.cur.moves, this.botLevel);
        const human = rt.botSide === 0 ? m.b : m.a;
        this.send(human, { k: 'relay', m: m.id, d: JSON.stringify({ k: 'move', m: { t: mv.t, from: mv.from, to: mv.to, beyond: mv.beyond | 0 } }) });
        g.play(mv);
        this._afterPlay(m, g);
      }, this.botDelay);
    }
    _afterPlay(m, g) {
      if (g.over) {
        const E = this.E, c = [0, 0];
        for (let i = 0; i < E.N; i++) { const p = g.st.b[i]; if (p) c[E.sideOf(p)]++; }
        const dA = c[0] - c[1];
        this._finish(m, g.over.winner === 0 ? m.a : m.b, g.over.reason, [dA, -dA]);
      } else this._botMaybeMove(m);
    }
    // Partidas entre dois robôs: resolvidas por sorteio
    _autoBots() {
      if (this._auto) return;
      this._auto = true;
      try {
        let again = true;
        while (again) {
          again = false;
          const m = this.matches.find(x => x.status === 'pending' && x.a != null && x.b != null && this.isBot(x.a) && this.isBot(x.b));
          if (m) { again = true; this._finish(m, this.rnd() < 0.5 ? m.a : m.b, 'sorteio entre robôs', [0, 0], true); }
        }
      } finally { this._auto = false; }
    }

    /* --- o juiz: confere cada mensagem da partida --- */
    _validSetup(list, side) {
      const E = this.E;
      if (!Array.isArray(list) || list.length !== E.PIECES) return false;
      const terr = new Set(E.territoryCells(side));
      const seen = new Set();
      let def = 0;
      for (let k = 0; k < list.length; k++) {
        const it = list[k];
        if (!Array.isArray(it) || it.length !== 2) return false;
        const i = it[0], p = it[1];
        if (!Number.isInteger(i) || !terr.has(i) || seen.has(i)) return false;
        if (!(p === 1 || p === 2 || p === 3 || p === 4) || E.sideOf(p) !== side) return false;
        if (!E.isAttack(p)) def++;
        seen.add(i);
      }
      return def <= E.MAX_DEF;
    }
    relay(id, mid, d) {
      const m = this._m(mid);
      if (!m || m.status !== 'playing' || typeof d !== 'string') return;
      const side = m.a === id ? 0 : m.b === id ? 1 : -1;
      if (side < 0) return;
      const rt = this.rt[mid];
      if (!rt) return;
      const opp = side === 0 ? m.b : m.a;
      let o;
      try { o = JSON.parse(d); } catch (e) { return; }
      if (!o || typeof o !== 'object') return;
      const forward = () => this.send(opp, { k: 'relay', m: mid, d: d });
      if (o.k === 'hello') { forward(); return; }
      if (o.k === 'bye') { this._forfeit(m, id, 'saiu da partida'); return; }
      if (o.k === 'setup') {
        if (!this._validSetup(o.p, side)) { this._forfeit(m, id, 'montagem inválida'); return; }
        if (rt.setups[side]) return;
        rt.setups[side] = o.p;
        forward();
        if (rt.setups[0] && rt.setups[1]) {
          const E = this.E, pieces = new Int8Array(E.N);
          rt.setups.forEach(list => list.forEach(it => { pieces[it[0]] = it[1]; }));
          rt.game = new E.Game(pieces);
          this._botMaybeMove(m);
        }
        return;
      }
      if (o.k === 'move') {
        const g = rt.game;
        if (!g || g.over || g.st.turn !== side || !o.m) { this._forfeit(m, id, 'jogada fora de hora'); return; }
        const q = o.m;
        const mv = g.cur.moves.find(x => x.t === q.t && x.from === q.from && x.to === q.to && (x.beyond | 0) === (q.beyond | 0));
        if (!mv) { this._forfeit(m, id, 'jogada inválida'); return; }
        forward();
        g.play(mv);
        this._afterPlay(m, g);
      }
    }
    _forfeit(m, loserId, reason) {
      if (m.status !== 'playing') return;
      this._finish(m, m.a === loserId ? m.b : m.a, 'W.O.: ' + reason, [0, 0]);
    }

    /* --- resultados --- */
    _finish(m, winnerId, reason, diff, silent) {
      m.status = 'done'; m.winner = winnerId; m.reason = reason; m.diff = diff; m.ready = [false, false];
      delete this.rt[m.id];
      if (!silent) [m.a, m.b].forEach(id => { if (id != null) this.send(id, { k: 'matchEnd', m: m.id, winner: winnerId, reason: reason }); });
      this._advance(m);
      this._autoBots();
      if (!silent) { this._checkFinished(); this.broadcast(); }
    }
    _parent(m) {
      if (this.format !== 'knockout' || m.round >= this.rounds) return null;
      const num = parseInt(m.id.split('-')[1], 10);
      const parent = this._m('K' + (m.round + 1) + '-' + Math.ceil(num / 2));
      return parent ? { parent: parent, slot: num % 2 === 1 ? 'a' : 'b' } : null;
    }
    _advance(m) {
      const pr = this._parent(m);
      if (pr) pr.parent[pr.slot] = m.winner;
    }
    _checkFinished() {
      if (this.status !== 'running') return;
      if (this.format === 'league') {
        if (this.matches.every(m => m.status === 'done')) {
          this.status = 'finished';
          this.champion = standings(this.snapshot())[0].id;
        }
      } else {
        const last = this._m('K' + this.rounds + '-1');
        if (last && last.status === 'done') { this.status = 'finished'; this.champion = last.winner; }
      }
    }
    // O organizador dá a vitória (partida travada, jogador sumiu...)
    award(mid, winnerId) {
      const m = this._m(mid);
      if (!m || this.status !== 'running' || m.status === 'done' || m.a == null || m.b == null) return false;
      if (winnerId !== m.a && winnerId !== m.b) return false;
      this._finish(m, winnerId, 'decidido pelo organizador', [0, 0]);
      return true;
    }
    // O organizador manda refazer uma partida já encerrada (ex.: queda de internet)
    reset(mid) {
      const m = this._m(mid);
      if (!m || m.status !== 'done' || m.reason === 'bye' || (this.isBot(m.a) && this.isBot(m.b)) || (this.status !== 'running' && this.status !== 'finished')) return false;
      const pr = this._parent(m);
      if (pr) {
        const p = pr.parent;
        if (p.status !== 'pending' || p.ready[0] || p.ready[1]) return false; // a próxima fase já começou
        p[pr.slot] = null;
      }
      m.status = 'pending'; m.winner = null; m.reason = null; m.diff = [0, 0]; m.ready = [false, false];
      this.status = 'running'; this.champion = null;
      this.broadcast();
      return true;
    }
  }

  const api = {
    WIN_POINTS, MAX_PLAYERS, MIN_PLAYERS,
    leagueFixtures, knockoutFixtures, seedOrder, roundLabel, standings, nickOf, shuffle, Hub
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ManobraTournament = api;
})(typeof window !== 'undefined' ? window : globalThis);
