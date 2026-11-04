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
  function state() { const r = run(); if (!r) return null; r.abilityState ||= {}; const s = r.abilityState; s.shield ||= {}; s.cooldown ||= {}; s.used ||= {}; s.captured ||= [0, 0]; s.stun ||= {}; s.pending ||= null; s.turnUsed ||= {}; s.charges ||= {}; s.abilityCooldown ||= {}; s.deathPacts ||= {}; s.predatorAmbush ||= {}; s.duelistBan ||= {}; s.bounties ||= {}; s.chronoFreeze ||= {}; s.illusions ||= {}; return s; }
  // Recarga em turnos do próprio jogador. O turno de ativação não conta.
  const ABILITY_LIMITS = Object.freeze({
    escudeiro: { uses: 1, cooldown: 0 },
    rebatedor: { uses: 1, cooldown: 0 },
    bastiao: { uses: 1, cooldown: 0 },
    tita_de_aco: { uses: 1, cooldown: 0 },
    baluarte: { uses: 1, cooldown: 0 },
    lancer: { uses: 3, cooldown: 2 },
    assassino_sombras: { uses: 2, cooldown: 2 },
    ceifador: { uses: 1, cooldown: 0 },
    vento_cortante: { uses: 2, cooldown: 3 },
    alquimista: { uses: 1, cooldown: 0 },
    sentinela: { uses: 2, cooldown: 2 },
    colosso: { uses: 1, cooldown: 0 },
    muralha: { uses: 1, cooldown: 0 },
    muralha_ancora: { uses: 1, cooldown: 1 },
    javali_de_ferro: { uses: 1, cooldown: 0 },
    guardiao_runico: { uses: 1, cooldown: 0 },
    berserker: { uses: 2, cooldown: 3 },
    executor: { uses: 1, cooldown: 0 },
    cavaleiro_errante: { uses: 2, cooldown: 2 },
    predador: { uses: 1, cooldown: 0 },
    duelista: { uses: 1, cooldown: 1 },
    cacador_cabecas: { uses: 1, cooldown: 0 },
    cronomante: { uses: 1, cooldown: 2 },
    ilusionista: { uses: 1, cooldown: 3 },
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
      return { uses: base.uses + (match ? boss.uses : 0), cooldown: ['duelista','muralha_ancora'].includes(key) ? 1 : Math.max(0, base.cooldown - (match ? boss.cooldown : 0)) };
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
    if (key === 'ilusionista') return { uses: mastery, cooldown: mastery >= 3 ? 1 : mastery === 2 ? 2 : 3 };
    extra += Math.max(0, mastery - 1);
    if (mastery >= 3) reduction += 1;
    return { uses: base.uses + extra, cooldown: ['duelista','muralha_ancora'].includes(key) ? 1 : Math.max(0, base.cooldown - reduction) };
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
  // Congelamento por uma única ação do adversário. A vítima continua capturável.
  function frozenAt(side, pos) {
    const freeze = state().chronoFreeze[String(side)];
    return !!freeze && freeze.target === pos;
  }
  function expireFreeze(side) { delete state().chronoFreeze[String(side)]; }
  function moveFreeze(side, from, to) {
    const freeze = state().chronoFreeze[String(side)];
    if (freeze && freeze.target === from) freeze.target = to;
  }
  function specialAtBoard(board, i) {
    if (Object.values(state()?.illusions || {}).some(x => x.pos === i)) return null;
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
    const illusion = Object.values(state()?.illusions || {}).find(x => x.pos === i);
    if (illusion) return ' data-special-piece="ilusionista" data-symbol="🎭"';
    const key = specialAtBoard((window.__manobraApp && window.__manobraApp.game && window.__manobraApp.game.st.b) || (window.__manobraApp && window.__manobraApp.pieces), i), piece = key && catalog()[key];
    if (!piece) return '';
    return ` data-special-piece="${key}" data-symbol="${piece.symbol || '★'}"`;
  }

  function beforeMove(game, mv) {
    if (!run() || !run().active || !mv) return true;
    // Não aplicar poderes a uma jogada inexistente no motor original.
    state().blockedMove = false;
    state().pendingRepel = null;
    // A ação bônus é exclusiva do Berserker que a conquistou.
    const bonus = state().berserkerBonus;
    if (bonus && (game.st.turn !== bonus.side || mv.from !== bonus.at || !['m','k'].includes(mv.t))) return false;
    delete mv.rogueWind;
    delete mv.rogueCavalry;
    delete mv.rogueExecution;
    delete mv.rogueTeleport;
    const legal = game.legal();
    if (game.over || !legal || !Array.isArray(legal.moves) || !legal.moves.some(x => x.t === mv.t && x.from === mv.from && x.to === mv.to && (x.beyond ?? -1) === (mv.beyond ?? -1))) return false;
    const board = game.st.b, mover = sideAt(board, mv.from), target = mv.to >= 0 ? specialEntry(board, mv.to) : null;
    // A isca é representada por uma peça normal para a IA; sua identidade
    // verdadeira só é revelada quando o adversário tenta interagir com ela.
    const illusionHit = Object.entries(state().illusions).find(([,x]) => x.pos === mv.to);
    if (illusionHit && ['k','p','s','x'].includes(mv.t) &&
        game.st.turn !== illusionHit[1].side) {
      game.st.b[mv.to] = 0;
      delete state().illusions[illusionHit[0]];
      if (typeof game.record === 'function') game.record();
      state().blockedMove = true; state().pending = null;
      announce('🎭 Era uma ilusão! A cópia desapareceu e a jogada foi consumida.');
      return false;
    }
    // Ilusões não podem executar movimentos, virar ou capturar.
    if (Object.values(state().illusions).some(x => x.pos === mv.from)) return false;
    const actor = specialEntry(board, mv.from);
    if (actor?.key === 'ilusionista' && available(mover,mv.from,'ilusionista') &&
        !Object.values(state().illusions).some(x => x.ownerSide === mover && x.ownerPos === mv.from)) {
      const free = [];
      for (let j = 0; j < board.length; j++)
        if (!board[j] && !E().isMain(j) && isDiagonal(mv.from,j)) free.push(j);
      if (free.length) {
        const human = window.__manobraApp && window.__manobraApp.humanSide === mover;
        const approved = !human || (typeof window.confirm === 'function' &&
          window.confirm('🎭 ILUSÃO PERFEITA\n\nCriar uma cópia na diagonal? Consome sua jogada e uma carga. Cancelar = jogar normalmente.'));
        if (approved) {
          let chosen = free[0];
          if (human && free.length > 1 && typeof window.prompt === 'function') {
            const answer = window.prompt('Escolha a casa vazia para a ilusão: '+free.join(', '),String(chosen));
            if (answer === null || !free.includes(Number(answer))) chosen = -1;
            else chosen = Number(answer);
          }
          if (chosen >= 0 && consume(mover,mv.from,'ilusionista')) {
            // Defesa falsa: pode ser ameaçada normalmente; nunca tem ataque.
            board[chosen] = E().makePiece(mover,false);
            state().illusions[`${mover}:${mv.from}`] = { side:mover,ownerSide:mover,ownerPos:mv.from,pos:chosen };
            if (typeof game.record === 'function') game.record();
            state().blockedMove = true; state().pending = null; state().illusionJustCast = mover;
            announce('🎭 Ilusão Perfeita: uma cópia surgiu no tabuleiro!');
            return false;
          }
        }
      }
    }

    if (mv.t !== 'x' && mover !== game.st.turn) return false;
    // Validação extra para interface e para qualquer chamador direto.
    if (frozenAt(mover, mv.from)) {
      announce('⏳ Esta peça está paralisada até o fim deste turno. Escolha outra peça.');
      return false;
    }
    // A paralisia é opcional, consome a ação inteira e inicia a recarga agora.
    // Alcance de uma casa diagonal: respeita as casas jogáveis do tabuleiro.
    if (specialEntry(board, mv.from)?.key === 'cronomante' &&
        available(mover, mv.from, 'cronomante') && !state().berserkerBonus) {
      const targets = [];
      for (let i = 0; i < board.length; i++)
        if (sideAt(board, i) === enemyOf(mover) && isDiagonal(mv.from, i)) targets.push(i);
      const human = window.__manobraApp && window.__manobraApp.humanSide === mover;
      let target = -1;
      if (targets.length && human && typeof window.confirm === 'function' &&
          window.confirm('⏳ ATRASO TEMPORAL\n\nParalisar um inimigo na diagonal por uma ação adversária? Consome este turno e uma carga. Cancelar = jogar normalmente.')) {
        if (targets.length === 1) target = targets[0];
        else if (typeof window.prompt === 'function') {
          const answer = window.prompt('Escolha a casa do inimigo para paralisar: ' + targets.join(', '), String(targets[0]));
          if (answer !== null && targets.includes(Number(answer))) target = Number(answer);
        }
      } else if (targets.length && !human) {
        // IA decide sem conhecer escolhas ocultas: ameaça adjacente mais próxima do centro.
        target = targets.slice().sort((a,b) => Math.abs(rc(a).c-6)-Math.abs(rc(b).c-6))[0];
      }
      if (target >= 0 && consume(mover, mv.from, 'cronomante')) {
        state().chronoFreeze[String(enemyOf(mover))] = { target };
        state().blockedMove = true;
        state().pending = null;
        announce('⏳ Atraso Temporal: peça inimiga paralisada por uma ação!');
        return false;
      }
    }
    const moving = specialEntry(board, mv.from);
    // A restrição dura somente a próxima ação do Duelista, e apenas contra
    // o agressor que provocou a troca de posições.
    const duelBan = state().duelistBan[mover];
    if (duelBan && specialEntry(board, mv.from)?.key === 'duelista' &&
        mv.from === duelBan.duelistAt && mv.t === 'k' && mv.to === duelBan.attackerAt) {
      announce('🤺 O Duelista não pode capturar seu último agressor neste turno.');
      return false;
    }

    // Recompensa pela Cabeça: escolha voluntária do alvo antes de jogar.
    // O alvo não é capturado à distância; só uma captura legal pelo próprio
    // Caçador marcado rende 20 moedas. Uma marca por caçador por vez.
    if (moving && moving.key === 'cacador_cabecas' && available(mover, mv.from, moving.key) &&
        !state().bounties[`${mover}:${mv.from}`]) {
      const candidates = [];
      for (let i = 0; i < board.length; i++) if (sideAt(board,i) === enemyOf(mover)) candidates.push(i);
      const human = window.__manobraApp && window.__manobraApp.humanSide === mover;
      let choice = -1;
      if (candidates.length && human && typeof window.prompt === 'function') {
        const answer = window.prompt('🎯 Recompensa pela Cabeça: digite a casa (índice) do inimigo para marcar. Cancelar = jogar sem marcar.\nAlvos: ' + candidates.join(', '), '');
        if (answer !== null && answer.trim() !== '' && candidates.includes(Number(answer))) choice = Number(answer);
      } else if (candidates.length && !human) {
        // A IA só conhece o tabuleiro, não informações ocultas do jogador.
        choice = candidates.reduce((a,b) => distance(mv.from,a) <= distance(mv.from,b) ? a : b);
      }
      if (choice >= 0 && consume(mover,mv.from,'cacador_cabecas')) {
        state().bounties[`${mover}:${mv.from}`] = {side:enemyOf(mover),target:choice};
        announce('🎯 Caçador de Cabeças marcou um alvo para receber 20 moedas.');
      }
    }
    // A armadilha expira quando o dono volta a jogar, mesmo se mover outra peça.
    for (const id of Object.keys(state().predatorAmbush)) if (id.startsWith(`${mover}:`)) delete state().predatorAmbush[id];
    // Armar uma emboscada custa o turno inteiro. O jogador escolhe na
    // primeira tentativa de movimentar o Predador; a IA arma quando há presa
    // próxima (distância <= 2), para não desperdiçar turnos.
    const ambushId = pactKey(mover, mv.from);
    if (moving && moving.key === 'predador' && E().isAttack(board[mv.from]) &&
        !state().predatorAmbush[ambushId] && available(mover, mv.from, 'predador')) {
      const closeEnemy = allEntries(board).some(e => e.side !== mover && distance(e.i, mv.from) <= 2) ||
        Array.from(board).some((v,i) => sideAt(board,i) === enemyOf(mover) && distance(i,mv.from) <= 2);
      const human = window.__manobraApp && window.__manobraApp.humanSide === mover;
      const approved = human ? (typeof window.confirm === 'function' && window.confirm('🐺 Armar Emboscada Mortal? Custa este turno e uma carga. Cancelar = fazer a jogada normal.')) : closeEnemy;
      if (approved && consume(mover,mv.from,'predador')) {
        state().predatorAmbush[ambushId] = true;
        state().blockedMove = true;
        state().pending = null;
        announce('🐺 Predador preparou Emboscada Mortal até seu próximo turno!');
        return false;
      }
    }
    // Ao iniciar outro turno do Predador, a emboscada antiga expira.
    if (moving && moving.key === 'predador') delete state().predatorAmbush[ambushId];
    state().pending = { reapersBefore: allEntries(board).filter(x => x.key === 'ceifador').map(x => ({side:x.side,pos:x.i})), victim: target && target.key, victimSide: sideAt(board, mv.to), attacker: moving && moving.key, attackerSide: mv.t === 'x' ? game.st.turn : mover, from: mv.from, to: mv.to };
    // A troca precisa guardar a identidade ANTES de game.play alterar o tabuleiro.
    if (mv.t === 's') {
      const other = specialEntry(board, mv.to);
      state().pending.swapOther = other && other.key;
      state().pending.swapOtherSide = other && other.side;
    }
    // Contra-Ataque: ao receber uma captura legal, o Duelista pode trocar
    // posições com o agressor. A ação do agressor é consumida, sem mortes.
    if (mv.t === 'k' && target && target.key === 'duelista' &&
        available(target.side, mv.to, 'duelista')) {
      const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
      const approved = target.side !== human || (typeof window.confirm === 'function' &&
        window.confirm('🤺 Ativar Contra-Ataque? Trocar posições com o agressor, sem capturas (1 carga).'));
      if (approved && consume(target.side, mv.to, 'duelista')) {
        state().pendingDuelSwap = { duelSide: target.side, duelAt: mv.to,
          attackerSide: mover, attackerAt: mv.from };
        state().blockedMove = true; state().pending = null;
        announce('🤺 Contra-Ataque! Duelista troca de posição com o atacante.');
        return false;
      }
    }
    // Remoção obrigatória da sétima defesa é regra do motor, não uma captura bloqueável.
    if (mv.t === 'x') return true;
    // Cavaleiro Errante: captura e avanço opcional de uma casa na mesma diagonal.
    // Sem espaço livre ou sem aprovação, mantém captura comum e não gasta carga.
    if (moving && moving.key === 'cavaleiro_errante' && mv.t === 'k' &&
        E().isAttack(board[mv.from]) && available(mover, mv.from, moving.key)) {
      const a = rc(mv.from), f = rc(mv.to), dr = f.r - a.r, dc = f.c - a.c;
      const landing = idx(f.r + dr, f.c + dc);
      if (Math.abs(dr) === 1 && Math.abs(dc) === 1 && landing >= 0 &&
          E().isDarkCell(landing) && !E().isMain(landing) && !board[landing]) {
        const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
        const approved = mover !== human || (typeof window.confirm === 'function' &&
          window.confirm('♞ CARGA DE CAVALARIA\n\nOK: capturar e avançar mais uma casa na mesma diagonal (gasta 1 carga).\nCancelar: captura normal sem gastar carga.'));
        if (approved && consume(mover, mv.from, moving.key)) {
          mv.rogueCavalry = { landing };
          state().pending.cavalry = { landing };
          announce('♞ Carga de Cavalaria: captura e avanço extra!');
          return true;
        }
      }
    }
    // Executor: captura legal da peça frontal é transformada em execução da
    // peça imediatamente atrás, seguida de empurrão frontal para essa casa.
    // A origem fica ocupada pelo Executor; sem duas vítimas, lance normal.
    if (moving && moving.key === 'executor' && mv.t === 'k' &&
        E().isAttack(board[mv.from]) && available(mover, mv.from, moving.key)) {
      const a = rc(mv.from), f = rc(mv.to);
      const dr = f.r - a.r, dc = f.c - a.c;
      const back = idx(f.r + dr, f.c + dc);
      if (Math.abs(dr) === 1 && Math.abs(dc) === 1 && back >= 0 &&
          E().isDarkCell(back) && sideAt(board, mv.to) === enemyOf(mover) &&
          sideAt(board, back) === enemyOf(mover)) {
        const rear = specialEntry(board, back);
        if (consume(mover, mv.from, moving.key)) {
          mv.rogueExecution = { back };
          state().pending.execution = { back, victimSide: enemyOf(mover), rearKey: rear && rear.key,
            frontKey: target && target.key };
          announce('⚔️ Execução em Cadeia: inimigo de trás eliminado; peça frontal empurrada!');
          return true;
        }
      }
    }
    // Assassino: no ataque, fica na origem; na defesa, ocupa a casa do alvo
    // em vez de trocá-la. A vítima volta à última linha do próprio território.
    // A habilidade só substitui uma ação legal e nunca consome carga sem destino.
    if (moving && moving.key === 'assassino_sombras' &&
        ((mv.t === 'k' && E().isAttack(board[mv.from])) ||
         (mv.t === 's' && !E().isAttack(board[mv.from]))) &&
        sideAt(board, mv.to) === enemyOf(mover) && available(mover, mv.from, moving.key)) {
      const victimSide = enemyOf(mover);
      const backRow = victimSide === E().WHITE ? E().ROWS - 1 : 0;
      const candidates = [];
      for (let col = 0; col < E().COLS; col++) {
        const landing = idx(backRow, col);
        if (E().isDarkCell(landing) && !E().isMain(landing) && !board[landing]) candidates.push(landing);
      }
      if (candidates.length) {
        const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
        const approved = mv.t !== 's' || mover !== human ||
          (typeof window.confirm === 'function' && window.confirm('🥷 TELETRANSPORTE SOMBRIO\n\nOK: enviar o inimigo para o fundo do campo e ocupar a casa dele (gasta uma carga).\nCancelar: fazer a troca normal, sem gastar carga.'));
        if (approved) {
          // Preferir a casa mais próxima do centro; escolha determinística para IA.
          candidates.sort((a,b) => Math.abs(rc(a).c - 6) - Math.abs(rc(b).c - 6) || a-b);
          const landing = candidates[0];
          if (consume(mover, mv.from, moving.key)) {
            mv.rogueTeleport = { landing };
            state().pending.teleport = { landing, victimSide, victimKey: target && target.key, attackerSide: mover, attackerFrom: mv.from, attackerTo: mv.to, mode: mv.t };
            announce('🥷 Teletransporte Sombrio: inimigo enviado ao fundo do próprio campo!');
            return true;
          }
        }
      }
    }
    // Rajada Cortante: o atacante fixa o alvo ANTES da escolha defensiva.
    // Apenas capturas diagonais legais; o empurrão é adicional e opcional.
    if (moving && moving.key === 'vento_cortante' && mv.t === 'k' &&
        isDiagonal(mv.from,mv.to) && available(mover,mv.from,'vento_cortante')) {
      const choices = [];
      for (let pos=0;pos<board.length;pos++) {
        if (pos === mv.to || sideAt(board,pos) !== enemyOf(mover) || distance(pos,mv.to)!==1) continue;
        const a=rc(mv.to),b=rc(pos);
        const landing=idx(b.r+Math.sign(b.r-a.r),b.c+Math.sign(b.c-a.c));
        if (landing>=0 && E().isDarkCell(landing) && !E().isMain(landing) && !board[landing]) choices.push({target:pos,landing});
      }
      if (choices.length) {
        const human = window.__manobraApp && window.__manobraApp.humanSide === mover;
        let selected=null;
        if (human && typeof window.confirm==='function' && window.confirm('🌪️ Ativar Rajada Cortante após a captura? Gasta 1 carga.')) {
          if (choices.length===1) selected=choices[0];
          else if (typeof window.prompt==='function') {
            const pick=Number(window.prompt('Escolha SECRETAMENTE a peça para empurrar (número da casa): '+choices.map(x=>x.target).join(', '),' '+choices[0].target));
            selected=choices.find(x=>x.target===pick)||null;
          }
        } else if (!human) selected=choices[0]; // IA não lê a defesa antes de escolher
        if (selected) {
          const defender=enemyOf(mover);
          // Só a Âncora de Ferro da Muralha bloqueia empurrão.
          // Sua carga é independente da proteção original contra captura.
          const pushGuardKeys = new Set(['muralha']);
          const guards=allEntries(board).filter(e=>e.side===defender &&
            pushGuardKeys.has(e.key) && available(e.side,e.i,'muralha_ancora'));
          const options=[];
          for (const g of guards) for (const c of choices) {
            const reach=g.i===c.target || (g.key === 'muralha' && distance(g.i,c.target) <= 1);
            if (reach) options.push({guard:g,protected:c.target});
          }
          let defense=null;
          const defenseHuman=window.__manobraApp && window.__manobraApp.humanSide===defender;
          if (options.length && defenseHuman && typeof window.prompt==='function') {
            const answer=window.prompt('🛡️ Escolha uma peça para proteger SEM conhecer o alvo da Rajada. Digite número da opção, ou 0 para não defender:\n'+options.map((o,i)=>`${i+1}: ${o.guard.piece.name} protege casa ${o.protected}`).join('\n'),'0');
            const number=Number(answer); if (number>=1 && number<=options.length) defense=options[number-1];
          } else if (options.length && !defenseHuman) {
            // Palpite independente do alvo secreto, prioriza casas ameaçadas.
            defense=options[Math.floor(Math.random()*options.length)];
          }
          const blocked=!!defense && defense.protected===selected.target;
          if (consume(mover,mv.from,'vento_cortante')) {
            if (defense) consume(defender,defense.guard.i,'muralha_ancora');
            mv.rogueWind={...selected,blocked};
            state().pending.wind={...selected,blocked,side:defender};
            announce(blocked?'🛡️ Rajada bloqueada! As duas cargas foram gastas.':
              '🌪️ Rajada Cortante ativada!'+(defense?' Defesa errou o alvo e gastou carga.':''));
          }
        }
      }
    }
    // Ataque especial: rompe UMA proteção reativa, mas somente em captura
    // já autorizada pelo motor. Não cria movimentos, capturas ou turnos.
    const pierceConditions = {
      lancer: () => isDiagonal(mv.from, mv.to),
      berserker: () => true,
      executor: () => false,
      cavaleiro_errante: () => false,
      ceifador: () => false,
      predador: () => false,
      duelista: () => false,
      vento_cortante: () => false,
      cacador_cabecas: () => false
    };
    const protectedTarget = isCapture(mv, board) && target && (
      ['escudeiro', 'rebatedor', 'muralha'].includes(target.key) ||
      allEntries(board).some(e => e.side === target.side && distance(e.i, mv.to) <= (e.key === 'baluarte' ? 2 : 1) && e.i !== mv.to &&
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
    if (piercing) {
      if (moving.key === 'berserker' && mv.t === 'k' && !state().berserkerBonus) state().pending.berserkerPierced = true;
      announce(`⚔️ ${moving.piece.name}: rompeu a proteção inimiga!`); return true;
    }
    // Escudeiro: o primeiro ataque é absorvido; não perde a peça nem permite combo.
    if (target && target.key === 'escudeiro' && isCapture(mv, board)) {
      if (consume(target.side, mv.to, 'escudeiro')) { announce('🛡️ Escudeiro absorveu o primeiro impacto.'); state().blockedMove = true; state().pending = null; return false; }
    }
    // Sentinela: a carga só é consumida com autorização do dono.
    // A IA preserva cargas em avanços simples, priorizando capturas e ameaças diretas.
    for (const e of allEntries(board)) if (e.key === 'sentinela' && e.side !== mover && mv.to >= 0 && distance(e.i, mv.to) === 1 && available(e.side, e.i, e.key)) {
      const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
      const capturing = isCapture(mv, board);
      let block;
      if (e.side === human) {
        block = typeof window.confirm === 'function'
          ? window.confirm('🏰 SENTINELA\n\nO inimigo quer entrar na sua área protegida.\n\nOK: gastar 1 carga e bloquear (o inimigo perde a jogada).\nCancelar: permitir a jogada e guardar a carga.')
          : false; // Sem interface de confirmação, nunca gastar a carga do jogador automaticamente.
      } else {
        // IA: não desperdiça carga com avanço simples; protege contra captura.
        block = capturing;
      }
      if (block && consume(e.side, e.i, e.key)) {
        announce('🏰 Sentinela: bloqueio autorizado! Uma carga consumida.');
        state().blockedMove = true; state().pending = null; return false;
      }
      announce('🏰 Sentinela: passagem permitida; carga preservada.');
    }
    // Bastião/Titã: alcance 1; Baluarte: alcance 2. Nunca protege a si mesmo.
    if (isCapture(mv, board) && sideAt(board, mv.to) >= 0 && sideAt(board, mv.to) !== mover) {
      for (const e of allEntries(board)) if (['bastiao', 'tita_de_aco', 'baluarte'].includes(e.key) && e.side === sideAt(board, mv.to) && e.i !== mv.to && distance(e.i, mv.to) <= (e.key === 'baluarte' ? 2 : 1)) {
        if (consume(e.side, e.i, e.key)) {
          // Titã: o atacante recua uma casa na direção oposta ao alvo,
          // somente se a casa for jogável, livre e não for uma base.
          if (e.key === 'tita_de_aco') {
            const origin = rc(mv.from), destination = rc(mv.to);
            const retreat = idx(origin.r + Math.sign(origin.r - destination.r),
                                origin.c + Math.sign(origin.c - destination.c));
            if (retreat >= 0 && E().isDarkCell(retreat) && !E().isMain(retreat) && !board[retreat]) {
              state().pendingRepel = { side: mover, from: mv.from, to: retreat };
              announce('🦾 Titã de Aço: captura bloqueada! O atacante foi repelido uma casa.');
            } else {
              announce('🦾 Titã de Aço: captura bloqueada! Sem espaço livre para repelir.');
            }
          } else {
            announce(`🧱 ${e.piece.name}: captura aliada bloqueada.`);
          }
          state().blockedMove = true; state().pending = null; return false;
        }
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
    const duel = s.pendingDuelSwap;
    s.pendingDuelSwap = null;
    if (duel && attackerSide === duel.attackerSide &&
        sideAt(game.st.b, duel.attackerAt) === duel.attackerSide &&
        sideAt(game.st.b, duel.duelAt) === duel.duelSide) {
      const board = game.st.b;
      [board[duel.attackerAt],board[duel.duelAt]] = [board[duel.duelAt],board[duel.attackerAt]];
      const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
      const bag = side => side === human ? run().deployed : run().enemyDeployed;
      const relocateSpecial = (side, from, to) => {
        const entries = bag(side), key = entries && entries[String(from)];
        if (!key) return;
        delete entries[String(from)]; entries[String(to)] = key;
        pactRelocate(s,side,from,to);
      moveFreeze(side,from,to);
      // Marcas seguem a presa, mesmo quando ela se move ou é empurrada.
      for (const mark of Object.values(s.bounties)) if (mark.side === side && mark.target === from) mark.target = to;
      const hunterMark = `${side}:${from}`;
      if (special === 'cacador_cabecas' && s.bounties[hunterMark]) {
        s.bounties[`${side}:${to}`] = s.bounties[hunterMark]; delete s.bounties[hunterMark];
      }

        for (const field of ['charges','abilityCooldown']) {
          const oldId = abilityId(side,from,key), newId = abilityId(side,to,key);
          if (Object.prototype.hasOwnProperty.call(s[field],oldId)) {
            s[field][newId] = s[field][oldId]; delete s[field][oldId];
          }
        }
      };
      relocateSpecial(duel.duelSide,duel.duelAt,duel.attackerAt);
      relocateSpecial(duel.attackerSide,duel.attackerAt,duel.duelAt);
      s.duelistBan[duel.duelSide] = {duelistAt:duel.attackerAt,attackerAt:duel.duelAt};
      if (typeof game.record === 'function') game.record();
    }
    const repel = s.pendingRepel;
    s.pendingRepel = null;
    if (repel && repel.side === attackerSide && sideAt(game.st.b, repel.from) === attackerSide &&
        repel.to >= 0 && E().isDarkCell(repel.to) && !E().isMain(repel.to) && !game.st.b[repel.to]) {
      game.st.b[repel.to] = game.st.b[repel.from];
      game.st.b[repel.from] = 0;
      const bag = attackerSide === (window.__manobraApp && window.__manobraApp.humanSide)
        ? run().deployed : run().enemyDeployed;
      if (bag && bag[String(repel.from)]) {
        const key = bag[String(repel.from)];
        delete bag[String(repel.from)];
        bag[String(repel.to)] = key;
        for (const field of ['charges', 'abilityCooldown']) {
          const a = abilityId(attackerSide, repel.from, key), b = abilityId(attackerSide, repel.to, key);
          if (Object.prototype.hasOwnProperty.call(s[field], a)) {
            s[field][b] = s[field][a]; delete s[field][a];
          }
        }
      }
      if (typeof game.record === 'function') game.record();
    }
    const wasBonus = !!s.berserkerBonus && s.berserkerBonus.side === attackerSide;
    if (wasBonus) s.berserkerBonus = null;
    delete s.duelistBan[attackerSide];
    game.pass();
    expireFreeze(attackerSide);
    if (s.illusionJustCast === attackerSide) delete s.illusionJustCast;
    else if (!wasBonus) tickCooldown(attackerSide);
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
  function specialMoves(game, base) {
    const bonus = state() && state().berserkerBonus;
    if (!base || !Array.isArray(base.moves)) return base;
    const filtered = base.moves.filter(m => !frozenAt(game.st.turn, m.from) && !Object.values(state().illusions).some(x => x.pos === m.from));
    if (!bonus || game.st.turn !== bonus.side) return { ...base, moves: filtered };
    return { ...base, moves: base.moves.filter(m => m.from === bonus.at && ['m','k'].includes(m.t)) };
  }

  function patchLegal() {
    const Game = E() && E().Game;
    if (!Game || Game.prototype.__roguelikePatched) return;
    const original = Game.prototype.legal;
    Game.prototype.legal = function (opts) { const base = original.call(this, opts); return specialMoves(this, base); };
    Game.prototype.__roguelikePatched = true;
  }

  function pactKey(side, pos) { return `${side}:${pos}`; }
  function pactRelocate(s, side, from, to) {
    if (from === to) return;
    const oldKey = pactKey(side, from), newKey = pactKey(side, to);
    if (s.deathPacts[oldKey]) { s.deathPacts[newKey] = s.deathPacts[oldKey]; delete s.deathPacts[oldKey]; }
    for (const marks of Object.values(s.deathPacts)) {
      if (marks[oldKey]) { delete marks[oldKey]; marks[newKey] = true; }
    }
  }
  function pactKill(game, beforeReapers, movingSide, from, to, mv) {
    const s = state(), b = game.st.b, r = run();
    const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
    const bag = side => side === human ? r.deployed : r.enemyDeployed;
    // Atualizar as marcas quando um inimigo se desloca até uma nova casa.
    // Remoção da vítima ocorre antes desta rotina, no afterMove.
    let changed = false;
    for (const item of beforeReapers) {
      const movedReaper = movingSide === item.side && from === item.pos && ['m','k','p','s'].includes(mv.t);
      const currentPos = movedReaper ? to : item.pos;
      const key = pactKey(item.side, currentPos);
      const stillHere = sideAt(b, currentPos) === item.side && bag(item.side)[String(currentPos)] === 'ceifador';
      if (stillHere) continue;
      const marks = s.deathPacts[key];
      delete s.deathPacts[key];
      if (!marks) continue;
      let dead = 0;
      for (const target of Object.keys(marks)) {
        const [side, pos] = target.split(':').map(Number);
        if (sideAt(b, pos) !== side) continue;
        b[pos] = 0; changed = true;
        const victimKey = bag(side)[String(pos)];
        delete bag(side)[String(pos)];
        if (victimKey) { const id = abilityId(side,pos,victimKey); delete s.charges[id]; delete s.abilityCooldown[id]; }
        dead++;
      }
      if (dead) announce(`💀 Pacto da Morte: ${dead} peça(s) marcada(s) eliminada(s) com o Ceifador!`);
    }
    // Marcação somente quando um inimigo ENTRA na vizinhança após a jogada.
    const moved = mv.t === 'm' || mv.t === 'k' || mv.t === 'p' || mv.t === 's';
    if (moved && movingSide >= 0 && from >= 0) {
      const candidates = mv.t === 's' ? [to, from] : [to];
      for (const dest of candidates) {
        const side = sideAt(b, dest);
        if (side < 0) continue;
        for (const reaper of allEntries(b).filter(x => x.key === 'ceifador' && x.side !== side)) {
          if (distance(reaper.i, dest) > 1 || distance(reaper.i, mv.t === 's' && dest === from ? to : from) <= 1) continue;
          const id = pactKey(reaper.side,reaper.i), target = pactKey(side,dest);
          if ((s.deathPacts[id] && s.deathPacts[id][target]) || !available(reaper.side,reaper.i,'ceifador')) continue;
          const ownerHuman = reaper.side === human;
          const approved = !ownerHuman || (typeof window.confirm === 'function' && window.confirm('💀 Pacto da Morte: marcar esta peça inimiga?'));
          if (approved && consume(reaper.side,reaper.i,'ceifador')) {
            (s.deathPacts[id] ||= {})[target] = true;
            announce('💀 Ceifador marcou um inimigo. Se morrer, levará a peça marcada!');
          }
        }
      }
    }
    // A resolução acontece após o lance original: atualizar histórico e vitória.
    if (!changed) return;
    const previous = game.hist && E().hashOf(game.st);
    if (previous && game.hist.has(previous)) game.hist.set(previous, Math.max(0,game.hist.get(previous)-1));
    game.record();
    const outcome = E().winner(game.st, game.st.turn ^ 1);
    if (outcome) { game.over = { winner: game.st.turn ^ 1, reason: outcome }; game.cur = null; }
    else { game.over = null; game.refresh(); }
  }

  function resolvePredatorAmbush(game, mv, movingSide, from, to) {
    const s = state(), b = game.st.b, r = run();
    if (!s || !r || !['m','k','p','s'].includes(mv.t)) return;
    const human = window.__manobraApp ? window.__manobraApp.humanSide : E().WHITE;
    const bag = side => side === human ? r.deployed : r.enemyDeployed;
    // Somente entrada efetiva em uma casa diagonal, não inimigo já parado.
    const destinations = mv.t === 's' ? [to,from] : [to];
    for (const dest of destinations) {
      const enemySide = sideAt(b,dest);
      if (enemySide < 0 || enemySide !== movingSide) continue;
      for (const [id] of Object.entries(s.predatorAmbush)) {
        const [side,pos] = id.split(':').map(Number);
        if (side === enemySide || sideAt(b,pos) !== side || bag(side)[String(pos)] !== 'predador') { if (sideAt(b,pos) !== side) delete s.predatorAmbush[id]; continue; }
        const old = mv.t === 's' && dest === from ? to : from;
        if (distance(pos,dest) !== 1 || distance(pos,old) <= 1 || !E().isAttack(b[pos])) continue;
        // Só dispara se a captura seria legal, incluindo apoio aliado.
        const legal = E().generate({...game.st,turn:side},side).some(x => x.t === 'k' && x.from === pos && x.to === dest);
        if (!legal) continue;
        const victimKey = bag(enemySide)[String(dest)];
        delete bag(enemySide)[String(dest)];
        if (victimKey) { const aid = abilityId(enemySide,dest,victimKey); delete s.charges[aid]; delete s.abilityCooldown[aid]; }
        b[dest] = b[pos]; b[pos] = 0;
        const pid = abilityId(side,pos,'predador'), nid = abilityId(side,dest,'predador');
        delete bag(side)[String(pos)]; bag(side)[String(dest)] = 'predador';
        for (const field of ['charges','abilityCooldown']) if (Object.prototype.hasOwnProperty.call(s[field],pid)) {
          s[field][nid] = s[field][pid]; delete s[field][pid];
        }
        pactRelocate(s,side,pos,dest);
        delete s.predatorAmbush[id];
        // O lance adversário já gastou a vez; corrigir histórico e condição final.
        const h = E().hashOf(game.st);
        if (game.hist && game.hist.has(h)) game.hist.set(h,Math.max(0,game.hist.get(h)-1));
        if (typeof game.record === 'function') game.record();
        const result = E().winner(game.st,side);
        if (result) { game.over = {winner:side,reason:result}; game.cur = null; }
        else { game.over = null; if (typeof game.refresh === 'function') game.refresh(); }
        announce('🐺 Emboscada Mortal! Predador capturou a peça que entrou na diagonal.');
        return;
      }
    }
  }

  function afterMove(game, mv, captured) {
    if (!run() || !run().active || !mv) return;
    const board = game.st.b;
    const s = state(), pending = s.pending || {}; s.pending = null;
    // Captura da presa é verificada ANTES de atualizar as posições.
    const bountyClaim = !!(captured && mv.t === 'k' && pending.attacker === 'cacador_cabecas' &&
      s.bounties[`${pending.attackerSide}:${mv.from}`] &&
      s.bounties[`${pending.attackerSide}:${mv.from}`].target === mv.to &&
      s.bounties[`${pending.attackerSide}:${mv.from}`].side === pending.victimSide);
    const beforeReapers = pending.reapersBefore || [];
    const finishPact = () => { pactKill(game, beforeReapers, pending.attackerSide, mv.from, mv.to, mv); resolvePredatorAmbush(game,mv,pending.attackerSide,mv.from,mv.to); };
    // Só uma jogada efetivamente realizada consome a habilidade e avança a recarga.
    const originSide = mv.from >= 0 ? sideAt(board, mv.from) : -1;
    const turnSide = pending.attackerSide >= 0 ? pending.attackerSide : originSide;
    if (s.duelistBan[turnSide]) delete s.duelistBan[turnSide];
    const usingBonus = !!s.berserkerBonus && s.berserkerBonus.side === turnSide;
    if (usingBonus) s.berserkerBonus = null;
    if (turnSide >= 0 && !usingBonus) { expireFreeze(turnSide); tickCooldown(turnSide); }
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
      const illusionKey = `${side}:${from}`;
      if (s.illusions[illusionKey]) { s.illusions[`${side}:${to}`] = {...s.illusions[illusionKey],ownerPos:to}; delete s.illusions[illusionKey]; }
      delete bag[String(from)];
      bag[String(to)] = special;
      pactRelocate(s,side,from,to);
      moveFreeze(side,from,to);
      // Marcas seguem a presa, mesmo quando ela se move ou é empurrada.
      for (const mark of Object.values(s.bounties)) if (mark.side === side && mark.target === from) mark.target = to;
      const hunterMark = `${side}:${from}`;
      if (special === 'cacador_cabecas' && s.bounties[hunterMark]) {
        s.bounties[`${side}:${to}`] = s.bounties[hunterMark]; delete s.bounties[hunterMark];
      }

      const oldId = abilityId(side, from, special), newId = abilityId(side, to, special);
      for (const field of ['charges', 'abilityCooldown']) {
        if (Object.prototype.hasOwnProperty.call(s[field], oldId)) {
          s[field][newId] = s[field][oldId]; delete s[field][oldId];
        }
      }
    };
    // O motor já avançou o Cavaleiro antes de registrar o histórico.
    if (pending.cavalry && mv.rogueCavalry) {
      if (pending.victimSide >= 0) {
        const victimBag = bagForSide(pending.victimSide);
        if (victimBag) delete victimBag[String(mv.to)];
        const victimId = abilityId(pending.victimSide, mv.to, pending.victim);
        delete s.charges[victimId]; delete s.abilityCooldown[victimId];
      }
      relocate(turnSide, mv.from, pending.cavalry.landing);
      delete mv.rogueCavalry;
      finishPact(); return;
    }
    if (pending.wind && mv.rogueWind) {
      const w=pending.wind;
      if (!w.blocked) relocate(w.side,w.target,w.landing);
      delete mv.rogueWind;
    }
    // A peça frontal foi deslocada para trás e a traseira foi eliminada.
    // Atualizar identidades e estado das habilidades após game.play.
    if (pending.execution && mv.rogueExecution) {
      const t = pending.execution, enemyBag = bagForSide(t.victimSide);
      if (enemyBag) {
        delete enemyBag[String(t.back)];
        delete enemyBag[String(mv.to)];
        if (t.frontKey) enemyBag[String(t.back)] = t.frontKey;
      }
      if (t.rearKey) {
        const id = abilityId(t.victimSide, t.back, t.rearKey);
        delete s.charges[id]; delete s.abilityCooldown[id];
      }
      if (t.frontKey) {
        const oldId = abilityId(t.victimSide, mv.to, t.frontKey);
        const newId = abilityId(t.victimSide, t.back, t.frontKey);
        for (const field of ['charges', 'abilityCooldown']) {
          if (Object.prototype.hasOwnProperty.call(s[field], oldId)) {
            s[field][newId] = s[field][oldId]; delete s[field][oldId];
          }
        }
      }
      delete mv.rogueExecution;
      finishPact(); return;
    }
    // A vítima do teletransporte continua viva, com identidade, cargas e recarga.
    // O motor já aplicou o lance completo antes de registrar o histórico.
    if (pending.teleport && mv.rogueTeleport) {
      const t = pending.teleport;
      const victimBag = bagForSide(t.victimSide);
      if (t.victimKey && victimBag) {
        delete victimBag[String(mv.to)];
        victimBag[String(t.landing)] = t.victimKey;
        const oldId = abilityId(t.victimSide, mv.to, t.victimKey);
        const newId = abilityId(t.victimSide, t.landing, t.victimKey);
        for (const field of ['charges', 'abilityCooldown']) {
          if (Object.prototype.hasOwnProperty.call(s[field], oldId)) {
            s[field][newId] = s[field][oldId]; delete s[field][oldId];
          }
        }
      }
      if (t.mode === 's') relocate(t.attackerSide, t.attackerFrom, t.attackerTo);
      delete mv.rogueTeleport;
      finishPact(); return;
    }
    // Limpar a vítima antes de mover o atacante: evita apagar a peça vencedora.
    if ((captured || mv.t === 'x') && (mv.t === 'k' || mv.t === 'x') && pending.victimSide >= 0) {
      const victimBag = bagForSide(pending.victimSide);
      if (victimBag) delete victimBag[String(mv.to)];
      const victimId = abilityId(pending.victimSide, mv.to, pending.victim);
      delete s.charges[victimId]; delete s.abilityCooldown[victimId];
    }
    // Remover marcas de vítimas mortas, sem pagar recompensa a outros aliados.
    if (captured && (mv.t === 'k' || mv.t === 'x')) {
      if (frozenAt(pending.victimSide,mv.to)) expireFreeze(pending.victimSide);
      for (const [id,mark] of Object.entries(s.bounties))
        if (mark.side === pending.victimSide && mark.target === mv.to) delete s.bounties[id];
    }
    // Presas comuns (sem identidade especial) também carregam a marca ao andar.
    if ((mv.t === 'm' || mv.t === 'k') && !pending.attacker)
      for (const mark of Object.values(s.bounties))
        if (mark.side === turnSide && mark.target === mv.from) mark.target = mv.to;
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
    if (!piece) { finishPact(); return; }
    // Suportes: benefícios econômicos após ações que o motor já validou.
    // Nenhum destes efeitos modifica peças, turno, apoio ou histórico da partida.
    if (movedSide === humanSide) {
      const supportRewards = {
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
    if (bountyClaim && movedSide === humanSide) {
      r.gold = Math.max(0, Number(r.gold) || 0) + 20;
      announce('🎯 Recompensa pela Cabeça: +20 moedas pela presa capturada!');
    }
    if (key === 'berserker' && mv.t === 'k' && captured) {
      s.captured[movedSide] = (s.captured[movedSide] || 0) + 1;
      if (pending.berserkerPierced && !usingBonus && !game.over) {
        // game.play já trocou a vez; devolver somente uma ação ao Berserker.
        game.st.turn = turnSide;
        s.berserkerBonus = { side: turnSide, at: mv.to };
        game.refresh();
        if (!game.cur || !game.cur.moves.length) {
          s.berserkerBonus = null;
          game.over = null; // Sem jogada bônus não é derrota: encerra o bônus.
          game.st.turn = turnSide ^ 1;
          game.refresh();
          announce('🪓 Fúria Implacável: sem movimento ou ataque extra disponível.');
        } else announce('🪓 Fúria Implacável: Berserker ganhou uma ação extra!');
      }
    }
    if (key === 'alquimista' && movedSide === humanSide && (mv.t === 'k' || mv.t === 'x') && captured && consume(movedSide, destinationAfter, 'alquimista')) { run().gold += 20; announce('🧪 Alquimista: +20 moedas.'); }
    finishPact();


    
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
