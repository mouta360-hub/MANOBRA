/* ==========================================================================
 * MANOBRA ROGUELIKE - INTERFACE VISUAL DO CODEX (PERSISTENTE)
 * ========================================================================== */

const SPECIAL_PIECES_PT_BR = {
    // --- GUARDIÕES / TANQUES ---
    "escudeiro": { name: "Escudeiro", passive: "Absorve o primeiro impacto de dano recebido por rodada.", active: "Levanta uma barricada temporária bloqueando casas adjacentes." },
    "general": { name: "General", passive: "Concede bônus de moral para peças aliadas próximas.", active: "Ordem de marcha: move uma peça aliada adjacente." },
    "sentinela": { name: "Sentinela", passive: "Imune a ataques surpresa vindos de diagonais.", active: "Modo vigília: intercepta qualquer inimigo que passe por perto." },
    "baluarte": { name: "Baluarte", passive: "Reduz o dano de investidas frontais pela metade.", active: "Postura firme: recusa-se a ser empurrado ou movido." },
    "guardiao": { name: "Guardião", passive: "Divide o dano sofrido com a peça principal.", active: "Intercepção heroica: troca de lugar com um aliado em perigo." },
    "tartaruga": { name: "Tartaruga", passive: "Defesa dobrada quando permanece imóvel por um turno.", active: "Casco blindado: anula o próximo ataque recebido." },
    "colosso": { name: "Colosso", passive: "Peso pesado: imune a efeitos de empurrão.", active: "Pisada sísmica: desacelera inimigos próximos." },
    "muralha": { name: "Muralha", passive: "Cria uma zona de bloqueio intransponível ao redor.", active: "Fortificação: aumenta a própria armadura temporariamente." },
    "bastiao": { name: "Bastião", passive: "Recupera pequena quantidade de escudo a cada turno.", active: "Pulso defensivo: empurra inimigos adjacentes para trás." },
    "titan": { name: "Titã", passive: "Resistência massiva contra múltiplos atacantes.", active: "Investida do Titã: avança esmagando obstáculos." },

    // --- ATACANTES / BERSERKERS ---
    "lancer": { name: "Lançer", passive: "Ganho de alcance bônus ao avançar em linha reta.", active: "Investida relâmpago: perfura a defesa do oponente." },
    "berserker": { name: "Berserker", passive: "Causa mais dano quanto menor for a sua vida/resistência.", active: "Fúria cega: executa dois ataques consecutivos." },
    "assassino": { name: "Assassino", passive: "Ataques pelas costas causam dano crítico garantido.", active: "Passo sombrio: teleporta para uma casa vazia próxima." },
    "duelista": { name: "Duelista", passive: "Excelente no mano a mano contra peças isoladas.", active: "Desafio: força o inimigo adjacente a focar seus ataques nele." },
    "carrasco": { name: "Carrasco", passive: "Executa inimigos com menos de 20% de integridade.", active: "Golpe brutal: causa dano massivo com alto recuo." },
    "cacador": { name: "Caçador", passive: "Rastreia o último movimento do oponente marcado.", active: "Disparo certeiro: atinge inimigos à distância." },
    "gladiador": { name: "Gladiador", passive: "Ganho de poder progressivo a cada combate travado.", active: "Redemoinho de lâminas: atinge todos os adjacentes." },
    "fanatico": { name: "Fanático", passive: "Move-se mais rápido em direção ao inimigo mais próximo.", active: "Sacrifício tático: causa dano em área ao custo de vida." },
    "destruidor": { name: "Destruidor", passive: "Ignora parte da armadura ou bônus defensivo do alvo.", active: "Golpe sísmico: racha o piso da casa alvo." },
    "viper": { name: "Viper", passive: "Aplica efeito de veneno corrosivo nos alvos atingidos.", active: "Bote rápido: envenena e recua para posição segura." },

    // --- MAGOS / SUPORTES ---
    "cronomago": { name: "Cronomago", passive: "Manipula o tempo, reduzindo o tempo de recarga das habilidades.", active: "Distorção temporal: repete o último turno ou ação." },
    "oraculo": { name: "Oráculo", passive: "Revela jogadas futuras ou intenções do oponente.", active: "Visão do Futuro: prevê a próxima jogada da IA antes de você agir." },
    "xama": { name: "Xamã", passive: "Aura de regeneração passiva para aliados adjacentes.", active: "Totem ancestral: invoca um marco de cura em campo." },
    "arquimago": { name: "Arquimago", passive: "Magias custam menos energia ou turnos de recarga.", active: "Explosão arcana: dispara um feixe de pura energia." },
    "curandeiro": { name: "Curandeiro", passive: "Restaura a integridade das peças aliadas feridas.", active: "Bênção da cura: recupera totalmente uma peça aliada." },
    "mestre_de_manobras": { name: "Mestre de Manobras", passive: "Ordem Estratégica: seleciona duas peças aliadas distintas dentro do alcance; não pode escolher a si mesmo. Cada uma se move uma casa diagonal legal, sem capturas, respeitando o apoio em ataque. A segunda movimentação é calculada depois da primeira; se não houver duas, a habilidade não ativa.", active: "Consome uma carga e a jogada inteira. Maestrias I/II/III: alcance 2/3/4 casas (incluindo a origem), 1/2/3 cargas por combate, cooldown 3/2/2 turnos próprios." },
    "sacerdote_da_luz": { name: "Sacerdote da Luz", passive: "Ressuscita apenas aliados capturados nesta batalha, uma única vez por identidade; não ressuscita a si mesmo. Retorno em defesa, na diagonal livre adjacente, respeitando o limite de seis defesas.", active: "Milagre Divino: consome uma carga e o turno. Maestrias I/II/III: 1/2/3 ressurreições por combate; cooldown 4/3/3 turnos próprios." },
    "alquimista": { name: "Alquimista", passive: "Aplica poção apenas a um aliado na diagonal imediatamente adjacente.", active: "Poção de Transmutação: aliado avança até duas casas na mesma diagonal; no máximo uma captura legal; consome o turno. Maestrias 1/2/3 cargas e recarga 3/2/2 turnos." },
    "ilusionista": { name: "Ilusionista", passive: "Cria cópias falsas para confundir o oponente.", active: "Troca de ilusão: troca de posição com um holograma." },
    "invocador": { name: "Invocador", passive: "Canaliza energia para fortalecer unidades menores.", active: "Invocar construto: coloca uma peça fantasma de suporte." },
    "bardo": { name: "Bardo", passive: "Inspira aliados próximos com notas motivadoras.", active: "Melodia revigorante: concede um movimento extra a um aliado." },
    "elementalista": { name: "Elementalista", passive: "Alterna entre afinidades de fogo, gelo e raio.", active: "Tempestade elemental: afeta o tabuleiro com dano mágico." }
};

