# Simulador: oportunidades de habilidades

O runtime atual aciona os poderes especiais por eventos de jogadas legais (captura, troca, empurrão, movimento e bloqueio defensivo), não por um comando manual universal. O simulador agora detecta essas oportunidades e prioriza ocasionalmente uma jogada legal que ative a habilidade, sem ignorar o motor de regras. Foram adicionados contadores `abilityOpportunities`, `abilityPreferredMoves` e `abilityEffectsObserved`.

Teste exploratório: 3 campanhas, 3 combates, 0 vitórias, 3 derrotas; nenhum jogador chegou à loja, portanto 0 oportunidades ofensivas/de suporte. O inimigo acionou uma proteção. Esse teste **não** comprova o equilíbrio dos mapas 2 e 3. É necessário aumentar a qualidade da IA e testar partidas completas antes de afirmar que o jogo é vencível.
