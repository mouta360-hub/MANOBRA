# Atualização visual do tabuleiro

- Moldura inspirada em tabuleiro de fantasia, com contraste aprimorado entre casas.
- Destaque dourado para a peça selecionada, verde para deslocamento, vermelho para captura e âmbar para empurrar/trocar.
- Legenda de movimentos e cabeçalho do campo.
- Ajustes para telas menores, orientação horizontal e redução de animação.
- Sem mudanças nas regras, nas 13 peças, nas habilidades ou no cálculo de movimentos.

## Verificações
- `node --check www/app.js`: aprovado.
- `node tests/engine.test.js`: 12 testes aprovados.
- `node tests/roguelike_runtime.test.js`: aprovado.

Pendente: inspeção visual interativa no navegador em diferentes resoluções.
