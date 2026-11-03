# Correções do Roguelike

- A loja agora lista as 30 peças do catálogo, em vez de apenas quatro.
- Comprar uma peça adiciona corretamente ao `roster`, reduz o ouro uma única vez e já libera a peça para a próxima batalha.
- Peças compradas aparecem como “Adquirida” quando a loja é reaberta e não podem ser compradas novamente.
- O seletor de colocação agora reconhece as casas reais do tabuleiro (`data-i`).
- O posicionamento é salvo em `RoguelikeRun.deployed` e reaparece após a renderização do tabuleiro.
- O novo `roguelike_runtime.js` conecta as peças ao fluxo real de jogadas, mantém indicadores visuais por categoria e executa efeitos de batalha para habilidades como Executor, Alquimista, Lancer, Berserker, Cronomante, Oráculo, Bastião e Guardião Rúnico.
- O Codex usa o catálogo real como fonte de verdade e exibe o efeito de cada peça, mesmo quando a tabela antiga de traduções não possui aquele ID.
- O CSS das peças especiais agora é carregado pelo HTML e o indicador de escudo foi corrigido.

## Validação

- `node --check` passou nos módulos alterados.
- `npm test` passou: motor, Bluetooth, online, campeonatos, temporizador e worker.
