(function () {
  'use strict';
  const E = window.ManobraEngine;
  const { COLS, ROWS, N, WA, WD, BA, BD, WHITE, BLACK, MAX_DEF, PIECES } = E;
  const NAMES = ['Brancas', 'Pretas'];
  // Perfis fictícios: parecem jogadores, mas continuam sendo IA internamente.
  // O catálogo é criado pelo módulo do campeonato (mais de 6.000 combinações).
  const BOT_PROFILES = window.ManobraBotProfiles || [{ nick: 'Rafael', av: 'eagle' }];
  const REASONS = {
    principal: 'alcançou a casa principal do oponente',
    eliminacao: 'eliminou todas as peças do oponente',
    isolamento: 'separou todas as peças de ataque do oponente, sem como reconectá-las',
    sem_movimentos: 'o oponente ficou sem movimentos'
  };

  const app = {
    screen: 'menu', mode: 'ai', humanSide: WHITE, level: 'medium', rotate: false,
    pieces: new Int8Array(N), setupSide: WHITE, game: null,
    sel: -1, purge: false, choice: null, thinking: false, flipped: false,
    speed: 'slow', animating: false, animToken: 0,
    // Bluetooth
    bt: { stage: 'idle', devices: [], msg: '', code: '' }, btLinked: false, btReady: false,
    peerSetup: null, btQueue: [],
    net: 'bt',       // por onde o jogo remoto passa: 'bt' (Bluetooth) ou 'online' (internet)
    onlineCode: '',  // código digitado para entrar numa partida online
    tour: { role: null, code: '', myId: null, snap: null, msg: '', matchId: null, connecting: false },
    tourCode: '',
    me: { code: '', nick: '', av: 'fox' },
    ai: { nick: 'Rafael', av: 'eagle' },
    peer: { nick: 'Adversário', av: 'robot' },
    friends: [],
    fr: { state: 'idle', msg: '', invite: null, target: null, newCode: '', newNick: '' },
    presence: { visible: true, state: 'off', msg: '' }, // 'off' | 'connecting' | 'ready' | 'error'
    inv: null,       // convite recebido, na tela por cima de qualquer coisa
    fstat: {},       // código do amigo -> 'online' | 'match' | 'tour' | 'offline'
    pollMs: 20000    // de quanto em quanto tempo a tela Amigos confere o status
  };
  const attachedPlugins = [];
  window.__manobraApp = app; // gancho usado só pelos testes
  const DURS = { slow: 1100, medium: 650, fast: 280 }; // duração do movimento (ms)
  try { const sp = localStorage.getItem('manobra.speed'); if (DURS[sp]) app.speed = sp; } catch (e) { /* sem armazenamento */ }

  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Sons (sintetizados no próprio app, sem arquivos) ---------- */
  const snd = { ctx: null, on: true };
  try { if (localStorage.getItem('manobra.sound') === '0') snd.on = false; } catch (e) { /* ok */ }
  function actx() {
    try {
      if (!snd.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        snd.ctx = new AC();
      }
      if (snd.ctx.state === 'suspended' && snd.ctx.resume) snd.ctx.resume();
      return snd.ctx;
    } catch (e) { return null; }
  }
  function tone(ctx, t, freq, dur, type, vol, freqEnd) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(ctx, t, dur, vol, freq) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t);
  }
  // kind: m mover | k eliminar | p empurrar | s trocar | f virar modo | x eliminar defesa (7ª) | sel | win | lose
  function sfx(kind, delayMs) {
    if (!snd.on) return;
    const ctx = actx();
    if (!ctx) return;
    try {
      const t = ctx.currentTime + (delayMs || 0) / 1000;
      switch (kind) {
        case 'm': tone(ctx, t, 320, 0.11, 'triangle', 0.5, 130); noise(ctx, t, 0.04, 0.25, 1800); break;
        case 'k': tone(ctx, t, 170, 0.28, 'sine', 0.8, 45); noise(ctx, t, 0.16, 0.5, 900); tone(ctx, t, 420, 0.08, 'square', 0.15, 200); break;
        case 'p': tone(ctx, t, 300, 0.08, 'triangle', 0.45, 160); tone(ctx, t + 0.1, 260, 0.1, 'triangle', 0.45, 120); noise(ctx, t, 0.05, 0.2, 1500); break;
        case 's': tone(ctx, t, 260, 0.18, 'sine', 0.35, 620); tone(ctx, t + 0.17, 300, 0.1, 'triangle', 0.45, 140); break;
        case 'f': tone(ctx, t, 520, 0.07, 'sine', 0.35); tone(ctx, t + 0.07, 780, 0.1, 'sine', 0.35); break;
        case 'x': tone(ctx, t, 220, 0.3, 'sawtooth', 0.25, 70); noise(ctx, t, 0.2, 0.3, 700); break;
        case 'sel': tone(ctx, t, 700, 0.04, 'sine', 0.15); break;
        case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(ctx, t + i * 0.14, f, 0.28, 'triangle', 0.4)); break;
        case 'lose': [392, 330, 262].forEach((f, i) => tone(ctx, t + i * 0.2, f, 0.35, 'triangle', 0.4)); break;
      }
    } catch (e) { /* som é opcional */ }
  }

  /* ---------- Peças (como no manual) ---------- */
  function pieceSvg(p) {
    const o = '<svg class="pc" viewBox="0 0 100 100">';
    switch (p) {
      case WD: return o + '<circle cx="50" cy="50" r="40" fill="#fff" stroke="#8d96a8" stroke-width="4"/></svg>';
      case WA: return o + '<circle cx="50" cy="50" r="42" fill="#fff" stroke="#1a2433" stroke-width="5"/><circle cx="50" cy="50" r="22" fill="#111"/></svg>';
      case BD: return o + '<circle cx="50" cy="50" r="40" fill="#0b0d12" stroke="#aab4c6" stroke-width="5"/></svg>';
      case BA: return o + '<circle cx="50" cy="50" r="36" fill="#fff" stroke="#0b0d12" stroke-width="16"/><circle cx="50" cy="50" r="46" fill="none" stroke="#aab4c6" stroke-width="3"/></svg>';
    }
    return '';
  }

  function counts(arr) {
    const c = [[0, 0], [0, 0]]; // [lado][0=ataque,1=defesa]
    for (let i = 0; i < N; i++) {
      const p = arr[i];
      if (!p) continue;
      c[E.sideOf(p)][E.isAttack(p) ? 0 : 1]++;
    }
    return c;
  }

  /* ---------- Tabuleiro ---------- */
  function boardHtml(arr, marks) {
    marks = marks || {};
    let h = '<div id="board">';
    for (let rr = 0; rr < ROWS; rr++) {
      const r = app.flipped ? ROWS - 1 - rr : rr;
      for (let cc = 0; cc < COLS; cc++) {
        const c = app.flipped ? COLS - 1 - cc : cc;
        const i = r * COLS + c;
        const dark = ((r + c) & 1) === 0;
        // A linha vermelha (terreno neutro) só aparece na montagem
        let cls = 'cell ' + (dark ? 'dark' : 'light') + (r === 4 && app.screen === 'setup' ? ' neutral' : '');
        if (dark) {
          if (marks.terr && marks.terr.has(i)) cls += ' can';
          if (marks.last && marks.last.indexOf(i) >= 0) cls += ' last';
          if (marks.sel === i) cls += ' sel';
          if (marks.dest && marks.dest.has(i)) cls += ' ' + marks.dest.get(i);
        }
        h += '<div class="' + cls + '"' + (dark ? ' data-i="' + i + '"' : '') + '>' +
          (E.isMain(i) ? '<i class="mainsq"></i>' : '') + pieceSvg(arr[i]) + '</div>';
      }
    }
    return h + '</div>';
  }

  /* ---------- Avatares ---------- */
  const AVATARS = [
    ['fox', '🦊'], ['bear', '🐻'], ['lion', '🦁'], ['tiger', '🐯'], ['wolf', '🐺'], ['panda', '🐼'],
    ['cat', '🐱'], ['dog', '🐶'], ['owl', '🦉'], ['eagle', '🦅'], ['shark', '🦈'], ['dragon', '🐲'],
    ['unicorn', '🦄'], ['robot', '🤖'], ['ninja', '🥷'], ['king', '👑'], ['knight', '🛡️'], ['rocket', '🚀'],
    ['fire', '🔥'], ['star', '⭐']
  ];
  const AV = {};
  AVATARS.forEach(a => { AV[a[0]] = a[1]; });
  const usedAiBots = new Set();
  const avOf = id => AV[id] || '🙂';
  const avHtml = id => '<span class="av">' + avOf(id) + '</span>';
  function pickBot() {
    if (usedAiBots.size >= BOT_PROFILES.length) usedAiBots.clear();
    let i;
    do { i = Math.floor(Math.random() * BOT_PROFILES.length); } while (usedAiBots.has(i));
    usedAiBots.add(i);
    return BOT_PROFILES[i];
  }
  function playerForSide(side) {
    if (app.mode === 'ai') {
      return side === app.humanSide
        ? { nick: myNick(), av: app.me.av, me: true }
        : { nick: app.ai.nick, av: app.ai.av, bot: true };
    }
    if (app.mode === 'bt' || app.mode === 'tour') {
      return side === app.humanSide
        ? { nick: myNick(), av: app.me.av, me: true }
        : { nick: app.peer.nick || 'Adversário', av: app.peer.av || 'robot' };
    }
    return side === WHITE
      ? { nick: 'Brancas', av: 'star' }
      : { nick: 'Pretas', av: 'knight' };
  }
  function playerScore(side, c, turn) {
    const p = playerForSide(side);
    const total = c[side][0] + c[side][1];
    return '<div class="player-score' + (turn === side ? ' turn' : '') + '">' +
      '<div class="player-head">' + avHtml(p.av) + '<div class="player-name"><b>' + esc(p.nick) + '</b>' +
      (p.bot ? '<small>IA</small>' : (p.me ? '<small>Você</small>' : '')) + '</div></div>' +
      '<div class="player-pieces"><strong>' + total + '</strong><span>peças</span></div>' +
      '<div class="player-breakdown">Ataque ' + c[side][0] + ' · Defesa ' + c[side][1] + '</div></div>';
  }
  function profileEditor() {
    return '<div class="card"><div class="prof"><span class="av big">' + avOf(app.me.av) + '</span>' +
      '<input id="nick" class="txtin" maxlength="16" placeholder="Seu apelido" autocomplete="off" value="' + esc(app.me.nick) + '"></div>' +
      '<p class="muted" style="margin:0 0 6px">Escolha seu avatar:</p><div class="avgrid">' +
      AVATARS.map(a => '<button data-act="avatar" data-v="' + a[0] + '" class="' + (app.me.av === a[0] ? 'on' : '') + '">' + a[1] + '</button>').join('') + '</div></div>';
  }

  /* ---------- Telas ---------- */
  function menuScreen() {
    const seg = (act, cur, items) => '<div class="seg">' + items.map(([v, label]) =>
      '<button data-act="' + act + '" data-v="' + v + '" class="' + (String(cur) === String(v) ? 'on' : '') + '">' + label + '</button>').join('') + '</div>';
    return '<div class="menu"><h1>MANOBRA</h1><p class="sub">versão 1.0</p>' +
      profileEditor() +
      '<div class="card"><h3>Contra a IA</h3>' +
      seg('side', app.humanSide, [[0, 'Brancas (começam)'], [1, 'Pretas']]) +
      seg('level', app.level, [['easy', 'Fácil'], ['medium', 'Médio'], ['hard', 'Difícil']]) +
      '<button class="primary" data-act="startAI">Jogar contra a IA</button></div>' +
      '<div class="card"><h3>Dois jogadores</h3><button class="primary" data-act="startPVP">Jogar no mesmo celular</button>' +
      '<label class="chk"><input type="checkbox" id="rot" ' + (app.rotate ? 'checked' : '') + '> Girar o tabuleiro a cada vez</label></div>' +
      '<div class="card"><h3>Dois celulares</h3><button class="primary" data-act="btOpen">Jogar por Bluetooth</button>' +
      '<button class="primary" style="margin-top:8px" data-act="onOpen">Jogar online (pela internet)</button>' +
      '<button class="primary" style="margin-top:8px" data-act="frOpen">Amigos e convites</button>' +
      '<p class="muted" style="margin:8px 0 0;text-align:center" data-presline>' + presenceLine() + '</p></div>' +
      '<div class="card"><h3>Campeonato</h3><button class="primary" data-act="tourOpen">Criar ou entrar num campeonato</button></div>' +
      '<div class="card"><h3>Velocidade das jogadas</h3>' +
      seg('speed', app.speed, [['slow', 'Lenta'], ['medium', 'Média'], ['fast', 'Rápida']]) +
      '<h3>Som</h3>' + seg('sound', snd.on ? '1' : '0', [['1', 'Ligado'], ['0', 'Desligado']]) + '</div>' +
      '<button class="link" data-act="rules">Como jogar</button></div>';
  }

  function rulesScreen() {
    return '<div class="rules"><div class="topbar"><b>Como jogar</b><button data-act="menu">Voltar</button></div>' +
      '<h2>Tabuleiro</h2><p>13 × 9 = 117 casas. Só as casas escuras (azul-escuro) são usadas, sempre em diagonal. Cada jogador tem 13 peças e uma casa principal (o quadrado).</p>' +
      '<h2>Como vencer (qualquer um)</h2><ul><li>Separar todas as peças de ataque do oponente, sem possibilidade de conectá-las.</li><li>Eliminar todas as peças do oponente.</li><li>Alcançar a casa principal do oponente.</li></ul>' +
      '<h2>Montagem</h2><p>Cada jogador distribui as 13 peças no seu terreno (4 linhas). A linha vermelha na montagem é o terreno neutro: ninguém coloca peças nela no início. No máximo 6 peças em modo defesa; pode ter menos. Se um jogador ficar com a 7ª peça em defesa, o adversário pode eliminar uma defesa dele.</p>' +
      '<h2>Modos</h2><ul>' +
      '<li><b>Defesa</b> (branca lisa / preta lisa): anda sozinha 1 casa em qualquer diagonal. Não elimina: empurra a peça inimiga uma casa para trás dela ou troca de lugar com ela.</li>' +
      '<li><b>Ataque</b> (branca com bolinha / preta com anel): só se move se houver uma peça sua na diagonal ao lado. Elimina qualquer peça inimiga ocupando a casa dela. Se ficar sozinha, volta a andar quando outra peça sua chegar perto.</li></ul>' +
      '<h2>Sua vez</h2><p>Um movimento por turno: andar, ou virar uma peça de modo (conta como o movimento). Virar de ataque para defesa exige uma peça sua por perto. As brancas começam.</p>' +
      '<h2>Efeito looping</h2><p>Se os dois repetem o mesmo movimento, quem tem menos peças leva vantagem; depois quem tem mais peças em ataque; depois o dono do terreno onde acontece. Quem perde o desempate é obrigado a fazer outro movimento.</p></div>';
  }

  function tourTimerMatch() {
    if (app.net !== 'tour' || !app.tour.snap || !app.tour.matchId) return null;
    return app.tour.snap.matches.find(m => m.id === app.tour.matchId) || null;
  }
  function scheduleTourTimer() {
    if (!app._tourTimerTick) {
      app._tourTimerTick = true;
      setTimeout(() => {
        app._tourTimerTick = false;
        if (app.screen === 'tour' || app.screen === 'setup') render();
      }, 1000);
    }
  }
  function timerClock(m) {
    const seconds = m && m.timer ? Math.max(0, Math.ceil((Number(m.timer.until) - Date.now()) / 1000)) : 0;
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function setupScreen() {
    const s = app.setupSide;
    const c = counts(app.pieces)[s];
    const total = c[0] + c[1];
    const terr = new Set(E.territoryCells(s));
    const lock = app.mode === 'bt' && app.btReady;
    const dis = lock ? ' disabled' : '';
    const setupMatch = tourTimerMatch();
    if (setupMatch && setupMatch.timer) scheduleTourTimer();
    const setupClock = setupMatch && setupMatch.timer ? timerClock(setupMatch) : '';
    const setupMineReady = setupMatch && setupMatch.setupReady ? !!setupMatch.setupReady[app.humanSide] : lock;
    const setupOppReady = setupMatch && setupMatch.setupReady ? !!setupMatch.setupReady[app.humanSide ^ 1] : !!app.peerSetup;
    const tourTimerInfo = setupMatch && setupMatch.timer && setupMatch.timer.kind === 'setup'
      ? '<div class="countdown-panel"><b>Montagem</b><br>Você: ' + (setupMineReady ? 'pronto' : setupClock) + ' · Adversário: ' + (setupOppReady ? 'pronto' : setupClock) + '</div>' : '';
    const hint = lock ? 'Pronto! Aguardando o adversário terminar a montagem…' :
      'Toque numa casa verde: 1× ataque, 2× defesa, 3× remove. Coloque as ' + PIECES + ' peças. A linha vermelha (terreno neutro) fica vazia.' +
      (app.mode === 'bt' ? ' Seu adversário não vê suas peças até o jogo começar.' : '') +
      (app.net === 'tour' ? ' Você tem 2 minutos. Quando o tempo acabar, o computador completa as peças que faltam ao acaso e a partida começa — sem perder.' : '');
    return '<div class="layout"><div class="bw">' + boardHtml(app.pieces, { terr: terr }) + '</div><div class="side">' +
      '<div class="topbar"><b>Montagem: ' + NAMES[s] + '</b><span>' + total + '/' + PIECES + ' peças</span></div>' +
      '<div class="legend"><span>' + pieceSvg(E.makePiece(s, true)) + 'ataque: ' + c[0] + '</span><span>' + pieceSvg(E.makePiece(s, false)) + 'defesa: ' + c[1] + ' (máx. ' + MAX_DEF + ')</span></div>' +
      tourTimerInfo + '<div class="hint">' + hint + '</div>' +
      '<div class="bar"><button data-act="setupDefault"' + dis + '>Padrão</button><button data-act="setupRandom"' + dis + '>Aleatório</button><button data-act="setupClear"' + dis + '>Limpar</button></div>' +
      '<div class="bar" style="margin-top:8px"><button data-act="menu">Menu</button><button class="hot" data-act="setupDone" ' + (total === PIECES && !lock ? '' : 'disabled') + '>Pronto</button></div></div></div>';
  }

  function statusText() {
    const g = app.game;
    if (g.over && !app.animating) return 'Fim de jogo';
    if (app.thinking) return 'IA pensando…';
    const s = g.st.turn;
    if (app.mode === 'ai') return s === app.humanSide ? 'Sua vez (' + NAMES[s] + ')' : 'Vez de ' + app.ai.nick;
    if (app.mode === 'bt' || app.mode === 'tour') return s === app.humanSide ? 'Sua vez (' + NAMES[s] + ')' : 'Vez de ' + (app.peer.nick || 'Adversário');
    return 'Vez das ' + NAMES[s];
  }
  function hintText() {
    const g = app.game;
    if (g.over) return '';
    if (app.purge) return 'Toque numa peça de defesa do adversário para eliminá-la (gasta sua jogada).';
    if (app.sel < 0) return 'Toque em uma peça sua para ver os movimentos.';
    const p = g.st.b[app.sel];
    const atk = E.isAttack(p);
    const mv = g.cur.moves.filter(m => m.from === app.sel);
    if (!mv.length) return atk ? 'Ataque isolado: não anda nem vira defesa até outra peça sua chegar na diagonal dele.' : 'Essa peça não tem movimentos.';
    return atk ? 'Ataque: elimina o inimigo ao ocupar a casa dele.' : 'Defesa: anda 1 casa, empurra ou troca de lugar com inimigos.';
  }

  function isHumanTurn() {
    const g = app.game;
    return !g.over && !app.thinking && !app.animating && (app.mode === 'pvp' || g.st.turn === app.humanSide);
  }

  function gameScreen() {
    const g = app.game, b = g.st.b;
    const c = counts(b);
    const marks = { last: g.last ? [g.last.from, g.last.to] : [] };
    if (g.cur && isHumanTurn()) {
      if (app.purge) {
        marks.dest = new Map();
        for (const m of g.cur.moves) if (m.t === 'x') marks.dest.set(m.to, 'kill');
      } else if (app.sel >= 0) {
        marks.sel = app.sel;
        marks.dest = new Map();
        for (const m of g.cur.moves) {
          if (m.from !== app.sel || m.t === 'f') continue;
          marks.dest.set(m.to, m.t === 'm' ? 'dest' : m.t === 'k' ? 'kill' : 'push');
        }
      }
    }
    const sel = app.sel;
    const canFlip = isHumanTurn() && !app.purge && sel >= 0 && g.cur.moves.some(m => m.t === 'f' && m.from === sel);
    const flipLabel = sel >= 0 && E.isAttack(b[sel]) ? 'Virar p/ defesa' : 'Virar p/ ataque';
    const canPurge = isHumanTurn() && g.cur.moves.some(m => m.t === 'x');
    let h = '<div class="layout"><div class="bw">' + boardHtml(b, marks) + '</div><div class="side">' +
      '<div class="topbar"><b>' + statusText() + '</b><span>jogada ' + (g.plies + 1) + '</span></div>' +
      '<div class="scoreboard">' + playerScore(WHITE, c, g.st.turn) + playerScore(BLACK, c, g.st.turn) + '</div>' +
      '<div class="hint">' + hintText() + '</div><div class="bar">' +
      '<button data-act="flipMode" ' + (canFlip ? '' : 'disabled') + '>' + flipLabel + '</button>' +
      (canPurge ? '<button class="warn" data-act="purge">' + (app.purge ? 'Cancelar' : 'Eliminar defesa (7ª)') + '</button>' : '') +
      '<button data-act="toggleSound">' + (snd.on ? '🔊 Som' : '🔇 Mudo') + '</button>' +
      '<button data-act="turnBoard">Girar</button>' +
      (app.net === 'tour' && app.tour.role === 'host' && tourBotOnly(app.tour.snap) ? '<button data-act="tourSave">💾 Salvar</button>' : '') +
      '<button data-act="menu">Menu</button></div></div></div>';
    if (app.choice) {
      h += '<div class="overlay" data-act="cancelChoice"><div class="sheet"><h2>Como mover?</h2><p>Escolha o que fazer com a peça inimiga.</p>' +
        '<button class="primary" data-act="choose" data-v="p">Empurrar</button><button class="primary" data-act="choose" data-v="s">Trocar de lugar</button></div></div>';
    }
    if (g.over && !app.animating) {
      const w = g.over.winner;
      const winner = playerForSide(w);
      let who = winner.nick + ' venceu!';
      if (app.mode === 'ai') who = w === app.humanSide ? 'Você venceu! 🎉' : winner.nick + ' venceu.';
      if (app.mode === 'bt') who = w === app.humanSide ? 'Você venceu! 🎉' : 'O adversário venceu.';
      if (app.mode === 'bt' && w !== app.humanSide) who = winner.nick + ' venceu.';
      h += '<div class="overlay center"><div class="sheet"><div class="result-winner">' + avHtml(winner.av) + '<div><h2>' + esc(who) + '</h2><p class="result-name">Vencedor: <b>' + esc(winner.nick) + '</b></p></div></div><p>Motivo: ' + REASONS[g.over.reason] + '.</p>' +
        (app.net === 'tour'
          ? '<button class="primary" data-act="tourBack">Voltar ao campeonato</button>'
          : '<button class="primary" data-act="again">Jogar de novo</button><button data-act="menu">Menu</button>') +
        '</div></div>';
    }
    return h;
  }

  function btScreen() {
    const b = app.bt, native = !!nativeBt();
    let h = '<div class="rules"><div class="topbar"><b>Jogar por Bluetooth</b><button data-act="btBack">Voltar</button></div>';
    if (!native) h += '<div class="card"><p>O Bluetooth só funciona no app Android (APK). Neste navegador ele não está disponível.</p></div>';
    h += '<div class="card"><p><b>Como fazer:</b></p><ol>' +
      '<li>Ligue o Bluetooth nos dois celulares e pareie um com o outro (botão abaixo, só na primeira vez).</li>' +
      '<li>Um celular toca em <b>Criar partida</b> e espera. Ele joga de Brancas e começa.</li>' +
      '<li>O outro toca em <b>Entrar numa partida</b> e escolhe o celular do amigo. Ele joga de Pretas.</li>' +
      '<li>Cada um monta as suas peças em segredo. O jogo começa quando os dois tocarem em Pronto.</li></ol></div>';
    if (b.msg) h += '<div class="hint">' + esc(b.msg) + '</div>';
    if (b.stage === 'idle') {
      h += '<div class="bar"><button data-act="btSettings"' + (native ? '' : ' disabled') + '>Abrir Bluetooth</button></div>' +
        '<div class="bar" style="margin-top:8px"><button class="hot" data-act="btHost"' + (native ? '' : ' disabled') + '>Criar partida</button>' +
        '<button class="hot" data-act="btJoin"' + (native ? '' : ' disabled') + '>Entrar numa partida</button></div>';
    } else if (b.stage === 'listening') {
      h += '<div class="bar"><button class="warn" data-act="btCancel">Cancelar</button></div>';
    } else if (b.stage === 'choose') {
      h += '<div class="card">' + b.devices.map(d => '<button class="primary" style="margin-bottom:8px" data-act="btConnect" data-v="' + esc(d.address) + '">' + esc(d.name) + '</button>').join('') + '</div>' +
        '<div class="bar"><button data-act="btSettings">Abrir Bluetooth</button><button data-act="btJoin">Atualizar lista</button></div>';
    } else if (b.stage === 'connecting') {
      h += '<div class="bar"><button class="warn" data-act="btCancel">Cancelar</button></div>';
    }
    return h + '</div>';
  }

  function onlineScreen() {
    const b = app.bt;
    let h = '<div class="rules"><div class="topbar"><b>Jogar online</b><button data-act="btBack">Voltar</button></div>' +
      '<div class="card"><p><b>Como fazer:</b></p><ol>' +
      '<li>Os dois celulares precisam de internet (Wi-Fi ou dados).</li>' +
      '<li>Um toca em <b>Criar partida</b> e passa o código de 4 letras para o amigo. Ele joga de Brancas e começa.</li>' +
      '<li>O outro digita o código e toca em <b>Entrar</b>. Ele joga de Pretas.</li>' +
      '<li>Cada um monta as suas peças em segredo. O jogo começa quando os dois tocarem em Pronto.</li></ol>' +
      '<p class="muted" style="margin:8px 0 0">A partida é para dois jogadores. O modo de assistir como espectador ainda não está disponível.</p></div>';
    if (b.msg) h += '<div class="hint">' + esc(b.msg) + '</div>';
    if (b.stage === 'idle') {
      h += '<div class="card"><button class="primary" data-act="onHost">Criar partida</button></div>' +
        '<div class="card"><h3>Entrar com código</h3>' +
        '<input id="code" class="codein" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CÓDIGO" value="' + esc(app.onlineCode) + '">' +
        '<button class="primary" data-act="onJoin">Entrar</button></div>';
    } else if (b.stage === 'listening') {
      if (b.code) h += '<div class="card"><p style="text-align:center;margin:0">Código da partida</p><div class="bigcode">' + esc(b.code) + '</div></div>';
      h += '<div class="bar"><button class="warn" data-act="btCancel">Cancelar</button></div>';
    } else if (b.stage === 'connecting') {
      h += '<div class="bar"><button class="warn" data-act="btCancel">Cancelar</button></div>';
    }
    return h + '</div>';
  }

  const STATUS_TXT = { online: 'Online', match: 'Em partida', tour: 'Em campeonato', offline: 'Offline' };
  const statusTxt = c => STATUS_TXT[app.fstat[c]] || 'verificando…';
  function presenceLine() {
    const pr = app.presence;
    if (!pr.visible) return '⚪ Invisível: seus amigos veem você offline';
    if (pr.state === 'ready') return '🟢 Você está online: amigos podem te chamar';
    if (pr.state === 'connecting') return '⏳ Conectando…';
    return '⚪ Sem conexão online' + (pr.msg ? ' (' + pr.msg + ')' : '');
  }
  function friendRowHtml(fr) {
    const st = app.fstat[fr.code];
    const canInv = app.fr.state !== 'inviting' && st !== 'offline' && st !== 'match' && st !== 'tour';
    return '<div class="frow"><div class="fwho">' + avHtml(fr.av) + '<div><b>' + esc(fr.nick) + '</b><br>' +
      '<span class="muted"><i class="dot ' + (st || 'wait') + '" data-st="' + esc(fr.code) + '"></i><span data-stt="' + esc(fr.code) + '">' + statusTxt(fr.code) + '</span> · ' + esc(fr.code) + '</span></div></div><div>' +
      '<button data-act="frInvite" data-inv="' + esc(fr.code) + '" data-v="' + esc(fr.code) + '"' + (canInv ? '' : ' disabled') + '>Chamar</button>' +
      '<button data-act="frRemove" data-v="' + esc(fr.code) + '">Remover</button></div></div>';
  }
  function friendsScreen() {
    const f = app.fr, me = app.me, pr = app.presence;
    let h = '<div class="rules"><div class="topbar"><b>Amigos</b><button data-act="frBack">Voltar</button></div>' +
      profileEditor() +
      '<div class="card"><p style="margin:0 0 4px;text-align:center">Seu código pessoal</p>' +
      '<div class="bigcode" style="font-size:34px;letter-spacing:6px">' + esc(me.code) + '</div>' +
      '<p style="text-align:center;font-size:13px">Passe este código para os seus amigos adicionarem você.</p>' +
      '<button data-act="frCopy">Copiar meu código</button></div>';
    h += '<div class="card"><h3>Aparecer online</h3><p style="margin:0 0 8px;font-size:14px" data-presline>' + presenceLine() + '</p>' +
      '<div class="seg"><button data-act="frVisible" data-v="1" class="' + (pr.visible ? 'on' : '') + '">Ligado</button>' +
      '<button data-act="frVisible" data-v="0" class="' + (pr.visible ? '' : 'on') + '">Invisível</button></div>' +
      '<p class="muted" style="margin:0">Ligado: seus amigos veem se você está online ou em partida e podem te chamar de qualquer tela do app (menos durante partida ou campeonato).</p></div>';
    if (f.msg) h += '<div class="hint">' + esc(f.msg) + '</div>';
    h += '<div class="card"><h3>Adicionar amigo</h3>' +
      '<input id="fcode" class="codein" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CÓDIGO" value="' + esc(f.newCode) + '">' +
      '<input id="fnick" class="txtin" maxlength="16" placeholder="Apelido do amigo" autocomplete="off" value="' + esc(f.newNick) + '">' +
      '<button class="primary" data-act="frAdd">Adicionar</button></div>';
    h += '<div class="card"><h3>Meus amigos</h3>';
    if (!app.friends.length) h += '<p>Nenhum amigo ainda. Adicione pelo código dele.</p>';
    app.friends.forEach(fr => { h += friendRowHtml(fr); });
    h += '<p class="muted" style="margin:8px 0 0">O status é atualizado sozinho enquanto esta tela está aberta.</p></div>';
    if (f.state === 'inviting') {
      h += '<div class="overlay center"><div class="sheet"><h2>Convite enviado</h2>' +
        '<p>Esperando ' + esc(f.target ? f.target.nick : 'seu amigo') + ' responder. Você joga de Brancas.</p>' +
        '<button class="warn" data-act="frCancelInvite">Cancelar</button></div></div>';
    }
    return h + '</div>';
  }
  // Convite recebido: aparece por cima de qualquer tela
  function renderInvite() {
    const box = $('#inv');
    if (!box) return;
    const i = app.inv;
    if (!i) { box.innerHTML = ''; return; }
    const known = app.friends.some(x => x.code === i.code);
    box.innerHTML = '<div class="overlay center"><div class="sheet">' + '<div style="font-size:54px;line-height:1">' + avOf(i.av) + '</div>' +
      '<h2>' + esc(i.nick) + ' chamou você para jogar</h2>' +
      '<p>Código ' + esc(i.code) + (known ? ' (seu amigo)' : ' (não está na sua lista)') + '. Você joga de Pretas.</p>' +
      '<button class="primary" data-act="frAccept">Aceitar</button><button data-act="frDecline">Recusar</button></div></div>';
  }
  // Atualiza só as bolinhas e botões (sem redesenhar a tela, para não atrapalhar quem está digitando)
  function paintStatus(code) {
    if (typeof document.querySelectorAll !== 'function') return;
    const st = app.fstat[code];
    document.querySelectorAll('[data-st]').forEach(el => { if (el.dataset.st === code) el.className = 'dot ' + (st || 'wait'); });
    document.querySelectorAll('[data-stt]').forEach(el => { if (el.dataset.stt === code) el.textContent = statusTxt(code); });
    document.querySelectorAll('[data-inv]').forEach(el => {
      if (el.dataset.inv === code) el.disabled = app.fr.state === 'inviting' || st === 'offline' || st === 'match' || st === 'tour';
    });
  }
  function paintPresence() {
    if (typeof document.querySelectorAll !== 'function') return;
    document.querySelectorAll('[data-presline]').forEach(el => { el.textContent = presenceLine(); });
  }

  /* ---------- Campeonato: telas ---------- */
  const MATCH_REASONS = { bye: 'passou direto' };
  function reasonText(r) {
    if (!r) return '';
    if (MATCH_REASONS[r]) return MATCH_REASONS[r];
    if (REASONS[r]) return REASONS[r];
    return r; // "W.O.: ..."
  }
  function tourFormatName(f) { return f === 'knockout' ? 'Mata-mata' : 'Todos contra todos'; }
  const TOUR_SAVE_KEY = 'manobra.tour.bot.save.v1';
  function tourBotOnly(s) { return !!(s && s.players && s.players.length && s.players.every(p => p.id === 0 || p.bot)); }
  function tourSaved() { try { return JSON.parse(localStorage.getItem(TOUR_SAVE_KEY) || 'null'); } catch (e) { return null; } }
  // Salvamento manual (botão). O estado do jogo vem do juiz (fonte única), então o celular e o juiz nunca divergem.
  function tourSaveLocal(silent) {
    const l = window.ManobraTourLink, s = app.tour.snap;
    if (!l || app.tour.role !== 'host' || !tourBotOnly(s)) return false;
    const data = l.saveState && l.saveState();
    if (!data) { if (!silent) toast('Não foi possível salvar este campeonato.'); return false; }
    let local = null;
    const mine = s.matches.find(m => m.status === 'playing' && (m.a === 0 || m.b === 0));
    if (mine) {
      const gm = data.rt && data.rt[mine.id] && data.rt[mine.id].game;
      if (!gm) return false; // montagem em andamento: mantém o último salvamento bom
      const opp = s.players.find(p => p.id === (mine.a === 0 ? mine.b : mine.a)) || {};
      local = { matchId: mine.id, humanSide: mine.a === 0 ? WHITE : BLACK, peer: { nick: opp.nick || 'Adversário', av: AV[opp.av] ? opp.av : 'robot' }, game: gm };
    }
    try { localStorage.setItem(TOUR_SAVE_KEY, JSON.stringify({ data: data, local: local, savedAt: Date.now() })); if (!silent) toast('Campeonato salvo neste celular.'); return true; }
    catch (e) { if (!silent) toast('Não há espaço suficiente para salvar o campeonato.'); return false; }
  }
  function tourClearSaved() { try { localStorage.removeItem(TOUR_SAVE_KEY); } catch (e) {} }
  function tourRestoreLocal(saved) {
    const x = saved && saved.local;
    if (!x || !x.game || !x.matchId) return;
    const g = new E.Game(Int8Array.from(x.game.b || []));
    g.st.turn = x.game.turn | 0; g.over = x.game.over || null; g.last = x.game.last || null;
    g.plies = x.game.plies | 0; g.hist = new Map(Array.isArray(x.game.hist) ? x.game.hist : []);
    if (!g.over) g.refresh(); else g.cur = null;
    app.mode = 'bt'; app.net = 'tour'; app.btLinked = true; app.btReady = false;
    app.humanSide = x.humanSide == null ? WHITE : x.humanSide; app.peer = x.peer || app.peer;
    app.tour.matchId = x.matchId; app.game = g; app.screen = 'game'; app.animating = false; render();
  }

  function tourMatchRow(m, s, t) {
    const T = window.ManobraTournament;
    const nk = id => (id == null ? 'a definir' : esc(T.nickOf(s, id)));
    const pa = m.a == null ? null : s.players.find(x => x.id === m.a);
    const pb = m.b == null ? null : s.players.find(x => x.id === m.b);
    const bots = !!(pa && pb && pa.bot && pb.bot);
    const ph = id => {
      const p = id == null ? null : s.players.find(x => x.id === id);
      return p ? '<span class="fwho">' + avHtml(p.av) + '<b>' + esc(p.nick) + '</b></span>' : 'a definir';
    };
    let status;
    if (m.status === 'done') {
      const winnerDiff = m.winner === m.a ? (m.diff && m.diff[0]) : (m.diff && m.diff[1]);
      const saldo = m.reason !== 'bye' && Number.isFinite(Number(winnerDiff)) ? ' · saldo de peças: ' + (winnerDiff > 0 ? '+' : '') + winnerDiff : '';
      status = m.reason === 'bye' ? esc(nk(m.winner)) + ' passa direto'
        : '<b>' + nk(m.winner) + '</b> venceu <span class="muted">(' + esc(reasonText(m.reason) + saldo) + ')</span>';
    } else if (m.status === 'playing') {
      status = bots
        ? '<span class="live">simulação dos robôs em andamento</span>'
        : '<span class="live">em andamento</span>';
    }
    else if (m.a == null || m.b == null) status = '<span class="muted">aguardando</span>';
    else status = '<span class="muted">' + ((m.ready[0] || m.ready[1]) ? 'alguém já está pronto' : 'pendente') + '</span>';
    return '<div class="mrow"><div>' + ph(m.a) + ' <span class="muted">×</span> ' + ph(m.b) + '<br>' + status + '</div></div>';
  }

  function tourScreen() {
    const t = app.tour, T = window.ManobraTournament;
    let h = '<div class="rules"><div class="topbar"><b>Campeonato</b><button data-act="tourExit">Voltar</button></div>';
    const timerActive = t.snap && t.snap.matches && t.snap.matches.some(m => m.timer && m.status !== 'done');
    if (timerActive) scheduleTourTimer();
    if (t.msg) h += '<div class="hint">' + esc(t.msg) + '</div>';
    if (!t.role) {
      if (t.connecting) return h + '<div class="hint">Conectando…</div></div>';
      h += '<div class="card"><p style="margin:0">Juntem de 1 a 8 jogadores (robôs completam): todos contra todos (com pontos) ou mata-mata (chaveamento). ' +
        'O celular de quem cria vira o "juiz": confere as jogadas e decide quem venceu. Ele também joga. ' +
        'Sozinho? Dá para jogar contra robôs.</p></div>' + profileEditor() +
        '<div class="card"><button class="primary" data-act="tourCreate">Criar campeonato</button>' +
        (tourSaved() ? '<button data-act="tourResume" style="margin-top:8px">Continuar campeonato salvo</button><button class="link" data-act="tourClearSaved">Apagar campeonato salvo</button>' : '') + '</div>' +
        '<div class="card"><h3>Entrar com código</h3>' +
        '<input id="tcode" class="codein" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="CÓDIGO" value="' + esc(app.tourCode) + '">' +
        '<button class="primary" data-act="tourJoin">Entrar</button></div>';
      return h + '</div>';
    }
    const s = t.snap;
    if (!s) return h + '<div class="hint">Conectando…</div></div>';
    const isOrg = t.myId === 0;
    if (s.status === 'lobby') {
      if (t.local) h += '<div class="card"><p style="margin:0;text-align:center"><b>Campeonato offline</b></p><p style="text-align:center;font-size:13px;margin:6px 0 0">Sem internet: só dá para jogar contra robôs. Adicione robôs abaixo. Use o botão Salvar para continuar depois.</p></div>';
      else h += '<div class="card"><p style="margin:0;text-align:center">Código do campeonato</p><div class="bigcode">' + esc(t.code || '') + '</div>' +
        '<p style="text-align:center;font-size:13px;margin:0">' + (isOrg ? 'Passe este código para os jogadores (de 1 a 8, contando com você e os robôs).' : 'Aguardando o organizador iniciar.') + '</p></div>';
      h += '<div class="card"><h3>Jogadores (' + s.players.length + '/' + T.MAX_PLAYERS + ')</h3>';
      s.players.forEach(p => {
        h += '<div class="mrow"><div class="fwho">' + avHtml(p.av) + '<span><b>' + esc(p.nick) + '</b>' + (p.id === 0 ? ' <span class="muted">(organizador)</span>' : '') +
          (p.bot ? ' <span class="muted">(IA)</span>' : '') +
          (p.id === t.myId ? ' <span class="muted">(você)</span>' : '') + '</span></div><div class="btns">' +
          (p.bot && isOrg ? '<button data-act="tourRmBot" data-v="' + p.id + '">Tirar</button>' : '<span class="' + (p.connected ? 'live' : 'muted') + '">' + (p.connected ? 'online' : 'fora') + '</span>') + '</div></div>';
      });
      if (isOrg) {
        h += '<button data-act="tourAddBot"' + (s.players.length >= T.MAX_PLAYERS ? ' disabled' : '') + '>+ Adicionar robô</button>';
        if (s.players.some(p => p.bot)) {
          h += '<p class="muted" style="margin:10px 0 4px">Nível dos robôs:</p><div class="seg" style="margin:0">' +
            [['easy', 'Fácil'], ['medium', 'Médio'], ['hard', 'Difícil']].map(l => '<button data-act="tourBotLevel" data-v="' + l[0] + '" class="' + (s.botLevel === l[0] ? 'on' : '') + '">' + l[1] + '</button>').join('') + '</div>';
        }
      }
      h += '</div>';
      if (isOrg) {
        h += '<div class="card"><h3>Formato</h3><div class="seg">' +
          ['league', 'knockout'].map(f => '<button data-act="tourFmt" data-v="' + f + '" class="' + (s.format === f ? 'on' : '') + '">' + tourFormatName(f) + '</button>').join('') + '</div>' +
          '<p style="font-size:13px;margin:0 0 8px">' + (s.format === 'knockout'
            ? 'Chaveamento sorteado: quem perde está fora. Se não fechar 4 ou 8 jogadores, alguns passam direto na 1ª fase.'
            : 'Todos jogam contra todos. Vitória vale 3 pontos. Desempate: confronto direto e saldo de peças.') + '</p>' +
          (s.players.length < T.MIN_PLAYERS ? '<p class="muted" style="margin:0 0 8px">Você está sozinho: ao iniciar, entra 1 robô como adversário (ou adicione mais robôs).</p>' : '') +
          '<button class="primary" data-act="tourStart">Iniciar campeonato</button></div>';
      } else {
        h += '<div class="card"><p style="margin:0">Formato: <b>' + tourFormatName(s.format) + '</b></p></div>';
      }
      return h + '</div>';
    }

    // campeonato em andamento ou terminado
    if (s.status === 'finished' && s.champion != null) {
      h += '<div class="card" style="text-align:center"><h3 style="margin:0">🏆 Campeão</h3><div class="bigcode" style="font-size:30px;letter-spacing:2px;padding:10px 0 4px">' + avHtml((s.players.find(x => x.id === s.champion) || {}).av) + ' ' + esc(T.nickOf(s, s.champion)) + '</div></div>';
    }
    if (isOrg && tourBotOnly(s)) h += '<div class="card"><button data-act="tourSave">Salvar campeonato neste celular</button><p class="muted" style="margin:6px 0 0">Toque para guardar o ponto em que está (também há o botão 💾 Salvar durante a partida). Para continuar depois: Campeonato &gt; Continuar campeonato salvo.</p></div>';
    const busyMe = s.players.some(p => p.id === t.myId && p.busy);
    const mine = s.matches.filter(m => (m.a === t.myId || m.b === t.myId));
    h += '<div class="card"><h3>Minhas partidas</h3>';
    const playable = mine.filter(m => m.a != null && m.b != null);
    const openRound = playable.filter(m => m.status !== 'done').reduce((min, m) => Math.min(min, m.round), Infinity);
    if (!playable.length) h += '<p style="margin:0">Nenhuma partida disponível agora.</p>';
    playable.forEach(m => {
      const meIdx = m.a === t.myId ? 0 : 1, opp = meIdx === 0 ? m.b : m.a;
      const isCurrent = m.round === openRound;
      const oppP = s.players.find(p => p.id === opp);
      const oppReady = m.ready[1 - meIdx] || !!(oppP && oppP.bot);
      const seconds = m.timer ? Math.max(0, Math.ceil((Number(m.timer.until) - Date.now()) / 1000)) : 0;
      const countdown = m.timer ? '<b class="countdown">' + String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0') + '</b>' : '';
      let right = '';
      if (m.status === 'pending' && isCurrent) {
        if (m.ready[meIdx]) right = '<button data-act="tourUnready">Cancelar</button>';
        else right = '<button class="hot" data-act="tourPlay" data-v="' + esc(m.id) + '"' + (busyMe ? ' disabled' : '') + '>Jogar</button>';
      }
      let status;
      if (m.status === 'done') status = m.winner === t.myId ? '<b>Você venceu</b>' : 'Você perdeu';
      else if (m.status === 'playing') status = m.timer && m.timer.kind === 'setup'
        ? '<span class="live">montagem das peças — tempo restante: ' + countdown + '</span>'
        : '<span class="live">em andamento</span>';
      else if (!isCurrent) status = '<span class="muted">aguardando a rodada anterior</span>';
      else if (m.ready[meIdx]) status = 'Você: <b>entrou</b> · adversário: <b>' + (oppP && oppP.bot ? 'entrou automaticamente' : 'aguardando ficar pronto') + '</b> — tempo: ' + countdown;
      else if (oppReady) status = '<span class="live">Adversário ' + (oppP && oppP.bot ? 'entrou automaticamente' : 'já está pronto') + '.</span> Você: <b>não entrou</b> — ' + countdown;
      else status = '<span class="muted">Você: ' + countdown + ' · adversário: ' + countdown + '</span>';
      h += '<div class="mrow"><div>' + (T.roundLabel(s.format, s.rounds, m.round)) + ': contra <b>' + esc(T.nickOf(s, opp)) + '</b>' +
        (oppP && !oppP.connected ? ' <span class="muted">(fora)</span>' : '') + '<br>' + status + '</div><div class="btns">' + right + '</div></div>';
    });
    h += '</div>';

    if (s.format === 'league') {
      const rows = T.standings(s);
      h += '<div class="card"><h3>Classificação</h3><table class="tbl"><tr><th>#</th><th>Jogador</th><th>J</th><th>V</th><th>D</th><th>Pts</th><th>Saldo</th></tr>' +
        rows.map(r => { const p = s.players.find(x => x.id === r.id) || {}; return '<tr' + (r.id === t.myId ? ' class="me"' : '') + '><td>' + r.pos + '</td><td><span class="fwho">' + avHtml(p.av) + '<b>' + esc(r.nick) + '</b></span></td><td>' + r.played + '</td><td>' + r.wins + '</td><td>' + r.losses + '</td><td><b>' + r.points + '</b></td><td>' + (r.diff > 0 ? '+' : '') + r.diff + '</td></tr>'; }).join('') +
        '</table><p class="muted" style="margin:6px 0 0">J = jogos, V = vitórias, D = derrotas, Saldo = peças a mais que o adversário.</p></div>';
    }
    // todas as partidas, por rodada / fase
    const byRound = {};
    s.matches.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
    h += '<div class="card"><h3>' + (s.format === 'knockout' ? 'Chaveamento' : 'Todas as partidas') + '</h3>';
    Object.keys(byRound).map(Number).sort((x, y) => x - y).forEach(r => {
      h += '<p class="muted" style="margin:10px 0 0"><b>' + T.roundLabel(s.format, s.rounds, r) + '</b></p>';
      byRound[r].forEach(m => { h += tourMatchRow(m, s, t); });
    });
    h += '</div>';
    return h + '</div>';
  }

  /* ---------- Tela sempre acesa durante o jogo ---------- */
  // Acesa na montagem, na partida e no campeonato; ao voltar ao menu, o celular volta ao comportamento normal.
  const awake = { on: false, lock: null };
  function nativeScreen() {
    try {
      const C = window.Capacitor;
      if (!C) return null;
      const native = C.isNativePlatform ? C.isNativePlatform() : (C.getPlatform ? C.getPlatform() !== 'web' : false);
      if (!native) return null;
      if (C.Plugins && C.Plugins.ManobraScreen) return C.Plugins.ManobraScreen;
      if (C.registerPlugin) return C.registerPlugin('ManobraScreen');
    } catch (e) { /* sem plugin */ }
    return null;
  }
  function syncAwake(force) {
    const want = app.screen === 'game' || app.screen === 'setup' || app.screen === 'tour';
    if (want === awake.on && !force) return;
    awake.on = want;
    try { const p = nativeScreen(); if (p) Promise.resolve(p.keepAwake({ on: want })).catch(() => {}); } catch (e) { /* ok */ }
    try { // navegador / WebView com Wake Lock
      if (want && navigator.wakeLock && navigator.wakeLock.request && !awake.lock && !(document && document.hidden)) {
        navigator.wakeLock.request('screen').then(l => { awake.lock = l; if (!awake.on) { l.release().catch(() => {}); awake.lock = null; } else l.addEventListener('release', () => { awake.lock = null; }); }).catch(() => {});
      } else if (!want && awake.lock) { const l = awake.lock; awake.lock = null; l.release().catch(() => {}); }
    } catch (e) { /* ok */ }
  }

  function render() {
    syncAwake();
    const root = $('#app');
    if (app.screen === 'menu') root.innerHTML = menuScreen();
    else if (app.screen === 'tour') root.innerHTML = tourScreen();
    else if (app.screen === 'friends') root.innerHTML = friendsScreen();
    else if (app.screen === 'rules') root.innerHTML = rulesScreen();
    else if (app.screen === 'online') root.innerHTML = onlineScreen();
    else if (app.screen === 'bt') root.innerHTML = btScreen();
    else if (app.screen === 'setup') root.innerHTML = setupScreen();
    else root.innerHTML = gameScreen();
    syncPresenceStatus();
  }

  /* ---------- Montagem ---------- */
  function clearSide(s) { for (let i = 0; i < N; i++) if (app.pieces[i] && E.sideOf(app.pieces[i]) === s) app.pieces[i] = 0; }
  function placeList(s, list) { clearSide(s); for (const o of list) app.pieces[o.i] = o.p; }
  function sendSetupProgress() {
    if (app.net !== 'tour' || !app.tour.matchId || !app.btLinked) return;
    const list = [];
    for (let i = 0; i < N; i++) if (app.pieces[i] && E.sideOf(app.pieces[i]) === app.setupSide) list.push([i, app.pieces[i]]);
    btSend({ k: 'setupProgress', p: list });
  }
  function placeAI(s) {
    placeList(s, app.level === 'easy' ? E.randomSetup(s) : E.presetSetup(s, Math.random));
  }

  function onSetupCell(i) {
    if (app.mode === 'bt' && app.btReady) return;
    const s = app.setupSide;
    if (!E.inTerritory(i, s)) { toast('Coloque as peças só no seu terreno (casas verdes).'); return; }
    const p = app.pieces[i];
    const c = counts(app.pieces)[s];
    if (!p) {
      if (c[0] + c[1] >= PIECES) { toast('Já são ' + PIECES + ' peças. Remova uma para mudar.'); return; }
      app.pieces[i] = E.makePiece(s, true);
    } else if (E.isAttack(p)) {
      if (c[1] >= MAX_DEF) { toast('No máximo ' + MAX_DEF + ' peças em defesa.'); app.pieces[i] = 0; }
      else app.pieces[i] = E.makePiece(s, false);
    } else app.pieces[i] = 0;
    sendSetupProgress();
    render();
  }

  function setupDone() {
    const s = app.setupSide;
    const c = counts(app.pieces)[s];
    if (c[0] + c[1] !== PIECES || c[1] > MAX_DEF) { toast('Coloque exatamente ' + PIECES + ' peças (máx. ' + MAX_DEF + ' em defesa).'); return; }
    if (app.mode === 'bt') {
      if (app.btReady) return;
      const list = [];
      for (let i = 0; i < N; i++) if (app.pieces[i]) list.push([i, app.pieces[i]]);
      btSend({ k: 'setup', p: list });
      app.btReady = true;
      render();
      tryStartBt();
      return;
    }
    if (app.mode === 'ai') {
      if (app.humanSide === WHITE) placeAI(BLACK);
      startGame();
    } else if (s === WHITE) {
      app.setupSide = BLACK;
      app.flipped = app.rotate;
      render();
    } else startGame();
  }

  /* ---------- Partida ---------- */
  function updateFlip() {
    if (app.mode === 'pvp' && app.rotate) app.flipped = app.game.st.turn === BLACK;
  }

  function startGame() {
    app.game = new E.Game(app.pieces);
    app.screen = 'game';
    app.sel = -1; app.purge = false; app.choice = null; app.thinking = false; app.animating = false; app.animToken++;
    if (app.mode === 'ai' || app.mode === 'bt') app.flipped = app.humanSide === BLACK;
    else app.flipped = app.rotate && app.game.st.turn === BLACK;
    render();
    afterMove(false);
    processBtQueue();
  }

  function afterMove(announce) {
    const g = app.game;
    if (g.over) { render(); return; }
    if (announce && g.cur && g.cur.blocked > 0 && (app.mode === 'pvp' || g.st.turn === app.humanSide)) {
      toast('Efeito looping: esse movimento repetido não é permitido, faça outro.');
    }
    if (app.mode === 'ai' && g.st.turn !== app.humanSide) aiTurn();
  }

  function aiTurn() {
    app.thinking = true;
    render();
    const token = app.game;
    setTimeout(() => {
      if (app.game !== token || app.screen !== 'game') return;
      const g = app.game;
      let l = g.legal({ noSeventh: true });
      if (!l.moves.length) l = g.cur;
      const mv = E.chooseMove(g.st, l.moves, app.level);
      app.thinking = false;
      doMove(mv);
    }, 80);
  }

  /* ---------- Animação dos movimentos ---------- */
  const cellEl = i => document.querySelector('[data-i="' + i + '"]');
  const pcEl = i => { const c = cellEl(i); return c && c.querySelector ? c.querySelector('.pc') : null; };
  function offset(fromI, toI) { // deslocamento em px da casa `fromI` até a casa `toI`
    const a = cellEl(fromI), b = cellEl(toI);
    if (!a || !b || !a.getBoundingClientRect || !b.getBoundingClientRect) return null;
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return [ra.left - rb.left, ra.top - rb.top];
  }
  function slide(el, dx, dy, dur) {
    el.style.transition = 'none';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    el.style.zIndex = 5;
    void el.getBoundingClientRect();
    el.style.transition = 'transform ' + dur + 'ms ease-in-out';
    el.style.transform = 'translate(0px,0px)';
  }
  function ghost(i, piece, dur, delayFrac) { // peça eliminada some devagar
    const cell = cellEl(i);
    if (!cell || !piece || !document.createElement) return;
    const gh = document.createElement('div');
    gh.className = 'ghost';
    gh.innerHTML = pieceSvg(piece);
    cell.appendChild(gh);
    void gh.offsetWidth;
    const delay = Math.round(dur * delayFrac);
    gh.style.transition = 'opacity ' + (dur - delay) + 'ms ease-in ' + delay + 'ms, transform ' + (dur - delay) + 'ms ease-in ' + delay + 'ms';
    gh.style.opacity = '0';
    gh.style.transform = 'scale(0.4)';
  }
  // Roda depois do render (as peças já estão nas casas novas). Retorna a duração, ou 0 se não animou.
  function animate(mv, cap, dur) {
    try {
      if (mv.t === 'f') {
        const el = pcEl(mv.from);
        if (!el) return 0;
        el.style.transition = 'none';
        el.style.transform = 'scale(0.2) rotate(-200deg)';
        void el.getBoundingClientRect();
        el.style.transition = 'transform ' + dur + 'ms ease-out';
        el.style.transform = 'none';
        return dur;
      }
      if (mv.t === 'x') {
        if (!cellEl(mv.to)) return 0;
        ghost(mv.to, cap, dur, 0);
        return dur;
      }
      const off = offset(mv.from, mv.to), el = pcEl(mv.to);
      if (!off || !el) return 0;
      slide(el, off[0], off[1], dur);
      if (mv.t === 'k') ghost(mv.to, cap, dur, 0.55);
      if (mv.t === 'p' || mv.t === 's') {
        const dest = mv.t === 'p' ? mv.beyond : mv.from;
        const o2 = offset(mv.to, dest), e2 = pcEl(dest);
        if (o2 && e2) slide(e2, o2[0], o2[1], dur);
      }
      return dur;
    } catch (err) { return 0; }
  }

  function finishAnim(token) {
    if (app.animToken !== token || !app.animating) return;
    app.animating = false;
    updateFlip();
    render();
    const g = app.game;
    if (g.over) {
      const mine = app.mode === 'pvp' || g.over.winner === app.humanSide;
      sfx(mine ? 'win' : 'lose', 0);
    }
    afterMove(true);
    processBtQueue();
  }

  // remote = jogada recebida do adversário por Bluetooth (não é enviada de volta)
  function doMove(mv, remote) {
    const g = app.game;
    if (app.mode === 'bt' && !remote) btSend({ k: 'move', m: { t: mv.t, from: mv.from, to: mv.to, beyond: mv.beyond } });
    const cap = g.st.b[mv.to]; // peça que estava na casa de destino (para animar a eliminação)
    g.play(mv);
    app.sel = -1; app.purge = false; app.choice = null;
    const token = ++app.animToken;
    app.animating = true;
    render();
    const dur = animate(mv, cap, DURS[app.speed] || DURS.slow);
    // o som toca quando a peça chega (movimentos) ou na hora (virar modo / eliminar defesa)
    const land = (mv.t === 'f' || mv.t === 'x') ? 0 : Math.round(dur * 0.88);
    sfx(mv.t, land);
    if (!dur) { finishAnim(token); return; }
    setTimeout(() => finishAnim(token), dur + 150);
  }

  function onGameCell(i) {
    const g = app.game;
    if (!isHumanTurn() || app.choice) return;
    const s = g.st.turn, b = g.st.b;
    if (app.purge) {
      const m = g.cur.moves.find(x => x.t === 'x' && x.to === i);
      if (m) doMove(m); else toast('Toque numa peça de defesa do adversário.');
      return;
    }
    if (app.sel >= 0) {
      const ms = g.cur.moves.filter(m => m.from === app.sel && m.to === i && m.t !== 'f');
      if (ms.length === 1) { doMove(ms[0]); return; }
      if (ms.length > 1) { app.choice = ms; render(); return; }
    }
    if (b[i] && E.sideOf(b[i]) === s) {
      app.sel = app.sel === i ? -1 : i;
      if (app.sel >= 0) sfx('sel', 0);
    } else app.sel = -1;
    render();
  }

  /* ---------- Bluetooth (dois celulares) ---------- */
  // O plugin nativo (ManobraBluetooth) só existe no app Android. Fora dele, btPlugin() = null.
  function nativeBt() {
    try {
      const C = window.Capacitor;
      if (!C) return null;
      const native = C.isNativePlatform ? C.isNativePlatform() : (C.getPlatform ? C.getPlatform() !== 'web' : false);
      if (!native) return null;
      if (C.Plugins && C.Plugins.ManobraBluetooth) return C.Plugins.ManobraBluetooth;
      if (C.registerPlugin) return C.registerPlugin('ManobraBluetooth');
    } catch (e) { /* sem plugin */ }
    return null;
  }
  // O "cano" atual do jogo remoto: Bluetooth (plugin nativo) ou internet (online.js)
  function btPlugin() {
    if (app.net === 'tour') return tourTransport;
    return app.net === 'online' ? (window.ManobraOnline || null) : nativeBt();
  }
  function errMsg(e) {
    const m = e && e.message ? e.message : String(e);
    if (/not implemented|unimplemented/i.test(m)) return 'Bluetooth indisponível nesta versão do app.';
    return m;
  }
  async function btEnsure() {
    const p = btPlugin();
    if (!p) throw new Error('O Bluetooth só funciona no app Android.');
    let st = await p.status();
    if (!st.available) throw new Error('Este aparelho não tem Bluetooth.');
    if (!st.permission) {
      st = await p.requestAccess();
      if (!st.permission) throw new Error('Permissão de Bluetooth negada. Libere nas configurações do app.');
    }
    if (!st.enabled) throw new Error('Ligue o Bluetooth do celular (botão "Abrir Bluetooth").');
    btAttach(p);
    return p;
  }
  function btAttach(p) {
    if (attachedPlugins.indexOf(p) >= 0) return;
    attachedPlugins.push(p);
    p.addListener('connected', ev => btConnected((ev && ev.role) || (app.bt.stage === 'connecting' ? 'guest' : 'host'), ev && ev.name));
    p.addListener('message', ev => handleBtMessage(ev && ev.data));
    p.addListener('disconnected', () => btDisconnected());
    if (p === window.ManobraOnline) { // convites de amigos (só existem no modo online)
      p.addListener('invite', ev => onInvite(ev));
      p.addListener('inviteEnd', () => onInviteEnd());
      p.addListener('presenceLost', () => presenceLost());
    }
  }
  function btSend(obj) {
    const p = btPlugin();
    if (!p || !app.btLinked) return;
    try { Promise.resolve(p.send({ data: JSON.stringify(obj) })).catch(() => {}); } catch (e) { /* ok */ }
  }
  function btLeave() {
    const p = btPlugin();
    if (p) {
      if (app.btLinked) btSend({ k: 'bye' });
      setTimeout(() => { try { Promise.resolve(p.close()).catch(() => {}); } catch (e) { /* ok */ } }, 200);
    }
    app.btLinked = false; app.btReady = false; app.peerSetup = null; app.btQueue.length = 0;
    app.bt = { stage: 'idle', devices: [], msg: '', code: '' };
    app.peer = { nick: 'Adversário', av: 'robot' };
  }
  function btConnected(role, name) {
    if (app.btLinked) return;
    app.btLinked = true;
    app.mode = 'bt';
    app.humanSide = role === 'host' ? WHITE : BLACK;
    app.peerSetup = null;
    app.peer = { nick: (name && String(name)) || app.peer.nick || 'Adversário', av: app.peer.av || 'robot' };
    app.bt.stage = 'idle';
    btSend({ k: 'hello', v: 1, nick: myNick(), av: app.me.av });
    toast('Conectado' + (name ? ' a ' + name : '') + '. Você joga de ' + NAMES[app.humanSide] + '.');
    startSetup('bt');
  }
  function btDisconnected() {
    if (!app.btLinked) return;
    app.btLinked = false;
    app.btReady = false;
    app.btQueue.length = 0;
    app.peer = { nick: 'Adversário', av: 'robot' };
    toast('Conexão Bluetooth encerrada.');
    if (app.screen === 'game' && app.game && app.game.over) { render(); return; }
    app.screen = 'menu'; app.game = null; app.animating = false; app.animToken++;
    render();
  }
  function btError(msg) {
    toast(msg);
    btLeave();
    if (app.net === 'tour') { tourEndMatchLocal(); app.screen = 'tour'; render(); return; }
    app.screen = 'menu'; app.game = null; app.animating = false; app.animToken++;
    render();
  }

  function validPeerSetup(list) {
    if (!Array.isArray(list) || list.length !== PIECES) return false;
    const side = app.humanSide ^ 1, seen = new Set();
    const terr = new Set(E.territoryCells(side));
    let def = 0;
    for (const it of list) {
      if (!Array.isArray(it) || it.length !== 2) return false;
      const i = it[0], p = it[1];
      if (!Number.isInteger(i) || !terr.has(i) || seen.has(i)) return false;
      if (!(p === 1 || p === 2 || p === 3 || p === 4) || E.sideOf(p) !== side) return false;
      if (!E.isAttack(p)) def++;
      seen.add(i);
    }
    return def <= MAX_DEF;
  }
  function tryStartBt() {
    if (app.mode !== 'bt' || app.screen !== 'setup' || !app.btReady || !app.peerSetup) return;
    for (const it of app.peerSetup) app.pieces[it[0]] = it[1];
    app.peerSetup = null;
    app.btReady = false;
    startGame();
  }
  function handleBtMessage(line) {
    let o;
    try { o = JSON.parse(line); } catch (e) { return; }
    if (!o || typeof o !== 'object') return;
    if (o.k === 'hello') {
      const nick = cleanNick(o.nick);
      app.peer = { nick: nick || app.peer.nick || 'Adversário', av: AV[o.av] ? o.av : (app.peer.av || 'robot') };
      if (app.screen === 'setup' || app.screen === 'game') render();
    } else if (o.k === 'setup') {
      if (!validPeerSetup(o.p)) { btError('O adversário enviou uma montagem inválida.'); return; }
      app.peerSetup = o.p;
      tryStartBt();
    } else if (o.k === 'autoSetup') {
      // montagem sorteada pelo juiz ao fim do tempo; cópias repetidas ou tardias são ignoradas
      if (app.mode !== 'bt' || app.screen !== 'setup' || !Array.isArray(o.p)) return;
      placeList(app.humanSide, o.p.map(it => ({ i: it[0], p: it[1] }))); // o juiz manda pares [casa, peça]
      if (Array.isArray(o.opp)) app.peerSetup = o.opp;
      app.btReady = true;
      tryStartBt();
    } else if (o.k === 'move') {
      app.btQueue.push(o.m);
      processBtQueue();
    } else if (o.k === 'bye') {
      app.btLinked = false;
      toast('O adversário saiu da partida.');
      if (app.screen === 'game' && app.game && app.game.over) { render(); return; }
      btLeave();
      app.screen = 'menu'; app.game = null; app.animating = false; app.animToken++;
      render();
    }
  }
  // Aplica as jogadas recebidas, uma de cada vez, sem atropelar a animação em andamento
  function processBtQueue() {
    if (app.mode !== 'bt' || !app.game || app.screen !== 'game' || app.animating || !app.btQueue.length) return;
    const g = app.game;
    if (g.over) { app.btQueue.length = 0; return; }
    if (g.st.turn === app.humanSide) { app.btQueue.length = 0; btError('Jogada recebida fora de hora. Partida encerrada.'); return; }
    const o = app.btQueue.shift();
    const mv = o && g.cur.moves.find(m => m.t === o.t && m.from === o.from && m.to === o.to && (m.beyond | 0) === (o.beyond | 0));
    if (!mv) { btError('Jogada inválida recebida. Partida encerrada.'); return; }
    doMove(mv, true);
  }

  async function btHost() {
    try {
      const p = await btEnsure();
      app.bt.stage = 'listening';
      app.bt.msg = 'Aguardando o outro celular entrar… Você joga de Brancas.';
      render();
      await p.listen();
    } catch (e) { app.bt.stage = 'idle'; app.bt.msg = errMsg(e); render(); }
  }
  async function btJoin() {
    try {
      const p = await btEnsure();
      const r = await p.pairedDevices();
      app.bt.devices = (r && r.devices) || [];
      app.bt.stage = 'choose';
      app.bt.msg = app.bt.devices.length ? 'Escolha o celular do seu amigo:' : 'Nenhum celular pareado. Toque em "Abrir Bluetooth", pareie com o amigo e volte aqui.';
      render();
    } catch (e) { app.bt.stage = 'idle'; app.bt.msg = errMsg(e); render(); }
  }
  async function btConnect(address) {
    try {
      const p = btPlugin();
      app.bt.stage = 'connecting';
      app.bt.msg = 'Conectando… (o outro celular precisa ter tocado em "Criar partida")';
      render();
      const r = await p.connect({ address: address });
      btConnected('guest', r && r.name);
    } catch (e) {
      if (app.btLinked) return;
      app.bt.stage = 'choose'; app.bt.msg = errMsg(e); render();
    }
  }

  /* ---------- Jogo online (pela internet) ---------- */
  function onlineEnsure() {
    const p = window.ManobraOnline;
    if (!p) throw new Error('O módulo online não está disponível nesta versão.');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Sem internet. Conecte-se ao Wi-Fi ou aos dados móveis.');
    app.net = 'online';
    btAttach(p);
    return p;
  }
  async function onlineHost() {
    try {
      const p = onlineEnsure();
      app.bt.stage = 'listening'; app.bt.code = ''; app.bt.msg = 'Criando a partida…';
      render();
      const r = await p.listen();
      if (app.bt.stage !== 'listening' || app.net !== 'online' || app.btLinked) return; // cancelou no meio
      app.bt.code = r.code;
      app.bt.msg = 'Passe este código para o seu amigo e espere. Você joga de Brancas.';
      render();
    } catch (e) {
      app.bt.stage = 'idle'; app.bt.code = ''; app.bt.msg = errMsg(e); render();
    }
  }
  async function onlineJoin() {
    const code = String(app.onlineCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { toast('Digite o código de 4 letras ou números.'); return; }
    try {
      const p = onlineEnsure();
      app.bt.stage = 'connecting'; app.bt.msg = 'Conectando…';
      render();
      const r = await p.connect({ address: code });
      btConnected('guest', r && r.name);
    } catch (e) {
      if (app.btLinked) return;
      app.bt.stage = 'idle'; app.bt.msg = errMsg(e); render();
    }
  }

  /* ---------- Amigos (perfil e lista ficam salvos neste aparelho) ---------- */
  const mem = {};
  function lsGet(k) {
    try { const v = localStorage.getItem('manobra.' + k); if (v != null) return v; } catch (e) { /* ok */ }
    return mem[k] == null ? null : mem[k];
  }
  function lsSet(k, v) {
    mem[k] = v;
    try { localStorage.setItem('manobra.' + k, v); } catch (e) { /* ok */ }
  }
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newMyCode() {
    let out = '';
    for (let i = 0; i < 6; i++) {
      let r;
      if (window.crypto && window.crypto.getRandomValues) r = window.crypto.getRandomValues(new Uint32Array(1))[0];
      else r = Math.floor(Math.random() * 4294967296);
      out += CODE_CHARS[r % CODE_CHARS.length];
    }
    return out;
  }
  const cleanNick = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
  const cleanCode6 = s => String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  function saveMe() { lsSet('me', JSON.stringify(app.me)); }
  function saveFriends() { lsSet('friends', JSON.stringify(app.friends)); }
  function loadProfile() {
    let me = null;
    try { me = JSON.parse(lsGet('me')); } catch (e) { me = null; }
    if (!me || !/^[A-Z0-9]{6}$/.test(String(me.code))) me = { code: newMyCode(), nick: '' };
    me.nick = cleanNick(me.nick);
    if (!AV[me.av]) me.av = AVATARS[Math.floor(Math.random() * AVATARS.length)][0];
    app.me = me;
    app.presence.visible = lsGet('visible') !== '0';
    saveMe();
    let fl = [];
    try { fl = JSON.parse(lsGet('friends')) || []; } catch (e) { fl = []; }
    app.friends = Array.isArray(fl) ? fl.filter(x => x && /^[A-Z0-9]{6}$/.test(String(x.code))).map(x => ({ code: x.code, nick: cleanNick(x.nick) || x.code, av: AV[x.av] ? x.av : '' })).slice(0, 100) : [];
  }
  const myNick = () => app.me.nick || 'Jogador';

  /* ---- presença: o app fica "registrado" com o código pessoal enquanto estiver aberto ---- */
  let presRetry = null, presBusy = false;
  const isBusy = () => app.screen === 'game' || app.screen === 'setup' || app.btLinked || !!app.tour.role ||
    app.fr.state === 'inviting' || app.animating || ((app.screen === 'online' || app.screen === 'bt') && app.bt.stage !== 'idle');
  const myStatus = () => (app.tour.role ? 'tour' : isBusy() ? 'match' : 'online');
  function syncPresenceStatus() {
    const p = window.ManobraOnline;
    if (!p || !p.setStatus) return;
    p.setStatus(myStatus());
    if (p.setAvatar) p.setAvatar(app.me.av);
  }
  async function presenceStart() {
    const p = window.ManobraOnline;
    if (!app.presence.visible || !p || !p.startPresence || presBusy || app.presence.state === 'ready') return;
    clearTimeout(presRetry); presRetry = null;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      app.presence.state = 'error'; app.presence.msg = 'sem internet'; paintPresence();
      return;
    }
    presBusy = true;
    app.presence.state = 'connecting'; app.presence.msg = ''; paintPresence();
    btAttach(p);
    try {
      await p.startPresence(app.me.code);
      if (!app.presence.visible) { Promise.resolve(p.stopPresence()).catch(() => {}); app.presence.state = 'off'; }
      else { app.presence.state = 'ready'; syncPresenceStatus(); }
    } catch (e) {
      app.presence.state = 'error'; app.presence.msg = errMsg(e).replace(/\.$/, '');
      if (app.presence.visible) presRetry = setTimeout(() => { presRetry = null; presenceStart(); }, app.pollMs);
    }
    presBusy = false;
    paintPresence();
  }
  function presenceStop() {
    clearTimeout(presRetry); presRetry = null;
    const p = window.ManobraOnline;
    if (p) Promise.resolve(p.stopPresence()).catch(() => {});
    app.presence.state = 'off';
    paintPresence();
  }
  function presenceLost() { // a ligação com o serviço caiu
    app.presence.state = 'error'; app.presence.msg = 'conexão caiu';
    if (app.presence.visible && !presRetry) presRetry = setTimeout(() => { presRetry = null; presenceStart(); }, 3000);
    paintPresence();
  }

  /* ---- tela Amigos ---- */
  let pollGen = 0;
  function friendsOpen() {
    app.screen = 'friends';
    app.fr = { state: 'idle', msg: '', invite: null, target: null, newCode: '', newNick: '' };
    render();
    presenceStart();
    pollFriends(++pollGen);
  }
  const sleepMs = ms => new Promise(r => setTimeout(r, ms));
  async function probeOne(code) {
    const p = window.ManobraOnline;
    if (!p || !p.probe) return;
    const s = await p.probe(code);
    const old = app.fstat[code];
    app.fstat[code] = s;
    const av = p.lastSeen && p.lastSeen[code];
    const fr = app.friends.find(x => x.code === code);
    if (fr && av && fr.av !== av) { fr.av = av; saveFriends(); }
    if (fr && old === 'offline' && s !== 'offline') toast(fr.nick + ' ficou online.');
    paintStatus(code);
  }
  async function pollFriends(gen) {
    while (gen === pollGen && app.screen === 'friends') {
      for (const fr of app.friends.slice()) {
        if (gen !== pollGen) return;
        await probeOne(fr.code);
      }
      let waited = 0;
      while (waited < app.pollMs && gen === pollGen) { await sleepMs(Math.min(250, app.pollMs)); waited += 250; }
    }
  }
  function friendsLeave() {
    pollGen++;
    const p = window.ManobraOnline;
    if (p) { Promise.resolve(p.cancelInvite()).catch(() => {}); if (p.closeProbes) Promise.resolve(p.closeProbes()).catch(() => {}); }
    if (app.btLinked) btLeave();
    app.screen = 'menu';
    app.fr = { state: 'idle', msg: '', invite: null, target: null, newCode: '', newNick: '' };
  }
  function onInvite(ev) {
    const p = window.ManobraOnline;
    if (!ev) return;
    const nick = cleanNick(ev.nick) || String(ev.code);
    if (isBusy() || app.inv) {
      if (p) Promise.resolve(p.declineInvite('busy')).catch(() => {});
      toast(nick + ' tentou chamar você, mas você está ocupado.');
      return;
    }
    app.inv = { nick: nick, code: cleanCode6(ev.code), av: AV[ev.av] ? ev.av : '' };
    sfx('f', 0);
    renderInvite();
  }
  function onInviteEnd() {
    if (!app.inv) return;
    app.inv = null;
    renderInvite();
    toast('O convite foi cancelado.');
  }

  function friendAdd() {
    const f = app.fr, code = cleanCode6(f.newCode);
    if (code.length !== 6) { toast('O código do amigo tem 6 letras ou números.'); return; }
    if (code === app.me.code) { toast('Esse é o seu próprio código.'); return; }
    const nick = cleanNick(f.newNick) || code;
    const old = app.friends.find(x => x.code === code);
    if (old) old.nick = nick; else app.friends.push({ code: code, nick: nick, av: '' });
    saveFriends();
    f.newCode = ''; f.newNick = '';
    f.msg = nick + (old ? ' atualizado.' : ' adicionado aos amigos.');
    render();
    probeOne(code);
  }
  async function friendInvite(code) {
    const friend = app.friends.find(x => x.code === code);
    const p = window.ManobraOnline;
    if (!friend || !p || app.fr.state === 'inviting' || isBusy()) return;
    app.net = 'online';
    btAttach(p);
    app.fr.state = 'inviting'; app.fr.target = friend; app.fr.msg = '';
    syncPresenceStatus();
    render();
    try {
      await p.invite({ code: friend.code, from: app.me.code, nick: myNick(), friendNick: friend.nick, av: app.me.av });
      // se aceitou, o evento "connected" já levou para a montagem
    } catch (e) {
      if (app.btLinked || app.screen !== 'friends') return;
      app.fr.state = 'idle'; app.fr.target = null; app.fr.msg = errMsg(e);
      render();
    }
  }

  /* ---------- Campeonato: ligação com a partida ---------- */
  // A partida de campeonato usa a mesma lógica do Bluetooth/online; só muda o "cano":
  // as mensagens vão para o organizador (o juiz), que confere e repassa ao adversário.
  const tourHandlers = {};
  const tourTransport = {
    status: () => Promise.resolve({ available: true, enabled: true, permission: true }),
    requestAccess: () => Promise.resolve({ available: true, enabled: true, permission: true }),
    openSettings: () => Promise.resolve(),
    pairedDevices: () => Promise.resolve({ devices: [] }),
    listen: () => Promise.reject(new Error('Não usado no campeonato.')),
    connect: () => Promise.reject(new Error('Não usado no campeonato.')),
    send: opts => {
      const l = window.ManobraTourLink;
      if (!l || !app.tour.matchId) return Promise.reject(new Error('Sem partida.'));
      l.send({ k: 'relay', m: app.tour.matchId, d: opts.data });
      return Promise.resolve();
    },
    close: () => Promise.resolve(), // a ligação com o campeonato continua aberta entre as partidas
    addListener: (ev, fn) => { (tourHandlers[ev] = tourHandlers[ev] || []).push(fn); return Promise.resolve({ remove() {} }); }
  };
  function tourEmit(ev, data) { (tourHandlers[ev] || []).slice().forEach(f => { try { f(data); } catch (e) { /* ok */ } }); }
  let tourWired = false;
  const freshTour = () => ({ role: null, code: '', myId: null, snap: null, msg: '', matchId: null, connecting: false, local: false });

  function tourEnsure(allowOffline) {
    const l = window.ManobraTourLink;
    if (!l || !window.ManobraTournament) throw new Error('O campeonato não está disponível nesta versão.');
    if (!allowOffline && typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('Sem internet. Conecte-se ao Wi-Fi ou aos dados móveis.');
    app.net = 'tour';
    btAttach(tourTransport);
    if (!tourWired) {
      tourWired = true;
      l.addListener('msg', o => onTourMsg(o));
      l.addListener('closed', () => onTourClosed());
    }
    return l;
  }
  function tourOpen() {
    app.net = 'tour';
    if (!app.tour.role) app.tour = freshTour();
    app.screen = 'tour';
    render();
  }
  async function tourCreate() {
    try {
      const l = tourEnsure(true);
      app.tour = freshTour(); app.tour.connecting = true; render();
      const base = { nick: myNick(), pid: app.me.code, avatar: app.me.av };
      let local = typeof navigator !== 'undefined' && navigator.onLine === false, r;
      try { r = await l.host(Object.assign({ local: local }, base)); }
      catch (e) { if (local) throw e; local = true; r = await l.host(Object.assign({ local: true }, base)); } // sem conexão com o serviço: joga offline
      app.tour.connecting = false; app.tour.role = 'host'; app.tour.code = r.code; app.tour.myId = r.you; app.tour.local = local;
      if (local) toast('Sem internet: campeonato offline, só contra robôs.');
      app.tour.snap = l.snapshot();
      render();
    } catch (e) { app.tour = freshTour(); app.tour.msg = errMsg(e); render(); }
  }
  async function tourResume() {
    const saved = tourSaved();
    if (!saved || !saved.data) return toast('Nenhum campeonato salvo foi encontrado.');
    try {
      const l = tourEnsure(true);
      app.tour = freshTour(); app.tour.connecting = true; render();
      const r = await l.host({ restore: saved.data, local: true, nick: myNick(), pid: app.me.code, avatar: app.me.av });
      app.tour.connecting = false; app.tour.role = 'host'; app.tour.code = r.code; app.tour.myId = r.you; app.tour.local = true;
      app.tour.snap = l.snapshot();
      toast('Campeonato retomado.');
      tourRestoreLocal(saved);
      if (app.screen !== 'game') render();
    } catch (e) { app.tour = freshTour(); app.tour.msg = errMsg(e); render(); }
  }
  async function tourJoin() {
    const code = String(app.tourCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { toast('Digite o código de 4 letras ou números.'); return; }
    try {
      const l = tourEnsure();
      app.tour = freshTour(); app.tour.connecting = true; render();
      const r = await l.join({ code: code, nick: myNick(), pid: app.me.code, avatar: app.me.av });
      app.tour.connecting = false; app.tour.role = 'guest'; app.tour.code = code; app.tour.myId = r.you;
      render();
    } catch (e) { app.tour = freshTour(); app.tour.msg = errMsg(e); render(); }
  }
  function onTourMsg(o) {
    if (!o || typeof o !== 'object') return;
    if (o.k === 'state') {
      app.tour.snap = o.s;
      if (app.screen === 'tour') render();
    } else if (o.k === 'start') {
      if (app.btLinked || app.tour.matchId) return;
      app.tour.matchId = o.m;
      app.peer = { nick: cleanNick(o.opp) || 'Adversário', av: AV[o.oppAv] ? o.oppAv : 'robot' };
      tourEmit('connected', { name: o.opp, role: o.side === 0 ? 'host' : 'guest' });
    } else if (o.k === 'relay') {
      if (o.m === app.tour.matchId && typeof o.d === 'string') tourEmit('message', { data: o.d });
    } else if (o.k === 'autoSetup') {
      if (o.m === app.tour.matchId) handleBtMessage(JSON.stringify({ k: 'autoSetup', p: o.p, opp: o.opp }));
    } else if (o.k === 'matchEnd') {
      onTourMatchEnd(o, 0);
    }
  }
  // O juiz encerrou a partida (vitória na mesa, W.O., decisão do organizador)
  function onTourMatchEnd(o, tries) {
    if (o.m !== app.tour.matchId) return;
    // O juiz já encerrou a partida: não há contagem nem tela de espera.
    // Descarta qualquer animação restante e libera imediatamente o próximo jogo.
    app.btQueue.length = 0;
    app.animating = false;
    toast((o.winner === app.tour.myId ? 'Você venceu' : 'Você perdeu') + ' (' + reasonText(o.reason) + ').');
    tourEndMatchLocal();
    app.screen = 'tour';
    render();
  }
  function onTourClosed() {
    toast('A conexão com o campeonato foi encerrada.');
    tourEndMatchLocal();
    app.tour = freshTour();
    if (app.screen === 'tour' || app.screen === 'game' || app.screen === 'setup') app.screen = 'menu';
    render();
  }
  // Limpa o que é da partida atual, sem sair do campeonato
  function tourEndMatchLocal() {
    app.btLinked = false; app.btReady = false; app.peerSetup = null; app.btQueue.length = 0;
    app.game = null; app.animating = false; app.animToken++; app.thinking = false; app.purge = false; app.choice = null; app.sel = -1;
    app.tour.matchId = null;
    app.peer = { nick: 'Adversário', av: 'robot' };
  }
  function tourLeaveMatch() {
    const inGame = app.screen === 'game' && app.game && !app.game.over;
    if ((inGame || app.screen === 'setup') && app.tour.matchId) {
      const ok = typeof confirm === 'function' ? confirm('Sair agora da partida dá derrota por W.O. Deseja sair?') : true;
      if (!ok) return;
    }
    if (app.btLinked) btSend({ k: 'bye' }); // o juiz dá W.O. se a partida ainda estava valendo
    tourEndMatchLocal();
    app.screen = 'tour';
    render();
  }
  function tourExit() {
    const l = window.ManobraTourLink;
    if (app.tour.role) {
      const running = app.tour.snap && app.tour.snap.status === 'running';
      const msg = app.tour.role === 'host' ? 'Sair encerra o campeonato para todos. Deseja sair?' : 'Sair do campeonato? Suas partidas pendentes ficam sem jogar.';
      if (running || app.tour.role === 'host') {
        const ok = typeof confirm === 'function' ? confirm(msg) : true;
        if (!ok) return;
      }
    }
    if (l) l.leave();
    tourEndMatchLocal();
    app.tour = freshTour();
    app.screen = 'menu';
    render();
  }
  const tourSend = obj => { const l = window.ManobraTourLink; if (l) l.send(obj); };

  /* ---------- Eventos ---------- */
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t) return;
    if (t.id === 'tcode') {
      const v = String(t.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      app.tourCode = v;
      if (t.value !== v) t.value = v;
    } else if (t.id === 'code') {
      const v = String(t.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      app.onlineCode = v;
      if (t.value !== v) t.value = v;
    } else if (t.id === 'nick') {
      app.me.nick = cleanNick(t.value);
      saveMe();
    } else if (t.id === 'fcode') {
      const v = cleanCode6(t.value);
      app.fr.newCode = v;
      if (t.value !== v) t.value = v;
    } else if (t.id === 'fnick') {
      app.fr.newNick = cleanNick(t.value);
    }
  });
  document.addEventListener('click', e => {
    actx(); // o navegador só libera o áudio depois de um toque
    const cell = e.target.closest('[data-i]');
    if (cell && !e.target.closest('.overlay')) {
      const i = +cell.dataset.i;
      if (app.screen === 'setup') onSetupCell(i);
      else if (app.screen === 'game') onGameCell(i);
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, v = el.dataset.v;
    if (act === 'cancelChoice') {
      if (e.target === el) { app.choice = null; render(); }
      return;
    }
    switch (act) {
      case 'side': app.humanSide = +v; render(); break;
      case 'level': app.level = v; render(); break;
      case 'rules': app.screen = 'rules'; render(); break;
      case 'menu':
        if (app.net === 'tour' && app.mode === 'bt' && (app.screen === 'game' || app.screen === 'setup')) { tourLeaveMatch(); break; }
        if (app.mode === 'bt') btLeave();
        app.screen = 'menu'; app.thinking = false; app.animating = false; app.animToken++; app.game = null; render(); break;
      case 'speed':
        app.speed = v;
        try { localStorage.setItem('manobra.speed', v); } catch (err) { /* ok */ }
        render(); break;
      case 'sound':
        snd.on = v === '1';
        try { localStorage.setItem('manobra.sound', v); } catch (err) { /* ok */ }
        sfx('m', 0);
        render(); break;
      case 'toggleSound':
        snd.on = !snd.on;
        try { localStorage.setItem('manobra.sound', snd.on ? '1' : '0'); } catch (err) { /* ok */ }
        sfx('m', 0);
        render(); break;
      case 'startAI': startSetup('ai'); break;
      case 'startPVP': startSetup('pvp'); break;
      case 'again':
        if (app.mode === 'bt' && !app.btLinked) { toast('A conexão foi encerrada.'); app.screen = 'menu'; app.game = null; render(); break; }
        startSetup(app.mode); break;
      case 'setupDefault': if (!(app.mode === 'bt' && app.btReady)) { placeList(app.setupSide, E.presetSetup(app.setupSide)); sendSetupProgress(); render(); } break;
      case 'setupRandom': if (!(app.mode === 'bt' && app.btReady)) { placeList(app.setupSide, E.randomSetup(app.setupSide)); sendSetupProgress(); render(); } break;
      case 'setupClear': if (!(app.mode === 'bt' && app.btReady)) { clearSide(app.setupSide); sendSetupProgress(); render(); } break;
      case 'setupDone': setupDone(); break;
      case 'flipMode': {
        const m = app.game.cur.moves.find(x => x.t === 'f' && x.from === app.sel);
        if (m) doMove(m);
        break;
      }
      case 'purge': app.purge = !app.purge; app.sel = -1; render(); break;
      case 'turnBoard': if (!app.animating) { app.flipped = !app.flipped; render(); } break;
      case 'choose': {
        const m = app.choice && app.choice.find(x => x.t === v);
        if (m) doMove(m);
        break;
      }
      case 'btOpen': app.net = 'bt'; app.bt = { stage: 'idle', devices: [], msg: '', code: '' }; app.screen = 'bt'; render(); break;
      case 'onOpen': app.net = 'online'; app.bt = { stage: 'idle', devices: [], msg: '', code: '' }; app.screen = 'online'; render(); break;
      case 'tourOpen': tourOpen(); break;
      case 'tourCreate': tourCreate(); break;
      case 'tourResume': tourResume(); break;
      case 'tourClearSaved': tourClearSaved(); render(); break;
      case 'tourSave': tourSaveLocal(); break;
      case 'tourJoin': tourJoin(); break;
      case 'tourExit':
        if (app.tour.role) tourExit(); else { app.screen = 'menu'; render(); }
        break;
      case 'tourBack': tourLeaveMatch(); break;
      case 'tourFmt': tourSend({ k: 'format', v: v }); break;
      case 'tourStart': tourSend({ k: 'start' }); break;
      case 'tourAddBot': tourSend({ k: 'addbot' }); break;
      case 'tourRmBot': tourSend({ k: 'rmbot', id: +v }); break;
      case 'tourBotLevel': tourSend({ k: 'botlevel', v: v }); break;
      case 'tourPlay': tourSend({ k: 'ready', m: v }); break;
      case 'tourUnready': tourSend({ k: 'unready' }); break;
      case 'avatar':
        if (AV[v]) { app.me.av = v; saveMe(); syncPresenceStatus(); render(); }
        break;
      case 'frVisible':
        app.presence.visible = v === '1';
        lsSet('visible', v === '1' ? '1' : '0');
        if (app.presence.visible) presenceStart(); else presenceStop();
        render(); break;
      case 'frOpen': friendsOpen(); break;
      case 'frBack': friendsLeave(); render(); break;
      case 'frAdd': friendAdd(); break;
      case 'frRemove':
        app.friends = app.friends.filter(x => x.code !== v);
        saveFriends(); render(); break;
      case 'frInvite': friendInvite(v); break;
      case 'frCancelInvite': { const p = window.ManobraOnline; if (p) Promise.resolve(p.cancelInvite()).catch(() => {}); break; }
      case 'frAccept': {
        const p = window.ManobraOnline;
        if (!app.inv || !p) break;
        if (isBusy()) { toast('Termine o que está fazendo antes de aceitar.'); break; }
        app.inv = null; renderInvite();
        app.net = 'online';
        Promise.resolve(p.acceptInvite()).catch(err => { if (!app.btLinked) toast(errMsg(err)); });
        break;
      }
      case 'frDecline': {
        const p = window.ManobraOnline;
        if (p) Promise.resolve(p.declineInvite()).catch(() => {});
        app.inv = null; renderInvite(); break;
      }
      case 'frCopy': {
        const code = app.me.code;
        try {
          navigator.clipboard.writeText(code).then(() => toast('Código copiado.'), () => toast('Seu código: ' + code));
        } catch (err) { toast('Seu código: ' + code); }
        break;
      }
      case 'onHost': onlineHost(); break;
      case 'onJoin': onlineJoin(); break;
      case 'btBack': btLeave(); app.screen = 'menu'; render(); break;
      case 'btCancel': btLeave(); app.screen = app.net === 'online' ? 'online' : 'bt'; render(); break;
      case 'btSettings': { const p = btPlugin(); if (p) Promise.resolve(p.openSettings()).catch(() => {}); break; }
      case 'btHost': btHost(); break;
      case 'btJoin': btJoin(); break;
      case 'btConnect': btConnect(v); break;
    }
  });
  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'rot') app.rotate = e.target.checked;
  });

  function startSetup(mode) {
    app.mode = mode;
    app.pieces.fill(0);
    app.game = null; app.thinking = false; app.animating = false; app.animToken++;
    app.screen = 'setup';
    app.setupSide = WHITE;
    app.btReady = false;
    if (mode === 'ai') {
      app.ai = pickBot();
      app.flipped = app.humanSide === BLACK;
      if (app.humanSide === BLACK) { placeAI(WHITE); app.setupSide = BLACK; }
    } else if (mode === 'bt') {
      app.setupSide = app.humanSide; // cada celular monta só o seu lado, em segredo
      app.flipped = app.humanSide === BLACK;
      app.btQueue.length = 0;
    } else app.flipped = false;
    render();
    tryStartBt();
  }

  if (typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => { if (!document.hidden) syncAwake(true); });

  loadProfile();
  render();
  presenceStart();
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('online', () => { presenceStart(); });
    window.addEventListener('offline', () => {
      // Perder a internet durante uma partida é desistência. Se o aviso não
      // chegar, o fechamento da conexão também aplica o W.O. no juiz.
      if (app.net === 'tour' && app.tour.matchId && (app.screen === 'game' || app.screen === 'setup')) {
        btSend({ k: 'bye' });
      }
    });
  }
})();
