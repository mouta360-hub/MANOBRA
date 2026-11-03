/* Manobra Roguelike: três atos, mapa ramificado, economia e formação de batalha. */

if (typeof window.RoguelikeRun === 'undefined') {
  window.RoguelikeRun = {
    active: false, act: 1, floor: 1, maxFloors: 3, gold: 100,
    roster: [], activeTeam: [], deployed: {}, enemyDeployed: {}, enemyTeam: [], usedPieces: {},
    map: [], mapRow: -1, mapCol: 1, pendingNode: null, visited: []
  };
}

const ROGUE_NODE_TYPES = {
  battle:  { label: 'Combate', icon: '⚔️', color: '#ef4444' },
  elite:   { label: 'Elite', icon: '☠️', color: '#a855f7' },
  shop:    { label: 'Loja', icon: '🛒', color: '#10b981' },
  event:   { label: 'Evento', icon: '❓', color: '#f59e0b' },
  treasure:{ label: 'Tesouro', icon: '💎', color: '#38bdf8' },
  rest:    { label: 'Descanso', icon: '🔥', color: '#f97316' }
};

function getRoguelikePieceRarity(key) {
  const epics = ['tita_de_aco', 'cronomante', 'mestre_de_manobras', 'teleportador', 'ilusionista'];
  const rares = ['baluarte', 'berserker', 'executor', 'oraculo', 'alquimista', 'colosso', 'guardiao_runico', 'cavaleiro_errante'];
  if (epics.includes(key)) return { name: 'Épica', color: '#a855f7', price: 90, weight: 3 };
  if (rares.includes(key)) return { name: 'Rara', color: '#3b82f6', price: 60, weight: 2 };
  return { name: 'Comum', color: '#10b981', price: 35, weight: 1 };
}

function rogueCatalogPiece(key) {
  return typeof SPECIAL_PIECES_CATALOG !== 'undefined' ? SPECIAL_PIECES_CATALOG[key] || {} : {};
}
function rogueName(key) {
  const p = rogueCatalogPiece(key);
  const t = typeof SPECIAL_PIECES_PT_BR !== 'undefined' ? SPECIAL_PIECES_PT_BR[key] : {};
  return t && t.name || p.name || key;
}
function rogueDescription(key) {
  const p = rogueCatalogPiece(key);
  const t = typeof SPECIAL_PIECES_PT_BR !== 'undefined' ? SPECIAL_PIECES_PT_BR[key] : {};
  return t && t.passive || p.description || 'Efeito especial durante a batalha.';
}
function rogueToast(text) { if (typeof showRoguelikeToast === 'function') showRoguelikeToast(text); }

function generateRoguelikeMap() {
  // A maior parte do caminho é combate. Cada ato tem apenas um respiro de loja,
  // um tesouro, um evento e um descanso, além de dois combates de elite.
  const map = [];
  for (let row = 0; row < 8; row++) {
    const nodes = [];
    for (let col = 0; col < 3; col++) nodes.push({ id: `${Date.now()}-${row}-${col}-${Math.random()}`, row, col, type: row === 7 ? 'elite' : 'battle', cleared: false });
    map.push(nodes);
  }
  const special = [
    [1, Math.floor(Math.random() * 3), 'shop'],
    [3, Math.floor(Math.random() * 3), 'elite'],
    [4, Math.floor(Math.random() * 3), 'treasure'],
    [5, Math.floor(Math.random() * 3), 'event'],
    [6, Math.floor(Math.random() * 3), 'rest']
  ];
  special.forEach(([row, col, type]) => { map[row][col].type = type; });
  return map;
}
function rogueAvailable(node) {
  const r = window.RoguelikeRun;
  if (node.cleared || node.row !== r.mapRow + 1) return false;
  if (r.mapRow < 0) return node.row === 0;
  return Math.abs(node.col - r.mapCol) <= 1;
}
function rogueNextAct() {
  const r = window.RoguelikeRun;
  if (r.act >= 3) {
    r.active = false;
    rogueToast(`🏆 Aventura concluída! Você terminou os 3 mapas com ${r.gold} moedas.`);
    updateFloatingAdventureButton();
    closeRoguelikeAdventure();
    return;
  }
  r.act++; r.floor = 1; r.map = generateRoguelikeMap(); r.mapRow = -1; r.mapCol = 1; r.visited = [];
  rogueToast(`🗺️ Mapa ${r.act}/3 desbloqueado.`);
  openRoguelikeMap();
}

