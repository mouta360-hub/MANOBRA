# Correções da auditoria — 13 × 11, 20 peças

- Atualizado `tests/engine.test.js` para 143 casas, 72 casas jogáveis, 32 casas disponíveis por território (excluindo a casa principal), e 40 peças na formação de ambos os lados.
- Atualizados `tests/roguelike_offense.test.js` e `tests/remaining_abilities.test.js`: as habilidades ofensivas de ruptura de proteção não geram mais moedas. Recompensas econômicas restantes são verificadas nos casos em que existem.
- Corrigido `isBackRow()` em `www/roguelike_runtime.js` para usar a última linha do tabuleiro (`ROWS - 1`), não o valor antigo 8.
- Executados os testes de motor, ofensivas, habilidades restantes, 30 peças, limites, sinergias, defesa, sorteio, Maestria e economia de campanha.

Limites: os testes são automatizados em Node.js; não constituem validação visual no Linux nem garantia de ausência de travamentos em toda situação possível. A integração de economia da campanha simula os resultados dos combates.
