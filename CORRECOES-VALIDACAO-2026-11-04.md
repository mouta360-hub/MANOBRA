# Manobra — correções verificadas em 04/11/2026

## Alterações no código
- `www/roguelike_runtime.js`: proteção de Bastião/Titã/Baluarte e suportes passa a funcionar também quando a vítima é uma peça comum, e não apenas uma peça especial. Ímã Tático pode proteger aliados comuns. Adicionado `resolveBlockedMove`: ataques repelidos consomem a vez sem remover peças, mas jogadas ilegais não consomem turno.
- `www/app.js`: integra a resolução de ataques repelidos ao fluxo normal da partida, atualizando turno e interface.
- `tests/commanders.test.js`: corrige a simulação do DOM adicionando `style` ao elemento falso; não altera regras de comandantes.

## Testes desta rodada
Passaram diretamente: `support_rewards`, `commanders`, `judge_failover` (cinco cenários), `all_30_combat`, `ability_limits_all`, `map2_balance`, `boss_stage`.
Na execução em lote de testes curtos, 27 terminaram com sucesso; cinco (`tour_setup_timeout`, `sim_worker`, `move_timer`, `judge_failover`, `online`) excederam 3 segundos nesse procedimento, o que não comprova falha funcional. O teste `judge_failover` já havia mostrado seus cinco cenários aprovados quando executado individualmente.

## Limitações e pendências
- Não há validação de campanha completa vencida nos três mapas.
- O equilíbrio prático do Mapa 2 e do Mapa 3 continua sem demonstração estatística.
- Não foi concluída uma bateria completa de testes longos (campanhas/torneio).
- A versão ainda não deve ser anunciada como livre de erros ou 100% concluída.

## Instalação
Faça backup do repositório antes de substituir arquivos. O ZIP contém os arquivos do projeto na raiz, inclusive `.github` se presente.