function startRoguelikeAdventure() {
  const r = window.RoguelikeRun;
  r.active = true; r.act = 1; r.floor = 1; r.gold = 100; r.roster = [];
  r.activeTeam = []; r.deployed = {}; r.enemyDeployed = {}; r.enemyTeam = []; r.usedPieces = {}; r.map = generateRoguelikeMap();
  r.mapRow = -1; r.mapCol = 1; r.pendingNode = null; r.visited = [];
  const codex = document.getElementById('roguelike-codex-modal'); if (codex) codex.remove();
  rogueToast('🚀 Aventura iniciada: atravesse os 3 mapas.');
  openRoguelikeMap(); updateFloatingAdventureButton();
}

function closeRoguelikeAdventure() {
  const modal = document.getElementById('roguelike-adventure-modal'); if (modal) modal.remove();
}
function rogueNodeButton(node) {
  const meta = ROGUE_NODE_TYPES[node.type];
  const available = rogueAvailable(node);
  const current = node.row === window.RoguelikeRun.mapRow && node.col === window.RoguelikeRun.mapCol;
  return `<button class="rogue-map-node ${available ? 'available' : ''} ${current ? 'current' : ''} ${node.cleared ? 'cleared' : ''}" style="--node-color:${meta.color}" ${available ? `onclick="chooseRoguelikeNode('${node.id}')"` : 'disabled'} title="${meta.label}">
    <span class="rogue-node-icon">${meta.icon}</span><span>${meta.label}</span>${node.cleared ? '<small>✓</small>' : ''}</button>`;
}
function openRoguelikeMap() {
  if (window._inRoguelikeBattle || window._roguelikePreparingSetup || window._roguelikePlacementPhase) { rogueToast('🧩 Termine a preparação e toque em Pronto para jogar.'); return; }
  const r = window.RoguelikeRun;
  let modal = document.getElementById('roguelike-adventure-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'roguelike-adventure-modal'; modal.className = 'roguelike-modal-overlay'; document.body.appendChild(modal); }
  const rows = r.map.map((nodes, row) => `<div class="rogue-map-row"><span class="rogue-map-floor">${row + 1}</span>${nodes.map(rogueNodeButton).join('')}</div>`).join('');
  modal.innerHTML = `<div class="rogue-shell">
    <header class="rogue-topbar"><div><small>MANOBRA ROGUELIKE</small><h2>🗺️ Mapa ${r.act}/3</h2></div><button class="rogue-close" onclick="closeRoguelikeAdventure()">×</button></header>
    <div class="rogue-stats"><span>💰 <b>${r.gold}</b> moedas</span><span>🛡️ ${r.roster.length} no quartel</span><span>🧩 ${r.activeTeam.length} no conjunto</span></div>
    <p class="rogue-subtitle">Escolha um caminho. Nós adjacentes ao último local ficam disponíveis.</p>
    <div class="rogue-map-legend">${Object.values(ROGUE_NODE_TYPES).map(x => `<span><i style="background:${x.color}"></i>${x.icon} ${x.label}</span>`).join('')}</div>
    <div class="rogue-map">${rows}</div>
    <div class="rogue-actions"><button onclick="openArmyManagement()">🛡️ Montar conjunto</button><button onclick="openRoguelikeShop()">🛒 Loja</button><button class="danger" onclick="abandonRoguelikeRun()">Desistir</button></div>
  </div>`;
}
function chooseRoguelikeNode(id) {
  const r = window.RoguelikeRun;
  const node = r.map.flat().find(n => n.id === id);
  if (!node || !rogueAvailable(node)) return;
  r.pendingNode = node; r.pendingPrevious = { row: r.mapRow, col: r.mapCol };
  r.mapRow = node.row; r.mapCol = node.col; r.floor = node.row + 1;
  if (node.type === 'battle' || node.type === 'elite') { openRoguelikeLoadout(node); return; }
  node.cleared = true; r.visited.push(id);
  if (node.type === 'shop') { openRoguelikeShop(); return; }
  if (node.type === 'treasure') { const gain = node.row === 7 ? 100 : 50; r.gold += gain; rogueToast(`💎 Tesouro encontrado: +${gain} moedas.`); openRoguelikeMap(); return; }
  if (node.type === 'rest') { r.gold += 15; rogueToast('🔥 Descanso: você recuperou 15 moedas.'); openRoguelikeMap(); return; }
  const gain = Math.floor(Math.random() * 31) + 10; r.gold += gain; rogueToast(`❓ Evento resolvido: +${gain} moedas.`); openRoguelikeMap();
}

window.cancelRoguelikePreparation = function () {
  const r = window.RoguelikeRun;
  if (r.pendingNode && !r.pendingNode.cleared && r.pendingPrevious) { r.mapRow = r.pendingPrevious.row; r.mapCol = r.pendingPrevious.col; }
  r.pendingNode = null; r.pendingPrevious = null;
  window._inRoguelikeBattle = false; window._roguelikePreparingSetup = false; window._roguelikePlacementPhase = false; window._selectedSpecialToPlace = null;
  const tray = document.getElementById('roguelike-battle-tray'); if (tray) tray.remove();
  updateFloatingAdventureButton();
};
function cancelRoguelikeNode() {
  const r = window.RoguelikeRun;
  if (r.pendingNode && !r.pendingNode.cleared && r.pendingPrevious) {
    r.mapRow = r.pendingPrevious.row; r.mapCol = r.pendingPrevious.col;
  }
  r.pendingNode = null; r.pendingPrevious = null; openRoguelikeMap();
}
function openRoguelikeLoadout(node) {
  const r = window.RoguelikeRun;
  let modal = document.getElementById('roguelike-adventure-modal'); if (!modal) return;
  const cards = r.roster.map(key => {
    const p = rogueCatalogPiece(key), rarity = getRoguelikePieceRarity(key), active = r.activeTeam.includes(key);
    return `<button class="rogue-loadout-card ${active ? 'selected' : ''}" onclick="toggleActivePiece('${key}')"><span class="rogue-card-symbol">${p.symbol || '⭐'}</span><strong>${rogueName(key)}</strong><em style="color:${rarity.color}">${rarity.name}</em><small>${rogueDescription(key)}</small><b>${active ? '✓ No conjunto' : '+ Adicionar'}</b></button>`;
  }).join('');
  modal.innerHTML = `<div class="rogue-shell rogue-loadout"><header class="rogue-topbar"><div><small>PREPARAÇÃO</small><h2>${node.type === 'elite' ? '☠️ Combate de Elite' : '⚔️ Novo Combate'}</h2></div><button class="rogue-close" onclick="cancelRoguelikeNode()">×</button></header><div class="rogue-loadout-head"><span>💰 ${r.gold}</span><span>${r.activeTeam.length} selecionadas</span><small>Escolha quais peças compradas substituirão peças comuns nesta batalha. Depois, no tabuleiro, toque em uma peça sua para aplicar a substituição.</small></div><div class="rogue-loadout-grid">${cards || '<div class="rogue-setup-empty">Nenhuma peça especial comprada. Tudo bem: este combate começa com suas peças normais.</div>'}</div><div class="rogue-actions"><button onclick="cancelRoguelikeNode()">← Voltar ao mapa</button><button class="primary" onclick="launchRoguelikeBattle()">Começar montagem normal ⚔️</button></div></div>`;
}
function openArmyManagement() {
  const r = window.RoguelikeRun;
  if (r.pendingNode && (r.pendingNode.type === 'battle' || r.pendingNode.type === 'elite')) { openRoguelikeLoadout(r.pendingNode); return; }
  openRoguelikeLoadout({ type: 'battle' });
}
function toggleActivePiece(key) {
  const r = window.RoguelikeRun, i = r.activeTeam.indexOf(key);
  if (i >= 0) r.activeTeam.splice(i, 1); else r.activeTeam.push(key);
  if (r.pendingNode && (r.pendingNode.type === 'battle' || r.pendingNode.type === 'elite')) openRoguelikeLoadout(r.pendingNode); else openArmyManagement();
}
function prepareRoguelikeEnemy() {
  const r = window.RoguelikeRun;
  const keys = typeof SPECIAL_PIECES_CATALOG !== 'undefined' ? Object.keys(SPECIAL_PIECES_CATALOG) : [];
  const count = Math.min(6, 1 + Math.floor((r.floor - 1) / 2) + (r.act - 1));
  const pool = keys.filter(k => !r.activeTeam.includes(k)).sort(() => Math.random() - 0.5);
  r.enemyTeam = pool.slice(0, count);
  r.enemyDeployed = {};
}
function onRoguelikeDefeat() {
  const r = window.RoguelikeRun;
  if (!r.active || !window._inRoguelikeBattle) return;
  window._inRoguelikeBattle = false; window._roguelikePlacementPhase = false;
  const tray = document.getElementById('roguelike-battle-tray'); if (tray) tray.remove();
  r.active = false; r.act = 1; r.floor = 1; r.gold = 100; r.roster = []; r.activeTeam = [];
  r.deployed = {}; r.enemyDeployed = {}; r.enemyTeam = []; r.usedPieces = {}; r.map = []; r.mapRow = -1; r.mapCol = 1; r.pendingNode = null; r.pendingPrevious = null;
  updateFloatingAdventureButton();
  rogueToast('💀 GAME OVER: você perdeu o confronto. Ouro, peças e mapa foram reiniciados.');
}
function launchRoguelikeBattle() {
  const r = window.RoguelikeRun;
  closeRoguelikeAdventure(); window._inRoguelikeBattle = true; window._roguelikePlacementPhase = false; r.deployed = {}; r.usedPieces = {}; prepareRoguelikeEnemy();
  if (typeof window.startRoguelikeSetup === 'function') window.startRoguelikeSetup();
  else rogueToast('Não foi possível abrir a montagem do combate.');
  rogueToast('🧩 Primeiro monte suas peças normais e toque em Pronto.');
}
function finishRoguelikeNormalSetup() {
  window._roguelikePlacementPhase = true;
  if (typeof window.startRoguelikePreparedGame === 'function') window.startRoguelikePreparedGame();
  createInGameBattleTray();
  rogueToast('🧩 Agora aplique as habilidades opcionais. Quando terminar, toque em Pronto para jogar.');
}
window.finishRoguelikeNormalSetup = finishRoguelikeNormalSetup;
function readyRoguelikeBattle() {
  window._roguelikePlacementPhase = false;
  window._selectedSpecialToPlace = null;
  updateFloatingAdventureButton();
  const tray = document.getElementById('roguelike-battle-tray'); if (tray) tray.remove();
  if (window.__manobraApp && typeof window.__manobraApp.render === 'function') window.__manobraApp.render();
  rogueToast('⚔️ Pronto! Colocação encerrada. Agora o clique faz uma jogada normal.');
}
function createInGameBattleTray() {
  let tray = document.getElementById('roguelike-battle-tray'); if (tray) tray.remove();
  tray = document.createElement('div'); tray.id = 'roguelike-battle-tray'; tray.className = 'rogue-battle-tray';
  let html = '<span class="rogue-tray-title">✨ Substituir peça comum <small>(mantém ataque/defesa + habilidade)</small></span>';
  window.RoguelikeRun.activeTeam.forEach(key => { const p = rogueCatalogPiece(key); const used = !!window.RoguelikeRun.usedPieces[key]; html += `<button ${used ? 'disabled' : ''} onclick="selectPieceToPlace('${key}', '${p.symbol || '⭐'}', '${rogueName(key)}')" title="${rogueDescription(key)}"><span>${p.symbol || '⭐'}</span>${used ? 'Aplicada: ' : ''}${rogueName(key)}</button>`; });
  html += '<button class="rogue-ready-button" onclick="readyRoguelikeBattle()">✅ Pronto para jogar</button>'; tray.innerHTML = html; document.body.appendChild(tray); enableBoardCellSpawner();
}
function selectPieceToPlace(key, symbol, name) { window._selectedSpecialToPlace = { key, symbol, name }; rogueToast(`🎯 ${name}: ${rogueDescription(key)}. Toque numa peça sua para substituir.`); }
function applySelectedSpecialToCell(cell, e) {
  if (!window._roguelikePlacementPhase) return false;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  if (!window._selectedSpecialToPlace) { rogueToast('Selecione uma habilidade no painel primeiro.'); return true; }
  const s = window._selectedSpecialToPlace, i = String(cell.dataset.i);
  const appState = window.__manobraApp;
  const game = appState && appState.game;
  const boardPiece = game ? game.st.b[+i] : (appState && appState.pieces ? appState.pieces[+i] : 0);
  const engine = window.ManobraEngine;
  if (!boardPiece || !engine || !appState || engine.sideOf(boardPiece) !== appState.humanSide) {
    rogueToast('⚠️ Escolha uma peça sua de ataque ou defesa.'); return true;
  }
  const existing = cell.dataset.deployedSpecialPiece;
  if (window.RoguelikeRun.usedPieces[s.key] && existing !== s.key) { rogueToast('Essa habilidade já foi aplicada nesta batalha.'); return true; }
  if (existing && existing !== s.key) delete window.RoguelikeRun.usedPieces[existing];
  window.RoguelikeRun.deployed[i] = s.key;
  window.RoguelikeRun.usedPieces[s.key] = true;
  cell.dataset.deployedSpecialPiece = s.key;
  cell.classList.add('special-deployed-cell');
  const old = cell.querySelector('.rogue-special-badge'); if (old) old.remove();
  const p = rogueCatalogPiece(s.key);
  const overlay = document.createElement('div');
  overlay.className = `rogue-special-badge rogue-special-badge-${p.category || 'support'}`;
  overlay.title = `${s.name}: ${rogueDescription(s.key)}`;
  overlay.innerHTML = `<span>${s.symbol}</span><small>${s.name}</small>`;
  overlay.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); rogueToast(`${s.name}: ${rogueDescription(s.key)}`); };
  cell.appendChild(overlay);
  window._selectedSpecialToPlace = null;
  createInGameBattleTray();
  rogueToast(`✅ ${s.name} aplicada na peça. Ataque/defesa foram mantidos.`);
  return true;
}

