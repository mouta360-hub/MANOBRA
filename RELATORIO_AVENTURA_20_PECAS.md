# Teste da aventura — tabuleiro 13×11, 20 peças por lado

Data: 2026-11-03.

## Bateria 1 — campanha normal
Comando: `CAMPAIGN_RUNS=12 CAMPAIGN_DEPTH=1 CAMPAIGN_SEARCH_MS=3 CAMPAIGN_SAFETY_PLIES=300 CAMPAIGN_TRY_MASTERY=1 node tests/campaign_mastery_eval.test.js`
12 campanhas; 13 batalhas; 1 vitória, 12 derrotas; 0 campanhas completas; 0 lojas; 0 peças especiais implantadas pelo jogador; 14 implantações especiais inimigas. Mapa 2 não alcançado.

## Bateria 2 — cenário experimental com quatro especiais iniciais
Comando: `CAMPAIGN_RUNS=12 CAMPAIGN_DEPTH=1 CAMPAIGN_SEARCH_MS=3 CAMPAIGN_SAFETY_PLIES=300 node tests/campaign_special_start_eval.test.js`
12 campanhas; 14 batalhas; 2 vitórias, 12 derrotas; 0 campanhas completas; 1 loja; 1 compra; 58 implantações especiais do jogador, 17 do inimigo; 6 efeitos bloqueadores observados, 2 usos registrados. Mapa 2 não alcançado.

IMPORTANTE: O segundo cenário concede quatro peças especiais iniciais exclusivamente para medir seu funcionamento, não é uma regra do jogo nem prova de equilíbrio da campanha real. O simulador usa IA rasa (profundidade 1, 3 ms) e não ativa todos os poderes manuais; resultados não predizem o desempenho de um jogador humano. Não há adjudicação de vitória por limite de lances.

Testes adicionais: `node tests/all_30_combat.test.js` passou; `node tests/synergy_combat.test.js` passou.

Conclusão: habilidades e sinergias funcionam em testes isolados; ainda não há evidência de equilíbrio dos três mapas. Próximo passo: testar IA com decisões melhores, habilidade manual e loadouts mais diversos antes de alterar dificuldade.
