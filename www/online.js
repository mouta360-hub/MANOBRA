/* Manobra: jogo online entre dois celulares, por código de sala.
 * Usa a biblioteca PeerJS (conexão direta entre os dois aparelhos; o serviço gratuito dela só
 * serve para um celular achar o outro). Tem a mesma interface do plugin de Bluetooth:
 * listen / connect / send / close / addListener, com os eventos connected, message e disconnected.
 */
(function (root) {
  'use strict';

  const PREFIX = 'manobra-';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0 e 1 para não confundir
  // Primeiro tenta o arquivo local (se o app o trouxer), depois duas cópias públicas da biblioteca.
  const SOURCES = [
    'peerjs.min.js',
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'
  ];

  const handlers = {};
  let peer = null, conn = null, closing = false, loading = null;
  let publicPeer = null, publicRoom = "", publicConnections = [];

  function emit(ev, data) {
    (handlers[ev] || []).slice().forEach(function (f) {
      try { f(data); } catch (e) { /* um erro no app não derruba a conexão */ }
    });
  }

  function loadLib() {
    if (root.Peer) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      let i = 0;
      const next = function () {
        if (root.Peer) { resolve(); return; }
        if (i >= SOURCES.length || !root.document) {
          reject(new Error('Não foi possível carregar o módulo online. Confira a internet.'));
          return;
        }
        const s = root.document.createElement('script');
        s.src = SOURCES[i++];
        s.onload = function () { if (root.Peer) resolve(); else next(); };
        s.onerror = function () { next(); };
        (root.document.head || root.document.body).appendChild(s);
      };
      next();
    });
    loading = loading.catch(function (e) { loading = null; throw e; });
    return loading;
  }

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

  function publicCode() { let s = ''; for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }

  function cleanup() {
    closing = true;
    const c = conn, p = peer;
    conn = null; peer = null;
    try { if (c) c.close(); } catch (e) { /* ok */ }
    try { if (p) p.destroy(); } catch (e) { /* ok */ }
  }

  function attach(c) {
    conn = c;
    c.on('data', function (d) { emit('message', { data: typeof d === 'string' ? d : String(d) }); });
    const gone = function () {
      if (conn !== c) return; // já foi trocada ou encerrada de propósito
      conn = null;
      if (!closing) emit('disconnected', {});
    };
    c.on('close', gone);
    c.on('error', gone);
  }

  const api = {
    status: function () {
      const on = !(root.navigator && root.navigator.onLine === false);
      return Promise.resolve({ available: true, enabled: on, permission: true });
    },
    requestAccess: function () { return api.status(); },
    openSettings: function () { return Promise.resolve(); },
    pairedDevices: function () { return Promise.resolve({ devices: [] }); },

    // Anfitrião: cria a sala e devolve o código de 4 letras.
    listen: function () {
      return loadLib().then(function () {
        cleanup();
        closing = false;
        return new Promise(function (resolve, reject) {
          let tries = 0, opened = false, finished = false;
          const timer = setTimeout(function () {
            if (finished) return;
            finished = true; cleanup();
            reject(new Error('Não consegui criar a partida online. Confira a internet e tente de novo.'));
          }, 20000);
          const open = function () {
            const code = genCode();
            const p = new root.Peer(PREFIX + code);
            peer = p;
            p.on('open', function () {
              if (finished) return;
              opened = true; finished = true; clearTimeout(timer);
              resolve({ code: code });
            });
            p.on('connection', function (c) {
              if (conn) { try { c.close(); } catch (e) { /* ok */ } return; } // só um adversário
              c.on('open', function () {
                if (conn) { try { c.close(); } catch (e) { /* ok */ } return; }
                attach(c);
                emit('connected', { name: 'Adversário', address: code });
              });
            });
            p.on('error', function (err) {
              if (opened) return; // depois de conectado, quem avisa é a própria conexão
              if (finished) return;
              if (err && err.type === 'unavailable-id' && tries++ < 6) {
                try { p.destroy(); } catch (e) { /* ok */ }
                open();
                return;
              }
              finished = true; clearTimeout(timer); cleanup();
              reject(new Error('Não consegui criar a partida online (' + ((err && err.type) || 'erro') + ').'));
            });
          };
          open();
        });
      });
    },

    // Convidado: entra na sala pelo código.
    connect: function (opts) {
      const code = String((opts && opts.address) || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 4) return Promise.reject(new Error('O código tem 4 letras ou números.'));
      return loadLib().then(function () {
        cleanup();
        closing = false;
        return new Promise(function (resolve, reject) {
          let done = false;
          const fail = function (msg) {
            if (done) return;
            done = true; clearTimeout(timer); cleanup();
            reject(new Error(msg));
          };
          const timer = setTimeout(function () {
            fail('Tempo esgotado. Confira o código e a internet dos dois celulares.');
          }, 25000);
          const p = new root.Peer();
          peer = p;
          p.on('error', function (err) {
            if (done) return;
            if (err && err.type === 'peer-unavailable') fail('Partida não encontrada. Confira o código e veja se o outro celular já criou a partida.');
            else fail('Falha na conexão online (' + ((err && err.type) || 'erro') + ').');
          });
          p.on('open', function () {
            const c = p.connect(PREFIX + code, { reliable: true });
            c.on('open', function () {
              if (done) return;
              done = true; clearTimeout(timer);
              attach(c);
              emit('connected', { name: 'Adversário', address: code });
              resolve({ name: 'Adversário', address: code });
            });
            c.on('error', function () { fail('Não foi possível conectar com o outro celular.'); });
          });
        });
      });
    },

    send: function (opts) {
      const data = opts && opts.data;
      if (data == null) return Promise.reject(new Error('Sem dados.'));
      if (!conn || conn.open === false) return Promise.reject(new Error('Sem conexão.'));
      try { conn.send(data); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    },

    close: function () { cleanup(); return Promise.resolve(); },
    publicListen: function () {
      return loadLib().then(function () {
        api.publicClose();
        return new Promise(function (resolve, reject) {
          const code = publicCode();
          const p = new root.Peer(PREFIX + 'public-' + code);
          publicPeer = p; publicRoom = code;
          const timer = setTimeout(function () { try { p.destroy(); } catch (e) {} reject(new Error('Não consegui criar o chat público.')); }, 20000);
          p.on('open', function () { clearTimeout(timer); resolve({ code: code }); });
          p.on('connection', function (c) {
            publicConnections.push(c);
            c.on('data', function (d) {
              let o; try { o = JSON.parse(d); } catch (e) { return; }
              if (o && o.k === 'publicChat') {
                publicConnections.forEach(function (x) { if (x !== c && x.open) try { x.send(JSON.stringify(o)); } catch (e) {} });
                emit('publicMessage', { data: JSON.stringify(o) });
              }
            });
            c.on('close', function () { publicConnections = publicConnections.filter(function (x) { return x !== c; }); });
          });
          p.on('error', function () {});
        });
      });
    },
    publicJoin: function (code, nick, av) {
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 6) return Promise.reject(new Error('O código público precisa ter 6 caracteres.'));
      return loadLib().then(function () {
        api.publicClose();
        return new Promise(function (resolve, reject) {
          const p = new root.Peer(); publicPeer = p; publicRoom = code;
          const timer = setTimeout(function () { try { p.destroy(); } catch (e) {} reject(new Error('Chat público não encontrado.')); }, 20000);
          p.on('open', function () {
            const c = p.connect(PREFIX + 'public-' + code, { reliable: true });
            c.on('open', function () {
              clearTimeout(timer); publicConnections = [c];
              c.send(JSON.stringify({ k: 'publicHello', nick: cleanText(nick, 16), av: cleanAv(av) }));
              c.on('data', function (d) { emit('publicMessage', { data: typeof d === 'string' ? d : String(d) }); });
              emit('publicConnected', {}); resolve({ code: code });
            });
            c.on('error', function () { reject(new Error('Não foi possível entrar no chat público.')); });
          });
        });
      });
    },
    publicSend: function (obj) {
      const d = JSON.stringify(obj);
      publicConnections.forEach(function (c) { if (c.open) try { c.send(d); } catch (e) {} });
      return Promise.resolve();
    },
    publicClose: function () {
      publicConnections.forEach(function (c) { try { c.close(); } catch (e) {} });
      publicConnections = [];
      if (publicPeer) { try { publicPeer.destroy(); } catch (e) {} }
      publicPeer = null; publicRoom = '';
    },
    addListener: function (ev, fn) {
      (handlers[ev] = handlers[ev] || []).push(fn);
      return Promise.resolve({ remove: function () { handlers[ev] = (handlers[ev] || []).filter(function (f) { return f !== fn; }); } });
    }
  };

  /* ---------- Amigos: código pessoal fixo e convites ----------
   * Cada pessoa tem um código de 6 caracteres. Enquanto a tela Amigos está aberta, o app fica
   * "registrado" com esse código e pode receber convites. Quem convida entra direto no código do amigo.
   */
  const UPREFIX = PREFIX + 'u-';
  let pres = null;        // presença: { peer, code, pending, stopped }
  let invitation = null;  // convite enviado em andamento: { cancel }

  function cleanText(s, max) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
  }
  function cleanCode(s) {
    return String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function stopPresence() {
    const st = pres;
    pres = null;
    if (!st) return;
    st.stopped = true;
    if (st.pending) { try { st.pending.conn.close(); } catch (e) { /* ok */ } st.pending = null; }
    try { if (st.peer) st.peer.destroy(); } catch (e) { /* ok */ }
  }

  let presStatus = 'online'; // o que os amigos veem: online | match (em partida) | tour (em campeonato)
  let presAvatar = '';       // avatar que os amigos veem
  const cleanAv = function (s) { return String(s == null ? '' : s).replace(/[^a-z0-9]/gi, '').slice(0, 12); };

  function onIncoming(st, c) {
    let adopted = false;
    c.on('data', function (d) {
      if (adopted) return; // depois de aceito, quem lê é a partida
      let o;
      try { o = JSON.parse(d); } catch (e) { return; }
      if (o && o.k === 'ping') { // um amigo quer saber se estou online
        try { c.send(JSON.stringify({ k: 'pong', s: presStatus, av: presAvatar })); } catch (e) { /* ok */ }
        setTimeout(function () { try { c.close(); } catch (e) { /* ok */ } }, 400);
        return;
      }
      if (!o || (o.k !== 'invite' && o.k !== 'tourInvite' && o.k !== 'chatInvite' && o.k !== 'publicInvite')) return;
      if (st.pending) { // já tem um convite na tela: recusa o novo
        try { c.send(JSON.stringify({ k: 'decline', why: 'busy' })); } catch (e) { /* ok */ }
        setTimeout(function () { try { c.close(); } catch (e) { /* ok */ } }, 300);
        return;
      }
      const from = cleanCode(o.code);
      if (from.length !== 6) return;
      st.pending = { conn: c, nick: cleanText(o.nick, 16) || from, from: from, av: cleanAv(o.av), kind: o.k === 'tourInvite' ? 'tour' : (o.k === 'chatInvite' ? 'chat' : (o.k === 'publicInvite' ? 'public' : 'game')), tourCode: cleanCode(o.tourCode), adopt: function () { adopted = true; } };
      emit('invite', { nick: st.pending.nick, code: from, av: st.pending.av, kind: st.pending.kind, tourCode: st.pending.tourCode });
    });
    c.on('close', function () {
      if (adopted) return;
      if (st.pending && st.pending.conn === c) { st.pending = null; emit('inviteEnd', {}); }
    });
  }

  api.startPresence = function (code) {
    code = cleanCode(code);
    if (code.length !== 6) return Promise.reject(new Error('Código pessoal inválido.'));
    return loadLib().then(function () {
      stopPresence();
      return new Promise(function (resolve, reject) {
        const st = { peer: null, code: code, pending: null, stopped: false };
        pres = st;
        let tries = 0, finished = false;
        const open = function () {
          if (st.stopped) return;
          const p = new root.Peer(UPREFIX + code);
          st.peer = p;
          p.on('open', function () { if (!finished) { finished = true; resolve({ code: code }); } });
          p.on('connection', function (c) { onIncoming(st, c); });
          p.on('disconnected', function () { // caiu do serviço (troca de Wi-Fi, soneca): tenta voltar sem perder o código
            if (st.stopped || !finished) return;
            try { p.reconnect(); } catch (e) { /* ok */ }
          });
          p.on('close', function () {
            if (st.stopped || !finished) return;
            if (pres === st) pres = null;
            st.stopped = true;
            emit('presenceLost', {});
          });
          p.on('error', function (err) {
            if (st.stopped || finished) return;
            if (err && err.type === 'unavailable-id' && tries++ < 15) { // o código ainda está "preso" da última vez
              try { p.destroy(); } catch (e) { /* ok */ }
              setTimeout(open, 1000);
              return;
            }
            finished = true;
            if (pres === st) stopPresence();
            reject(new Error('Não consegui ficar online (' + ((err && err.type) || 'erro') + '). Confira a internet e tente de novo.'));
          });
        };
        open();
      });
    });
  };
  api.stopPresence = function () { stopPresence(); return Promise.resolve(); };

  api.acceptInvite = function () {
    const st = pres;
    if (!st || !st.pending) return Promise.reject(new Error('Esse convite já expirou.'));
    const pnd = st.pending;
    st.pending = null;
    const c = pnd.conn;
    if (c.open === false) return Promise.reject(new Error('Seu amigo cancelou o convite.'));
    if (pnd.kind === 'tour') {
      try { c.send(JSON.stringify({ k: 'tourAccept' })); c.close(); } catch (e) { return Promise.reject(new Error('Falha ao aceitar o convite do campeonato.')); }
      return Promise.resolve({ name: pnd.nick, code: pnd.from, tourCode: pnd.tourCode, tour: true });
    }
    if (pnd.kind === 'chat') {
      try { c.send(JSON.stringify({ k: 'chatAccept' })); } catch (e) { return Promise.reject(new Error('Falha ao aceitar a conversa.')); }
      pnd.adopt(); closing = false; attach(c);
      emit('chatConnected', { name: pnd.nick, address: pnd.from, role: 'guest' });
      return Promise.resolve({ name: pnd.nick, code: pnd.from, chat: true });
    }
    if (pnd.kind === 'public') {
      try { c.send(JSON.stringify({ k: 'publicAccept' })); c.close(); } catch (e) { return Promise.reject(new Error('Falha ao aceitar o convite público.')); }
      return Promise.resolve({ name: pnd.nick, code: pnd.from, public: true, roomCode: pnd.tourCode });
    }
    try { c.send(JSON.stringify({ k: 'accept' })); } catch (e) { return Promise.reject(new Error('Falha ao aceitar o convite.')); }
    pnd.adopt();
    // a conexão do convite vira a partida; o registro (presença) continua ativo para os amigos
    if (peer) { try { peer.destroy(); } catch (e) { /* ok */ } peer = null; }
    closing = false;
    attach(c);
    emit('connected', { name: pnd.nick, address: pnd.from, role: 'guest' });
    return Promise.resolve({ name: pnd.nick, code: pnd.from });
  };

  api.setStatus = function (s) { presStatus = (s === 'match' || s === 'tour' || s === 'chat') ? s : 'online'; };
  api.setAvatar = function (av) { presAvatar = cleanAv(av); };
  api.lastSeen = {}; // código -> avatar visto na última sonda

  // Pergunta a um amigo se ele está online (e em que estado). Uma pergunta por vez.
  let probePeer = null, probeChain = Promise.resolve();
  function getProbePeer() {
    return new Promise(function (resolve, reject) {
      if (probePeer && probePeer.open !== false && !probePeer.destroyed) { resolve(probePeer); return; }
      const p = new root.Peer();
      probePeer = p;
      let ok = false;
      p.on('open', function () { ok = true; resolve(p); });
      p.on('error', function (err) { if (!ok) { if (probePeer === p) probePeer = null; reject(err || new Error('erro')); } });
    });
  }
  api.probe = function (code) {
    code = cleanCode(code);
    const run = function () {
      return loadLib().then(getProbePeer).then(function (p) {
        return new Promise(function (resolve) {
          let done = false, c = null;
          const onErr = function (err) { if (err && err.type === 'peer-unavailable') finish('offline'); };
          const finish = function (s) {
            if (done) return;
            done = true; clearTimeout(timer);
            if (p.off) p.off('error', onErr);
            try { if (c) c.close(); } catch (e) { /* ok */ }
            resolve(s);
          };
          const timer = setTimeout(function () { finish('offline'); }, 7000);
          p.on('error', onErr);
          c = p.connect(UPREFIX + code, { reliable: true });
          c.on('open', function () {
            try { c.send(JSON.stringify({ k: 'ping' })); } catch (e) { finish('offline'); }
          });
          c.on('data', function (d) {
            let o;
            try { o = JSON.parse(d); } catch (e) { return; }
            if (o && o.k === 'pong') { api.lastSeen[code] = cleanAv(o.av); finish(o.s === 'match' || o.s === 'tour' || o.s === 'chat' ? o.s : 'online'); }
          });
          c.on('error', function () { finish('offline'); });
          c.on('close', function () { finish('offline'); }); // fechou sem responder
        });
      }).catch(function () { return 'offline'; });
    };
    probeChain = probeChain.then(run, run);
    return probeChain;
  };
  api.closeProbes = function () {
    const p = probePeer;
    probePeer = null;
    try { if (p) p.destroy(); } catch (e) { /* ok */ }
    return Promise.resolve();
  };

  api.declineInvite = function (why) {
    const st = pres;
    if (!st || !st.pending) return Promise.resolve();
    const c = st.pending.conn;
    st.pending = null;
    try { c.send(JSON.stringify(why === 'busy' ? { k: 'decline', why: 'busy' } : { k: 'decline' })); } catch (e) { /* ok */ }
    setTimeout(function () { try { c.close(); } catch (e) { /* ok */ } }, 300);
    return Promise.resolve();
  };

  // Convida um amigo pelo código dele. Resolve quando ele aceita; quem convida joga de Brancas.
  api.invite = function (opts) {
    const code = cleanCode(opts && opts.code);
    const from = cleanCode(opts && opts.from);
    const nick = cleanText(opts && opts.nick, 16);
    const friendNick = cleanText(opts && opts.friendNick, 16) || code;
    const av = cleanAv(opts && opts.av);
    const tour = opts && opts.kind === 'tour';
    const chat = opts && opts.kind === 'chat';
    const pub = opts && opts.kind === 'public';
    const tourCode = cleanCode(opts && opts.tournamentCode).slice(0, pub ? 6 : 4);
    if (code.length !== 6 || from.length !== 6) return Promise.reject(new Error('Código do amigo inválido.'));
    return loadLib().then(function () {
      return new Promise(function (resolve, reject) {
        let done = false, adopted = false, c = null;
        const p = new root.Peer();
        const fail = function (msg) {
          if (done) return;
          done = true; clearTimeout(timer);
          if (invitation && invitation.p === p) invitation = null;
          try { if (c) c.close(); } catch (e) { /* ok */ }
          try { p.destroy(); } catch (e) { /* ok */ }
          reject(new Error(msg));
        };
        const timer = setTimeout(function () { fail('Seu amigo não respondeu ao convite.'); }, 60000);
        invitation = { p: p, cancel: function () { fail('Convite cancelado.'); } };
        p.on('error', function (err) {
          if (done) return;
          if (err && err.type === 'peer-unavailable') fail('Seu amigo não está online agora. O app dele precisa estar aberto e online.');
          else fail('Falha na conexão online (' + ((err && err.type) || 'erro') + ').');
        });
        p.on('open', function () {
          if (done) return;
          c = p.connect(UPREFIX + code, { reliable: true });
          c.on('open', function () {
            try { c.send(JSON.stringify({ k: tour ? 'tourInvite' : (chat ? 'chatInvite' : (pub ? 'publicInvite' : 'invite')), nick: nick, code: from, av: av, tourCode: tourCode })); }
            catch (e) { fail('Não foi possível enviar o convite.'); }
          });
          c.on('data', function (d) {
            if (adopted) return;
            let o;
            try { o = JSON.parse(d); } catch (e) { return; }
            if (!o || done) return;
            if (o.k === (tour ? 'tourAccept' : (chat ? 'chatAccept' : (pub ? 'publicAccept' : 'accept')))) {
              done = true; adopted = true; clearTimeout(timer);
              invitation = null;
              if (tour) { adopted = false; try { c.close(); } catch (e) { /* ok */ } resolve({ name: friendNick, code: code, tourCode: tourCode, tour: true }); return; }
              if (chat) { if (peer && peer !== p) { try { peer.destroy(); } catch (e) { /* ok */ } } peer = p; closing = false; attach(c); emit('chatConnected', { name: friendNick, address: code, role: 'host' }); resolve({ name: friendNick, code: code, chat: true }); return; }
              if (pub) { adopted = false; try { c.close(); } catch (e) {} resolve({ name: friendNick, code: code, public: true, roomCode: tourCode }); return; }
              if (peer && peer !== p) { try { peer.destroy(); } catch (e) { /* ok */ } }
              peer = p;
              closing = false;
              attach(c);
              emit('connected', { name: friendNick, address: code, role: 'host' });
              resolve({ name: friendNick, code: code });
            } else if (o.k === 'decline') {
              fail(o.why === 'busy' ? 'Seu amigo está ocupado agora (em partida, campeonato ou outro convite). Tente em instantes.' : 'Seu amigo recusou o convite.');
            }
          });
          c.on('close', function () { if (!adopted) fail('O convite foi encerrado.'); });
          c.on('error', function () { if (!adopted) fail('Não foi possível conectar com o seu amigo.'); });
        });
      });
    });
  };
  api.cancelInvite = function () {
    if (invitation) invitation.cancel();
    return Promise.resolve();
  };

  api.loadLib = loadLib; // o campeonato reaproveita o carregador da biblioteca
  root.ManobraOnline = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
