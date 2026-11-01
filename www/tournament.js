/* Manobra: campeonato (lógica pura, sem tela e sem rede).
 * - Todos contra todos (pontos corridos) e mata-mata (chaveamento, com "byes" quando não fecha 4 ou 8).
 * - Hub: o "juiz" que roda no celular do organizador. Recebe as jogadas, confere com o motor do jogo
 *   e decide sozinho quem venceu cada partida.
 */
(function (root) {
  'use strict';

  const WIN_POINTS = 3, MAX_PLAYERS = 8, MIN_PLAYERS = 2;
  const ENTRY_TIMEOUT = 120000, SETUP_TIMEOUT = 120000;
  // 60 nomes x 100 sobrenomes = 6.000 perfis fictícios. O nome parece humano,
  // mas continua sendo uma IA; o avatar é escolhido junto com o perfil.
  const BOT_FIRST = 'Ana Beatriz Bruno Camila Carlos Clara Daniel Davi Diego Eduarda Eduardo Elisa Fernanda Felipe Gabriel Gabriela Helena Henrique Igor Isabela João Joaquim Júlia Juliana Laura Larissa Leonardo Lívia Lucas Luana Manuel Manuela Marcelo Marcos Maria Mariana Mateus Melissa Miguel Murilo Natália Nicolas Otávio Patrícia Paulo Pedro Rafael Rafaela Raquel Renato Ricardo Rodrigo Sabrina Samuel Sofia Thiago Valentina Vicente Vinícius Vitória Yuri Alice Arthur Bianca Caio Cecília Enzo Gustavo'.split(' ');
  const BOT_LAST = 'Almeida Alves Amaral Andrade Araújo Assis Azevedo Barbosa Barros Batista Borges Braga Brandão Brito Bueno Cabral Campos Cardoso Carvalho Castro Coelho Correia Costa Coutinho Cruz Cunha Dias Diniz Duarte Esteves Farias Fernandes Ferreira Figueiredo Fonseca Freitas Garcia Gouveia Guimarães Guerra Leal Leite Lima Lobato Lopes Machado Macedo Maia Martins Medeiros Melo Mendes Miranda Monteiro Moraes Moreira Moura Nascimento Navarro Neves Nogueira Nunes Oliveira Paiva Pacheco Padilha Paredes Passos Peixoto Pereira Pinheiro Pires Pontes Prado Queiroz Ramos Reis Rezende Ribeiro Rocha Rodrigues Rosa Sampaio Santana Santos Saraiva Siqueira Soares Sousa Souza Tavares Teixeira Toledo Torres Valente Varela Vaz Veloso Vieira Xavier'.split(' ');
  const BOT_AVATARS = ['fox', 'bear', 'lion', 'tiger', 'wolf', 'panda', 'cat', 'dog', 'owl', 'eagle', 'shark', 'dragon', 'unicorn', 'robot', 'ninja', 'king', 'knight', 'rocket', 'fire', 'star'];
  const BOT_PROFILES = [];
  BOT_FIRST.forEach(first => BOT_LAST.forEach(last => BOT_PROFILES.push({ nick: first + ' ' + last, av: BOT_AVATARS[BOT_PROFILES.length % BOT_AVATARS.length] })));
  if (root) root.ManobraBotProfiles = BOT_PROFILES;

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
      const d = Array.isArray(m.diff) ? m.diff : (Array.isArray(m.pieces) ? [m.pieces[0] - m.pieces[1], m.pieces[1] - m.pieces[0]] : [0, 0]);
      A.diff += Number(d[0]) || 0;
      B.diff += Number(d[1]) || 0;
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
      this._usedBotProfiles = new Set();
      this._botSimulationActive = false;
      this._entryTimeout = opts.entryTimeout == null ? ENTRY_TIMEOUT : opts.entryTimeout;
      this._setupTimeout = opts.setupTimeout == null ? SETUP_TIMEOUT : opts.setupTimeout;
      this._entryTimers = {};
      this._setupTimers = {};
      this._auto = false;
    }

    _p(id) { return this.players.find(p => p.id === id) || null; }
    _m(mid) { return this.matches.find(m => m.id === mid) || null; }
    send(id, obj) { const p = this._p(id); if (p && p.connected && !p.bot) this._send(id, obj); }
    busy(id) { return this.matches.some(m => m.status === 'playing' && (m.a === id || m.b === id)); }
    isBot(id) { const p = id == null ? null : this._p(id); return !!(p && p.bot); }
    _currentRound() {
      let round = Infinity;
      this.matches.forEach(m => { if (m.status !== 'done' && m.a != null && m.b != null) round = Math.min(round, m.round); });
      return round === Infinity ? null : round;
    }
    _clearTimer(map, mid) {
      if (map[mid]) { clearTimeout(map[mid]); delete map[mid]; }
    }
    _armEntryTimer(m) {
      if (!m || m.status !== 'pending' || m.round !== this._currentRound() || this._entryTimers[m.id]) return;
      m.timer = { kind: 'entry', until: Date.now() + this._entryTimeout };
      this._entryTimers[m.id] = setTimeout(() => {
        delete this._entryTimers[m.id];
        m.timer = null;
        if (m.status !== 'pending' || m.round !== this._currentRound()) return;
        const readyA = m.ready[0] || this.isBot(m.a), readyB = m.ready[1] || this.isBot(m.b);
        const missing = readyA === readyB ? null : (readyA ? m.b : m.a);
        if (missing != null) this._forfeit(m, missing, 'não entrou na partida dentro de 2 minutos');
      }, this._entryTimeout);
      if (this._entryTimers[m.id] && this._entryTimers[m.id].unref) this._entryTimers[m.id].unref();
    }
    _armCurrentEntryTimers() {
      const round = this._currentRound();
      if (round == null) return;
      this.matches.filter(m => m.status === 'pending' && m.round === round && m.a != null && m.b != null).forEach(m => this._armEntryTimer(m));
    }
    _armSetupTimer(m) {
      this._clearTimer(this._setupTimers, m.id);
      m.timer = { kind: 'setup', until: Date.now() + this._setupTimeout };
      this._setupTimers[m.id] = setTimeout(() => {
        delete this._setupTimers[m.id];
        m.timer = null;
        const rt = this.rt[m.id];
        if (!rt || m.status !== 'playing') return;
        const missingSides = [0, 1].filter(side => !rt.setups[side]);
        if (missingSides.length) {
          missingSides.forEach(side => {
            const missing = side === 0 ? m.a : m.b;
            const partial = rt.progress[side] || [];
            const used = new Set(partial.map(o => o[0]));
            const list = partial.slice();
            for (const o of this.E.presetSetup(side, this.rnd)) {
              if (list.length >= this.E.PIECES || used.has(o.i)) continue;
              list.push([o.i, o.p]); used.add(o.i);
            }
            rt.setups[side] = list;
          });
          missingSides.forEach(side => {
            const missing = side === 0 ? m.a : m.b;
            const payload = { k: 'autoSetup', m: m.id, p: rt.setups[side], opp: rt.setups[side ^ 1] };
            this.send(missing, payload);
            this.send(missing, { k: 'relay', m: m.id, d: JSON.stringify(payload) });
          });
          this._startGameFromSetups(m, rt);
        }
      }, this._setupTimeout);
      if (this._setupTimers[m.id] && this._setupTimers[m.id].unref) this._setupTimers[m.id].unref();
    }
    _forfeitDisconnected() {
      if (this._forfeiting) return;
      const round = this._currentRound();
      if (round == null) return;
      this._forfeiting = true;
      try {
        let changed = true;
        while (changed) {
          changed = false;
          this.matches.filter(m => m.status === 'pending' && m.round === round && m.a != null && m.b != null).some(m => {
            const a = this._p(m.a), b = this._p(m.b);
            if (!a || !b || a.connected === b.connected) return false;
            this._finish(m, a.connected ? m.a : m.b, 'W.O.: jogador ausente', [0, 0]);
            changed = true;
            return true;
          });
        }
      } finally { this._forfeiting = false; }
    }

    snapshot() {
      return {
        status: this.status, format: this.format, rounds: this.rounds, champion: this.champion, botLevel: this.botLevel,
        players: this.players.map(p => ({ id: p.id, nick: p.nick, av: p.av || '', bot: !!p.bot, connected: p.connected, busy: this.busy(p.id) })),
        matches: this.matches.map(m => ({
          id: m.id, round: m.round, a: m.a, b: m.b, status: m.status, winner: m.winner,
          reason: m.reason, diff: m.diff.slice(), pieces: m.pieces ? m.pieces.slice() : null,
          sim: m.sim ? { moves: m.sim.moves, turn: m.sim.turn, pieces: m.sim.pieces.slice() } : null,
          timer: m.timer ? { kind: m.timer.kind, until: m.timer.until } : null,
          setupReady: this.rt[m.id] ? this.rt[m.id].setups.map(x => !!x) : null,
          ready: m.ready.slice()
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
      const available = [];
      for (let i = 0; i < BOT_PROFILES.length; i++) if (!this._usedBotProfiles.has(i)) available.push(i);
      const pi = available[Math.floor(this.rnd() * available.length) % available.length];
      this._usedBotProfiles.add(pi);
      const profile = BOT_PROFILES[pi];
      this.players.push({ id: this._next++, pid: 'bot-' + n, nick: profile.nick, av: profile.av, connected: true, bot: true });
      return true;
    }
    _removeBot(id) {
      const p = this._p(id);
      if (this.status !== 'lobby' || !p || !p.bot) return false;
      this.players = this.players.filter(x => x.id !== id);
      return true;
    }
    leave(id, reason) {
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
        if (live) this._forfeit(live, id, reason || 'saiu da partida');
        this._forfeitDisconnected();
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
        case 'skip': if (org) this.skipSimulation(msg.m); break;
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
        id: m.id, round: m.round, a: m.a, b: m.b, status: 'pending', winner: null, reason: null, diff: [0, 0], pieces: null, sim: null, timer: null, ready: [false, false]
      }));
      this.status = 'running';
      this.matches.filter(m => m.round === 1 && (m.a == null || m.b == null) && this.format === 'knockout').forEach(m => {
        this._finish(m, m.a != null ? m.a : m.b, 'bye', [0, 0], true);
      });
      this._forfeitDisconnected();
      this._armCurrentEntryTimers();
      this._autoBots();
      this._checkFinished();
      this.broadcast();
      return true;
    }

    /* --- iniciar partidas --- */
    ready(id, mid) {
      const m = this._m(mid), p = this._p(id);
      if (!m || !p || this.status !== 'running' || m.status !== 'pending' || m.a == null || m.b == null) return false;
      if (m.round !== this._currentRound()) return false;
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
      this._clearTimer(this._entryTimers, m.id);
      m.timer = null;
      m.status = 'playing';
      m.ready = [false, false];
      const rt = { setups: [null, null], progress: [[], []], game: null, botSide: null, pending: false };
      this.rt[m.id] = rt;
      this.send(m.a, { k: 'start', m: m.id, side: 0, opp: this._p(m.b).nick, oppAv: this._p(m.b).av || '' });
      this.send(m.b, { k: 'start', m: m.id, side: 1, opp: this._p(m.a).nick, oppAv: this._p(m.a).av || '' });
      this.broadcast();
      if (this.isBot(m.a) || this.isBot(m.b)) {
        const bs = this.isBot(m.a) ? 0 : 1, human = bs === 0 ? m.b : m.a;
        rt.botSide = bs;
        const list = this.E.presetSetup(bs, this.rnd).map(o => [o.i, o.p]);
        rt.setups[bs] = list;
        rt.progress[bs] = list.slice();
        const talk = d => this.send(human, { k: 'relay', m: m.id, d: JSON.stringify(d) });
        const bot = this._p(bs === 0 ? m.a : m.b);
        setTimeout(() => { if (this.rt[m.id] === rt) { talk({ k: 'hello', v: 1, nick: bot.nick, av: bot.av }); talk({ k: 'setup', p: list }); } }, Math.min(this.botDelay, 400));
      }
      this._armSetupTimer(m);
      this.broadcast();
    }
    _startGameFromSetups(m, rt) {
      if (!rt || rt.game || !rt.setups[0] || !rt.setups[1]) return;
      this._clearTimer(this._setupTimers, m.id);
      m.timer = null;
      const E = this.E, pieces = new Int8Array(E.N);
      rt.setups.forEach(list => list.forEach(it => { pieces[it[0]] = it[1]; }));
      rt.game = new E.Game(pieces);
      this._botMaybeMove(m);
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
        this._finish(m, g.over.winner === 0 ? m.a : m.b, g.over.reason, [dA, -dA], false, c);
      } else this._botMaybeMove(m);
    }
    // Partidas entre dois robôs: jogadas pelo motor, uma por vez, para que o
    // organizador consiga acompanhar e pular apenas a simulação atual.
    _autoBots() {
      if (this._auto || this._botSimulationActive) return;
      this._auto = true;
      try {
        const m = this.matches.find(x => x.status === 'pending' && x.a != null && x.b != null && this.isBot(x.a) && this.isBot(x.b));
        if (m) this._startBotSimulation(m);
      } finally { this._auto = false; }
    }

    _simSnapshot(m, g, moves) {
      const c = [0, 0];
      for (let i = 0; i < this.E.N; i++) { const p = g.st.b[i]; if (p) c[this.E.sideOf(p)]++; }
      m.sim = { moves: moves, turn: g.st.turn, pieces: c };
    }

    _startBotSimulation(m) {
      this._botSimulationActive = true;
      m.status = 'playing';
      m.ready = [false, false];
      const pieces = new Int8Array(this.E.N);
      [0, 1].forEach(side => this.E.presetSetup(side, this.rnd).forEach(o => { pieces[o.i] = o.p; }));
      const g = new this.E.Game(pieces);
      const rt = { setups: [true, true], game: g, botSide: null, pending: false, sim: true };
      this.rt[m.id] = rt;
      this._simSnapshot(m, g, 0);
      this.broadcast();
      const step = () => {
        if (this.rt[m.id] !== rt || m.status !== 'playing' || g.over) return;
        const legal = g.cur.moves;
        const mv = this.E.chooseMove(g.st, legal, this.botLevel);
        if (!mv) { this._finish(m, g.st.turn === 0 ? m.b : m.a, 'sem jogadas', [0, 0]); return; }
        g.play(mv);
        const moves = (m.sim ? m.sim.moves : 0) + 1;
        this._simSnapshot(m, g, moves);
        if (g.over) {
          const c = m.sim.pieces, dA = c[0] - c[1];
          this._finish(m, g.over.winner === 0 ? m.a : m.b, g.over.reason, [dA, -dA], false, c);
          return;
        }
        // A simulação é invisível: não transmite o tabuleiro nem cada lance.
        // O temporizador curto mantém o celular livre para partidas humanas.
        setTimeout(step, 5);
      };
      setTimeout(step, 5);
    }

    // O organizador pode terminar a simulação imediatamente, sem alterar o resultado.
    skipSimulation(mid) {
      const m = this._m(mid), rt = m && this.rt[mid];
      if (!m || !rt || !rt.sim || m.status !== 'playing') return false;
      let guard = 0;
      // Processa em blocos para não congelar a tela. Se ainda não terminou,
      // agenda o bloco seguinte; nunca corta nem sorteia o resultado.
      while (this.rt[mid] === rt && m.status === 'playing' && !rt.game.over && guard++ < 500) {
        const g = rt.game, mv = this.E.chooseMove(g.st, g.cur.moves, this.botLevel);
        if (!mv) {
          this._finish(m, g.st.turn === 0 ? m.b : m.a, 'sem jogadas', [0, 0]);
          return true;
        }
        g.play(mv);
        this._simSnapshot(m, g, (m.sim ? m.sim.moves : 0) + 1);
      }
      if (m.status === 'playing' && rt.game.over) {
        const c = m.sim.pieces, dA = c[0] - c[1];
        this._finish(m, rt.game.over.winner === 0 ? m.a : m.b, rt.game.over.reason, [dA, -dA], false, c);
      } else if (m.status === 'playing' && this.rt[mid] === rt) {
        setTimeout(() => this.skipSimulation(mid), 0);
      }
      return true;
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
      return def <= this.E.MAX_DEF;
    }
    _validPartial(list, side) {
      if (!Array.isArray(list) || list.length > this.E.PIECES) return false;
      const seen = new Set(), terr = new Set(this.E.territoryCells(side)); let def = 0;
      for (const it of list) {
        if (!Array.isArray(it) || it.length !== 2 || !Number.isInteger(it[0]) || seen.has(it[0]) || !terr.has(it[0])) return false;
        if (!(it[1] === 1 || it[1] === 2 || it[1] === 3 || it[1] === 4) || this.E.sideOf(it[1]) !== side) return false;
        if (!this.E.isAttack(it[1])) def++;
        seen.add(it[0]);
      }
      return def <= this.E.MAX_DEF;
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
        rt.progress[side] = o.p.slice();
        forward();
        this.broadcast();
        if (rt.setups[0] && rt.setups[1]) {
          this._startGameFromSetups(m, rt);
        }
        return;
      }
      if (o.k === 'setupProgress') {
        if (this._validPartial(o.p, side)) rt.progress[side] = o.p.slice();
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
      if (m.status !== 'pending' && m.status !== 'playing') return;
      this._finish(m, m.a === loserId ? m.b : m.a, 'W.O.: ' + reason, [0, 0]);
    }

    /* --- resultados --- */
    _finish(m, winnerId, reason, diff, silent, pieces) {
      const wasSimulation = !!(this.rt[m.id] && this.rt[m.id].sim);
      this._clearTimer(this._entryTimers, m.id);
      this._clearTimer(this._setupTimers, m.id);
      m.timer = null;
      m.status = 'done'; m.winner = winnerId; m.reason = reason; m.diff = diff; m.pieces = pieces ? pieces.slice() : null; m.sim = null; m.ready = [false, false];
      delete this.rt[m.id];
      if (wasSimulation) this._botSimulationActive = false;
      if (!silent) [m.a, m.b].forEach(id => { if (id != null) this.send(id, { k: 'matchEnd', m: m.id, winner: winnerId, reason: reason }); });
      this._advance(m);
      this._forfeitDisconnected();
      this._autoBots();
      this._armCurrentEntryTimers();
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
  }

  const api = {
    WIN_POINTS, MAX_PLAYERS, MIN_PLAYERS,
    leagueFixtures, knockoutFixtures, seedOrder, roundLabel, standings, nickOf, shuffle, Hub
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ManobraTournament = api;
})(typeof window !== 'undefined' ? window : globalThis);
