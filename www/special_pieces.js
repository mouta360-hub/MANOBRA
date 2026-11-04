
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
        description: 'Mantém sua proteção original contra captura. Âncora de Ferro: protege a si ou um aliado nas 8 casas próximas contra empurrão da Rajada Cortante; escolha secreta, gasta carga mesmo se errar. 1/2/3 usos por Maestria, recarga obrigatória de 1 turno.',
        passive: 'backrow_fortress'
    },
    javali_de_ferro: {
        id: 'javali_de_ferro',
        name: 'Javali de Ferro',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🐗',
        description: 'Ao realizar uma captura legal, recebe 10 moedas. Maestria I: até 10; II: até 20; III: até 30 moedas por combate (10 por captura).'
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
        description: 'Protege um aliado adjacente contra captura legal e repele o atacante uma casa para trás, se houver casa livre e jogável. Se não houver espaço, apenas bloqueia. Cargas aumentam com a Maestria.',
        passive: 'damage_reduction_zone'
    },
    baluarte: {
        id: 'baluarte',
        name: 'Baluarte',
        category: 'tank',
        categoryName: 'Guardião / Tanque',
        symbol: '🔰',
        description: 'Bloqueia capturas contra aliados a até 2 casas de distância (inclusive diagonais), mas não protege a si mesmo. Cargas aumentam com a Maestria.',
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
        description: 'Investida: ao realizar uma captura diagonal válida, rompe uma proteção inimiga (3 usos, recarga 2).',
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
        description: 'Teletransporte Sombrio: em captura diagonal no ataque, manda o alvo à última linha inimiga sem avançar. Na defesa, pode substituir a troca por teletransporte e ocupar a casa do alvo. Sem espaço livre, ação normal. 2 usos, recarga 2; Maestria amplia usos.',
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
        description: 'Fúria Implacável: ao romper uma proteção e capturar, ganha uma ação extra imediata somente com o Berserker (movimento ou ataque legal, sem encadear). 2 usos, recarga 3; Maestria amplia cargas.',
        passive: 'fury_scaling'
    },
    executor: {
        id: 'executor',
        name: 'Executor',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '⚔️',
        description: 'Execução em Cadeia: no ataque, com apoio aliado e duas peças inimigas consecutivas na mesma diagonal, elimina a de trás, empurra a da frente para a casa liberada e permanece parado. 1 uso por combate; Maestria amplia cargas.'
    },
    cavaleiro_errante: {
        id: 'cavaleiro_errante',
        name: 'Cavaleiro Errante',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '♞',
        description: 'Carga de Cavalaria: após uma captura diagonal legal, pode avançar mais uma casa livre na mesma diagonal, sem turno adicional. Avanço opcional; 2 usos, recarga 2. Maestria amplia cargas e reduz recarga.',
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
        description: 'Pacto da Morte: quando um inimigo entra nas 8 casas próximas, pode marcá-lo. Se o Ceifador morrer, todas as peças marcadas por ele morrem junto. 1/2/3 marcas por Maestria.',
        passive: 'rear_capture'
    },
    predador: {
        id: 'predador',
        name: 'Predador',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🐺',
        description: 'Emboscada Mortal: no ataque, gasta um turno e uma carga para armar. Até seu próximo turno, captura automaticamente inimigo que entrar em diagonal adjacente se houver apoio aliado. Maestria: 1/2/3 emboscadas por combate.',
        passive: 'hunt_mode'
    },
    duelista: {
        id: 'duelista',
        name: 'Duelista',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🤺',
        description: 'Contra-Ataque: quando tentam capturá-lo, pode trocar de posição com o agressor, sem mortes. No próximo turno não pode capturar esse agressor, mas pode mover ou atacar outro inimigo. Maestria: 1/2/3 usos por combate. Recarga obrigatória de um turno entre ativações, inclusive na Maestria III.',
        passive: 'lone_wolf_boost'
    },
    vento_cortante: {
        id: 'vento_cortante',
        name: 'Vento Cortante',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🌪️',
        description: 'Rajada Cortante: após captura diagonal, pode escolher secretamente um inimigo adjacente para empurrar. Defensor tenta adivinhar qual peça proteger; ambas as habilidades gastam carga quando ativadas, mesmo se a defesa errar. 2 usos, recarga 3.',
        passive: 'rook_slide'
    },
    cacador_cabecas: {
        id: 'cacador_cabecas',
        name: 'Caçador de Cabeças',
        category: 'attacker',
        categoryName: 'Atacante / Berserker',
        symbol: '🎯',
        description: 'Recompensa pela Cabeça: marque um inimigo e capture-o com este Caçador para ganhar 20 moedas. 1/2/3 caçadas por combate conforme a Maestria; captura normal, sem ignorar proteções.',
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
        description: 'Atraso Temporal: gasta a jogada para paralisar um inimigo na diagonal durante a próxima ação adversária. Maestria I: 1 uso, recarga 2; II: 2 usos, recarga 2; III: 3 usos, recarga 1.',
        cooldown: 2,
        activePower: () => ({ action: 'freeze_adjacent_enemy' })
    },
    ilusionista: {
        id: 'ilusionista',
        name: 'Ilusionista',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🎭',
        description: 'Ilusão Perfeita: cria uma cópia em casa diagonal vazia. A isca não age e desaparece quando atacada, consumindo a ação inimiga. Uma cópia ativa por Ilusionista. Maestria I/II/III: 1/2/3 usos e recarga 3/2/1 turnos.',
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
