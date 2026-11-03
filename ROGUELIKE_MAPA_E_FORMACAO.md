# Roguelike: mapa e formação

Esta versão adiciona:

- Três mapas/atos em sequência.
- Oito níveis por mapa, com três caminhos possíveis por nível.
- Nós de combate, elite, loja, evento, tesouro e descanso.
- Caminhos disponíveis destacados e escolhas anteriores marcadas.
- Economia de moedas com recompensas de combate, elite, tesouro e eventos.
- Raridades Comum, Rara e Épica com preços diferentes.
- Loja completa com as 30 peças especiais.
- Peças compradas entram automaticamente no quartel e no conjunto inicial.
- Tela de formação antes de cada combate.
- Barra de peças no início da partida para selecionar e colocar as peças em casas do tabuleiro.
- O conjunto pode ser alterado antes de iniciar a partida.

Validação realizada:

- `node --check` nos módulos modificados.
- `npm test` completo aprovado.
- Smoke test HTTP dos arquivos do jogo aprovado.
