# Próxima estratégia — avaliação do Manobra

Atualização do simulador `tests/campaign_real_combat.test.js`:
- Nas lojas, tenta evoluir uma peça do inventário se houver moedas e não tiver alcançado Maestria III.
- Forma o grupo ativo priorizando peças com Maestria mais alta, evitando descartar investimentos anteriores.
- Registra a quantidade de aprimoramentos e de peças que chegam à Maestria III.
- Não concede vitórias ou derrotas por limite de jogadas; o motor continua aplicando a regra original de looping.

## Rodada rápida executada
3 campanhas, 4 combates, 1 vitória, 3 derrotas, nenhuma campanha concluída; nenhuma loja alcançada, portanto nenhum aprimoramento realizado. Busca reduzida (profundidade 1, 3 ms), que não mede o equilíbrio real.

## Verificações
Passaram: motor, combate das 30 peças, limites de habilidades, recompensa de Maestria após chefão, escala de inimigos no mapa 2, geração de 300 mapas e regressões defensivas. O teste `campaign_mastery_eval.test.js` executou sem erro.

## Limitações
O simulador ainda não aciona todas as habilidades que exigem escolhas manuais e não demonstra a possibilidade de concluir os três mapas. Nenhuma regra de combate ou dificuldade foi alterada nesta versão. É necessário expandir as decisões da IA antes de usar os resultados para balanceamento.
