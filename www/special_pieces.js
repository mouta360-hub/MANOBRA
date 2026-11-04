
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
        description: 'Carga de Cavalaria: após uma captura diagonal legal, pode escolher avançar mais uma casa livre em qualquer uma das quatro diagonais, sem turno adicional. Avanço opcional; 2 usos, recarga 2. Maestria amplia cargas e reduz recarga.',
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
        description: 'Portal Dimensional: transporta um aliado adjacente em ataque por qualquer diagonal (origem conta como casa 1). Maestria I: 3 casas, 1 carga, recarga 3; II: 4 casas, 2 cargas, recarga 2; III: 4 casas, 3 cargas, recarga 1. Consome a jogada; não entra na base inimiga nem na proteção adjacente.',
        activePower: (fromCoords, toCoords) => {
            return { action: 'ally_diagonal_portal' };
        }
    },
    ima_tatico: {
        id: 'ima_tatico',
        name: 'Ímã Tático',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🧲',
        description: 'Atração Magnética: puxa um inimigo na terceira casa diagonal uma casa para perto, se o destino estiver livre. Gasta uma jogada e uma carga. Maestria I: 1 uso/recarga 3; II: 2 usos/recarga 2; III: 3 usos/recarga 1. Âncora de Ferro da Muralha pode bloquear.',
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
        description: 'Rajada de Fuga: quando um aliado a uma casa diagonal do Xamã sofre uma tentativa de captura legal, o defensor pode optar por deslocá-lo para uma casa diagonal livre de sua escolha. O atacante avança para a casa abandonada sem capturar, e sua jogada termina. Sem saída livre, a habilidade não ativa nem gasta carga. 1 uso por combate; não protege o próprio Xamã.',
        activePower: (r, c) => {
            return { action: 'reactive_ally_diagonal_escape' };
        }
    },
    manipulador: {
        id: 'manipulador',
        name: 'Manipulador',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🔮',
        description: 'Controle de Movimento: gasta a jogada e uma carga para escolher um inimigo na diagonal e deslocá-lo uma casa em qualquer diagonal livre. A casa do Manipulador conta como primeira. Maestria I: alcance 2 casas, 1 carga, cooldown 3; II: alcance 3, 2 cargas, cooldown 2; III: alcance 4, 3 cargas, cooldown 2. Não captura nem muda o modo do alvo.',
        activePower: (enemyR, enemyC) => {
            return { action: 'control_enemy_diagonal' };
        }
    },
    oraculo: {
        id: 'oraculo',
        name: 'Oráculo',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '👁️',
        description: 'Visão do Futuro: antes de agir, prevê a próxima jogada da IA no tabuleiro inteiro. Não gasta o movimento; a IA cumpre a previsão se continuar legal. Maestrias I/II/III: 1/2/3 cargas, cooldown 3/3/2.',
        passive: 'reveal_ai_intent'
    },
    alquimista: {
        id: 'alquimista',
        name: 'Alquimista',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '🧪',
        description: 'Poção de Transmutação: no próprio turno, escolhe aliado nas quatro diagonais adjacentes e o move imediatamente até duas casas na mesma diagonal, sem atravessar peças. No máximo uma captura legal; se capturar na primeira casa, para ali. Consome a jogada e uma carga. Maestrias I/II/III: 1/2/3 cargas, cooldown 3/2/2.',
        passive: 'ally_diagonal_double_step'
    },
    sacerdote_da_luz: {
        id: 'sacerdote_da_luz',
        name: 'Sacerdote da Luz',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '✨',
        description: 'Milagre Divino: no próprio turno, ressuscita uma peça aliada capturada nesta batalha em uma casa escura livre diagonalmente adjacente ao Sacerdote, em modo de defesa. Uma vez por identidade por combate; não ressuscita a si mesmo. Consome uma jogada e uma carga. Não pode ultrapassar o limite de 6 defesas. Maestrias I/II/III: 1/2/3 ressurreições, cooldown 4/3/3 turnos próprios.',
        cooldown: 4,
        passive: 'resurrect_captured_ally'
    },
    mestre_de_manobras: {
        id: 'mestre_de_manobras',
        name: 'Mestre de Manobras',
        category: 'support',
        categoryName: 'Mago / Estrategista / Suporte',
        symbol: '👑',
        description: 'Ordem Estratégica: no próprio turno, movimenta duas peças aliadas diferentes, uma casa diagonal cada, sem capturar. As duas movimentações devem ser legais e cada peça em ataque precisa de apoio. O Mestre não pode escolher a si mesmo. Consome uma carga e o turno; só ativa se houver duas jogadas legais. Alcance contado incluindo a casa do Mestre: Maestrias I/II/III 2/3/4 casas; 1/2/3 cargas; cooldown 3/2/2 turnos próprios.',
        passive: 'two_allied_diagonal_moves'
    }
};


