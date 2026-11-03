# Dez comandantes do modo Aventura

O Novato começa desbloqueado. Cada vitória completa nos três mapas desbloqueia o comandante seguinte. O progresso é guardado no armazenamento local do navegador.

| Comandante | Aventuras concluídas | Benefício |
|---|---:|---|
| Novato | 0 | Nenhum |
| Estrategista | 1 | +5 moedas por vitória em combate |
| Explorador | 2 | +5 moedas por tesouro |
| Mercador | 3 | 5 moedas de desconto por peça da loja |
| Guardião | 4 | +20 moedas por chefão derrotado |
| Campista | 5 | +10 moedas por descanso |
| Diplomata | 6 | +10 moedas por evento |
| Caçador | 7 | +15 moedas por elite derrotada |
| Cartógrafo | 8 | +15 moedas ao entrar no mapa 2 e no mapa 3 |
| Artífice | 9 | Devolve 10 moedas na primeira compra de cada mercador |

Todas as aventuras começam com 30 moedas. Os bônus não alteram o tabuleiro nem as regras de combate. O teste `commanders_10.test.js` verifica quantidade, desbloqueios, desconto e bônus de exploração. Testes existentes de comandantes, motor e limites de habilidades também foram executados.
