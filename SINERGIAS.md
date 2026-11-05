> **DOCUMENTO HISTÓRICO — sinergias removidas do jogo em 05/11/2026. Não usar como especificação atual.**

# Sinergias de peças — Manobra Roguelike

Quatro trincas: Falange Tática (Lanceiro, Sentinela, Oráculo), Juramento de Ferro (Escudeiro, Bastião, Sacerdote da Luz), Caçada Coordenada (Assassino das Sombras, Predador, Duelista) e Fúria Disciplinada (Berserker, Cavaleiro Errante, Xamã dos Ventos).

- Dupla: duas peças distintas do conjunto, vivas e próximas (até duas casas para reconhecer a sinergia). Para ativar o efeito, o parceiro deve estar adjacente ao atacante ou ao alvo protegido.
- Trio: três peças distintas do conjunto vivas; parceiro pode estar a até duas casas na ativação.
- Ataque: uma captura já legal pode romper uma proteção reativa, gastando carga do atacante.
- Defesa: um integrante protege outro integrante de uma captura legal, gastando carga do protetor.
- O efeito é recalculado a cada tentativa: a captura de integrantes pode desativar a sinergia.
- As regras do motor não são modificadas. O efeito vale para jogador e inimigos, que continuam recebendo especiais por sorteio.
- As descrições são mostradas nas lojas, preparação e dicas de peças via rogueDescription.

## Verificações
Executar `node tests/synergy_combat.test.js` e os testes de regressão do projeto.
