# Teste de campanha — regra de looping do Manobra

O motor já continha a regra de desempate de looping em `www/engine.js` (`loopLoser`, `Game.legal`). A alteração desta rodada foi no simulador `tests/campaign_real_combat.test.js`: removido o empate automático após três estados repetidos; agora o simulador respeita os lances legais fornecidos pelo motor.

## Testes

- 6 campanhas, 35 combates: 29 vitórias reais, 2 derrotas reais, 4 inconclusivos por limite técnico de segurança; 0 campanhas concluídas.
- Mapa 1: 29 combates, 28 vitórias. Mapa 2: 6 combates, 1 vitória. Mapa 3: nenhum combate.
- 6 lojas, 6 compras, 22 implantações de peças especiais do jogador, 95 do inimigo; 5 usos de habilidade contabilizados.
- O limite técnico não gera vitória nem derrota. Os 4 inconclusivos foram contados no campo `draws` por compatibilidade com o formato antigo de estatísticas; **não são empates pelas regras do jogo**.
- Motor (12 testes), 30 peças, limites de habilidades, regras defensivas, economia e progressão, comandantes, chefões e geração de mapas passaram.

## Limitações

Não foi possível demonstrar vitória final nem avaliar equilíbrio do mapa 3. O simulador não reproduz todas as habilidades ativadas manualmente nem decisões humanas; a busca de IA é limitada. A regra de looping no motor já existia; a correção foi remover a lógica conflitante no teste. O fallback `forced` do motor, quando não resta alternativa, ainda requer auditoria específica de regras.

Reproduzir: `CAMPAIGN_RUNS=6 CAMPAIGN_SEARCH_MS=8 CAMPAIGN_DEPTH=2 node tests/campaign_real_combat.test.js`.
