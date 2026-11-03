# Investigação da campanha — 03/11/2026

## Correção do simulador
O teste `tests/campaign_real_combat.test.js` agora registra `abortedCampaigns` separadamente quando o combate atinge o limite técnico de segurança. A execução inconclusiva não chama `onRoguelikeDefeat()` e não é contabilizada como derrota real. A consistência estatística inclui os combates inconclusivos.

## Amostra executada
Comando: `CAMPAIGN_RUNS=6 CAMPAIGN_SAFETY_PLIES=650 CAMPAIGN_DEPTH=2 CAMPAIGN_SEARCH_MS=8 node tests/campaign_real_combat.test.js`.

- 6 campanhas, 20 combates, 14 vitórias e 6 derrotas reais.
- Mapa 1: 18 combates, 14 vitórias; mapa 2: 2 combates, 0 vitórias; mapa 3: não alcançado.
- 3 lojas, 3 compras, 3 aprimoramentos; nenhuma Maestria III.
- 350 oportunidades de habilidade avaliadas; 10 jogadas de habilidade priorizadas, 21 efeitos observados.
- 0 campanhas concluídas. 0 inconclusivos nesta amostra.

## Diagnóstico
As peças especiais inimigas foram implantadas 45 vezes, contra 9 do jogador nesta amostra. Esse desequilíbrio de acesso e o uso incompleto da estratégia são hipóteses a investigar; a amostra não prova que o jogo é impossível nem que o mapa 2 precisa ser novamente enfraquecido.

## Testes adicionais aprovados
Motor (12 testes), 30 peças, limites de habilidades, distribuição de peças no mapa 2, regras defensivas e avaliação de Maestria.

## Limitações
A IA do simulador não reproduz todas as decisões de um humano; as formações usam preset fixo; as campanhas não alcançaram o mapa 3. Não há validação de vitória final nem de equilíbrio estatístico.
