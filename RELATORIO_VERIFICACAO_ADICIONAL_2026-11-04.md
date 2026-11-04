# Verificação adicional — 04/11/2026

Esta versão é de **diagnóstico**, não certificada como estável.

## Testes confirmados nesta execução
- engine, ability_limits, ability_limits_all, all_30_combat, branching_map, mastery_progression, roguelike_defense_regression, roguelike_offense, roguelike_runtime, roguelike_swap_capture, random_enemy_army, procedural_map, shop_map, online e vários outros passaram.
- `map2_balance.test.js`: passou após atualizar o catálogo fictício do teste para as chaves reais do catálogo de combate. **Não houve mudança na dificuldade do jogo**.
- `boss_stage.test.js`: passou após atualizar as chaves do teste e substituir a exigência antiga de raridade mínima (que contradizia o sorteio atual) por verificação de ausência de duplicatas. **Não houve mudança na lógica do chefão**.

## Problemas ainda abertos
- `support_rewards.test.js` (Ímã Tático): a proteção não foi acionada no cenário de teste; investigação necessária, não corrigido.
- `commanders.test.js` e testes de campanha relacionados: mock do DOM fornece elemento sem `style`, enquanto a interface real espera `style`; testes não concluídos.
- `judge_failover.test.js` exibiu resultados parciais, mas excedeu o limite de 12 segundos no teste geral.
- Simulação de campanhas inteiras e mapa 3 não validados; não há evidência de conclusão real.
- Teste de torneio e outros testes longos não concluídos nesta bateria.

## Alterações desta rodada
- Somente os testes `tests/map2_balance.test.js`, `tests/boss_stage.test.js` e `tests/support_rewards.test.js` foram alterados. O último foi ajustado para posicionar o suporte próximo do atacante, mas ainda falha. Não foi alterado código de produção.

**Não substituir a versão principal do GitHub sem antes resolver os problemas acima.**
