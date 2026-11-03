# Comandantes — progressão de poder

O Novato não tem bônus. Os demais desbloqueiam após 1 a 9 aventuras completas.

- Estrategista: +5 moedas por vitória e +5 adicionais por elite.
- Explorador: +15 moedas em tesouros e +5 em eventos.
- Mercador: 10 moedas de desconto por peça.
- Guardião: +1 uso para habilidades defensivas; +20 moedas por chefão.
- Campista: +1 uso para habilidades defensivas; +25 moedas em descansos.
- Diplomata: +1 uso para habilidades de suporte; +25 moedas em eventos.
- Caçador: +1 uso para habilidades ofensivas; +30 moedas por elite.
- Cartógrafo: +1 uso para todas as habilidades especiais; +25 moedas ao entrar nos atos 2 e 3.
- Artífice Supremo: +2 usos para todas as habilidades especiais, recarga -1 turno (mínimo zero); devolução de 15 moedas na primeira compra de cada mercador.

Os bônus de peças se aplicam somente às peças especiais do jogador; o inimigo não recebe bônus. Nenhum comandante altera movimentos legais, apoio, alternância de turnos ou limite de seis defesas.

## Testes confirmados nesta alteração
- `node commander_progression.test.js`: passou.
- `node shop_access.test.js`: passou.
- `node tests/engine.test.js`: 12 testes passaram.
- `node tests/all_30_combat.test.js`: passou.

A suíte geral foi iniciada, mas excedeu o tempo de execução desta rodada. A validação visual continua pendente.
