# Auditoria de testes — 03/11/2026

Executados individualmente 18 arquivos de testes. 17 encerraram com código 0; `tests/tournament.test.js` imprimiu aprovação dos 15 casos de campeonato e dos testes de robôs, mas o processo permaneceu aberto além de 45 segundos, portanto não foi contabilizado como execução encerrada.

Aprovados: ability_limits, ability_limits_all, bluetooth, engine (12 casos), friends, move_timer, offline_save_awake, online, remaining_abilities, roguelike_offense, roguelike_runtime, roguelike_swap_capture, setup_timeout, sim_worker, support_rewards, tour, tour_setup_timeout.

Correção desta rodada: descrição do Titã de Aço alinhada à proteção adjacente já existente no runtime, evitando informar falsamente que não possui habilidade.

Limitações: os testes das 30 peças incluem verificações estruturais e recompensas, não 30 simulações individuais ponta a ponta com interface. A suíte não está 100% verde devido à execução persistente do teste de campeonato. Não declarar homologação final.
