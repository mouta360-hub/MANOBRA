# Ajuste de dificuldade — mapa 2

A quantidade de peças especiais da IA foi reduzida apenas no segundo mapa:

- Combate comum ou elite: 1 especial no andar 1; 2 nos andares 4–6; 3 nos andares 7–8 (máximo 4 conforme a fórmula).
- Chefão do mapa 2: 5 peças especiais (antes 6).
- Mapas 1 e 3: nenhuma alteração.

As habilidades dos chefões, as regras de movimento e as compras do jogador não foram modificadas.

Teste de regressão: `node tests/map2_balance.test.js`.

Esta é uma alteração pontual de balanceamento. Não comprova que uma campanha completa possa ser vencida: ainda é necessário repetir simulações longas com compras e habilidades ativáveis.