function enableBoardCellSpawner() {
  if (!window._roguePlacementDelegated) {
    document.addEventListener('click', e => {
      if (!window._roguelikePlacementPhase) return;
      if (e.target && e.target.closest && e.target.closest('.rogue-special-badge')) return;
      const cell = e.target && e.target.closest ? e.target.closest('[data-i]') : null;
      if (!cell) return;
      applySelectedSpecialToCell(cell, e);
    }, true);
    window._roguePlacementDelegated = true;
  }
  const interval = setInterval(() => {
    if (!window._inRoguelikeBattle || !window.RoguelikeRun.active) {
      clearInterval(interval);
      const t = document.getElementById('roguelike-battle-tray'); if (t) t.remove();
    }
  }, 400);
}

function onRoguelikeVictory() {
  const r = window.RoguelikeRun; if (!window._inRoguelikeBattle || !r.active) return; window._inRoguelikeBattle = false; const tray = document.getElementById('roguelike-battle-tray'); if (tray) tray.remove();
  const gain = r.pendingNode && r.pendingNode.type === 'elite' ? 90 : 45; r.gold += gain;
  if (r.pendingNode) { r.pendingNode.cleared = true; r.visited.push(r.pendingNode.id); }
  r.pendingNode = null; r.pendingPrevious = null; window._roguelikePlacementPhase = false; r.deployed = {}; r.enemyDeployed = {}; r.enemyTeam = []; r.floor++;
  rogueToast(`🎉 Vitória! +${gain} moedas.`); setTimeout(() => { if (r.floor > 8) rogueNextAct(); else openRoguelikeMap(); }, 700); updateFloatingAdventureButton();
}
function leaveRoguelikeShop() {
  const r = window.RoguelikeRun;
  if (r.pendingNode && (r.pendingNode.type === 'battle' || r.pendingNode.type === 'elite')) openRoguelikeLoadout(r.pendingNode);
  else openRoguelikeMap();
}
function openRoguelikeShop() {
  const r = window.RoguelikeRun; let modal = document.getElementById('roguelike-adventure-modal'); if (!modal) return;
  const keys = typeof SPECIAL_PIECES_CATALOG !== 'undefined' ? Object.keys(SPECIAL_PIECES_CATALOG) : [];
  const items = keys.map(key => { const p=rogueCatalogPiece(key), rarity=getRoguelikePieceRarity(key), owned=r.roster.includes(key); return `<div class="rogue-shop-card"><span class="rogue-card-symbol">${p.symbol || '⭐'}</span><div><strong>${rogueName(key)}</strong><em style="color:${rarity.color}">${rarity.name} · ${rarity.price}🪙</em><small>${rogueDescription(key)}</small></div><button ${owned ? 'disabled' : ''} onclick="buyRoguelikePiece('${key}', ${rarity.price}, this)">${owned ? 'Adquirida ✓' : 'Comprar'}</button></div>`; }).join('');
  modal.innerHTML = `<div class="rogue-shell"><header class="rogue-topbar"><div><small>MERCADOR</small><h2>🛒 Loja Tática</h2></div><button class="rogue-close" onclick="leaveRoguelikeShop()">×</button></header><div class="rogue-shop-gold">💰 ${r.gold} moedas</div><div class="rogue-shop-list">${items}</div><div class="rogue-actions"><button onclick="leaveRoguelikeShop()">← Voltar</button></div></div>`;
}
function buyRoguelikePiece(key, price, btn) {
  const r = window.RoguelikeRun; if (r.roster.includes(key)) return; if (r.gold < price) { rogueToast('❌ Ouro insuficiente.'); return; }
  r.gold -= price; r.roster.push(key); if (!r.activeTeam.includes(key)) r.activeTeam.push(key); btn.disabled = true; btn.textContent = 'Adquirida ✓'; btn.style.background = '#059669'; rogueToast(`🎉 ${rogueName(key)} entrou no quartel e no conjunto.`);
}
function abandonRoguelikeRun() {
  const r=window.RoguelikeRun; r.active=false; r.act=1; r.floor=1; r.gold=100; r.roster=[]; r.activeTeam=[]; r.deployed={}; r.map=[]; r.mapRow=-1; r.pendingNode=null; window._inRoguelikeBattle=false; const t=document.getElementById('roguelike-battle-tray'); if(t)t.remove(); closeRoguelikeAdventure(); rogueToast('💀 Aventura reiniciada.'); updateFloatingAdventureButton();
}
function updateFloatingAdventureButton() {
  let c=document.getElementById('roguelike-floating-btn-container'); if(!c){c=document.createElement('div');c.id='roguelike-floating-btn-container';c.className='rogue-floating';document.body.appendChild(c);} const r=window.RoguelikeRun;
  const locked = window._inRoguelikeBattle || window._roguelikePreparingSetup || window._roguelikePlacementPhase;
  c.innerHTML = locked ? '<button disabled>⚔️ Preparação em andamento</button>' : `<button onclick="${r.active?'openRoguelikeMap()':'startRoguelikeAdventure()'}">${r.active?`⚔️ Aventura · Mapa ${r.act}/3`:'⚔️ Modo Aventura'}</button>`;
}
window.addEventListener('DOMContentLoaded', () => setInterval(updateFloatingAdventureButton, 900));
