# Campanha automatizada com peças especiais — diagnóstico

Execução: `CAMPAIGN_RUNS=8 CAMPAIGN_PLIES=120 node tests/campaign_real_combat.test.js`.

- 8 tentativas de campanha; 20 batalhas com jogadas reais do motor; 12 vitórias e 8 derrotas; 0 campanhas completas.
- 4 compras reais nas lojas; 8 implantações de peças especiais do jogador; 40 implantações de peças especiais inimigas.
- 1 uso de habilidade registrado; 0 bloqueios defensivos contabilizados separadamente.
- Todas as tentativas terminaram no ato 1.

## O que esta versão integra

As peças adquiridas nas lojas são incluídas no time ativo e posicionadas nas casas ocupadas no início da batalha. A equipe especial adversária também é posicionada. Cada lance passa por `RoguelikeRuntime.beforeMove` e `RoguelikeRuntime.afterMove`, permitindo efeitos automáticos e atualização de posições, recargas e cargas.

## Limitações

O simulador usa um time ativo escolhido por heurística (até seis peças), não os cliques de um jogador. Não aciona todas as habilidades que exigem uma ação manual específica; os efeitos que dependem de ações do jogador permanecem insuficientemente cobertos. A IA usa busca curta e os combates são encerrados após 120 jogadas, com adjudicação do motor. As estatísticas não constituem uma taxa de vitória humana ou prova de equilíbrio dos 27 chefões. O simulador não alcançou o segundo ato nesta amostra. Não houve alterações de balanceamento sem dados suficientes.
