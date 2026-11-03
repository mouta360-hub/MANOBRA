# Etapa: suportes e magia

Nove habilidades foram adaptadas para recompensas em moedas após ações **já legais** no motor. Nenhuma cria turnos, peças ou movimentos novos.

| Peça | Gatilho | Moedas | Usos | Recarga (turnos próprios) |
|---|---|---:|---:|---:|
| Cronomante | Movimento normal | 5 | 1 | 0 |
| Ilusionista | Troca | 6 | 2 | 3 |
| Teleportador | Troca | 8 | 2 | 3 |
| Ímã Tático | Empurrão | 7 | 2 | 2 |
| Xamã dos Ventos | Empurrão | 12 | 1 | 0 |
| Manipulador | Troca | 12 | 1 | 0 |
| Oráculo | Movimento normal | 4 | 2 | 3 |
| Sacerdote da Luz | Movimento normal | 6 | 2 | 3 |
| Mestre de Manobras | Captura efetiva | 15 | 1 | 0 |

O Alquimista já tinha bônus de captura e foi mantido. As habilidades ainda precisam de validação visual no navegador e de partidas completas.

Testes: `node tests/engine.test.js`, `node tests/roguelike_runtime.test.js`, `node tests/support_rewards.test.js`.
