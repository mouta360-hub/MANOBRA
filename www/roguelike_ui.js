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
    "oraculo": { name: "Oráculo", passive: "Revela jogadas futuras ou intenções do oponente.", active: "Visão mística: expõe peças ocultas no tabuleiro." },
    "xama": { name: "Xamã", passive: "Aura de regeneração passiva para aliados adjacentes.", active: "Totem ancestral: invoca um marco de cura em campo." },
    "arquimago": { name: "Arquimago", passive: "Magias custam menos energia ou turnos de recarga.", active: "Explosão arcana: dispara um feixe de pura energia." },
    "curandeiro": { name: "Curandeiro", passive: "Restaura a integridade das peças aliadas feridas.", active: "Bênção da cura: recupera totalmente uma peça aliada." },
    "alquimista": { name: "Alquimista", passive: "Transmuta o terreno ao redor em zonas de vantagem.", active: "Poção volátil: lança um frasco que altera o piso." },
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

function inspectSpecialPiece(pieceKey) {
    const data = SPECIAL_PIECES_PT_BR[pieceKey] || SPECIAL_PIECES_CATALOG[pieceKey];
    if (!data) return;

    const name = data.name || pieceKey;
    const passive = data.passive || data.passiveDesc || 'N/A';
    const active = data.active || data.activeDesc || 'N/A';

    showRoguelikeToast(`[${name}] • Passiva: ${passive} | Hab: ${active}`);
}

function openRoguelikeCodex() {
    if (document.getElementById('roguelike-codex-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'roguelike-codex-modal';
    modal.className = 'roguelike-modal-overlay';

    let contentHTML = `
    <div class="roguelike-modal-content">
    <div class="roguelike-header">
    <h2>📜 Codex Demonstrativo - 30 Peças Especiais</h2>
    <button class="roguelike-close-btn" onclick="closeRoguelikeCodex()">×</button>
    </div>
    <div class="roguelike-body">
    `;

    const categories = [
        { key: 'tank', title: '🛡️ Guardiões e Tanques (Resistência e Controle)' },
        { key: 'attacker', title: '⚔️ Atacantes e Berserkers (Dano e Pressão)' },
        { key: 'support', title: '🔮 Magos e Suportes (Utilidade e Magia)' }
    ];

    categories.forEach(cat => {
        contentHTML += `<div class="roguelike-category-section"><h3>${cat.title}</h3><div class="roguelike-grid">`;

        for (const [key, piece] of Object.entries(SPECIAL_PIECES_CATALOG)) {
            if (piece.category === cat.key) {
                const translation = SPECIAL_PIECES_PT_BR[key] || {};
                let passiveText = translation.passive || piece.description || 'Efeito tático passivo exclusivo.';
                let activeText = translation.active || (piece.activePower ? 'Habilidade ativa disponível durante a batalha.' : piece.getSpecialMoves ? 'Movimento especial disponível no tabuleiro.' : 'Efeito automático durante a batalha.');
                let pieceName = translation.name || piece.name || key;

                contentHTML += `
                <div class="roguelike-card" onclick="inspectSpecialPiece('${key}')" style="cursor: pointer;" title="Clique para testar aviso em jogo">
                <div class="roguelike-card-header">
                <span class="roguelike-symbol">${piece.symbol || '🔹'}</span>
                <span class="roguelike-name">${pieceName}</span>
                </div>
                <div class="roguelike-card-desc" style="display: flex; flex-direction: column; gap: 6px;">
                <div style="background: rgba(56, 189, 248, 0.1); padding: 6px 8px; border-radius: 6px; border-left: 3px solid #38bdf8;">
                <strong style="color: #38bdf8;">Passiva:</strong> ${passiveText}
                </div>
                <div style="background: rgba(168, 85, 247, 0.1); padding: 6px 8px; border-radius: 6px; border-left: 3px solid #a855f7;">
                <strong style="color: #c084fc;">Habilidade Ativa:</strong> ${activeText}
                </div>
                </div>
                </div>
                `;
            }
        }
        contentHTML += `</div></div>`;
    });

    contentHTML += `</div></div>`;
    modal.innerHTML = contentHTML;
    document.body.appendChild(modal);
}

function closeRoguelikeCodex() {
    const modal = document.getElementById('roguelike-codex-modal');
    if (modal) modal.remove();
}

// Garante que o botão reapareça sempre que o menu principal for atualizado
function ensureCodexButton() {
    const appDiv = document.getElementById('app');
    if (appDiv && !document.getElementById('roguelike-codex-btn-container')) {
        const menuBar = document.createElement('div');
        menuBar.id = 'roguelike-codex-btn-container';
        menuBar.style.cssText = 'text-align: center; margin: 15px 0; z-index: 99; position: relative;';
        menuBar.innerHTML = `
        <button onclick="openRoguelikeCodex()" style="background: #2b3240; color: #f1f5f9; border: 1px solid #475569; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
        📜 Codex Roguelike (30 Peças)
        </button>
        `;
        appDiv.prepend(menuBar);
    }
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
