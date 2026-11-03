# Inimigos e chefões com exércitos imprevisíveis

## Alterações
- Cada batalha sorteia, sem repetição, suas peças especiais entre as 30 disponíveis. Não exclui peças iguais às usadas pelo jogador.
- Chefões conservam seu comandante/habilidade exclusiva, mas sua equipe não é mais ordenada por preço/raridade: também é sorteada.
- As peças especiais inimigas são distribuídas aleatoriamente entre as 13 posições ocupadas pelo inimigo no início do combate, em vez de ocupar sempre as primeiras posições.
- As quantidades de especiais por ato e tipo de encontro foram preservadas.
- O simulador de campanhas usa a mesma função de distribuição aleatória do jogo.

## Testes executados
- 360 sorteios de equipes e implantações, 60 para cada combinação de 3 atos × batalha normal/chefão: variabilidade confirmada em todos os grupos.
- 6 campanhas de IA, 16 combates reais: 10 vitórias, 6 derrotas, 0 campanhas concluídas; 16 composições distintas e 16 distribuições distintas de especiais inimigas. Todos os 16 combates ocorreram no ato 1.
- Passaram os testes de motor (12), 30 especiais, limites, recompensas de chefão, Maestria, defesa e estratégia de compras.

## Limitações
- Não demonstra que um humano consiga ou não concluir os três atos; IA de teste é limitada.
- O teste de variabilidade não é prova de equilíbrio de todas as combinações possíveis.
- As posições iniciais de peças comuns continuam determinadas pela rotina de formação do motor/IA; esta alteração randomiza a associação das peças especiais às posições inimigas.
