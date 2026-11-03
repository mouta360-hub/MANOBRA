# Manobra Roguelike — estado de validação

Esta versão é uma candidata de estabilização, NÃO uma versão final homologada.

## Alterações nesta entrega
- Corrigida a contagem de recarga: a ativação é registrada após o avanço de turno e não exige um turno adicional indevido.
- Substituído teste frágil de busca textual por verificação da rotina de transferência; teste funcional de troca e recargas também foi executado.

## Testes aprovados nesta entrega
- engine.test.js (12 testes)
- ability_limits_all.test.js
- roguelike_swap_capture.test.js
- roguelike_runtime.test.js
- roguelike_offense.test.js
- support_rewards.test.js
- ability_limits.test.js
- bluetooth.test.js
- online.test.js
- friends.test.js
- offline_save_awake.test.js
- move_timer.test.js
- setup_timeout.test.js
- tour_setup_timeout.test.js
- tournament.test.js

## Pendências para a versão final
- Execução completa sem timeout de tour.test.js e sim_worker.test.js.
- Testes de interface em navegador real e partidas completas com as 30 habilidades.
- Habilidades ainda suspensas/incompletas devem receber implementação compatível ou ser explicitamente substituídas.
