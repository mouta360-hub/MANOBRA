# Manobra — avaliação da estratégia de formação e compras

## Mudanças
- `tests/campaign_strategy.js`: seleção de até seis peças especiais com alvo de 2 defensivas, 3 ofensivas e 1 suporte, preenchendo vagas com peças mais evoluídas.
- Planejamento de compras com orçamento real: procura primeiro formar uma equipe útil, depois aprimorar peças selecionadas, sem ultrapassar o limite de Maestria III.
- `tests/campaign_real_combat.test.js`: aplica a estratégia na loja e no início de cada combate; registra equipes variadas, compras e aprimoramentos.
- `tests/campaign_strategy.test.js`: cobre composição, limite de seis, prioridades de compra, aprimoramento e ausência de dinheiro.

## Bateria de 12 campanhas
- 38 combates: 26 vitórias reais, 12 derrotas reais, 0 inconclusivos.
- Mapa 1: 36 combates, 26 vitórias; mapa 2: 2 combates, 0 vitórias; mapa 3: nenhum.
- 3 visitas às lojas, 7 compras, 1 aprimoramento, 0 peças Maestria III.
- 25 implantações de peças especiais do jogador e 73 do adversário.
- 3 combates com conjunto de pelo menos três peças e duas categorias diferentes.
- 0 campanhas completas.

## Limitações
A IA de simulação não representa o desempenho de um jogador humano e não usa todas as escolhas de habilidades. A baixa frequência de lojas visitadas e o baixo nível de Maestria impedem afirmar que a campanha esteja equilibrada. As mudanças desta etapa são no simulador e **não** alteram as regras do jogo ou a IA usada pelo jogador.

## Testes automatizados
Passaram: motor (12), combate das 30 peças, limites das habilidades, Maestria, escala de dificuldade do mapa 2, economia e progressão com resultados simulados, recompensa dos chefões e testes novos de estratégia.