function showRoguelikeToast(message, duration = 4000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';

    clearTimeout(window._roguelikeToastTimer);
    window._roguelikeToastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, duration);
}

function codexEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function codexExplanation(key, piece) {
    if (key === 'escudeiro') return 'A primeira tentativa de captura válida é bloqueada: o escudo é consumido, mas nenhuma peça ocupa a casa do Escudeiro. Uma nova captura válida pode eliminá-lo.';
    return piece.description || 'Consulte as regras desta habilidade no jogo.';
}
function inspectSpecialPiece(pieceKey) {
    const piece = SPECIAL_PIECES_CATALOG[pieceKey];
    if (!piece) return;
    showRoguelikeToast(`${piece.name}: ${codexExplanation(pieceKey, piece)}`, 6500);
}
function openRoguelikeCodex() {
    if (document.getElementById('roguelike-codex-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'roguelike-codex-modal';
    modal.className = 'roguelike-modal-overlay roguelike-codex-floating';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Codex das 30 peças especiais');
    modal.addEventListener('click', event => { if (event.target === modal) closeRoguelikeCodex(); });
    const limits = window.MANOBRA_CODEX_ABILITY_LIMITS || {};
    const categories = [
        { key: 'tank', title: '🛡️ Guardiões e tanques' },
        { key: 'attacker', title: '⚔️ Atacantes' },
        { key: 'support', title: '🔮 Magos e suportes' }
    ];
    let html = `<div class="roguelike-modal-content"><div class="roguelike-header"><h2>📜 Codex — Peças e Sinergias</h2><button type="button" class="roguelike-close-btn" onclick="closeRoguelikeCodex()" aria-label="Fechar Codex">×</button></div><div class="roguelike-body"><p class="codex-intro">Descrições baseadas nas habilidades implementadas. As peças continuam obedecendo às regras normais de movimento e captura. Recargas contam turnos do próprio jogador; bônus do comandante podem alterar os valores.</p>`;
    const synergySets = (window.RoguelikeRuntime && window.RoguelikeRuntime.synergySets) || [];
    html += `<section class="roguelike-category-section" id="codex-synergies"><h3>🔗 Sinergias — duplas e trios</h3><p class="codex-intro">As habilidades individuais continuam funcionando sozinhas. A sinergia é um bônus adicional, válido para você e para os inimigos. É preciso ter duas peças diferentes do mesmo conjunto vivas e próximas no tabuleiro; comprar as peças não basta. O trio amplia o alcance, mas não substitui as habilidades individuais. Os bônus consomem usos da peça que os ativa e respeitam a recarga.</p><div class="roguelike-grid">`;
    for (const group of synergySets) {
        const names = group.keys.map(key => (SPECIAL_PIECES_CATALOG[key] || {}).name || key);
        const defense = group.type === 'guard';
        const pair = group.id === 'falange'
            ? 'Uma peça do conjunto pode gastar 1 uso para impedir a captura de QUALQUER aliado na mesma linha ou coluna, a até 1 casa dela. Precisa ter outra peça diferente da Falange próxima.'
            : group.id === 'juramento'
            ? 'Uma peça do conjunto pode gastar 1 uso para impedir a captura de OUTRA integrante do Juramento a até 1 casa. Não protege peças de fora do conjunto.'
            : 'Uma peça do conjunto que faz uma captura legal pode gastar 1 uso para ignorar a proteção especial do alvo se outra integrante diferente estiver a até 1 casa da atacante.';
        const trio = group.id === 'falange'
            ? 'Com as três integrantes diferentes próximas no tabuleiro, a Falange protege aliados na mesma linha ou coluna a até 2 casas da protetora.'
            : group.id === 'juramento'
            ? 'Com as três integrantes diferentes próximas no tabuleiro, uma peça do Juramento protege outra integrante a até 2 casas.'
            : 'Com as três integrantes diferentes próximas no tabuleiro, a parceira que apoia a atacante pode ficar a até 2 casas. Continua exigindo captura legal e consumindo 1 uso da atacante.';
        const example = group.id === 'falange'
            ? `Exemplo: ${names[0]} protege um aliado comum na mesma coluna. ${names[1]} precisa estar próxima para ativar a Falange. Com ${names[2]} por perto, o alcance aumenta.`
            : group.id === 'juramento'
            ? `Exemplo: ${names[0]} está sendo capturada e ${names[1]} impede o ataque. ${names[2]} amplia o alcance se estiver próxima.`
            : `Exemplo: ${names[0]} captura legalmente um inimigo com escudo. ${names[1]} dá apoio e permite ignorar a proteção. ${names[2]} amplia o alcance se estiver próxima.`;
        html += `<article class="roguelike-card"><div class="roguelike-card-header"><strong class="roguelike-name">${defense ? '🛡️' : '⚔️'} ${codexEscape(group.name)}</strong></div><p class="codex-effect"><strong>Peças da combinação:</strong> ${names.map(codexEscape).join(' + ')}</p><p class="codex-effect"><strong>EFEITO COM 2 PEÇAS:</strong> ${codexEscape(pair)}</p><p class="codex-effect"><strong>EFEITO COM 3 PEÇAS:</strong> ${codexEscape(trio)}</p><p class="codex-effect"><strong>Exemplo de combate:</strong> ${codexEscape(example)}</p><p class="codex-usage"><strong>Como ativar:</strong> as peças precisam estar vivas e posicionadas perto umas das outras durante a batalha. A ativação é automática quando acontece a captura adequada e há cargas disponíveis. Comprar as peças, por si só, não ativa nada. Cada peça mantém sua habilidade individual. A combinação não permite movimentos proibidos pelo motor.</p></article>`;
    }
    html += '</div></section>';
    for (const cat of categories) {
        html += `<section class="roguelike-category-section"><h3>${cat.title}</h3><div class="roguelike-grid">`;
        for (const [key, piece] of Object.entries(SPECIAL_PIECES_CATALOG)) {
            if (piece.category !== cat.key) continue;
            const limit = limits[key];
            const usage = limit ? `${limit.uses} uso${limit.uses !== 1 ? 's' : ''} por combate · ${limit.cooldown ? `recarga de ${limit.cooldown} turno${limit.cooldown !== 1 ? 's' : ''}` : 'sem recarga'}` : 'Consulte os limites no combate';
            const groupNames = synergySets.filter(group => group.keys.includes(key)).map(group => group.name);
            const detail = (window.MANOBRA_CODEX_DETAILS || {})[key];
            const guide = detail ? `<p class="codex-effect"><strong>Como funciona:</strong> ${codexEscape(detail.how)}</p><p class="codex-usage"><strong>Exemplo de jogada:</strong> ${codexEscape(detail.example)}</p><p class="codex-usage"><strong>Regras e Maestria:</strong> ${codexEscape(detail.note)}</p>` : `<p class="codex-effect">${codexEscape(codexExplanation(key, piece))}</p>`;
            html += `<article class="roguelike-card"><div class="roguelike-card-header"><span class="roguelike-symbol">${codexEscape(piece.symbol || '🔹')}</span><strong class="roguelike-name">${codexEscape(piece.name || key)}</strong></div>${guide}<p class="codex-usage"><strong>Limites iniciais:</strong> ${codexEscape(usage)}</p>${groupNames.length ? `<p class="codex-usage"><strong>Sinergia:</strong> ${groupNames.map(codexEscape).join(', ')} (veja acima)</p>` : ''}</article>`;
        }
        html += '</div></section>';
    }
    html += '</div></div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
    const closeOnEscape = event => { if (event.key === 'Escape') closeRoguelikeCodex(); };
    modal._closeOnEscape = closeOnEscape;
    document.addEventListener('keydown', closeOnEscape);
    modal.querySelector('.roguelike-close-btn')?.focus();
}
function closeRoguelikeCodex() {
    const modal = document.getElementById('roguelike-codex-modal');
    if (modal) { document.removeEventListener('keydown', modal._closeOnEscape); modal.remove(); }
}

// Garante que o botão reapareça sempre que o menu principal for atualizado
function ensureCodexButton() {
    const appDiv = document.getElementById('app');
    if (!appDiv) return;
    // O Codex acompanha os controles da partida, sem criar uma barra acima do tabuleiro.
    const controls = appDiv.querySelector('.layout .side .bar');
    const old = document.getElementById('roguelike-codex-btn-container');
    if (!controls) {
        if (old) old.remove();
        return;
    }
    if (old && old.parentElement === controls) return;
    if (old) old.remove();
    const holder = document.createElement('span');
    holder.id = 'roguelike-codex-btn-container';
    holder.className = 'roguelike-codex-control';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '📜 Codex';
    btn.title = 'Consultar as 30 peças especiais';
    btn.addEventListener('click', openRoguelikeCodex);
    holder.appendChild(btn);
    controls.appendChild(holder);
}

window.addEventListener('DOMContentLoaded', () => {
    // Monitoriza alterações no app para garantir persistência do botão
    const observer = new MutationObserver(() => {
        ensureCodexButton();
    });

    const appDiv = document.getElementById('app');
    if (appDiv) {
        observer.observe(appDiv, { childList: true, subtree: true });
    }

    setTimeout(ensureCodexButton, 500);

    // Intercepta cliques no tabuleiro para disparar o toast descritivo
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-piece], .piece, td, div');
        if (!target) return;

        for (const key of Object.keys(SPECIAL_PIECES_CATALOG)) {
            if (target.innerHTML?.toLowerCase().includes(key) || target.className?.toLowerCase().includes(key)) {
                inspectSpecialPiece(key);
                break;
            }
        }
    });
});
