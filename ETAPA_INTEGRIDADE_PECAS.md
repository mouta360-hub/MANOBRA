# Etapa: integridade das habilidades especiais

- Troca (`s`): a identidade e os contadores das duas peças são capturados antes da jogada, e acompanham as peças após a troca.
- Remoção obrigatória (`x`) da sétima defesa: não pode ser anulada por habilidades defensivas e remove o cadastro e contadores da peça eliminada.
- Movimento, captura, empurrão e troca continuam validados pelo motor original.
- Regressão: `node tests/roguelike_swap_capture.test.js`.

Esta etapa corrige inconsistências do estado das habilidades; não constitui validação individual de todos os 30 poderes.
