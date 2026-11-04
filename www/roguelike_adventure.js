/* Manobra Roguelike: três atos, mapa ramificado, economia e formação de batalha. */

if (typeof window.RoguelikeRun === 'undefined') {
  window.RoguelikeRun = {
    active: false, act: 1, floor: 1, maxFloors: 3, gold: 30,
    roster: [], activeTeam: [], deployed: {}, enemyDeployed: {}, enemyTeam: [], usedPieces: {},
    map: [], mapRow: -1, mapCol: 1, pendingNode: null, visited: [], shopOffers: {}, shopVisits: 0, mastery: {}
  };
}

// Comandantes são progressão permanente, independente das peças especiais.
const ROGUE_COMMANDERS = Object.freeze([
  { id: 'novato', name: 'Comandante Novato', icon: '🧑‍✈️', unlock: 0, ability: 'Sem bônus. Desafio original.' },
  { id: 'estrategista', name: 'Estrategista', icon: '🧠', unlock: 1, ability: '+5 moedas por vitória e +5 por elite.' },
  { id: 'explorador', name: 'Explorador', icon: '🧭', unlock: 2, ability: '+15 moedas por tesouro e +5 em eventos.' },
  { id: 'mercador', name: 'Mercador', icon: '🪙', unlock: 3, ability: 'Desconto de 10 moedas em cada peça comprada.' },
  { id: 'guardiao', name: 'Guardião', icon: '🛡️', unlock: 4, ability: 'Peças defensivas ganham +1 uso de proteção por combate; +20 moedas por chefão.' },
  { id: 'campista', name: 'Campista', icon: '🏕️', unlock: 5, ability: 'Peças defensivas ganham +1 uso; +25 moedas em descansos.' },
  { id: 'diplomata', name: 'Diplomata', icon: '📜', unlock: 6, ability: 'Peças de suporte ganham +1 uso de habilidade; +25 moedas em eventos.' },
  { id: 'cacador', name: 'Caçador', icon: '🏹', unlock: 7, ability: 'Peças ofensivas ganham +1 uso de habilidade; +30 moedas por elite.' },
  { id: 'cartografo', name: 'Cartógrafo', icon: '🗺️', unlock: 8, ability: 'Todas as peças especiais ganham +1 uso; +25 moedas ao entrar nos mapas 2 e 3.' },
  { id: 'artifice', name: 'Artífice Supremo', icon: '⚒️', unlock: 9, ability: 'Todas as peças especiais ganham +2 usos e recarga reduzida em 1 turno (mínimo 0); recupera 15 moedas na primeira compra por loja.' }
]);
// Chefões possuem comandantes próprios. Os bônus afetam somente os usos e recargas
// das habilidades especiais inimigas, sem criar movimentos fora das regras.
const ROGUE_BOSSES = Object.freeze([
  {id:'ferro',name:'Marechal de Ferro',icon:'🛡️',ability:'Peças defensivas do inimigo têm +1 uso de proteção.',category:'defense',uses:1,cooldown:0},
  {id:'lamina',name:'Senhora das Lâminas',icon:'⚔️',ability:'Peças ofensivas do inimigo têm +1 uso de habilidade.',category:'offense',uses:1,cooldown:0},
  {id:'oraculo',name:'Oráculo Sombrio',icon:'🔮',ability:'Peças de suporte do inimigo têm +1 uso de habilidade.',category:'support',uses:1,cooldown:0},
  {id:'relogio',name:'Senhor das Horas',icon:'⏳',ability:'Habilidades inimigas recarregam 1 turno mais rápido.',category:'all',uses:0,cooldown:1},
  {id:'baluarte',name:'Rainha da Fortaleza',icon:'🏰',ability:'Defesas inimigas têm +1 uso e recarga 1 turno menor.',category:'defense',uses:1,cooldown:1},
  {id:'cacador',name:'Caçador Carmesim',icon:'🏹',ability:'Ataques inimigos têm +1 uso e recarga 1 turno menor.',category:'offense',uses:1,cooldown:1},
  {id:'arcano',name:'Arquimaga do Véu',icon:'✨',ability:'Suportes inimigos têm +2 usos de habilidade.',category:'support',uses:2,cooldown:0},
  {id:'general',name:'General das Cinzas',icon:'🔥',ability:'Todas as habilidades inimigas têm +1 uso.',category:'all',uses:1,cooldown:0},
  {id:'imperador',name:'Imperador da Última Guarda',icon:'👑',ability:'Todas as habilidades inimigas têm +1 uso e recarga 1 turno menor.',category:'all',uses:1,cooldown:1},
  {id:'pedra',name:'Colosso de Pedra',icon:'🪨',ability:'Defesas inimigas têm +1 uso de habilidade.',category:'defense',uses:1,cooldown:0},
  {id:'espinho',name:'Dama dos Espinhos',icon:'🌿',ability:'Suportes inimigos têm +1 uso de habilidade.',category:'support',uses:1,cooldown:0},
  {id:'corvo',name:'Capitão dos Corvos',icon:'🐦‍⬛',ability:'Ataques inimigos têm +1 uso de habilidade.',category:'offense',uses:1,cooldown:0},
  {id:'bruma',name:'Vigia da Bruma',icon:'🌫️',ability:'Habilidades inimigas recarregam 1 turno mais rápido.',category:'all',uses:0,cooldown:1},
  {id:'lobo',name:'Barão dos Lobos',icon:'🐺',ability:'Ataques inimigos têm +1 uso de habilidade.',category:'offense',uses:1,cooldown:0},
  {id:'neve',name:'Matriarca da Neve',icon:'❄️',ability:'Defesas inimigas têm +1 uso de proteção.',category:'defense',uses:1,cooldown:0},
  {id:'cobre',name:'Engenheiro de Cobre',icon:'⚙️',ability:'Suportes inimigos têm +1 uso de habilidade.',category:'support',uses:1,cooldown:0},
  {id:'veneno',name:'Alquimista Venenoso',icon:'🧪',ability:'Suportes inimigos têm +1 uso e recarga 1 turno menor.',category:'support',uses:1,cooldown:1},
  {id:'falcao',name:'Almirante Falcão',icon:'🦅',ability:'Ataques inimigos têm +1 uso e recarga 1 turno menor.',category:'offense',uses:1,cooldown:1},
  {id:'cristal',name:'Rainha de Cristal',icon:'💠',ability:'Defesas inimigas têm +1 uso e recarga 1 turno menor.',category:'defense',uses:1,cooldown:1},
  {id:'tempestade',name:'Arauto da Tempestade',icon:'🌩️',ability:'Todas as habilidades inimigas têm +1 uso.',category:'all',uses:1,cooldown:0},
  {id:'sombra',name:'Duque das Sombras',icon:'🌑',ability:'Habilidades inimigas recarregam 1 turno mais rápido.',category:'all',uses:0,cooldown:1},
  {id:'dragao',name:'Senhor do Dragão',icon:'🐉',ability:'Ataques inimigos têm +2 usos de habilidade.',category:'offense',uses:2,cooldown:0},
  {id:'eclipse',name:'Sacerdotisa do Eclipse',icon:'🌘',ability:'Suportes inimigos têm +2 usos de habilidade.',category:'support',uses:2,cooldown:0},
  {id:'obsidiana',name:'Rei de Obsidiana',icon:'🗿',ability:'Defesas inimigas têm +2 usos de habilidade.',category:'defense',uses:2,cooldown:0},
  {id:'abismo',name:'Imperatriz do Abismo',icon:'🕳️',ability:'Todas as habilidades inimigas têm +1 uso.',category:'all',uses:1,cooldown:0},
  {id:'aurora',name:'Arconte da Aurora',icon:'🌅',ability:'Habilidades inimigas recarregam 1 turno mais rápido.',category:'all',uses:0,cooldown:1},
  {id:'trovao',name:'Titã do Trovão',icon:'⚡',ability:'Ataques inimigos têm +1 uso e recarga 1 turno menor.',category:'offense',uses:1,cooldown:1}
]);
function rogueBossFor(node, act) {
  if (!node || node.type !== 'boss') return null;
  if (!node.bossId) {
    const pool = ROGUE_BOSSES.filter((b,i) => act === 1 ? (i < 3 || (i >= 9 && i < 16)) : act === 2 ? ((i >= 3 && i < 6) || (i >= 16 && i < 22)) : ((i >= 6 && i < 9) || i >= 22));
    const previous = window.RoguelikeRun && window.RoguelikeRun.lastBossId;
    const choices = pool.filter(b => b.id !== previous);
    node.bossId = (choices.length ? choices : pool)[Math.floor(Math.random() * (choices.length || pool.length))].id;
    if (window.RoguelikeRun) window.RoguelikeRun.lastBossId = node.bossId;
  }
  return ROGUE_BOSSES.find(b => b.id === node.bossId) || ROGUE_BOSSES[0];
}
window.ROGUE_BOSSES = ROGUE_BOSSES;
window.rogueBossFor = rogueBossFor;
function rogueBossPortrait(b) { return `assets/bosses/${b.id}.svg`; }
function rogueCommanderHud() {
  const old = document.getElementById('rogue-commander-hud');
  const r = window.RoguelikeRun;
  if (!r || !r.active || !window._inRoguelikeBattle) { if (old) old.remove(); return; }
  const side = document.querySelector('#app > .layout > .side');
  if (!side) return;
  const c = rogueCommander(r.commanderId);
  const boss = r.pendingNode && r.pendingNode.type === 'boss' ? rogueBossFor(r.pendingNode, r.act) : null;
  const hud = old || document.createElement('section');
  hud.id = 'rogue-commander-hud'; hud.className = 'rogue-commander-hud';
  hud.innerHTML = `<img src="assets/commanders/${c.id}.webp" alt="Retrato de ${c.name}"><div><small>SEU COMANDANTE · ATO ${r.act}</small><strong>${c.name}</strong><span>${c.ability}</span></div>${boss ? `<img class="rogue-hud-boss" src="${rogueBossPortrait(boss)}" alt="${boss.name}" title="Chefão: ${boss.name} — ${boss.ability}">` : ''}`;
  if (!old) side.prepend(hud);
}
window.updateRogueCommanderHUD = rogueCommanderHud;
function rogueBossEffect(boss) {
  if (!boss || !window._inRoguelikeBattle) return;
  const el = document.createElement('div'); el.className = 'rogue-boss-effect';
  el.innerHTML = `<img src="${rogueBossPortrait(boss)}" alt=""><div><b>${boss.icon} ${boss.name}</b><span>Habilidade do chefão ativada!</span><small>${boss.ability}</small></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
window.rogueBossEffect = rogueBossEffect;
const ROGUE_PROGRESS_KEY = 'manobra_roguelike_commanders_v1';
function rogueReadProgress() {
  try {
    const data = JSON.parse(window.localStorage.getItem(ROGUE_PROGRESS_KEY) || '{}');
    return { wins: Math.max(0, Math.min(9999, Math.floor(Number(data.wins) || 0))) };
  } catch (_) { return { wins: 0 }; }
}
function rogueSaveProgress(progress) {
  try { window.localStorage.setItem(ROGUE_PROGRESS_KEY, JSON.stringify(progress)); return true; }
  catch (_) { rogueToast('⚠️ O navegador não permitiu salvar os desbloqueios.'); return false; }
}
function rogueCommander(id) { return ROGUE_COMMANDERS.find(c => c.id === id) || ROGUE_COMMANDERS[0]; }
function rogueCommanderUnlocked(id) { return rogueCommander(id).unlock <= rogueReadProgress().wins; }
function openRoguelikeCommanderSelection() {
  if (window.RoguelikeRun.active) return openRoguelikeMap();
  let modal = document.getElementById('roguelike-adventure-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'roguelike-adventure-modal'; modal.className = 'roguelike-modal-overlay'; document.body.appendChild(modal); }
  const wins = rogueReadProgress().wins;
  modal.innerHTML = `<div class="rogue-shell rogue-commander-select"><header class="rogue-topbar"><div><small>MANOBRA ROGUELIKE</small><h2>🎖️ Escolha seu comandante</h2></div><button class="rogue-close" onclick="closeRoguelikeAdventure()">×</button></header><p class="rogue-subtitle">O comandante representa você na aventura. Não ocupa lugar entre as 13 peças. Conclua os três mapas para desbloquear novos comandantes.</p><div class="rogue-commander-grid">${ROGUE_COMMANDERS.map(c => `<button class="rogue-commander-card" ${wins < c.unlock ? 'disabled' : `onclick="startRoguelikeAdventure('${c.id}')"`}><img class="rogue-commander-portrait" src="assets/commanders/${c.id}.webp" alt="Retrato de ${c.name}" loading="lazy"><strong>${c.name}</strong><small>${c.ability}</small><b>${wins < c.unlock ? `🔒 Conclua ${c.unlock} ${c.unlock === 1 ? 'aventura' : 'aventuras'} (${wins}/${c.unlock})` : 'Selecionar e começar →'}</b></button>`).join('')}</div></div>`;
}
const ROGUE_NODE_TYPES = {
  battle:  { label: 'Combate', icon: '⚔️', color: '#ef4444' },
  elite:   { label: 'Elite', icon: '☠️', color: '#a855f7' },
  boss:    { label: 'Chefão', icon: '👑', color: '#f59e0b' },
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
  const base = t && t.passive || p.description || 'Efeito especial durante a batalha.';
  const synergy = window.RoguelikeRuntime && window.RoguelikeRuntime.synergyDescription ? window.RoguelikeRuntime.synergyDescription(key) : '';
  return base + (synergy ? ' | SINERGIA: ' + synergy : '');
}
function rogueToast(text) { if (typeof showRoguelikeToast === 'function') showRoguelikeToast(text); }

function rogueShuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateRoguelikeMap() {
  // Grafo de rotas: cada encontro possui saídas explícitas (1, 2 ou 3).
  // As conexões são criadas uma vez por ato e não mudam ao reabrir o mapa.
  const map = [];
  for (let row = 0; row < 8; row++) {
    const count = row === 7 ? 1 : row === 0 ? 3 : 1 + Math.floor(Math.random() * 3);
    const columns = row === 7 ? [1] : rogueShuffle([0, 1, 2]).slice(0, count).sort();
    map.push(columns.map(col => ({
      id: `${Date.now()}-${row}-${col}-${Math.random()}`, row, col,
      type: row === 7 ? 'boss' : 'battle', cleared: false, next: []
    })));
  }
  // Cada nó da próxima etapa tem uma entrada e cada nó da etapa atual tem saída.
  // Isso evita becos sem saída e permite divisões/reuniões de rotas.
  for (let row = 0; row < 7; row++) {
    const from = map[row], to = map[row + 1];
    for (const node of from) {
      const nearest = [...to].sort((a, b) => Math.abs(a.col - node.col) - Math.abs(b.col - node.col));
      node.next.push(nearest[0].id);
    }
    for (const target of to) {
      if (!from.some(node => node.next.includes(target.id))) {
        const nearest = [...from].sort((a, b) => Math.abs(a.col - target.col) - Math.abs(b.col - target.col))[0];
        nearest.next.push(target.id);
      }
    }
    // Ramificações extras ocasionais, sem forçar sempre três escolhas.
    for (const node of from) {
      for (const target of to) {
        if (!node.next.includes(target.id) && Math.random() < 0.22) node.next.push(target.id);
      }
    }
  }
  // A ordem dos encontros muda em cada ato e em cada nova aventura.
  // O chefe fica sempre na etapa 8; a primeira etapa é combate.
  const encounterRows = rogueShuffle([1, 2, 3, 4, 5, 6]);
  const encounterTypes = rogueShuffle(['shop', 'elite', 'treasure', 'event', 'rest']);
  encounterTypes.forEach((type, index) => {
    const row = encounterRows[index];
    map[row][Math.floor(Math.random() * map[row].length)].type = type;
  });
  return map;
}
function rogueAvailable(node) {
  const r = window.RoguelikeRun;
  if (!node || node.cleared || node.row !== r.mapRow + 1) return false;
  if (r.mapRow < 0) return node.row === 0;
  const current = (r.map[r.mapRow] || []).find(n => n.col === r.mapCol);
  return !!(current && Array.isArray(current.next) && current.next.includes(node.id));
}
function rogueNextAct() {
  const r = window.RoguelikeRun;
  if (r.act >= 3) {
    r.active = false;
    if (!r.completionRecorded) {
      r.completionRecorded = true;
      const progress = rogueReadProgress();
      progress.wins += 1;
      rogueSaveProgress(progress);
      const unlocked = ROGUE_COMMANDERS.find(c => c.unlock === progress.wins);
      if (unlocked) rogueToast(`🎖️ Novo comandante desbloqueado: ${unlocked.name}!`);
    }
    rogueToast(`🏆 Aventura concluída! Você terminou os 3 mapas com ${r.gold} moedas.`);
    updateFloatingAdventureButton();
    closeRoguelikeAdventure();
    return;
  }
  r.act++; if (r.commanderId === 'cartografo') r.gold += 25; r.floor = 1; r.map = generateRoguelikeMap(); r.mapRow = -1; r.mapCol = 1; r.visited = []; r.shopOffers = {};
  rogueToast(`🗺️ Mapa ${r.act}/3 desbloqueado.`);
  openRoguelikeMap();
}

function startRoguelikeAdventure(commanderId = 'novato') {
  const r = window.RoguelikeRun;
  window._roguelikeLastBattleResult = null;
  r.commanderId = rogueCommanderUnlocked(commanderId) ? commanderId : 'novato'; r.completionRecorded = false;
  r.active = true; r.act = 1; r.floor = 1; r.gold = 30; r.roster = [];
  r.activeTeam = []; r.deployed = {}; r.enemyDeployed = {}; r.enemyTeam = []; r.usedPieces = {}; r.map = generateRoguelikeMap();
  r.mapRow = -1; r.mapCol = 1; r.pendingNode = null; r.visited = []; r.shopOffers = {}; r.shopVisits = 0; r.mastery = {}; r.artificeRefundedShops = {};
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
  return `<button aria-label="${meta.label}, etapa ${node.row + 1}${available ? ", disponível" : ""}" class="rogue-map-node ${available ? 'available' : ''} ${current ? 'current' : ''} ${node.cleared ? 'cleared' : ''} ${!node.cleared && !available ? 'locked' : ''}" style="--node-color:${meta.color}" ${available ? `onclick="chooseRoguelikeNode('${node.id}')"` : 'disabled'} title="${meta.label}">
    <span class="rogue-node-icon">${meta.icon}</span><span>${meta.label}</span>${node.cleared ? '<small>✓ Concluído</small>' : available ? '<small>Escolher →</small>' : '<small>·</small>'}</button>`;
}
function rogueMapTrails(r) {
  const x = col => 60 + col * 110;
  const y = row => 8 * 98 - 49 - row * 98;
  const trails = [];
  for (let row = 0; row < 7; row++) {
    for (const node of r.map[row]) {
      for (const id of node.next || []) {
        const target = r.map[row + 1].find(n => n.id === id);
        if (!target) continue;
        const onRoute = node.cleared && target.cleared;
        const selectable = row === r.mapRow && node.col === r.mapCol && rogueAvailable(target);
        const cls = onRoute ? 'traveled' : selectable ? 'reachable' : 'untraveled';
        trails.push(`<path class="${cls}" d="M${x(node.col)} ${y(row)} Q${(x(node.col)+x(target.col))/2} ${(y(row)+y(row+1))/2} ${x(target.col)} ${y(row+1)}"/>`);
      }
    }
  }
  return `<svg class="rogue-trail-lines" viewBox="0 0 340 784" preserveAspectRatio="none" aria-hidden="true">${trails.join('')}</svg>`;
}
function openRoguelikeMap() {
  if (window._inRoguelikeBattle || window._roguelikePreparingSetup || window._roguelikePlacementPhase) { rogueToast('🧩 Termine a preparação e toque em Pronto para jogar.'); return; }
  const r = window.RoguelikeRun;
  let modal = document.getElementById('roguelike-adventure-modal');
  if (!modal) { modal = document.createElement('div'); modal.id = 'roguelike-adventure-modal'; modal.className = 'roguelike-modal-overlay'; document.body.appendChild(modal); }
  const rows = r.map.map((nodes, row) => `<div class="rogue-map-row ${row === r.mapRow + 1 ? 'next' : ''}"><span class="rogue-map-floor">${row + 1}<small>${row === 7 ? 'CHEFE' : 'ETAPA'}</small></span>${nodes.map(node => `<div class="rogue-map-slot" style="grid-column:${node.col + 1}">${rogueNodeButton(node)}</div>`).join('')}</div>`).join('');
  modal.innerHTML = `<div class="rogue-shell">
    <header class="rogue-topbar"><div><small>MANOBRA ROGUELIKE</small><h2>🗺️ Mapa ${r.act}/3</h2></div><button class="rogue-close" onclick="closeRoguelikeAdventure()">×</button></header>
    <div class="rogue-stats"><span>💰 <b>${r.gold}</b> moedas</span><span>🛡️ ${r.roster.length} no quartel</span><span>🧩 ${r.activeTeam.length} no conjunto</span><span>${rogueCommander(r.commanderId).icon} ${rogueCommander(r.commanderId).name}</span></div>
    <div class="rogue-route-guide"><strong>📍 ${r.mapRow < 0 ? "Início da jornada" : `Etapa ${r.mapRow + 1} de 8 concluída ou em andamento`}</strong><span>Próxima escolha: etapa ${Math.min(r.mapRow + 2, 8)} · Os destinos iluminados podem ser visitados.</span></div>
    <div class="rogue-map-legend">${Object.values(ROGUE_NODE_TYPES).map(x => `<span><i style="background:${x.color}"></i>${x.icon} ${x.label}</span>`).join('')}</div>
    <div class="rogue-map-heading"><span>🏁 DESTINO FINAL</span><span>Avance pelas rotas iluminadas</span></div><div class="rogue-map">${rogueMapTrails(r)}${rows}</div><div class="rogue-map-start">🚩 INÍCIO DA EXPEDIÇÃO</div>
    <div class="rogue-actions"><button onclick="openArmyManagement()">🛡️ Montar conjunto</button><button class="danger" onclick="abandonRoguelikeRun()">Desistir</button></div>
  </div>`;
}
function chooseRoguelikeNode(id) {
  const r = window.RoguelikeRun;
  const node = r.map.flat().find(n => n.id === id);
  if (!node || !rogueAvailable(node)) return;
  r.pendingNode = node; r.pendingPrevious = { row: r.mapRow, col: r.mapCol };
  r.mapRow = node.row; r.mapCol = node.col; r.floor = node.row + 1;
  if (['battle', 'elite', 'boss'].includes(node.type)) { openRoguelikeLoadout(node); return; }
  node.cleared = true; r.visited.push(id);
  if (node.type === 'shop') { openRoguelikeShop(); return; }
  if (node.type === 'treasure') { const gain = (node.row === 7 ? 100 : 50) + (r.commanderId === 'explorador' ? 15 : 0); r.gold += gain; rogueToast(`💎 Tesouro encontrado: +${gain} moedas.`); openRoguelikeMap(); return; }
  if (node.type === 'rest') { const gain = 15 + (r.commanderId === 'campista' ? 25 : 0); r.gold += gain; rogueToast(`🔥 Descanso: você recuperou ${gain} moedas.`); openRoguelikeMap(); return; }
  const gain = Math.floor(Math.random() * 31) + 10 + (r.commanderId === 'diplomata' ? 25 : r.commanderId === 'explorador' ? 5 : 0); r.gold += gain; rogueToast(`❓ Evento resolvido: +${gain} moedas.`); openRoguelikeMap();
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
  const bossCommander = rogueBossFor(node, r.act);
  const cards = r.roster.map(key => {
    const p = rogueCatalogPiece(key), rarity = getRoguelikePieceRarity(key), active = r.activeTeam.includes(key);
    return `<button class="rogue-loadout-card ${active ? 'selected' : ''}" onclick="toggleActivePiece('${key}')"><span class="rogue-card-symbol">${p.symbol || '⭐'}</span><strong>${rogueName(key)} · Maestria ${rogueMasteryLabel(key)}</strong><em style="color:${rarity.color}">${rarity.name}</em><small>${rogueDescription(key)}</small><small>II: +1 uso · III: +2 usos e -1 recarga</small><b>${active ? '✓ No conjunto' : '+ Adicionar'}</b></button>`;
  }).join('');
  modal.innerHTML = `<div class="rogue-shell rogue-loadout"><header class="rogue-topbar"><div><small>PREPARAÇÃO</small><h2>${node.type === 'boss' ? `👑 CHEFÃO DO ATO ${r.act}` : node.type === 'elite' ? '☠️ Combate de Elite' : '⚔️ Novo Combate'}</h2></div><button class="rogue-close" onclick="cancelRoguelikeNode()">×</button></header>${bossCommander ? `<div class="rogue-boss-intro"><img class="rogue-boss-portrait" src="${rogueBossPortrait(bossCommander)}" alt="Retrato de ${bossCommander.name}"><div><strong>${bossCommander.name}</strong><small>Comandante inimigo — ${bossCommander.ability}</small><small>O efeito só melhora habilidades das peças especiais inimigas; não altera as regras de movimento.</small></div></div>` : ''}<div class="rogue-loadout-head"><span>💰 ${r.gold}</span><span>${r.activeTeam.length} selecionadas</span><small>Escolha quais peças compradas substituirão peças comuns nesta batalha. Depois, no tabuleiro, toque em uma peça sua para aplicar a substituição.</small></div><div class="rogue-loadout-grid">${cards || '<div class="rogue-setup-empty">Nenhuma peça especial comprada. Tudo bem: este combate começa com suas peças normais.</div>'}</div><div class="rogue-actions"><button onclick="cancelRoguelikeNode()">← Voltar ao mapa</button><button class="primary" onclick="launchRoguelikeBattle()">Começar montagem normal ⚔️</button></div></div>`;
}
function openArmyManagement() {
  const r = window.RoguelikeRun;
  if (r.pendingNode && (['battle', 'elite', 'boss'].includes(r.pendingNode.type))) { openRoguelikeLoadout(r.pendingNode); return; }
  openRoguelikeLoadout({ type: 'battle' });
}
function toggleActivePiece(key) {
  const r = window.RoguelikeRun, i = r.activeTeam.indexOf(key);
  if (i >= 0) r.activeTeam.splice(i, 1); else r.activeTeam.push(key);
  if (r.pendingNode && (['battle', 'elite', 'boss'].includes(r.pendingNode.type))) openRoguelikeLoadout(r.pendingNode); else openArmyManagement();
}
function rogueRandomEnemyDeployment(positions, team) {
  const shuffled = rogueShuffle(positions);
  const result = {};
  team.forEach((key, index) => { if (shuffled[index] != null) result[String(shuffled[index])] = key; });
  return result;
}
function prepareRoguelikeEnemy() {
  const r = window.RoguelikeRun;
  // A máquina não usa moedas nem visita lojas: sorteie somente peças
  // cujas habilidades têm efeito real durante o combate.
  const combatKeys = ['escudeiro', 'sentinela', 'bastiao', 'muralha',
    'rebatedor', 'tita_de_aco', 'baluarte',
    'lancer', 'assassino_sombras', 'berserker', 'executor', 'cavaleiro_errante',
    'ceifador', 'predador', 'duelista', 'vento_cortante', 'cacador_cabecas',
    'ima_tatico', 'xama_dos_ventos', 'manipulador', 'oraculo', 'sacerdote_da_luz'];
  const keys = typeof SPECIAL_PIECES_CATALOG !== 'undefined'
    ? combatKeys.filter(key => Object.prototype.hasOwnProperty.call(SPECIAL_PIECES_CATALOG, key)) : [];
  const boss = r.pendingNode && r.pendingNode.type === 'boss';
  const bossCommander = boss ? rogueBossFor(r.pendingNode, r.act) : null;
  // No segundo mapa, a IA cresce mais gradualmente para permitir que o
  // jogador aproveite as peças adquiridas no primeiro mapa.
  // Chefões do segundo mapa usam 5 especiais; os demais mapas mantêm 6.
  const count = r.act === 2
    ? (boss ? 5 : Math.min(4, 1 + Math.floor((r.floor - 1) / 3)))
    : (boss ? 6 : Math.min(6, 1 + Math.floor((r.floor - 1) / 2) + (r.act - 1)));
  // Sorteio sem repetição: chefões conservam sua habilidade própria, mas não
  // recebem uma composição fixa nem as peças mais caras automaticamente.
  // Peças iguais às do jogador também podem aparecer no exército inimigo.
  r.enemyTeam = rogueShuffle(keys).slice(0, Math.min(count, keys.length));
  r.enemyDeployed = {};
  if (boss) rogueToast(`${bossCommander.icon} ${bossCommander.name}: ${bossCommander.ability}`);
}
function onRoguelikeDefeat() {
  const r = window.RoguelikeRun;
  if (!r.active || !window._inRoguelikeBattle) return;
  window._inRoguelikeBattle = false; window._roguelikePlacementPhase = false; window._roguelikePreparingSetup = false;
  window._roguelikeLastBattleResult = 'defeat';
  const tray = document.getElementById('roguelike-battle-tray'); if (tray) tray.remove();
  r.active = false; r.act = 1; r.floor = 1; r.gold = 30; r.roster = []; r.mastery = {}; r.activeTeam = [];
  r.deployed = {}; r.enemyDeployed = {}; r.enemyTeam = []; r.usedPieces = {}; r.map = []; r.mapRow = -1; r.mapCol = 1; r.pendingNode = null; r.pendingPrevious = null; r.visited = []; r.shopOffers = {}; r.shopVisits = 0; r.artificeRefundedShops = {}; r.completionRecorded = false;
  updateFloatingAdventureButton();
  rogueToast('💀 GAME OVER: você perdeu o confronto. Ouro, peças e mapa foram reiniciados.');
}
function launchRoguelikeBattle() {
  const r = window.RoguelikeRun;
  closeRoguelikeAdventure(); window._roguelikeLastBattleResult = null; window._inRoguelikeBattle = true; window._roguelikePlacementPhase = false; r.deployed = {}; r.usedPieces = {}; prepareRoguelikeEnemy();
  if (typeof window.startRoguelikeSetup === 'function') window.startRoguelikeSetup();
  else rogueToast('Não foi possível abrir a montagem do combate.');
  if (r.pendingNode && r.pendingNode.type === 'boss') setTimeout(() => rogueBossEffect(rogueBossFor(r.pendingNode, r.act)), 350);
  rogueToast('🧩 Primeiro monte suas peças normais e toque em Pronto.');
}
function finishRoguelikeNormalSetup() {
  window._roguelikePreparingSetup = false;
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
  const isBoss = r.pendingNode && r.pendingNode.type === 'boss';
  const bonus = (r.commanderId === 'estrategista' ? 5 : 0) + (isBoss && r.commanderId === 'guardiao' ? 20 : 0) + (r.pendingNode && r.pendingNode.type === 'elite' && r.commanderId === 'cacador' ? 30 : 0);
  const gain = (isBoss ? 130 : r.pendingNode && r.pendingNode.type === 'elite' ? 90 : 45) + bonus; r.gold += gain;
  if (r.pendingNode) { r.pendingNode.cleared = true; r.visited.push(r.pendingNode.id); }
  // Ao superar um chefe, o jogador leva uma melhoria gratuita para o mapa seguinte.
  // Prioriza a peça menos evoluída; nunca ultrapassa Maestria III.
  let bossMasteryMessage = '';
  if (isBoss && Array.isArray(r.roster)) {
    const eligible = r.roster.filter(key => rogueMasteryLevel(key) < 3);
    // No segundo chefão, consolidar uma peça veterana no nível III.
    // No primeiro, distribuir a melhoria para uma peça ainda iniciante.
    eligible.sort((a, b) => r.act >= 2 ? rogueMasteryLevel(b) - rogueMasteryLevel(a) : rogueMasteryLevel(a) - rogueMasteryLevel(b));
    if (eligible.length) {
      const key = eligible[0];
      r.mastery ||= {};
      r.mastery[key] = rogueMasteryLevel(key) + 1;
      bossMasteryMessage = ` ⬆️ ${rogueName(key)}: Maestria ${rogueMasteryLabel(key)}!`;
    }
  }
  r.pendingNode = null; r.pendingPrevious = null; window._roguelikePlacementPhase = false; r.deployed = {}; r.enemyDeployed = {}; r.enemyTeam = []; r.floor++;
  rogueToast(`${isBoss ? '👑 CHEFÃO DERROTADO!' : '🎉 Vitória!'} +${gain} moedas.${bossMasteryMessage}`); setTimeout(() => { if (r.floor > 8) rogueNextAct(); else openRoguelikeMap(); }, 700); updateFloatingAdventureButton();
}
function leaveRoguelikeShop() {
  const r = window.RoguelikeRun;
  if (r.pendingNode && (['battle', 'elite', 'boss'].includes(r.pendingNode.type))) openRoguelikeLoadout(r.pendingNode);
  else openRoguelikeMap();
}
// Cada parada de loja recebe um estoque persistente de até três ofertas.
// Reabrir a mesma loja não muda as peças; avançar para outra parada gera novas ofertas.
function rogueShopId() {
  const r = window.RoguelikeRun;
  return r.pendingNode && r.pendingNode.type === 'shop'
    ? `ato-${r.act}-no-${r.pendingNode.id}`
    : `ato-${r.act}-mercador-${r.mapRow}-${r.mapCol}`;
}
function rogueShopSelection(id) {
  const r = window.RoguelikeRun;
  if (!r.shopOffers) r.shopOffers = {};
  if (!Object.prototype.hasOwnProperty.call(r.shopOffers, id)) {
    const pool = typeof SPECIAL_PIECES_CATALOG !== 'undefined'
      ? Object.keys(SPECIAL_PIECES_CATALOG).filter(key => !r.roster.includes(key)) : [];
    // Sorteio sem repetição, com raridade influenciando a chance de aparecer.
    const offers = [];
    while (offers.length < 3 && pool.length) {
      const weights = pool.map(key => {
        const rarity = getRoguelikePieceRarity(key);
        return rarity.name === 'Comum' ? 5 : rarity.name === 'Rara' ? 3 : 1;
      });
      let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
      let index = weights.findIndex(w => (roll -= w) < 0);
      if (index < 0) index = pool.length - 1;
      offers.push(pool.splice(index, 1)[0]);
    }
    r.shopOffers[id] = offers;
  }
  return r.shopOffers[id];
}
// O mercador só pode ser acessado ao alcançar fisicamente um nó de loja no mapa.
function rogueAtShop() {
  const r = window.RoguelikeRun;
  const node = r && r.pendingNode;
  return !!(r && r.active && node && node.type === 'shop' && node.cleared &&
    r.mapRow === node.row && r.mapCol === node.col &&
    Array.isArray(r.visited) && r.visited.includes(node.id) &&
    Array.isArray(r.map) && r.map[node.row] && r.map[node.row].some(candidate => candidate.id === node.id));
}
// Evolução persistente apenas nesta expedição: I (original), II (+1 uso), III (+2 usos, -1 recarga).
function rogueMasteryLevel(key) {
  const r = window.RoguelikeRun;
  return r && r.mastery && r.roster.includes(key) ? Math.max(1, Math.min(3, Number(r.mastery[key]) || 1)) : 1;
}
function rogueMasteryLabel(key) { return ['','I','II','III'][rogueMasteryLevel(key)]; }
function rogueUpgradeCost(key) { return rogueMasteryLevel(key) === 1 ? 25 : 45; }
function upgradeRoguelikePiece(key) {
  const r = window.RoguelikeRun;
  if (!rogueAtShop() || !r.roster.includes(key) || rogueMasteryLevel(key) >= 3) return;
  const cost = rogueUpgradeCost(key);
  if (r.gold < cost) { rogueToast('❌ Moedas insuficientes para aprimorar.'); return; }
  r.gold -= cost; r.mastery ||= {}; r.mastery[key] = rogueMasteryLevel(key) + 1;
  rogueToast(`⬆️ ${rogueName(key)} evoluiu para maestria ${rogueMasteryLabel(key)}!`);
  openRoguelikeShop();
}
window.rogueMasteryLevel = rogueMasteryLevel;
window.upgradeRoguelikePiece = upgradeRoguelikePiece;
function rogueShopPrice(key) { return Math.max(1, getRoguelikePieceRarity(key).price - (window.RoguelikeRun.commanderId === 'mercador' ? 10 : 0)); }
function openRoguelikeShop() {
  if (!rogueAtShop()) {
    rogueToast('🛒 A loja só abre quando você encontra um mercador durante a masmorra.');
    if (window.RoguelikeRun && window.RoguelikeRun.active) openRoguelikeMap();
    return;
  }
  const r = window.RoguelikeRun;
  const modal = document.getElementById('roguelike-adventure-modal');
  if (!modal) return;
  const offers = rogueShopSelection(rogueShopId());
  const items = offers.map(key => {
    const p = rogueCatalogPiece(key), rarity = getRoguelikePieceRarity(key);
    const owned = r.roster.includes(key), price = rogueShopPrice(key), affordable = r.gold >= price;
    return `<div class="rogue-shop-card ${owned ? 'purchased' : ''}"><span class="rogue-card-symbol">${p.symbol || '⭐'}</span><div><strong>${rogueName(key)}</strong><em style="color:${rarity.color}">${rarity.name} · ${price}🪙</em><small>${rogueDescription(key)}</small></div><button ${owned || !affordable ? 'disabled' : ''} onclick="buyRoguelikePiece('${key}', ${price}, this)">${owned ? 'Comprada ✓' : affordable ? 'Comprar' : 'Sem moedas'}</button></div>`;
  }).join('');
  const upgrades = r.roster.map(key => {
    const level = rogueMasteryLevel(key), cost = rogueUpgradeCost(key), max = level >= 3;
    return `<div class="rogue-shop-card"><span class="rogue-card-symbol">${rogueCatalogPiece(key).symbol || '⭐'}</span><div><strong>${rogueName(key)} · Maestria ${rogueMasteryLabel(key)}</strong><small>${max ? 'Nível máximo: +2 usos e -1 recarga' : level === 1 ? 'Próximo: +1 uso por combate' : 'Próximo: +2 usos e -1 recarga'}</small></div><button ${max || r.gold < cost ? 'disabled' : ''} onclick="upgradeRoguelikePiece('${key}')">${max ? 'Máximo ✓' : `Evoluir · ${cost}🪙`}</button></div>`;
  }).join('');
  modal.innerHTML = `<div class="rogue-shell"><header class="rogue-topbar"><div><small>MERCADOR · OFERTAS DA VISITA</small><h2>🛒 Loja Tática</h2></div><button class="rogue-close" onclick="leaveRoguelikeShop()">×</button></header><div class="rogue-shop-gold"><span>💰 <strong>${r.gold}</strong> moedas</span><span>🎴 ${offers.length} ofertas aleatórias</span><span>🛡️ ${r.roster.length} no quartel</span></div><p class="rogue-subtitle">Escolha suas peças. As ofertas permanecem iguais ao reabrir esta loja. As compras entram no quartel e ficam disponíveis para a próxima batalha.</p><div class="rogue-shop-list">${items || '<div class="rogue-setup-empty">Você já possui todas as peças disponíveis.</div>'}</div><h3>⬆️ Aprimorar peças do seu quartel</h3><p class="rogue-subtitle">Melhorias duram até o fim desta aventura e não alteram movimentos ou regras de captura.</p><div class="rogue-shop-list">${upgrades || '<div class="rogue-setup-empty">Compre uma peça para começar a evoluí-la.</div>'}</div><div class="rogue-actions"><button onclick="leaveRoguelikeShop()">← Continuar aventura</button></div></div>`;
}
function buyRoguelikePiece(key, price, btn) {
  if (!rogueAtShop()) { rogueToast('🛒 Encontre o mercador na masmorra para comprar peças.'); return; }
  const r = window.RoguelikeRun;
  const offer = rogueShopSelection(rogueShopId());
  const actual = rogueShopPrice(key);
  if (!offer.includes(key) || r.roster.includes(key) || price !== actual) return;
  if (r.gold < actual) { rogueToast('❌ Ouro insuficiente.'); openRoguelikeShop(); return; }
  r.gold -= actual;
  if (r.commanderId === 'artifice') {
    if (!r.artificeRefundedShops) r.artificeRefundedShops = {};
    const shopId = rogueShopId();
    if (!r.artificeRefundedShops[shopId]) { r.gold += 15; r.artificeRefundedShops[shopId] = true; }
  }
  r.roster.push(key); r.mastery ||= {}; r.mastery[key] = 1;
  if (!r.activeTeam.includes(key)) r.activeTeam.push(key);
  rogueToast(`🎉 ${rogueName(key)} entrou no quartel e no conjunto.`);
  openRoguelikeShop();
}
function abandonRoguelikeRun() {
  const r=window.RoguelikeRun; r.active=false; r.act=1; r.floor=1; r.gold=30; r.roster=[]; r.mastery={}; r.activeTeam=[]; r.deployed={}; r.map=[]; r.mapRow=-1; r.pendingNode=null; r.shopOffers={}; r.shopVisits=0; window._inRoguelikeBattle=false; const t=document.getElementById('roguelike-battle-tray'); if(t)t.remove(); closeRoguelikeAdventure(); rogueToast('💀 Aventura reiniciada.'); updateFloatingAdventureButton();
}
// O acesso à aventura fica exclusivamente no painel principal do menu.
// Mantemos a função para chamadas existentes, mas nunca criamos o atalho lateral.
function updateFloatingAdventureButton() {
  const shortcut = document.getElementById('roguelike-floating-btn-container');
  if (shortcut) {
    shortcut.style.display = 'none';
    shortcut.innerHTML = '';
    if (typeof shortcut.remove === 'function') shortcut.remove();
  }
}
window.addEventListener('DOMContentLoaded', updateFloatingAdventureButton);