// Guia detalhado do Codex: conteúdo informativo, sem efeitos de combate.
const MANOBRA_CODEX_DETAILS = {
  "escudeiro": { how: "Escudo próprio: a primeira captura legal contra ele é anulada. O atacante gasta a jogada e o escudo desaparece; outra captura legal pode eliminá-lo. Não protege aliados.", example: "Um inimigo tenta capturar o Escudeiro: o escudo absorve a tentativa, e o Escudeiro continua na casa.", note: "Proteção contra captura, não contra empurrão." },
  "sentinela": { how: "Pode gastar uma carga para impedir que um inimigo entre na área adjacente que vigia. O dono escolhe se usa a proteção; não é bloqueio automático obrigatório.", example: "O inimigo tenta entrar em uma casa vigiada: você decide bloquear ou guardar a carga.", note: "Base: 2 usos e recarga de 2 turnos." },
  "colosso": { how: "Recebe 10 moedas depois de um empurrão legal efetuado por ele. O empurrão deve ser permitido pelas regras do tabuleiro.", example: "O Colosso empurra um adversário para uma casa válida: ganha 10 moedas.", note: "1 recompensa por combate na Maestria I." },
  "bastiao": { how: "Bloqueia uma tentativa de captura contra um aliado nas oito casas adjacentes. Não protege a si mesmo.", example: "Um aliado ao lado do Bastião seria capturado: o Bastião pode impedir a captura gastando uma carga.", note: "Protege contra captura; não impede empurrões." },
  "muralha": { how: "Mantém a defesa original contra captura. Âncora de Ferro é uma proteção diferente, contra empurrão e atração: pode escolher secretamente a própria Muralha ou um aliado nas oito casas ao redor.", example: "Na Rajada Cortante, a Muralha escolhe uma peça para proteger sem saber o alvo secreto do atacante. Acertando, impede o empurrão; errando, não impede.", note: "A carga da Âncora é gasta mesmo se errar. Maestrias I/II/III: 1/2/3 usos; recarga mínima de 1 turno próprio." },
  "javali_de_ferro": { how: "Cada captura legal realizada pelo Javali rende 10 moedas adicionais, dentro do limite de recompensas da batalha.", example: "O Javali captura duas peças inimigas legalmente: recebe 20 moedas adicionais, se tiver usos.", note: "Maestrias I/II/III: no máximo 10/20/30 moedas por combate. Não contra-ataca por suicídio." },
  "guardiao_runico": { how: "Recebe 8 moedas por movimento válido, sem precisar capturar. Não paralisa inimigos.", example: "O Guardião anda uma casa diagonal permitida: recebe 8 moedas se houver recompensa disponível.", note: "Maestrias I/II/III: 1/2/3 movimentos recompensados por combate." },
  "rebatedor": { how: "Proteção própria contra tentativa de captura diagonal: a tentativa protegida é repelida, sem eliminar o Rebatedor.", example: "O adversário tenta capturá-lo na diagonal: a proteção impede a captura.", note: "Não confundir com proteção contra empurrão." },
  "tita_de_aco": { how: "Protege aliados nas oito casas adjacentes contra captura. Quando bloqueia, pode repelir o atacante uma casa para trás se a casa for válida e estiver livre.", example: "Um inimigo tenta capturar um aliado do Titã: a captura é bloqueada e, se houver espaço, o agressor recua uma casa.", note: "Não protege o próprio Titã; bloquear captura não equivale a bloquear empurrão." },
  "baluarte": { how: "Bloqueia tentativas de captura contra aliados a até duas casas, incluindo diagonais. Não protege a si mesmo.", example: "Um aliado a duas casas do Baluarte seria capturado: o Baluarte pode impedir a captura com uma carga.", note: "Proteção contra captura, não contra empurrão." },
  "lancer": { how: "Investida: durante uma captura diagonal legal, pode atravessar uma proteção especial do alvo. Continua exigindo apoio aliado e uma captura permitida pelo motor.", example: "O Lanceiro tem apoio para capturar na diagonal um inimigo protegido: a Investida ignora a proteção ao gastar uma carga.", note: "Maestrias I/II/III: 3/4/5 usos, recarga de 2/2/1 turnos." },
  "assassino_sombras": { how: "Teletransporte Sombrio: no ataque, uma captura diagonal legal pode enviar o alvo para uma casa livre na última linha do território dele; o Assassino fica parado. Na defesa, pode substituir uma troca por teletransporte e ocupar a casa deixada pelo alvo.", example: "Em vez de eliminar um inimigo na diagonal, o Assassino o envia de volta à última linha inimiga, se houver destino livre.", note: "Sem destino livre, segue a ação normal. Maestrias I/II/III: 2/3/4 cargas; recarga 2/2/1." },
  "berserker": { how: "Fúria Implacável: quando rompe uma proteção especial e realiza uma captura legal, ganha imediatamente mais uma ação com o próprio Berserker. A segunda ação também deve ser legal e não pode gerar uma terceira.", example: "O Berserker captura um inimigo protegido com apoio aliado; depois pode mover ou capturar uma segunda vez com o mesmo Berserker, se permitido.", note: "Maestrias I/II/III: 2/3/4 usos; recarga 3/3/2 turnos. Não ignora apoio ou regras normais na ação extra." },
  "executor": { how: "Execução em Cadeia: em modo de ataque, com apoio aliado, se houver dois inimigos consecutivos na mesma diagonal, elimina o inimigo de trás, empurra o da frente para a casa liberada e permanece na origem.", example: "Executor → inimigo A → inimigo B, em diagonal consecutiva: B é eliminado; A ocupa a casa de B; Executor não avança.", note: "Se houver apenas um inimigo, vale a captura normal. Maestrias I/II/III: 1/2/3 usos." },
  "cavaleiro_errante": { how: "Carga de Cavalaria: após uma captura diagonal legal, pode escolher avançar mais uma casa vazia em qualquer diagonal, sem gastar outra jogada. Se não quiser ou não houver espaço, não usa a carga.", example: "O Cavaleiro captura um inimigo e escolhe uma das quatro diagonais livres para avançar uma casa, caso a casa esteja livre.", note: "Maestrias I/II/III: 2/3/4 usos; recarga 2/2/1 turnos." },
  "ceifador": { how: "Pacto da Morte: quando um inimigo entra em uma das oito casas ao redor, o Ceifador pode marcá-lo. Se esse Ceifador morrer por qualquer causa, todos os inimigos ainda vivos marcados por ele morrem, mesmo longe.", example: "O Ceifador marca dois inimigos em turnos diferentes; quando morre, ambos morrem junto se ainda estiverem vivos.", note: "Cada Ceifador mantém suas próprias marcas. Maestrias I/II/III: 1/2/3 marcas." },
  "predador": { how: "Emboscada Mortal: em modo de ataque, gasta uma carga e a jogada para armar uma emboscada. Até seu próximo turno, captura automaticamente um inimigo que entre numa diagonal adjacente, desde que haja apoio aliado válido.", example: "O Predador prepara a emboscada; na jogada adversária, um inimigo entra na diagonal vizinha e é capturado.", note: "Se ninguém ativar a armadilha, ela expira no próximo turno do dono. Maestrias I/II/III: 1/2/3 usos." },
  "duelista": { how: "Contra-Ataque: pode atacar sem apoio aliado e capturar mesmo em defesa, conforme suas regras especiais. Ao sofrer tentativa de captura, pode trocar de casa com o agressor: ambos sobrevivem e a jogada atacante termina.", example: "Um inimigo tenta capturar o Duelista: ele troca de posição com o agressor. Na jogada seguinte pode fugir ou atacar outro inimigo, mas não aquele agressor.", note: "Maestrias I/II/III: 1/2/3 usos. Recarga obrigatória de 1 turno próprio, inclusive na III." },
  "vento_cortante": { how: "Rajada Cortante: após captura diagonal legal, pode escolher usar uma carga para empurrar um inimigo adjacente para uma casa livre. O alvo é escolhido secretamente; uma defesa anti-empurrão pode tentar adivinhar qual peça proteger.", example: "O Vento escolhe em segredo o inimigo A. A Muralha protege B: o empurrão em A acontece. Se protegesse A, seria bloqueado.", note: "Se ambas ativarem, ambas gastam carga mesmo se a defesa errar. Maestrias I/II/III: 2/3/4 usos; recarga 3/3/2." },
  "cacador_cabecas": { how: "Recompensa pela Cabeça: marca um inimigo como alvo. Somente se este mesmo Caçador capturar pessoalmente o alvo por uma jogada legal recebe 20 moedas extras.", example: "O Caçador marca A; se outro aliado capturar A, não há bônus. Se o próprio Caçador capturar A, ganha 20 moedas.", note: "Maestrias I/II/III: 1/2/3 caçadas, até 20/40/60 moedas por combate. A marca acompanha o alvo." },
  "cronomante": { how: "Atraso Temporal: gasta uma carga e a jogada para paralisar uma peça inimiga próxima na diagonal durante a próxima jogada do adversário. O adversário ainda pode movimentar outras peças.", example: "O Cronomante paralisa A; o adversário joga com B. Na sua próxima vez, você pode tentar capturar A se a captura for legal.", note: "Cooldown começa na ativação, mesmo sem captura. Maestrias I/II/III: 1/2/3 cargas e recarga 2/2/1 turnos." },
  "ilusionista": { how: "Ilusão Perfeita: gasta a jogada para criar uma cópia em uma casa diagonal vazia. A cópia parece real para o inimigo, não anda nem ataca. Se atacada, desaparece e consome a jogada do atacante.", example: "O adversário tenta capturar a cópia: ela some, mas a peça inimiga não a substitui nem ganha recompensa.", note: "Somente uma ilusão ativa por Ilusionista. Maestrias I/II/III: 1/2/3 usos; recarga 3/2/1. A IA não deve conhecer a identidade oculta." },
  "teleportador": { how: "Portal Dimensional: com o Teleportador ao lado de um aliado em modo de ataque, gasta a jogada e uma carga para levá-lo a uma casa livre em qualquer uma das quatro diagonais a partir do aliado. Pode atravessar peças.", example: "A peça aliada está na casa 1; na Maestria I, pode chegar até a casa 3, ou seja, avançar duas casas diagonais. A posição do Teleportador não define a direção.", note: "Maestrias I/II/III: alcance 3/4/4 casas contando a origem, 1/2/3 usos e recarga 3/2/1. Proibido pousar na casa principal inimiga ou área protegida." },
  "alquimista": { how: "Poção de Transmutação: durante o próprio turno, seleciona um aliado em uma das quatro casas diagonais imediatamente adjacentes ao Alquimista e o faz agir imediatamente, avançando uma ou duas casas na MESMA diagonal. Não pode atravessar peças, nem aplicar em si mesmo. A poção gasta uma carga e a jogada inteira.", example: "Alquimista encostado diagonalmente em uma aliada em defesa: ativa a poção e escolhe um avanço de duas casas diagonais livres. Se a aliada estiver em ataque e fizer uma captura legal na primeira casa, captura e para imediatamente; nunca elimina duas peças em sequência.", note: "Mantém as regras normais de apoio, ataque e defesa. No máximo uma captura legal por uso; o destino e o trajeto devem ser válidos. Maestria I: 1 carga, cooldown 3 turnos próprios; II: 2 cargas, cooldown 2; III: 3 cargas, cooldown 2. Alcance do Alquimista permanece sempre uma diagonal adjacente." },
  "oraculo": { how: "Visão do Futuro: somente no início do seu turno contra a IA, antes de qualquer ação, use o botão lateral para revelar a peça e o destino da próxima jogada da IA em qualquer lugar do tabuleiro. Não consome sua jogada normal, mas gasta uma carga.", example: "A previsão mostra que a IA moverá de C6 para D5. Você aproxima uma peça para ameaçar D5; a IA ainda executa C6 → D5 se a jogada permanecer legal. Se D5 ficar bloqueada e a jogada se tornar ilegal, a IA recalcula.", note: "Maestria I: 1 previsão, cooldown 3 turnos próprios; II: 2 previsões, cooldown 3; III: 3 previsões, cooldown 2. Uma ativação por turno; Oráculo deve estar vivo e no tabuleiro. A previsão não força jogadas ilegais." },
  "manipulador": { how: "Controle de Movimento: durante seu turno, pode gastar uma carga e toda a jogada para escolher um inimigo em uma das quatro diagonais dentro do alcance e deslocá-lo uma casa diagonal livre à sua escolha. Não causa captura e o inimigo conserva ataque ou defesa.", example: "O Manipulador vê um inimigo a duas casas diagonais de distância. Escolhe o inimigo e uma casa livre na diagonal dele para desmontar sua formação. Sua jogada termina.", note: "Contagem do alcance inclui a casa do Manipulador. Maestria I: 2 casas, 1 carga, cooldown 3; II: 3 casas, 2 cargas, cooldown 2; III: 4 casas, 3 cargas, cooldown 2. Sem destino livre, não ativa nem gasta carga." },
  "xama_dos_ventos": { how: "Rajada de Fuga: durante o turno inimigo, quando tentam capturar um aliado a uma casa diagonal do Xamã, você pode aceitar ou recusar a reação. Se aceitar, escolhe uma casa diagonal livre para o aliado fugir; o atacante avança para a casa abandonada, sem capturar.", example: "O Cavaleiro Errante inimigo tenta capturar seu aliado. Você ativa a Rajada e escolhe a diagonal de fuga; o Cavaleiro ocupa a antiga casa do aliado, mas não ativa a Carga de Cavalaria, pois não capturou.", note: "1 carga por combate; não protege o próprio Xamã. Recusar não gasta carga. Sem diagonal livre, não oferece reação. Não ativa habilidades que exigem captura real." },
  "ima_tatico": { how: "Atração Magnética: gasta a jogada e uma carga para puxar um inimigo na diagonal uma casa na direção do Ímã, se a casa intermediária estiver livre. O Ímã permanece parado.", example: "Um inimigo está na terceira casa da diagonal (contando o Ímã como primeira): ele é puxado uma casa para perto, se houver espaço.", note: "Maestrias I/II/III: 1/2/3 usos e recarga 3/2/1. Âncora de Ferro da Muralha pode impedir a atração." },
};
if (typeof window !== 'undefined') window.MANOBRA_CODEX_DETAILS = MANOBRA_CODEX_DETAILS;

/* Exportação do Módulo */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SPECIAL_PIECES_CATALOG };
}
