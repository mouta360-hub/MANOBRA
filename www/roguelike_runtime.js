/* Runtime balanceado das peças especiais: tanques, atacantes e suporte. */
(function () {
  'use strict';
  const run = () => window.RoguelikeRun;
  const E = () => window.ManobraEngine;
  const catalog = () => (typeof SPECIAL_PIECES_CATALOG !== 'undefined' ? SPECIAL_PIECES_CATALOG : (window.SPECIAL_PIECES_CATALOG || {}));
  const deployedAt = (i, enemy) => { const r = run(); if (!r) return null; const bag = enemy ? r.enemyDeployed : r.deployed; return bag ? bag[String(i)] : null; };
  const rc = i => ({ r: Math.floor(i / 13), c: i % 13 });
  const idx = (r, c) => r >= 0 && r < 9 && c >= 0 && c < 13 ? r * 13 + c : -1;
  const distance = (a, b) => { const x = rc(a), y = rc(b); return Math.max(Math.abs(x.r - y.r), Math.abs(x.c - y.c)); }; // vizinhança diagonal nas casas jogáveis
  const sideAt = (board, i) => board && Number.isInteger(i) && i >= 0 && i < board.length && board[i] && E() ? E().sideOf(board[i]) : -1;
  const enemyOf = side => side === E().WHITE ? E().BLACK : E().WHITE;
  function announce(text) { if (typeof window.showRoguelikeToast === 'function') window.showRoguelikeToast(text); }
  function state() { const r = run(); if (!r) return null; r.abilityState ||= {}; const s = r.abilityState; s.shield ||= {}; s.cooldown ||= {}; s.used ||= {}; s.captured ||= [0, 0]; s.stun ||= {}; s.pending ||= null; s.turnUsed ||= {}; s.charges ||= {}; s.abilityCooldown ||= {}; return s; }
  // Recarga em turnos do próprio jogador. O turno de ativação não conta.
  const ABILITY_LIMITS = Object.freeze({
    escudeiro: { uses: 1, cooldown: 0 },
    rebatedor: { uses: 1, cooldown: 0 },
    bastiao: { uses: 1, cooldown: 0 },
    tita_de_aco: { uses: 1, cooldown: 0 },
    baluarte: { uses: 1, cooldown: 0 },
    lancer: { uses: 3, cooldown: 2 },
    assassino_sombras: { uses: 2, cooldown: 2 },
    ceifador: { uses: 2, cooldown: 3 },
    vento_cortante: { uses: 2, cooldown: 3 },
    alquimista: { uses: 1, cooldown: 0 },
    sentinela: { uses: 2, cooldown: 2 },
    colosso: { uses: 1, cooldown: 0 },
    muralha: { uses: 1, cooldown: 0 },
    javali_de_ferro: { uses: 1, cooldown: 0 },
    guardiao_runico: { uses: 1, cooldown: 0 },
    berserker: { uses: 2, cooldown: 3 },
    executor: { uses: 1, cooldown: 0 },
    cavaleiro_errante: { uses: 2, cooldown: 2 },
    predador: { uses: 2, cooldown: 2 },
    duelista: { uses: 2, cooldown: 2 },
    cacador_cabecas: { uses: 2, cooldown: 3 },
    cronomante: { uses: 1, cooldown: 0 },
    ilusionista: { uses: 2, cooldown: 3 },
    teleportador: { uses: 2, cooldown: 3 },
    ima_tatico: { uses: 2, cooldown: 2 },
    xama_dos_ventos: { uses: 1, cooldown: 0 },
    manipulador: { uses: 1, cooldown: 0 },
    oraculo: { uses: 2, cooldown: 3 },
    sacerdote_da_luz: { uses: 2, cooldown: 3 },
    mestre_de_manobras: { uses: 1, cooldown: 0 }
  });
  window.MANOBRA_CODEX_ABILITY_LIMITS = ABILITY_LIMITS;
  const DEFENSE_KEYS = new Set(['escudeiro','rebatedor','bastiao','tita_de_aco','baluarte','sentinela','muralha','javali_de_ferro']);
  const OFFENSE_KEYS = new Set(['lancer','assassino_sombras','ceifador','vento_cortante','berserker','executor','cavaleiro_errante','predador','duelista','cacador_cabecas','colosso']);
  function effectiveAbilityLimit(side, key) {
    const base = ABILITY_LIMITS[key];
    if (!base) return null;
    const r = run(), human = window.__manobraApp && window.__manobraApp.humanSide;
    // Os bônus pertencem apenas ao jogador, nunca às peças do chefão.
    if (!r || !r.active || human == null) return base;
    if (side !== human) {
      const boss = r.pendingNode && r.pendingNode.type === 'boss' && typeof window.rogueBossFor === 'function' ? window.rogueBossFor(r.pendingNode, r.act) : null;
      if (!boss) return base;
      const match = boss.category === 'all' || (boss.category === 'defense' && DEFENSE_KEYS.has(key)) || (boss.category === 'offense' && OFFENSE_KEYS.has(key)) || (boss.category === 'support' && !DEFENSE_KEYS.has(key) && !OFFENSE_KEYS.has(key));
      return { uses: base.uses + (match ? boss.uses : 0), cooldown: Math.max(0, base.cooldown - (match ? boss.cooldown : 0)) };
    }
    const commander = r.commanderId;
    let extra = 0, reduction = 0;
    if (commander === 'artifice') { extra = 2; reduction = 1; }
    else if (commander === 'cartografo') extra = 1;
    else if (['guardiao','campista'].includes(commander) && DEFENSE_KEYS.has(key)) extra = 1;
    else if (commander === 'cacador' && OFFENSE_KEYS.has(key)) extra = 1;
    else if (commander === 'diplomata' && !DEFENSE_KEYS.has(key) && !OFFENSE_KEYS.has(key)) extra = 1;
    // Maestria adquirida nas lojas durante esta campanha, nunca para o inimigo.
    const mastery = typeof window.rogueMasteryLevel === 'function' ? window.rogueMasteryLevel(key) : 1;
    extra += Math.max(0, mastery - 1);
    if (mastery >= 3) reduction += 1;
    return { uses: base.uses + extra, cooldown: Math.max(0, base.cooldown - reduction) };
  }
  function abilityId(side, index, key) { return `${side}:${index}:${key}`; }
  function available(side, index, key) {
    const rule = effectiveAbilityLimit(side, key);
    if (!rule) return false;
    const id = abilityId(side,index,key), s = state();
    return !!s && (s.charges[id] || 0) < rule.uses && !(s.abilityCooldown[id] > 0);
  }
  function consume(side, index, key) {
    if (!available(side,index,key)) return false;
    const id = abilityId(side,index,key), s = state(), rule = effectiveAbilityLimit(side, key);
    s.charges[id] = (s.charges[id] || 0) + 1;
    s.abilityCooldown[id] = rule.cooldown;
    const r = run(), human = window.__manobraApp && window.__manobraApp.humanSide;
    if (r && r.active && side !== human && r.pendingNode && r.pendingNode.type === 'boss' && typeof window.rogueBossEffect === 'function' && typeof window.rogueBossFor === 'function') {
      const boss = window.rogueBossFor(r.pendingNode, r.act);
      if (boss && (boss.category === 'all' || (boss.category === 'defense' && DEFENSE_KEYS.has(key)) || (boss.category === 'offense' && OFFENSE_KEYS.has(key)) || (boss.category === 'support' && !DEFENSE_KEYS.has(key) && !OFFENSE_KEYS.has(key)))) window.rogueBossEffect(boss);
    }
    return true;
  }
  function tickCooldown(side) {
    const s = state(), prefix = `${side}:`;
    for (const id of Object.keys(s.abilityCooldown)) {
      if (id.startsWith(prefix) && s.abilityCooldown[id] > 0) s.abilityCooldown[id]--;
    }
  }
  function specialAtBoard(board, i) {
    const side = sideAt(board, i), human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
    return side < 0 ? null : deployedAt(i, side !== human);
  }
  function specialEntry(board, i) { const key = specialAtBoard(board, i); return key ? { key, side: sideAt(board, i), piece: catalog()[key] } : null; }
  function allEntries(board) { const out = []; const r = run(); if (!r || !board) return out; for (let i = 0; i < E().N; i++) { const e = specialEntry(board, i); if (e) out.push({ i, ...e }); } return out; }
  // Trincas de sinergia: 2 integrantes vivos = combinação básica;
  // 3 integrantes vivos = combinação ampliada. Funciona para ambos os lados.
  // Exige proximidade real no tabuleiro, não basta possuir as peças no quartel.
  const SYNERGY_SETS = Object.freeze([
    { id: 'falange', name: 'Falange Tática', keys: ['lancer','sentinela','oraculo'], type: 'guard' },
    { id: 'juramento', name: 'Juramento de Ferro', keys: ['escudeiro','bastiao','sacerdote_da_luz'], type: 'guard' },
    { id: 'cacada', name: 'Caçada Coordenada', keys: ['assassino_sombras','predador','duelista'], type: 'pierce' },
    { id: 'furia', name: 'Fúria Disciplinada', keys: ['berserker','cavaleiro_errante','xama_dos_ventos'], type: 'pierce' }
  ]);
  function synergyFor(board, side, anchor, type) {
    const entries = allEntries(board).filter(e => e.side === side);
    const actor = entries.find(e => e.i === anchor);
    if (!actor) return null;
    for (const group of SYNERGY_SETS) {
      if (group.type !== type || !group.keys.includes(actor.key)) continue;
      const members = entries.filter(e => group.keys.includes(e.key));
      // Somente integrantes distintos contam; o terceiro precisa estar próximo
      // da dupla para elevar a sinergia ao nível 3.
      const partners = members.filter(e => e.i !== anchor && e.key !== actor.key && distance(e.i, anchor) <= 2);
      if (!partners.length) continue;
      const linked = [actor, ...partners];
      const distinct = new Set(linked.map(e => e.key));
      if (distinct.size < 2) continue;
      return { group, tier: distinct.size >= 3 ? 3 : 2 };
    }
    return null;
  }
  function synergyDescription(key) {
    const groups = SYNERGY_SETS.filter(g => g.keys.includes(key));
    return groups.map(g => `${g.name}: ${g.keys.map(k => (catalog()[k] || {}).name || k).join(' + ')}. Dupla próxima: ${g.id === 'falange' ? 'protege qualquer aliado na mesma linha ou coluna' : g.id === 'juramento' ? 'protege outra integrante do conjunto' : 'rompe proteção em captura legal'}; trio próximo: alcance ampliado.`).join(' ');
  }
  function isDiagonal(a, b) { const x = rc(a), y = rc(b); return Math.abs(x.r - y.r) === 1 && Math.abs(x.c - y.c) === 1; }
  function isBackRow(i) { return rc(i).r === 0 || rc(i).r === E().ROWS - 1; }
  function isCapture(mv, board) { return mv && (mv.t === 'k' || mv.t === 'x' || (mv.t === 'p' && board[mv.to])); }

  function cellMarkup(i) {
    const key = specialAtBoard((window.__manobraApp && window.__manobraApp.game && window.__manobraApp.game.st.b) || (window.__manobraApp && window.__manobraApp.pieces), i), piece = key && catalog()[key];
    if (!piece) return '';
    return ` data-special-piece="${key}" data-symbol="${piece.symbol || '★'}"`;
  }

  function beforeMove(game, mv) {
    if (!run() || !run().active || !mv) return true;
    // Não aplicar poderes a uma jogada inexistente no motor original.
    state().blockedMove = false;
    const legal = game.legal();
    if (game.over || !legal || !Array.isArray(legal.moves) || !legal.moves.some(x => x.t === mv.t && x.from === mv.from && x.to === mv.to && (x.beyond ?? -1) === (mv.beyond ?? -1))) return false;
    const board = game.st.b, mover = sideAt(board, mv.from), target = mv.to >= 0 ? specialEntry(board, mv.to) : null;
    if (mv.t !== 'x' && mover !== game.st.turn) return false;
    const moving = specialEntry(board, mv.from);
    state().pending = { victim: target && target.key, victimSide: target && target.side, attacker: moving && moving.key, attackerSide: mv.t === 'x' ? game.st.turn : mover, from: mv.from, to: mv.to };
    // A troca precisa guardar a identidade ANTES de game.play alterar o tabuleiro.
    if (mv.t === 's') {
      const other = specialEntry(board, mv.to);
      state().pending.swapOther = other && other.key;
      state().pending.swapOtherSide = other && other.side;
    }
    // Remoção obrigatória da sétima defesa é regra do motor, não uma captura bloqueável.
    if (mv.t === 'x') return true;
    // Ataque especial: rompe UMA proteção reativa, mas somente em captura
    // já autorizada pelo motor. Não cria movimentos, capturas ou turnos.
    const pierceConditions = {
      lancer: () => rc(mv.from).c === rc(mv.to).c,
      assassino_sombras: () => isDiagonal(mv.from, mv.to),
      berserker: () => true,
      executor: () => true,
      cavaleiro_errante: () => rc(mv.from).r !== rc(mv.to).r,
      ceifador: () => isBackRow(mv.to),
      predador: () => distance(mv.from, mv.to) === 1,
      duelista: () => !allEntries(board).some(e => e.side === mover && e.i !== mv.from && distance(e.i, mv.from) === 1),
      vento_cortante: () => rc(mv.from).r === rc(mv.to).r,
      cacador_cabecas: () => !!target
    };
    const protectedTarget = isCapture(mv, board) && target && (
      ['escudeiro', 'rebatedor', 'muralha'].includes(target.key) ||
      allEntries(board).some(e => e.side === target.side && distance(e.i, mv.to) === 1 &&
        ['bastiao','tita_de_aco','baluarte','sentinela','ima_tatico','xama_dos_ventos','manipulador','oraculo','sacerdote_da_luz'].includes(e.key))
    );
    // Combinação ofensiva: a dupla pode romper uma proteção reativa
    // ao capturar legalmente; o trio permite parceiro a até 2 casas.
    const offensiveSynergy = moving && synergyFor(board, mover, mv.from, 'pierce');
    const synergyPartner = offensiveSynergy && allEntries(board).some(e =>
      e.side === mover && e.i !== mv.from && e.key !== moving.key &&
      offensiveSynergy.group.keys.includes(e.key) &&
      distance(e.i, mv.from) <= (offensiveSynergy.tier === 3 ? 2 : 1));
    const synergyPierce = protectedTarget && offensiveSynergy && synergyPartner &&
      consume(mover, mv.from, moving.key);
    if (synergyPierce) { announce(`⚔️ ${offensiveSynergy.group.name}: combinação de ${offensiveSynergy.tier} peças rompeu a proteção!`); return true; }
    const piercing = protectedTarget && moving && pierceConditions[moving.key] &&
      pierceConditions[moving.key]() && consume(mover, mv.from, moving.key);
    if (piercing) { announce(`⚔️ ${moving.piece.name}: rompeu a proteção inimiga!`); return true; }
    // Escudeiro: o primeiro ataque é absorvido; não perde a peça nem permite combo.
    if (target && target.key === 'escudeiro' && isCapture(mv, board)) {
      if (consume(target.side, mv.to, 'escudeiro')) { announce('🛡️ Escudeiro absorveu o primeiro impacto.'); state().blockedMove = true; state().pending = null; return false; }
    }
    // Sentinela: bloqueia a entrada do adversário nas casas adjacentes.
    for (const e of allEntries(board)) if (e.key === 'sentinela' && e.side !== mover && mv.to >= 0 && distance(e.i, mv.to) === 1 && available(e.side, e.i, e.key)) {
      consume(e.side, e.i, e.key); announce('🏰 Sentinela: zona adjacente bloqueada.'); state().blockedMove = true; state().pending = null; return false;
    }
    // Bastião/Titã/Baluarte: uma proteção por combate para um aliado adjacente.
    if (isCapture(mv, board) && sideAt(board, mv.to) >= 0 && sideAt(board, mv.to) !== mover) {
      for (const e of allEntries(board)) if (['bastiao', 'tita_de_aco', 'baluarte'].includes(e.key) && e.side === sideAt(board, mv.to) && distance(e.i, mv.to) === 1) {
        if (consume(e.side, e.i, e.key)) { announce(`🧱 ${e.piece.name}: captura aliada bloqueada.`); state().blockedMove = true; state().pending = null; return false; }
      }
    }
    // Suportes oferecem proteção situacional. Só reagem a capturas legais.
    const supportGuard = {
      ima_tatico: (e) => distance(e.i, mv.from) === 1,
      xama_dos_ventos: (e) => isDiagonal(e.i, mv.to),
      manipulador: (e) => rc(e.i).r === rc(mv.to).r,
      oraculo: (e) => rc(e.i).c === rc(mv.to).c,
      sacerdote_da_luz: () => true
    };
    if (isCapture(mv, board) && sideAt(board, mv.to) >= 0 && sideAt(board, mv.to) !== mover) {
      for (const e of allEntries(board)) {
        if (e.side === sideAt(board, mv.to) && e.i !== mv.to && distance(e.i, mv.to) === 1 &&
            supportGuard[e.key] && supportGuard[e.key](e) && consume(e.side, e.i, e.key)) {
          announce(`✨ ${e.piece.name}: protegeu um aliado da captura.`);
          state().blockedMove = true; state().pending = null; return false;
        }
      }
    }
    // Sinergia defensiva: uma peça do conjunto protege outra integrante.
    // A dupla precisa estar adjacente à vítima; o trio alcança até 2 casas.
    if (isCapture(mv, board) && sideAt(board, mv.to) >= 0 && sideAt(board, mv.to) !== mover) {
      const victimSide = sideAt(board, mv.to);
      for (const e of allEntries(board)) {
        if (e.side !== victimSide || e.i === mv.to || (target && e.key === target.key)) continue;
        const synergy = synergyFor(board, e.side, e.i, 'guard');
        if (!synergy || (synergy.group.id !== 'falange' && !(target && synergy.group.keys.includes(target.key)))) continue;
        // Falange pode defender qualquer aliado na mesma linha ou coluna.
        if (synergy.group.id === 'falange' && rc(e.i).r !== rc(mv.to).r && rc(e.i).c !== rc(mv.to).c) continue;
        if (distance(e.i, mv.to) > (synergy.tier === 3 ? 2 : 1)) continue;
        if (consume(e.side, e.i, e.key)) {
          announce(`🛡️ ${synergy.group.name}: ${synergy.tier} peças protegeram a aliada!`);
          state().blockedMove = true; state().pending = null; return false;
        }
      }
    }
    // Muralha: não pode ser capturada lateralmente na fileira de defesa.
    if (target && target.key === 'muralha' && isCapture(mv, board) && isBackRow(mv.to) && rc(mv.from).r === rc(mv.to).r && consume(target.side, mv.to, 'muralha')) {
      announce('🏯 Muralha: ataque lateral bloqueado.'); state().blockedMove = true; state().pending = null; return false;
    }
    // Rebatedor: primeiro ataque diagonal é repelido.
    if (target && target.key === 'rebatedor' && isCapture(mv, board) && isDiagonal(mv.from, mv.to)) {
      if (consume(target.side, mv.to, 'rebatedor')) { announce('🪞 Rebatedor desviou o ataque diagonal.'); state().blockedMove = true; state().pending = null; return false; }
    }
    // Guardião Rúnico: uma vez por combate, paralisa o próximo turno inimigo.
    // Nunca alterar o turno durante a validação: isso dessincronizava a interface e o motor.
    return true;
  }

  // Proteções reativas anulam a captura, mas o ataque consome a vez.
  // Jogadas ilegais não podem consumir o turno.
  function resolveBlockedMove(game) {
    const s = state();
    if (!s || !s.blockedMove || !game || game.over || typeof game.pass !== 'function') return false;
    s.blockedMove = false;
    const attackerSide = game.st.turn;
    game.pass();
    tickCooldown(attackerSide);
    return true;
  }

  function addMove(out, seen, mv, board) {
    if (mv.from < 0 || mv.from >= E().N || mv.to < 0 || mv.to >= E().N || ((rc(mv.to).r + rc(mv.to).c) % 2 !== 0) || (board[mv.to] && E().sideOf(board[mv.to]) === E().sideOf(board[mv.from]))) return;
    if (mv.t === 'k' && (!board[mv.to] || !E().isAttack(board[mv.from]))) return;
    if (mv.t === 'm' && board[mv.to]) return;
    const k = `${mv.t}:${mv.from}:${mv.to}:${mv.beyond == null ? '' : mv.beyond}`;
    if (!seen.has(k)) { seen.add(k); out.push(mv); }
  }
  // Habilidades nunca criam lances que o motor original considera ilegais.
  // Efeitos de suporte e proteção são resolvidos em beforeMove/afterMove.
  function specialMoves(game, base) { return base; }

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
    const s = state(), pending = s.pending || {}; s.pending = null;
    // Só uma jogada efetivamente realizada consome a habilidade e avança a recarga.
    const originSide = mv.from >= 0 ? sideAt(board, mv.from) : -1;
    const turnSide = pending.attackerSide >= 0 ? pending.attackerSide : originSide;
    if (turnSide >= 0) tickCooldown(turnSide);
    if (mv.rogueAbility && pending.from >= 0 && turnSide >= 0) consume(turnSide, pending.from, mv.rogueAbility);
    const victimSpecial = captured ? pending.victim : null;
    const destinationAfter = mv.to;
    const movedSide = mv.t === 'f' ? sideAt(board, mv.from) : sideAt(board, destinationAfter);
    const humanSide = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
    const r = run();
    const bagForSide = side => side === humanSide ? r.deployed : r.enemyDeployed;
    const moverBag = movedSide >= 0 ? bagForSide(movedSide) : null;
    const key = pending.attacker || (moverBag && moverBag[String(mv.from)]);
    const piece = key && catalog()[key];
    const relocate = (side, from, to) => {
      const bag = bagForSide(side);
      if (!bag || from < 0 || to < 0 || from === to) return;
      const special = bag[String(from)];
      if (!special) return;
      delete bag[String(from)];
      bag[String(to)] = special;
      const oldId = abilityId(side, from, special), newId = abilityId(side, to, special);
      for (const field of ['charges', 'abilityCooldown']) {
        if (Object.prototype.hasOwnProperty.call(s[field], oldId)) {
          s[field][newId] = s[field][oldId]; delete s[field][oldId];
        }
      }
    };
    // Limpar a vítima antes de mover o atacante: evita apagar a peça vencedora.
    if ((captured || mv.t === 'x') && (mv.t === 'k' || mv.t === 'x') && pending.victimSide >= 0) {
      const victimBag = bagForSide(pending.victimSide);
      if (victimBag) delete victimBag[String(mv.to)];
      const victimId = abilityId(pending.victimSide, mv.to, pending.victim);
      delete s.charges[victimId]; delete s.abilityCooldown[victimId];
    }
    if (mv.t === 'm' || mv.t === 'k') relocate(turnSide, mv.from, mv.to);
    if (mv.t === 'p') {
      // Empurrão original: a peça na casa de destino vai para beyond.
      const pushedSide = sideAt(board, mv.beyond);
      if (pushedSide >= 0) relocate(pushedSide, mv.to, mv.beyond);
      relocate(turnSide, mv.from, mv.to);
    }
    if (mv.t === 's') {
      const otherSide = pending.swapOtherSide;
      const otherKey = pending.swapOther;
      const moverKey = pending.attacker;
      // Não usar as posições pós-jogada para descobrir quem estava onde.
      const aBag = bagForSide(turnSide);
      const bBag = otherSide >= 0 ? bagForSide(otherSide) : null;
      const snapshot = (side, pos, special) => {
        if (!special) return null;
        const id = abilityId(side, pos, special);
        return { special, charges: s.charges[id], cooldown: s.abilityCooldown[id] };
      };
      const a = snapshot(turnSide, mv.from, moverKey);
      const b = otherSide >= 0 ? snapshot(otherSide, mv.to, otherKey) : null;
      const erase = (side, pos, value) => {
        if (!value) return;
        delete bagForSide(side)[String(pos)];
        const id = abilityId(side, pos, value.special);
        delete s.charges[id]; delete s.abilityCooldown[id];
      };
      erase(turnSide, mv.from, a);
      if (otherSide >= 0) erase(otherSide, mv.to, b);
      const place = (side, pos, value) => {
        if (!value) return;
        bagForSide(side)[String(pos)] = value.special;
        const id = abilityId(side, pos, value.special);
        if (value.charges !== undefined) s.charges[id] = value.charges;
        if (value.cooldown !== undefined) s.abilityCooldown[id] = value.cooldown;
      };
      place(turnSide, mv.to, a);
      if (otherSide >= 0) place(otherSide, mv.from, b);
    }
    // Não alterar diretamente o tabuleiro após game.play(): o histórico, o resultado
    // e o estado de repetição do motor ficariam inconsistentes.
    if (victimSpecial === 'javali_de_ferro' && mv.t === 'k') {
      announce('🐗 Javali de Ferro foi capturado; contra-ataque automático desativado por segurança.');
    }
    if (!piece) return;
    // Suportes: benefícios econômicos após ações que o motor já validou.
    // Nenhum destes efeitos modifica peças, turno, apoio ou histórico da partida.
    if (movedSide === humanSide) {
      const supportRewards = {
        cronomante: { types: ['m'], gold: 5, message: '⏳ Cronomante: +5 moedas.' },
        ilusionista: { types: ['s'], gold: 6, message: '🎭 Ilusionista: +6 moedas.' },
        teleportador: { types: ['s'], gold: 8, message: '🔄 Teleportador: +8 moedas.' },

        mestre_de_manobras: { types: ['k', 'x'], gold: 15, message: '👑 Mestre de Manobras: +15 moedas.' },
        colosso: { types: ['p'], gold: 10, message: '🗿 Colosso: empurrão legal (+10 moedas).' },
        guardiao_runico: { types: ['m'], gold: 8, message: '☸️ Guardião Rúnico: avanço estratégico (+8 moedas).' },
        javali_de_ferro: { types: ['k'], gold: 10, message: '🐗 Javali de Ferro: captura legal (+10 moedas).' }
      };
      const bonus = supportRewards[key];
      if (bonus && bonus.types.includes(mv.t) &&
          (mv.t !== 'k' && mv.t !== 'x' || captured) &&
          consume(movedSide, destinationAfter, key)) {
        r.gold = Math.max(0, Number(r.gold) || 0) + bonus.gold;
        announce(bonus.message);
      }
    }
    if (key === 'berserker' && mv.t === 'k' && captured) { s.captured[movedSide] = (s.captured[movedSide] || 0) + 1; }
    if (key === 'alquimista' && movedSide === humanSide && (mv.t === 'k' || mv.t === 'x') && captured && consume(movedSide, destinationAfter, 'alquimista')) { run().gold += 20; announce('🧪 Alquimista: +20 moedas.'); }


    
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
  window.RoguelikeRuntime = { cellMarkup, beforeMove, resolveBlockedMove, afterMove, renderBoardState, patchLegal, abilityLimits: ABILITY_LIMITS, effectiveAbilityLimit, available, synergySets: SYNERGY_SETS, synergyFor, synergyDescription };
  window.addEventListener('DOMContentLoaded', () => { patchLegal(); setInterval(renderBoardState, 700); });
}());
