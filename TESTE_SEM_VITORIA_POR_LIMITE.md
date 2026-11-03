# Simulação de campanha — sem vitória por limite de jogadas

O teste `tests/campaign_real_combat.test.js` não usa mais `E.adjudicate` quando alcança um limite de lances.

- Vitória/derrota: somente resultado devolvido pelo motor do jogo.
- Repetição da mesma posição, turno e estado relevante das habilidades 3 vezes: **empate**, sem sorteio.
- Limite de segurança de 2400 meios-lances por batalha: **inconclusivo**, nunca vitória. Pode ser ajustado com `CAMPAIGN_SAFETY_PLIES`.
- `CAMPAIGN_REPEAT` ajusta o número de repetições.
- Empate ou inconclusivo interrompe a campanha de teste; não conta como campanha vencida.
- A regra de vitória por limite no motor (`E.adjudicate`) não foi alterada; a alteração solicitada vale para o simulador de campanha.

Exemplo de teste rápido: `CAMPAIGN_RUNS=2 CAMPAIGN_SAFETY_PLIES=350 CAMPAIGN_SEARCH_MS=3 node tests/campaign_real_combat.test.js`.

Nesse teste rápido: 12 combates, 10 vitórias reais, 2 empates por repetição, nenhuma campanha concluída. Isso não comprova equilíbrio de campanha completa; habilidades de ativação manual ainda não são reproduzidas pelo simulador.
