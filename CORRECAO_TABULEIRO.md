# Correção do tabuleiro — novembro de 2026

- Ampliação responsiva da grade clássica 13×9, usando a largura disponível no desktop e permitindo rolagem vertical em telas baixas.
- Remoção do isolamento de empilhamento por casa, que podia esconder peças durante deslocamentos.
- Durante a animação, a casa da peça móvel recebe uma camada superior, evitando que passe visualmente por baixo das casas adjacentes.
- Emblemas das peças especiais permanecem no canto superior direito.
- Sem mudanças nas regras do motor.

Testes executados: engine.test.js (12), all_30_combat.test.js, ability_limits_all.test.js e roguelike_runtime.test.js — passaram. A suíte geral não foi concluída nesta execução e o visual ainda precisa de verificação no navegador do usuário.
