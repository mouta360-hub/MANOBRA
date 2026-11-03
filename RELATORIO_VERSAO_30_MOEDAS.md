# Manobra Roguelike — atualização de economia e validação

Data: 2026-11-03

## Alterações
- Dinheiro inicial da aventura: 30 moedas (antes 100).
- Reinício de aventura e desistência: saldo-base 30 moedas.
- Mantido acesso à loja exclusivamente nos nós de mercador alcançados na masmorra.
- Mantidas até 3 ofertas aleatórias persistentes por mercador.
- Atualizado o teste da loja para refletir a regra de presença física no mercador.
- Novo teste de saldo inicial e reinício: `tests/roguelike_start_gold.test.js`.

## Resultados
- 22 arquivos de teste disponíveis foram executados nesta rodada, todos com sucesso após corrigir o cenário de teste desatualizado da loja.
- `tests/sim_worker.test.js`: sucesso, incluindo falha e silêncio do worker.
- `tests/tournament.test.js`: sucesso, incluindo campeonato e robôs.
- Motor original: 12 testes passaram.
- 30 habilidades: bateria simulada existente passou.

## Limites da validação
- Não foi realizada validação visual completa em navegador real ou dispositivo móvel.
- A bateria de testes não garante ausência de bugs ou balanceamento definitivo.
- Os preços atuais da loja começam em 35 moedas; com 30 moedas iniciais, o jogador precisa ganhar moedas antes da primeira compra, como esperado na progressão da masmorra.
