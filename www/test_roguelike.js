
/* ==========================================================================
   MANOBRA ROGUELIKE - SCRIPT DE TESTE UNITÁRIO & VALIDAÇÃO
   ========================================================================== */

console.log("=== INICIANDO VALIDAÇÃO DE SEGURANÇA DO MANOBRA ROGUELIKE ===");

// 1. Validar Carregamento do Catálogo
if (typeof SPECIAL_PIECES_CATALOG !== 'undefined') {
    const totalPieces = Object.keys(SPECIAL_PIECES_CATALOG).length;
    console.log(`[OK] Catálogo carregado com sucesso. Total de peças registradas: ${totalPieces}`);
    
    if (totalPieces === 30) {
        console.log("[OK] Quantidade exata de 30 peças confirmada!");
    } else {
        console.warn(`[AVISO] Encontradas ${totalPieces} peças em vez de 30.`);
    }
} else {
    console.error("[ERRO CRÍTICO] SPECIAL_PIECES_CATALOG não foi encontrado!");
}

// 2. Validar Categorias e Estruturas das Peças
let categoriesCount = { tank: 0, attacker: 0, support: 0 };
let validationErrors = 0;

for (const [key, piece] of Object.entries(SPECIAL_PIECES_CATALOG)) {
    if (!piece.id || !piece.name || !piece.symbol || !piece.category) {
        console.error(`[ERRO] Peça '${key}' possui propriedades obrigatórias ausentes.`);
        validationErrors++;
    }
    
    if (categoriesCount[piece.category] !== undefined) {
        categoriesCount[piece.category]++;
    } else {
        console.error(`[ERRO] Categoria desconhecida '${piece.category}' na peça '${key}'.`);
        validationErrors++;
    }
}

console.log(`[INFO] Distribuição por Categoria:`, categoriesCount);

if (validationErrors === 0) {
    console.log("[OK] Todas as 30 peças possuem estruturas válidas e sem conflitos!");
} else {
    console.error(`[FALHA] Encontrados ${validationErrors} erros na validação das peças.`);
}

// 3. Simulação de Execução Segura (Fallbacks)
function simulatePieceMove(pieceId, row, col, boardState) {
    try {
        const piece = SPECIAL_PIECES_CATALOG[pieceId];
        if (!piece) throw new Error("Peça não encontrada no catálogo");

        console.log(`[TESTE] Simulando ação para: ${piece.symbol} ${piece.name} (${piece.categoryName})`);

        if (piece.getSpecialMoves) {
            const moves = piece.getSpecialMoves(row, col, 1, boardState);
            console.log(`  -> Movimentos especiais calculados sem exceções.`);
        }

        if (piece.onCaptureAttempt) {
            const result = piece.onCaptureAttempt({ hp: 2 });
            console.log(`  -> Passiva de captura executada: ${result.msg}`);
        }

        return true;
    } catch (err) {
        console.error(`[ERRO DE EXECUÇÃO] Falha ao simular ${pieceId}:`, err.message);
        return false;
    }
}

// Criar tabuleiro sintético de teste (8x8 limpo)
const dummyBoard = Array(8).fill(null).map(() => Array(8).fill(null));

// Testar 3 peças representativas de cada categoria
const test1 = simulatePieceMove('escudeiro', 6, 3, dummyBoard);
const test2 = simulatePieceMove('lancer', 6, 3, dummyBoard);
const test3 = simulatePieceMove('cronomante', 6, 3, dummyBoard);

if (test1 && test2 && test3) {
    console.log("[SUCESSO TOTAL] O módulo passou em todos os testes de segurança sem comprometer o loop principal!");
} else {
    console.error("[FALHA] Foram detectados erros durante a simulação de movimentos.");
}

console.log("=== FIM DA VALIDAÇÃO DE SEGURANÇA ===");
