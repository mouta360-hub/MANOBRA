
/* ==========================================================================
   MANOBRA ROGUELIKE - MÓDULO DE PEÇAS ESPECIAIS & HABILIDADES
   ========================================================================== */

const SPECIAL_PIECES_CATALOG = {
    // ----------------------------------------------------------------------
    // CATEGORIA 1: GUARDIÕES E TANQUES (Defesa, Absorção e Controle de Espaço)
    // ----------------------------------------------------------------------
    escudeiro: {
        id: 'escudeiro',
        name: 'Escudeiro',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🛡️',
        description: 'Possui escudo tático (2 PV). Requer 2 capturas para ser eliminado.',
        hp: 2,
        passive: 'shield',
        onCaptureAttempt: (targetPiece) => {
            if (targetPiece.hp > 1) {
                targetPiece.hp--;
                targetPiece.shieldActive = false;
                return { destroyed: false, msg: 'O Escudeiro absorveu o impacto e perdeu o escudo!' };
            }
            return { destroyed: true, msg: 'O Escudeiro foi destruído!' };
        }
    },
    sentinela: {
        id: 'sentinela',
        name: 'Sentinela',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🏰',
        description: 'Cria uma zona de bloqueio. Inimigos não podem atravessar casas adjacentes.',
        passive: 'aura_block',
        getAuraArea: (r, c) => [
            {r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1}
        ]
    },
    colosso: {
        id: 'colosso',
        name: 'Colosso',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🗿',
        description: 'Ao avançar, empurra uma peça inimiga adjacente 1 casa para trás.',
        onAfterMove: (from, to, board) => {
            // Lógica de empurrão (knockback)
        }
    },
    bastiao: {
        id: 'bastiao',
        name: 'Bastião',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🧱',
        description: 'Concede imunidade a captura frontal para peças aliadas adjacentes.',
        passive: 'aura_front_defense'
    },
    muralha: {
        id: 'muralha',
        name: 'Muralha',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🏯',
        description: 'Inexpugnável na última fileira defensiva: ganha imunidade a ataques laterais.',
        passive: 'backrow_fortress'
    },
    javali_de_ferro: {
        id: 'javali_de_ferro',
        name: 'Javali de Ferro',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🐗',
        description: 'Vingança: Ao ser capturado, destrói automaticamente a peça que o atacou.',
        onDestroyed: (attackerPiece) => {
            return { destroyAttacker: true, msg: 'Contragolpe do Javali de Ferro!' };
        }
    },
    guardiao_runico: {
        id: 'guardiao_runico',
        name: 'Guardião Rúnico',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '☸️',
        description: 'Runa de Paralisia: Inimigos que param ao seu lado perdem o próximo turno.',
        passive: 'stun_aura'
    },
    rebatedor: {
        id: 'rebatedor',
        name: 'Rebatedor',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🪞',
        description: 'Inverte o vetor de captura se for atacado em ângulo diagonal.',
        passive: 'reflect_diagonal'
    },
    tita_de_aco: {
        id: 'tita_de_aco',
        name: 'Titã de Aço',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🦾',
        description: 'Ocupa o centro do bloqueio e reduz dano em área recebido por aliados.',
        passive: 'damage_reduction_zone'
    },
    baluarte: {
        id: 'baluarte',
        name: 'Baluarte',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🔰',
        description: 'Redireciona para si o primeiro ataque sofrido por qualquer aliado próximo.',
        passive: 'intercept_damage'
    },

    // ----------------------------------------------------------------------
    // CATEGORIA 2: ATACANTES E BERSERKERS (Ataque, Carga e Mobilidade Ofensiva)
    // ----------------------------------------------------------------------
    lancer: {
        id: 'lancer',
        name: 'Lancer',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🗡️',
        description: 'Carga Linear: Pode saltar 2 casas em linha reta se a intermediária estiver livre.',
        getSpecialMoves: (r, c, player, board) => {
            const dir = player === 1 ? -1 : 1;
            const moves = [];
            if (!board[r + dir]?.[c] && !board[r + 2*dir]?.[c]) {
                moves.push({ r: r + 2*dir, c: c, type: 'charge' });
            }
            return moves;
        }
    },
    assassino_sombras: {
        id: 'assassino_sombras',
        name: 'Assassino das Sombras',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🥷',
        description: 'Passos Sombrios: Atravessa 1 peça inimiga sem capturar para se posicionar atrás.',
        getSpecialMoves: (r, c, player, board) => {
            // Lógica de travessia fantasma
            return [];
        }
    },
    berserker: {
        id: 'berserker',
        name: 'Berserker',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🪓',
        description: 'Fúria: Ganha +1 casa de alcance de movimento para cada 3 aliados eliminados.',
        passive: 'fury_scaling'
    },
    executor: {
        id: 'executor',
        name: 'Executor',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '⚔️',
        description: 'Impulso Mortal: Ao realizar uma captura, ganha um movimento bônus imediato.',
        onCaptureSuccess: (player) => {
            return { extraTurn: true };
        }
    },
    cavaleiro_errante: {
        id: 'cavaleiro_errante',
        name: 'Cavaleiro Errante',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '♞',
        description: 'Movimento em "L" (Salto de Cavalo): Quebra os padrões de bloqueio em grade.',
        getSpecialMoves: (r, c, player, board) => {
            const offsets = [
                {dr: -2, dc: -1}, {dr: -2, dc: 1}, {dr: -1, dc: -2}, {dr: -1, dc: 2},
                {dr: 1, dc: -2}, {dr: 1, dc: 2}, {dr: 2, dc: -1}, {dr: 2, dc: 1}
            ];
            // Filtra casas válidas no tabuleiro
            return [];
        }
    },
    ceifador: {
        id: 'ceifador',
        name: 'Ceifador',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '💀',
        description: 'Ponto Cego: Capaz de capturar alvos na diagonal traseira.',
        passive: 'rear_capture'
    },
    predador: {
        id: 'predador',
        name: 'Predador',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🐺',
        description: 'Sede de Sangue: Ganha +1 casa de alcance quando avança contra a última peça inimiga.',
        passive: 'hunt_mode'
    },
    duelista: {
        id: 'duelista',
        name: 'Duelista',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🤺',
        description: 'Isolamento: Quando não possui aliados adjacentes, ganha alcance de captura +1.',
        passive: 'lone_wolf_boost'
    },
    vento_cortante: {
        id: 'vento_cortante',
        name: 'Vento Cortante',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🌪️',
        description: 'Projétil Tático: Percorre qualquer linha reta desocupada até encontrar obstáculo.',
        passive: 'rook_slide'
    },
    cacador_cabecas: {
        id: 'cacador_cabecas',
        name: 'Caçador de Cabeças',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🎯',
        description: 'Marca do Caçador: Escolhe um alvo na IA; ganha o dobro de pontos ao eliminar.',
        passive: 'bounty_target'
    },

    // ----------------------------------------------------------------------
    // CATEGORIA 3: MAGOS, ESTRATEGISTAS E SUPORTES (Utilidade, Teleporte e Sinergia)
    // ----------------------------------------------------------------------
    cronomante: {
        id: 'cronomante',
        name: 'Cronomante',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '⏳',
        description: 'Dobra do Tempo: Concede um turno bônus para uma peça aliada adjacente (CD: 3T).',
        cooldown: 3,
        activePower: (r, c, targetR, targetC) => {
            return { action: 'grant_extra_turn' };
        }
    },
    ilusionista: {
        id: 'ilusionista',
        name: 'Ilusionista',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🎭',
        description: 'Clone de Espelhos: Cria uma ilusão que força a IA a gastar um movimento atacando-a.',
        activePower: (r, c) => {
            return { action: 'spawn_decoy' };
        }
    },
    teleportador: {
        id: 'teleportador',
        name: 'Teleportador',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🌀',
        description: 'Permuta Quântica: Troca de posição instantaneamente com qualquer peça aliada.',
        activePower: (fromCoords, toCoords) => {
            return { action: 'swap_positions' };
        }
    },
    ima_tatico: {
        id: 'ima_tatico',
        name: 'Ímã Tático',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🧲',
        description: 'Atração Gravitacional: Puxa uma peça inimiga a até 2 casas para perto de si.',
        activePower: (r, c, enemyR, enemyC) => {
            return { action: 'pull_enemy' };
        }
    },
    xama_dos_ventos: {
        id: 'xama_dos_ventos',
        name: 'Xamã dos Ventos',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '💨',
        description: 'Onda Repulsiva: Empurra todas as peças adjacentes 1 casa para longe.',
        activePower: (r, c) => {
            return { action: 'push_all_adjacent' };
        }
    },
    manipulador: {
        id: 'manipulador',
        name: 'Manipulador',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🔮',
        description: 'Ordem Forçada: Obriga uma peça inimiga de menor valor a dar 1 passo para trás.',
        activePower: (enemyR, enemyC) => {
            return { action: 'force_enemy_retreat' };
        }
    },
    oraculo: {
        id: 'oraculo',
        name: 'Oráculo',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '👁️',
        description: 'Visão do Futuro: Mostra o indicador do próximo movimento intencionado pela IA.',
        passive: 'reveal_ai_intent'
    },
    alquimista: {
        id: 'alquimista',
        name: 'Alquimista',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🧪',
        description: 'Transmutação: Peças inimigas capturadas por ele concedem +50 Moedas Bônus.',
        passive: 'bonus_gold_on_capture'
    },
    sacerdote_da_luz: {
        id: 'sacerdote_da_luz',
        name: 'Sacerdote da Luz',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '✨',
        description: 'Restauração: Recupera o escudo/vida de um aliado danificado a cada 2 turnos.',
        cooldown: 2,
        activePower: (targetAlly) => {
            return { action: 'heal_ally' };
        }
    },
    mestre_de_manobras: {
        id: 'mestre_de_manobras',
        name: 'Mestre de Manobras',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '👑',
        description: 'Coringa Sincrônico: Copia a habilidade da peça especial aliada mais próxima.',
        passive: 'copy_closest_special_power'
    }
};

/* Exportação do Módulo */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SPECIAL_PIECES_CATALOG };
}
