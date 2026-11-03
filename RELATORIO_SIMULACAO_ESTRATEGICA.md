# Simulação estratégica de campanha — 03/11/2026

Executar: `CAMPAIGN_RUNS=8 CAMPAIGN_DEPTH=2 CAMPAIGN_SEARCH_MS=12 node tests/campaign_real_combat.test.js`

Resultado observado (uma execução aleatória): 8 tentativas, 60 combates, 52 vitórias (37 decisivas e 15 por adjudicação no limite), 8 derrotas por adjudicação, 10 compras, 41 implantações especiais do jogador, 167 inimigas, 2 usos de habilidades registrados, nenhuma campanha concluída; mapa 1: 38/38 vitórias, mapa 2: 14/22, mapa 3 não alcançado.

O teste usa o motor de combate e efeitos automáticos das peças, compra na loja e gera rotas reais. A IA de teste usa busca limitada; os efeitos acionados manualmente ainda não são modelados. Adjudicação por limite de jogadas NÃO é uma vitória por objetivo. Não concluir que o jogo é impossível ou equilibrado a partir dessa amostra.

Correção no teste: ao vencer o chefão do ato, avança explicitamente ao ato seguinte em ambiente de teste (o navegador usa um callback assíncrono de interface que o ambiente de teste não executa). O jogo não foi alterado.

Regressões executadas: engine.test.js, all_30_combat.test.js, ability_limits_all.test.js, campaign_economy_integration.test.js, procedural_map.test.js, roguelike_defense_regression.test.js — passaram.
