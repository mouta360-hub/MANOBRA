# Relatório de validação técnica — Manobra Roguelike

## Resultados observados

Comando: `CAMPAIGN_RUNS=8 CAMPAIGN_PLIES=90 node tests/campaign_real_combat.test.js`

- Tentativas de campanha: 8
- Batalhas efetivamente disputadas pelo motor: 17
- Vitórias do jogador simulado: 9; derrotas: 8
- Campanhas completas: 0
- Batalhas no mapa 1: 17; mapas 2 e 3: nenhuma
- Visitas a lojas: 3; compras efetuadas: 3
- Habilidades ativadas pelo simulador: 0

## O que este teste mede

A campanha é percorrida usando nós disponíveis no mapa; as compras usam a função real da loja e verificam o saldo. Em nós de combate, duas IAs escolhem movimentos legais pelo motor `engine.js`, e o resultado do combate determina se a aventura avança ou termina. Nenhuma vitória é injetada.

## Limitações importantes

Este **não é** ainda um teste fiel do balanceamento completo: as peças compradas não são implantadas no tabuleiro simulado, as habilidades não são ativadas, os bônus específicos dos 27 chefões não são exercitados, e as partidas são limitadas a 90 jogadas (decididas por critério de desempate quando necessário). O simulador usa busca de profundidade 1 para manter o teste rápido. Não extrapolar as taxas observadas para partidas humanas.

## Regressão

Passaram: `tests/engine.test.js` (12 testes), `tests/all_30_combat.test.js`, `tests/ability_limits_all.test.js`, `tests/campaign_economy_integration.test.js`, `tests/commanders.test.js`, `tests/branching_map.test.js` (200 mapas), e o novo `tests/campaign_real_combat.test.js`.

## Próxima melhoria necessária

Ligar o simulador à preparação real de equipes, implantação das peças compradas, efeitos e recargas de habilidades, chefões e condições de vitória; só então repetir muitas campanhas e calibrar a dificuldade.
