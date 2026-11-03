# Auditoria de estratégia da Aventura — 03/11/2026

## Mudanças desta etapa
- Simulador de campanha evita repetir indefinidamente o mesmo movimento, buscando outra jogada **legal** depois de repetição frequente. Isto é uma heurística de IA de teste, não alteração das regras do Manobra.
- Na loja, o conjunto de teste prioriza as seis peças mais recentemente adquiridas, para representar melhor a evolução.
- Nenhuma habilidade ou regra do jogo foi modificada nesta rodada, pois os resultados ainda não justificam rebalanceamento.

## Resultados (12 campanhas, profundidade 2, 12 ms por decisão)
- 38 combates: 26 vitórias por regra, 12 derrotas por regra; 0 empates, 0 inconclusivos.
- Mapa 1: 36 combates, 26 vitórias; mapa 2: 2 combates, 0 vitórias; mapa 3: 0 combates.
- 6 compras, 13 implantações especiais do jogador, 90 implantações inimigas, 5 usos de habilidade.
- 0 campanhas completas.

## Limitações
- O simulador não usa todas as habilidades manuais, nem reproduz escolhas humanas, e utiliza uma IA de busca limitada.
- Os resultados não demonstram que a campanha seja impossível, nem comprovam seu equilíbrio.
- A diferença de implantações especiais entre jogador e inimigos sugere necessidade de testar a economia e o acesso a peças especiais antes de enfraquecer chefões.

## Regressão
Passaram: engine.test.js (12 testes), all_30_combat.test.js, ability_limits_all.test.js, commanders.test.js, branching_map.test.js (200 mapas), campaign_economy_integration.test.js (vitórias simuladas).
