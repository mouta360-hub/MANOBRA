# Correção: Novo jogo após derrota no Roguelike

- Após derrota, o botão da tela final agora mostra **Nova aventura · escolher comandante**.
- Esse botão volta ao menu e abre diretamente a seleção de comandante; não reinicia uma partida clássica avulsa.
- O estado temporário de preparação, mapa, loja, peças e habilidades é limpo após derrota.
- Começar uma nova aventura ou um jogo clássico limpa o indicador de derrota anterior.
- As regras do motor e a aleatoriedade de inimigos e chefões não foram alteradas.

Testes: sintaxe dos arquivos JS, testes do motor, peças especiais, ouro inicial e regressão defensiva. Teste visual manual ainda recomendado.
