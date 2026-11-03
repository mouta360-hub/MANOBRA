
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
        description: 'Bloqueia até 2 tentativas de entrada inimiga em casas adjacentes (recarga de 2 turnos).',
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
        description: 'Ao realizar empurrão legal, recebe 10 moedas (1 vez por combate).',
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
        description: 'Bloqueia uma tentativa de captura de aliado adjacente por combate.',
        passive: 'aura_front_defense'
    },
    muralha: {
        id: 'muralha',
        name: 'Muralha',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🏯',
        description: 'Bloqueia um ataque lateral na última fileira por combate.',
        passive: 'backrow_fortress'
    },
    javali_de_ferro: {
        id: 'javali_de_ferro',
        name: 'Javali de Ferro',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🐗',
        description: 'Ao realizar captura legal, recebe 10 moedas (1 vez por combate). Sem contragolpe automático.',
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
        description: 'Ao realizar movimento legal, recebe 8 moedas (1 vez por combate). Sem paralisar turnos.',
        passive: 'stun_aura'
    },
    rebatedor: {
        id: 'rebatedor',
        name: 'Rebatedor',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🪞',
        description: 'Repele a primeira tentativa de captura diagonal por combate.',
        passive: 'reflect_diagonal'
    },
    tita_de_aco: {
        id: 'tita_de_aco',
        name: 'Titã de Aço',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🦾',
        description: 'Protege uma vez por combate um aliado adjacente contra uma captura legal. Não cria movimentos extras.',
        passive: 'damage_reduction_zone'
    },
    baluarte: {
        id: 'baluarte',
        name: 'Baluarte',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🔰',
        description: 'Bloqueia a primeira tentativa de captura de aliado adjacente por combate.',
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
        description: 'Investida: ao capturar em linha reta, rompe uma proteção inimiga (3 usos, recarga 2).',
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
        description: 'Ataque furtivo: ao capturar na diagonal, rompe uma proteção inimiga (2 usos, recarga 2).',
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
        description: 'Fúria: ao capturar, rompe uma proteção inimiga (2 usos, recarga 3).',
        passive: 'fury_scaling'
    },
    executor: {
        id: 'executor',
        name: 'Executor',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '⚔️',
        description: 'Execução: uma captura pode romper uma proteção inimiga (1 uso).',
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
        description: 'Carga: ao capturar mudando de fileira, rompe uma proteção (2 usos, recarga 2).',
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
        description: 'Colheita: captura na última fileira rompe uma proteção inimiga (2 usos, recarga 3).',
        passive: 'rear_capture'
    },
    predador: {
        id: 'predador',
        name: 'Predador',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🐺',
        description: 'Caçada: captura adjacente rompe uma proteção inimiga (2 usos, recarga 2).',
        passive: 'hunt_mode'
    },
    duelista: {
        id: 'duelista',
        name: 'Duelista',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🤺',
        description: 'Duelo: sem aliado adjacente, sua captura rompe uma proteção inimiga (2 usos, recarga 2).',
        passive: 'lone_wolf_boost'
    },
    vento_cortante: {
        id: 'vento_cortante',
        name: 'Vento Cortante',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🌪️',
        description: 'Corte horizontal: captura na mesma fileira rompe uma proteção (2 usos, recarga 3).',
        passive: 'rook_slide'
    },
    cacador_cabecas: {
        id: 'cacador_cabecas',
        name: 'Caçador de Cabeças',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🎯',
        description: 'Caça especial: captura de peça especial rompe uma proteção inimiga (2 usos, recarga 3).',
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
        description: 'Ritmo preciso: após um movimento legal sem captura, recebe +5 moedas (1 uso por combate). Não altera turnos.',
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
        description: 'Distração: após uma troca legal de posições, recebe +6 moedas (até 2 usos, recarga de 3 turnos).',
        activePower: (r, c) => {
            return { action: 'spawn_decoy' };
        }
    },
    teleportador: {
        id: 'teleportador',
        name: 'Teleportador',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🔄',
        description: 'Troca estratégica: após uma troca legal de posições, recebe +8 moedas (até 2 usos, recarga de 3 turnos). Não teleporta.',
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
        description: 'Campo magnético: protege aliado adjacente quando o atacante está junto ao Ímã (2 usos, recarga 2).',
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
        description: 'Rajada protetora: protege aliado adjacente na diagonal (1 uso).',
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
        description: 'Desvio tático: protege aliado adjacente na mesma fileira (1 uso).',
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
        description: 'Previsão: protege aliado adjacente na mesma coluna (2 usos, recarga 3).',
        passive: 'reveal_ai_intent'
    },
    alquimista: {
        id: 'alquimista',
        name: 'Alquimista',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🧪',
        description: 'Transmutação: Peças inimigas capturadas por ele concedem +20 moedas bônus (uma vez por combate).',
        passive: 'bonus_gold_on_capture'
    },
    sacerdote_da_luz: {
        id: 'sacerdote_da_luz',
        name: 'Sacerdote da Luz',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '✨',
        description: 'Amparo: protege aliado adjacente de uma captura (2 usos, recarga 3).',
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
        description: 'Maestria: após uma captura legal com apoio, recebe +15 moedas (1 uso por combate). Não copia poderes.',
        passive: 'copy_closest_special_power'
    }
};

/* Exportação do Módulo */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SPECIAL_PIECES_CATALOG };
}
