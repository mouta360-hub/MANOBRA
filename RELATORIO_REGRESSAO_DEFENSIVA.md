# Rodada adicional de validação — 03/11/2026

Novo teste `tests/roguelike_defense_regression.test.js`: verifica bloqueio único de Escudeiro e Rebatedor, proteção adjacente por Bastião, Titã de Aço e Baluarte, ausência de proteção da Muralha fora da condição especial e rejeição de captura ilegal sem gastar cargas.

Os testes de motor, habilidades e infraestrutura executados nesta rodada passaram. `tests/sim_worker.test.js` passou. O teste `tests/tour.test.js` passou em execução isolada, mas mostrou variação de duração em nova execução e não deve ser considerado determinístico. A validação visual e de combate real de todas as 30 habilidades permanece pendente.

Esta entrega amplia a cobertura de regressão; não é uma homologação final.
