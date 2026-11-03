# Revisão de segurança das habilidades — 03/11/2026

Esta entrega é uma **etapa de estabilização**, não a implementação completa das 30 habilidades.

- Corrigida a identificação de vizinhança diagonal nas casas jogáveis do tabuleiro.
- Impedida a alteração de turno durante a validação de uma jogada pelo Guardião Rúnico.
- Suspensos temporariamente o turno extra do Executor e o empurrão direto do Colosso, que modificavam o estado do motor sem passar pela validação normal.
- Atualizadas as descrições das peças suspensas para não anunciar poderes inexistentes.
- Limpeza do estado de captura pendente quando uma defesa bloqueia a jogada.

## Próximos passos necessários

1. Implementar cada habilidade no motor com ações atômicas validadas (sem editar `game.st.b` ou `game.st.turn` diretamente).
2. Definir custos, recargas e limites por partida, incluindo IA e jogador.
3. Testar cada uma das 30 habilidades individualmente, incluindo movimentos inválidos, derrota, captura e salvamento.
4. Verificar o tabuleiro no navegador e rodar a suíte completa, inclusive testes demorados.

## Verificação desta entrega

`node tests/engine.test.js`: 12 testes passaram.
`node tests/roguelike_runtime.test.js`: passou.
`node --check` nos dois arquivos editados: passou.

Não houve aprovação da suíte completa nesta etapa.
