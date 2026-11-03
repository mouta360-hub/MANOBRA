# Manobra Roguelike — execução e correções

## Como jogar no Linux
Abra `www/index.html` no navegador ou execute `python3 -m http.server 8080 --directory www` nesta pasta e acesse `http://localhost:8080`.

## Verificação
Execute `node tests/roguelike_runtime.test.js` e `node tests/engine.test.js`.

## Correções desta revisão
- Corrigida integração da lista de movimentos especiais com o motor (`legal().moves`).
- Movimentos especiais respeitam casas escuras, ocupação, tipo ataque e necessidade de apoio aliado.
- Corrigida associação de habilidades a peças de cada lado e proteção do Bastião.
- Corrigido contra-ataque do Javali de Ferro ao ser capturado.
- Estado de habilidades passa a ser inicializado mesmo quando o save tem estado parcial.

**Limitações:** a revisão automatizada valida o motor e os módulos, mas não substitui teste visual de cada tela e de todas as 30 habilidades. Algumas habilidades do catálogo ainda podem exigir implementação adicional.
