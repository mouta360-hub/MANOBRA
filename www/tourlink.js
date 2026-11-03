/* Manobra: ligação de rede do campeonato (PeerJS).
 * O organizador cria uma sala "manobra-t-CÓDIGO" e roda o Hub (o juiz). Os outros jogadores entram
 * pelo código e falam só com o organizador; as jogadas das partidas passam por ele, que confere tudo.
 * O organizador também joga: as mensagens dele não passam pela rede, vão direto ao Hub.
 */
(function (root) {
  'use strict';

  const TPREFIX = 'manobra-t-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const handlers = {};
  let role = null;      // 'host' | 'guest' | null
  let hub = null;       // só no organizador
  let hostPeer = null;
  let conns = {};       // id do jogador -> conexão (só no organizador)
  let client = null;    // { peer, conn } (só no convidado)
  let closing = false;
  let simWorker = null;
  let localOnly = false; // campeonato offline: só robôs, sem PeerJS
  let lastState = null;
  let promoting = false;
  let tournamentCode = '';
  let lossTimer = null;
  let localId = null;

  // O estado completo (para o reserva assumir) é calculado uma vez por transmissão, não uma por jogador
  function withState(h, obj, cache) {
    if (obj.k !== 'state') return obj;
    if (cache.s !== obj.s) { cache.s = obj.s; cache.x = h.exportState ? h.exportState({ public: true }) : null; }
    return Object.assign({}, obj, { x: cache.x, epoch: h.epoch || 1 });
  }

  function emit(ev, data) {
    (handlers[ev] || []).slice().forEach(function (f) { try { f(data); } catch (e) { /* ok */ } });
  }
  const later = fn => setTimeout(fn, 0);
  const cleanCode = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');

  function genCode() {
    let out = '';
    for (let i = 0; i < 4; i++) {
      let r;
      if (root.crypto && root.crypto.getRandomValues) r = root.crypto.getRandomValues(new Uint32Array(1))[0];
      else r = Math.floor(Math.random() * 4294967296);
      out += ALPHABET[r % ALPHABET.length];
    }
    return out;
  }

  // Worker que joga as partidas robô x robô sem travar a tela. Sem Worker (ou se falhar): null / plano B.
  function makeSimWorker() {
    if (!root.Worker || root.__manobraNoWorker) return null;
    let w;
    try { w = new root.Worker('engine-worker.js'); } catch (e) { return null; }
    const jobs = {};
    let broken = false;
    const failAll = function () {
      broken = true;
      Object.keys(jobs).forEach(function (id) { const j = jobs[id]; delete jobs[id]; try { j.fail(); } catch (e) { /* ok */ } });
    };
    w.onmessage = function (ev) {
      const d = ev.data || {}, j = jobs[d.id];
      if (!j) return;
      if (d.k === 'p') j.progress(d);
      else if (d.k === 'done') { delete jobs[d.id]; j.done(d); }
    };
    w.onerror = failAll;
    return {
      run: function (job, progress, done, fail) {
        if (broken) { fail(); return; }
        jobs[job.id] = { progress: progress, done: done, fail: fail };
        try { w.postMessage(Object.assign({ k: 'sim' }, job)); } catch (e) { delete jobs[job.id]; fail(); }
      },
      stop: function (id) { delete jobs[id]; try { w.postMessage({ k: 'stop', id: id }); } catch (e) { /* ok */ } },
      terminate: function () { broken = true; try { w.terminate(); } catch (e) { /* ok */ } }
    };
  }

  function loadLib() {
    if (root.Peer) return Promise.resolve();
    if (root.ManobraOnline && root.ManobraOnline.loadLib) return root.ManobraOnline.loadLib();
    return Promise.reject(new Error('Não foi possível carregar o módulo online.'));
  }

  function reset() {
    closing = true;
    const hp = hostPeer, cl = client, cs = conns;
    role = null; hub = null; hostPeer = null; client = null; conns = {}; localOnly = false; lastState = null; promoting = false; handledEpoch = null; tournamentCode = ''; localId = null; if (lossTimer) { clearTimeout(lossTimer); lossTimer = null; }
    if (simWorker) { simWorker.terminate(); simWorker = null; }
    Object.keys(cs).forEach(function (k) { try { cs[k].close(); } catch (e) { /* ok */ } });
    try { if (hp) hp.destroy(); } catch (e) { /* ok */ }
    if (cl) {
      try { if (cl.conn) cl.conn.close(); } catch (e) { /* ok */ }
      try { if (cl.peer) cl.peer.destroy(); } catch (e) { /* ok */ }
    }
  }

  function installPeerForGuest(p) {
    if (!p || p.__manobraGuestHook) return;
    p.__manobraGuestHook = true;
    p.on('connection', function (c) {
      if (role === 'host' && hub) { onGuest(hub, c); return; }
      c.on('data', function (raw) {
        let o; try { o = JSON.parse(raw); } catch (e) { return; }
        if (!o || typeof o !== 'object') return;
        if (o.k === 'state') { lastState = o; client = { peer: p, conn: c, pid: client && client.pid, nick: client && client.nick, av: client && client.av }; emit('msg', o); }
        else if (o.k === 'joined') { client = { peer: p, conn: c, pid: client && client.pid, nick: client && client.nick, av: client && client.av }; }
        else if (o.k !== 'rejected') emit('msg', o); // início de partida, jogadas, fim de partida, chat... do novo juiz
      });
      c.on('close', function () { authorityLost(c); });
      c.on('error', function () { authorityLost(c); });
    });
  }

  // O juiz atual (a ligação `c`) caiu. Cada reserva espera a sua vez na fila (1º já, depois 3,5 s por posição);
  // se nenhum antes assumiu (um novo juiz muda o "epoch"), assume. Sem sucesso, avisa que a conexão caiu.
  let handledEpoch = null;
  function authorityLost(c) {
    if (closing || role !== 'guest') return;
    if (client && client.conn && c && client.conn !== c) return; // já há outra ligação em uso (juiz novo): essa é velha
    const lostEpoch = lastState && lastState.epoch;
    if (handledEpoch !== null && handledEpoch === lostEpoch) return;
    handledEpoch = lostEpoch;
    if (tryPromote()) return;
    const snap = (lastState && lastState.s) || {};
    const order = snap.reserveOrder || [];
    const mineP = (snap.players || []).find(function (p) { return p.id === localId; });
    const rank = mineP ? order.indexOf(mineP.id) : -1;
    if (lossTimer) clearTimeout(lossTimer);
    lossTimer = setTimeout(function () {
      lossTimer = null;
      if (closing || role !== 'guest' || (lastState && lastState.epoch !== lostEpoch)) return;
      if (rank > 0 && tryPromote(true)) return;
      emit('closed', {});
    }, rank > 0 ? rank * 3500 : 5000);
  }

  function tryPromote(force) {
    if (promoting || role !== 'guest' || !lastState || !lastState.x || !client || !client.peer) return false;
    const snap = lastState.s || {}, mine = (snap.players || []).find(p => p.id === localId);
    if (!mine || mine.bot || mine.eliminated) return false;
    const order = snap.reserveOrder || (snap.players || []).filter(p => !p.bot && !p.eliminated && p.connected).map(p => p.id);
    if (!force && order[0] !== mine.id) return false;
    if (force && order.indexOf(mine.id) < 0) return false;
    promoting = true;
    const E = root.ManobraEngine, T = root.ManobraTournament, peer = client.peer, myId = mine.id;
    const cache = {};
    const h = new T.Hub({ engine: E, simWorker: simWorker, send: function (id, obj) {
      if (id === localId) { later(function () { emit('msg', obj); }); return; }
      const c = conns[id];
      if (c && c.open !== false) { try { c.send(JSON.stringify(withState(h, obj, cache))); } catch (e) {} }
    }});
    if (!h.importState(lastState.x) || !h.promote(myId, peer.id || '')) { promoting = false; return false; }
    h.players.forEach(p => { if (p.id === myId) { p.connected = true; p.peer = peer.id || p.peer; } });
    role = 'host'; hub = h; hostPeer = peer; client = null; conns = {}; localId = myId;
    installPeerForGuest(peer);
    h.players.forEach(p => {
      if (p.bot || p.id === myId || p.eliminated || !p.connected || !p.peer) return;
      try {
        const c = peer.connect(p.peer, { reliable: true });
        c.on('open', function () { conns[p.id] = c; try { c.send(JSON.stringify({ k: 'joined', you: p.id })); c.send(JSON.stringify({ k: 'state', s: h.snapshot(), x: h.exportState({ public: true }), epoch: h.epoch })); } catch (e) {} });
        c.on('data', function (raw) { // jogadas, "Jogar", chat... dos outros jogadores chegam por aqui
          let o; try { o = JSON.parse(raw); } catch (e) { return; }
          if (!o || typeof o !== 'object' || o.k === 'join') return;
          if (hub === h) h.handle(p.id, o);
        });
        const gone = function () { if (conns[p.id] === c) delete conns[p.id]; if (hub === h && !closing) h.leave(p.id, 'queda de internet'); };
        c.on('close', gone);
        c.on('error', gone);
      } catch (e) {}
    });
    h.broadcast();
    emit('promoted', { id: myId, epoch: h.epoch, code: tournamentCode });
    promoting = false;
    return true;
  }

  // Um convidado se conectou ao organizador
  function onGuest(h, c) {
    let id = null;
    const timer = setTimeout(function () { if (id === null) { try { c.close(); } catch (e) { /* ok */ } } }, 10000);
    const gone = function () {
      clearTimeout(timer);
      if (id !== null && conns[id] === c) { delete conns[id]; if (hub === h) h.leave(id, 'queda de internet'); }
    };
    c.on('data', function (d) {
      let o;
      try { o = JSON.parse(d); } catch (e) { return; }
      if (!o || typeof o !== 'object') return;
      if (id === null) {
        if (o.k !== 'join') return;
        const r = h.join(String(o.pid || ''), o.nick, o.av, { peer: o.peer });
        if (!r.ok) {
          try { c.send(JSON.stringify({ k: 'rejected', why: r.why })); } catch (e) { /* ok */ }
          setTimeout(function () { try { c.close(); } catch (e) { /* ok */ } }, 300);
          return;
        }
        clearTimeout(timer);
        id = r.id;
        const old = conns[id];
        conns[id] = c;
        if (old && old !== c) { try { old.close(); } catch (e) { /* ok */ } } // reentrada: a conexão antiga cai
        try { c.send(JSON.stringify({ k: 'joined', you: id })); } catch (e) { /* ok */ }
        h.send(id, { k: 'state', s: h.snapshot(), x: h.exportState ? h.exportState({ public: true }) : null, epoch: h.epoch || 1 });
        return;
      }
      h.handle(id, o);
    });
    c.on('close', gone);
    c.on('error', gone);
  }

  const api = {
    // Cria o campeonato. Resolve { code, you: 0 }.
    // opts.local = true: campeonato offline (só contra robôs), sem precisar de internet.
    host: function (opts) {
      return (opts.local ? Promise.resolve() : loadLib()).then(function () {
        reset();
        closing = false;
        tournamentCode = '';
        const E = root.ManobraEngine, T = root.ManobraTournament;
        if (!E || !T) throw new Error('O módulo de campeonato não está disponível.');
        simWorker = makeSimWorker();
        const hostCache = {};
        const h = new T.Hub({
          engine: E,
          simWorker: simWorker,
          botDelay: root.__manobraBotDelay, // só os testes mudam isso
          setupTimeout: root.__manobraSetupTimeout, // idem (indefinido = 2 minutos)
          moveGrace: root.__manobraMoveGrace,
          moveTimeout: root.__manobraMoveMs, // idem (indefinido = 1min30 por jogada)
          send: function (id, obj) {
            if (id === localId) { later(function () { emit('msg', obj); }); return; }
            const c = conns[id];
            if (c && c.open !== false) { try { c.send(JSON.stringify(withState(h, obj, hostCache))); } catch (e) { /* ok */ } }
          }
        });
        hub = h;
        role = 'host';
        localId = 0;
        localOnly = !!opts.local;
        if (opts.restore) {
          if (!h.importState(opts.restore)) throw new Error('O campeonato salvo está inválido ou corrompido.');
          const me = h.players.find(function (p) { return p.id === 0; });
          if (me) { me.connected = true; me.pid = String(opts.pid); me.nick = opts.nick || me.nick; me.av = opts.avatar || me.av; }
        } else {
          h.join(String(opts.pid), opts.nick, opts.avatar, { peer: '' }); // o organizador é sempre o jogador 0
        }
        if (opts.local) return { code: '', you: 0, local: true };
        return new Promise(function (resolve, reject) {
          let tries = 0, finished = false;
          const timer = setTimeout(function () {
            if (finished) return;
            finished = true; reset();
            reject(new Error('Não consegui criar o campeonato. Confira a internet e tente de novo.'));
          }, 20000);
          const open = function () {
            const code = genCode();
            const p = new root.Peer(TPREFIX + code);
            hostPeer = p;
            p.on('open', function () {
              if (finished) return;
              finished = true; clearTimeout(timer);
              tournamentCode = code; resolve({ code: code, you: 0 });
            });
            p.on('connection', function (c) { onGuest(h, c); });
            p.on('error', function (err) {
              if (finished) return;
              if (err && err.type === 'unavailable-id' && tries++ < 6) {
                try { p.destroy(); } catch (e) { /* ok */ }
                open();
                return;
              }
              finished = true; clearTimeout(timer); reset();
              reject(new Error('Não consegui criar o campeonato (' + ((err && err.type) || 'erro') + ').'));
            });
          };
          open();
        });
      });
    },

    // Entra num campeonato pelo código. Resolve { you }.
    join: function (opts) {
      const code = cleanCode(opts && opts.code);
      if (code.length !== 4) return Promise.reject(new Error('O código do campeonato tem 4 letras ou números.'));
      return loadLib().then(function () {
        reset();
        closing = false;
        role = 'guest';
        tournamentCode = code;
        return new Promise(function (resolve, reject) {
          let done = false, joined = false, closedSent = false;
          const fail = function (msg) {
            if (done) return;
            done = true; clearTimeout(timer); reset();
            reject(new Error(msg));
          };
          const lost = function () {
            if (!done) { fail('A conexão com o organizador caiu.'); return; }
            if (joined) authorityLost(c0);
          };
          let c0 = null;
          const timer = setTimeout(function () { fail('Tempo esgotado. Confira o código e a internet dos dois celulares.'); }, 25000);
          const p = new root.Peer();
          installPeerForGuest(p);
          client = { peer: p, conn: null, pid: String(opts.pid), nick: opts.nick, av: opts.avatar || '' };
          p.on('error', function (err) {
            if (done) return;
            fail(err && err.type === 'peer-unavailable'
              ? 'Campeonato não encontrado. Confira o código e veja se o organizador já criou.'
              : 'Falha na conexão online (' + ((err && err.type) || 'erro') + ').');
          });
          p.on('open', function () {
            const c = p.connect(TPREFIX + code, { reliable: true });
            c0 = c;
            client.conn = c;
            c.on('open', function () {
              try { c.send(JSON.stringify({ k: 'join', nick: opts.nick, pid: String(opts.pid), av: opts.avatar || '', peer: p.id || '' })); }
              catch (e) { fail('Não foi possível entrar no campeonato.'); }
            });
            c.on('data', function (d) {
              let o;
              try { o = JSON.parse(d); } catch (e) { return; }
              if (!o || typeof o !== 'object') return;
              if (o.k === 'joined' && !done) { done = true; joined = true; localId = o.you; clearTimeout(timer); resolve({ you: o.you }); return; }
              if (o.k === 'rejected' && !done) { fail(o.why || 'O organizador não aceitou a sua entrada.'); return; }
              if (joined) { if (o.k === 'state') lastState = o; emit('msg', o); }
            });
            c.on('close', lost);
            c.on('error', lost);
          });
        });
      });
    },

    // Manda uma mensagem ao Hub (no organizador, direto; no convidado, pela rede)
    send: function (obj) {
      if (role === 'host') {
        const h = hub;
        later(function () { if (h && hub === h) h.handle(localId == null ? h.judgeId : localId, obj); });
      } else if (role === 'guest' && client && client.conn && client.conn.open !== false) {
        try { client.conn.send(JSON.stringify(obj)); } catch (e) { /* ok */ }
      }
    },
    promote: function () { return tryPromote(); },
    withdraw: function () {
      if (role === 'guest' && client && client.conn && client.conn.open !== false) {
        try { client.conn.send(JSON.stringify({ k: 'withdraw' })); } catch (e) { /* ok */ }
      }
      reset();
      return Promise.resolve();
    },
    snapshot: function () { return hub ? hub.snapshot() : null; },
    saveState: function () { return hub && role === 'host' && hub.exportState ? hub.exportState() : null; },
    role: function () { return role; },
    isLocal: function () { return localOnly; },
    leave: function () { reset(); },
    addListener: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return Promise.resolve({ remove: function () {} }); }
  };

  root.ManobraTourLink = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
