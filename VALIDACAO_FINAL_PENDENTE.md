# Manobra Roguelike — entrega de consolidação (não homologada)

## Alterações desta etapa
- Colosso: empurrão legal concede 10 moedas, 1 vez por combate.
- Guardião Rúnico: movimento legal concede 8 moedas, 1 vez por combate.
- Javali de Ferro: captura legal concede 10 moedas, 1 vez por combate, sem contra-ataque que altere o tabuleiro.
- Lancer, Assassino das Sombras, Cavaleiro Errante e Vento Cortante: recompensas de captura legal, sujeitas aos limites existentes.
- Mantido o motor original como única fonte de movimentos legais; não há saltos, paralisia ou turnos extras.
- Incluído teste de regressão `tests/remaining_abilities.test.js` para essas sete habilidades.

## Testes confirmados nesta etapa
- `node tests/engine.test.js`: 12 aprovados.
- `node tests/roguelike_runtime.test.js`: aprovado (teste estrutural).
- `node tests/remaining_abilities.test.js`: 7 cenários aprovados.
- `node --check` nos dois arquivos JavaScript alterados: aprovado.
- Testes adicionais executados anteriormente nesta rodada: ability_limits, ability_limits_all, bluetooth, friends, move_timer, offline_save_awake, online, roguelike_offense, roguelike_swap_capture, setup_timeout, support_rewards e tour_setup_timeout passaram.

## Bloqueios para homologação
- `tour.test.js` não terminou no limite de 18 segundos, embora tenha apresentado resultados intermediários positivos.
- `sim_worker.test.js` e `tournament.test.js` não tiveram execução completa confirmada nesta rodada.
- Faltam testes de interface em navegador real e partidas completas com cada peça.
- A maior parte dos poderes foi adaptada para recompensas econômicas: a diferenciação tática e o balanceamento das 30 peças ainda precisam de validação de jogo.

**Não rotular como versão final homologada até fechar esses critérios.**
