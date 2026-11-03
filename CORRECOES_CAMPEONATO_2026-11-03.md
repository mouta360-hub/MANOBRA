# Correções do campeonato — 03/11/2026

- Vitória natural: o juiz continua enviando o resultado, mas a interface aguarda o último movimento retransmitido, sem apagar o tabuleiro antes da animação final.
- Saída voluntária do organizador: envia `tournamentClosed` aos convidados; eles voltam ao menu. Queda inesperada ainda aciona a transferência de juiz.
- Teste de avatar atualizado para o catálogo atual.

## Verificação
- `node tests/tournament.test.js`: aprovado após a correção.
- `node tests/tour.test.js`: aprovado na execução anterior; repetição final não concluída por limite de tempo.
- Os demais testes executados individualmente passaram, exceto a suíte do worker, cuja execução prolongada não foi concluída nesta rodada.
- Ainda é necessária validação visual e individual das 30 habilidades roguelike.
