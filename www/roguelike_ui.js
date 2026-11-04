/* ==========================================================================
 * MANOBRA ROGUELIKE - INTERFACE VISUAL DO CODEX (PERSISTENTE)
 * ========================================================================== */

// O catálogo real (special_pieces.js) é a fonte das regras do Codex.
// Não manter aqui descrições alternativas de poderes não implementados.

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
const CODEX_COMBAT_EXAMPLES = Object.freeze({
    escudeiro: 'Se o inimigo tentar capturá-lo pela primeira vez, o escudo absorve o golpe. Uma segunda captura válida pode eliminá-lo.',
    sentinela: 'Se um inimigo tentar entrar numa casa adjacente protegida, a Sentinela pode barrar a entrada; após gastar as cargas, não bloqueia novamente.',
    colosso: 'Quando você consegue empurrar uma peça pelas regras normais, ganha 10 moedas uma vez nesta batalha. Não empurra sozinho.',
    bastiao: 'Coloque o Bastião ao lado de um aliado. Quando esse aliado sofrer uma captura legal, o Bastião pode impedir a primeira tentativa.',
    muralha: 'Na última fileira, uma tentativa de ataque lateral pode ser bloqueada. Fora dessa condição, a proteção não é ativada.',
    javali_de_ferro: 'Se o Javali capturar uma peça normalmente, você recebe 10 moedas uma vez. Ele não elimina automaticamente quem o atacar.',
    guardiao_runico: 'Faça um movimento permitido com o Guardião Rúnico: você recebe 8 moedas uma vez. O movimento não paralisa o adversário.',
    rebatedor: 'Quando tentam capturá-lo na diagonal, o primeiro golpe é repelido; depois disso, ele fica vulnerável.',
    tita_de_aco: 'Mantenha um aliado na casa vizinha. O Titã de Aço pode impedir uma tentativa de captura contra esse aliado.',
    baluarte: 'Posicione o Baluarte perto de um aliado. Ele bloqueia a primeira captura válida desse aliado, consumindo sua proteção.',
    lancer: 'Se o Lancer fizer uma captura legal em linha reta contra um alvo protegido, sua investida pode atravessar a proteção.',
    assassino_sombras: 'Se capturar legalmente pela diagonal uma peça protegida, o ataque furtivo pode ignorar a proteção.',
    berserker: 'Ao fazer uma captura permitida contra uma peça protegida, a Fúria pode ultrapassar a defesa; não concede ataque extra.',
    executor: 'Uma captura legal pode ignorar a defesa especial do alvo uma vez na batalha.',
    cavaleiro_errante: 'Ao capturar legalmente mudando de fileira, a Carga pode atravessar a proteção do inimigo.',
    ceifador: 'Se o alvo estiver na última fileira e a captura for legal, a Colheita pode superar a proteção.',
    predador: 'Ao capturar uma peça adjacente por um movimento permitido, a Caçada pode ignorar sua defesa.',
    duelista: 'Em ataque, move e captura sem apoio. Em defesa, também pode capturar, além de empurrar e trocar. Sem especial aliada adjacente, uma captura pode ignorar uma proteção inimiga.',
    vento_cortante: 'Se a captura legal ocorrer na mesma fileira, o Corte Horizontal pode atravessar a proteção.',
    cacador_cabecas: 'Se o Caçador capturar legalmente uma peça especial protegida, pode ignorar a proteção. Não elimina o protetor automaticamente.',
    cronomante: 'Movimente o Cronomante legalmente sem capturar ninguém para ganhar 5 moedas uma vez. Ele não repete turnos.',
    ilusionista: 'Após uma troca de posições permitida pelas regras do tabuleiro, o Ilusionista pode ganhar 6 moedas. Não cria clones.',
    teleportador: 'Uma troca de posições legal rende 8 moedas. A habilidade não permite teletransportar para qualquer casa.',
    ima_tatico: 'Se um aliado adjacente ao Ímã sofrer uma captura e o atacante também estiver junto ao Ímã, o campo magnético pode bloquear a captura.',
    xama_dos_ventos: 'Se um aliado na diagonal adjacente sofrer uma captura legal, o Xamã pode protegê-lo uma vez.',
    manipulador: 'Se um aliado adjacente na mesma fileira for atacado, o Manipulador pode impedir uma captura. Não controla a peça inimiga.',
    oraculo: 'Um aliado adjacente na mesma coluna pode ser salvo de uma captura. A habilidade não prevê jogadas futuras.',
    alquimista: 'Quando o Alquimista captura legalmente um inimigo, recebe 20 moedas extras uma vez na batalha.',
    sacerdote_da_luz: 'Um aliado adjacente que seria capturado pode receber Amparo e permanecer no tabuleiro, gastando uma carga.',
    mestre_de_manobras: 'Quando o Mestre faz uma captura legal com apoio aliado, ganha 15 moedas uma vez. Não copia habilidades de outras peças.',
});
function codexExplanation(key, piece) {
    return piece.description || 'Habilidade sem descrição no catálogo.';
}
function codexCombatExample(key) {
    return CODEX_COMBAT_EXAMPLES[key] || 'A habilidade respeita o movimento e a captura normais.';
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
    let html = `<div class="roguelike-modal-content"><div class="roguelike-header"><h2>📜 Codex — Peças e Sinergias</h2><button type="button" class="roguelike-close-btn" onclick="closeRoguelikeCodex()" aria-label="Fechar Codex">×</button></div><div class="roguelike-body"><p class="codex-intro">Descrições baseadas nas habilidades implementadas. Contra a IA, inclusive na Aventura, não há limite de tempo para sua jogada. As peças continuam obedecendo às regras normais de movimento e captura. Recargas contam turnos do próprio jogador; bônus do comandante podem alterar os valores.</p>`;
    const synergySets = (window.RoguelikeRuntime && window.RoguelikeRuntime.synergySets) || [];
    html += `<section class="roguelike-category-section" id="codex-synergies"><h3>🔗 Sinergias — duplas e trios</h3><p class="codex-intro">As habilidades individuais continuam funcionando sozinhas. A sinergia é um bônus adicional, válido para você e para os inimigos. É preciso ter duas peças diferentes do mesmo conjunto vivas e próximas no tabuleiro; comprar as peças não basta. O trio amplia o alcance, mas não substitui as habilidades individuais. Os bônus consomem usos da peça que os ativa e respeitam a recarga.</p><div class="roguelike-grid">`;
    for (const group of synergySets) {
        const names = group.keys.map(key => (SPECIAL_PIECES_CATALOG[key] || {}).name || key);
        const defense = group.type === 'guard';
        const pair = group.id === 'falange'
            ? 'Uma peça do conjunto pode gastar 1 uso para impedir a captura de QUALQUER aliado na mesma linha ou coluna, a até 1 casa dela. Precisa ter outra peça diferente da Falange próxima.'
            : group.id === 'juramento'
            ? 'Uma peça do conjunto pode gastar 1 uso para impedir a captura de OUTRA integrante do Juramento a até 1 casa. Não protege peças de fora do conjunto.'
            : 'Uma peça do conjunto que faz uma captura legal pode gastar 1 uso para ignorar a proteção especial do alvo se outra integrante diferente estiver a até 2 casas da atacante.';
        const trio = group.id === 'falange'
            ? 'Com as três integrantes diferentes próximas no tabuleiro, a Falange protege aliados na mesma linha ou coluna a até 2 casas da protetora.'
            : group.id === 'juramento'
            ? 'Com as três integrantes diferentes próximas no tabuleiro, uma peça do Juramento protege outra integrante a até 2 casas.'
            : 'Com as três integrantes diferentes próximas no tabuleiro, a parceira que apoia a atacante continua podendo ficar a até 2 casas. Continua exigindo captura legal e consumindo 1 uso da atacante.';
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
            html += `<article class="roguelike-card"><div class="roguelike-card-header"><span class="roguelike-symbol">${codexEscape(piece.symbol || '🔹')}</span><strong class="roguelike-name">${codexEscape(piece.name || key)}</strong></div><p class="codex-effect"><strong>O que faz:</strong> ${codexEscape(codexExplanation(key, piece))}</p><p class="codex-effect"><strong>Exemplo em combate:</strong> ${codexEscape(codexCombatExample(key))}</p><p class="codex-usage"><strong>Limites:</strong> ${codexEscape(usage)}</p>${groupNames.length ? `<p class="codex-usage"><strong>Sinergia:</strong> ${groupNames.map(codexEscape).join(', ')} (veja acima)</p>` : ''}</article>`;
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
