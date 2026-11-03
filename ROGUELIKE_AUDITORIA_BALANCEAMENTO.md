# Auditoria de balanceamento das peças especiais

## Resultado geral

As 30 peças estão divididas em 10 tanques, 10 atacantes e 10 suportes. Porém, o catálogo descreve mais efeitos do que o runtime realmente executa. Portanto, no estado atual, o jogo **ainda não está equilibrado**: algumas peças alteram a partida e várias outras funcionam apenas como símbolo, descrição ou mensagem visual.

## Efeitos atualmente executados pelo runtime

- **Executor**: captura concede movimento bônus. É o efeito mais forte atualmente e precisa de limite por turno ou recarga.
- **Alquimista**: captura concede +50 moedas. O valor é alto em relação às recompensas normais de combate. Além disso, quando usado pelo inimigo, o código atual também pode aumentar o ouro do jogador; isso precisa ser separado por lado.
- **Lancer, Berserker, Cronomante, Oráculo, Mestre de Manobras**: exibem feedback, mas não alteram completamente as regras descritas.
- **Sentinela**: anuncia proteção, mas ainda não bloqueia de fato o movimento.
- **Guardião Rúnico e Bastião**: exibem a mensagem da habilidade, mas não aplicam paralisia/imunidade real.

## Habilidades do catálogo ainda sem implementação completa

Escudeiro, Colosso, Muralha, Javali de Ferro, Rebatedor, Titã de Aço, Baluarte, Assassino das Sombras, Cavaleiro Errante, Ceifador, Predador, Duelista, Vento Cortante, Caçador de Cabeças, Ilusionista, Teleportador, Ímã Tático, Xamã dos Ventos, Manipulador e Sacerdote da Luz ainda precisam de regras executáveis, validação de casas, custo ou recarga.

## Riscos de balanceamento

1. **Movimento bônus** pode criar uma sequência de capturas e decidir uma partida sozinho.
2. **+50 moedas por captura** pode pagar várias peças raras sem risco.
3. **Imunidade, redirecionamento e escudo** precisam de limite claro para não tornar uma peça impossível de eliminar.
4. **Teleporte, puxão e empurrão em área** precisam de restrição de distância, casas válidas e recarga.
5. **Habilidades inimigas** devem usar o mesmo limite das habilidades do jogador. O inimigo não pode receber versões mais fortes escondidas.
6. **Os adversários especiais são exibidos**, mas a IA ainda não escolhe ativamente todas as habilidades do catálogo.

## Proposta de balanceamento

### Comum — preço 35

Efeitos pequenos e previsíveis: +1 alcance condicionado, uma proteção de um turno, uma troca curta ou uma informação limitada. Recarga de 2 a 4 turnos.

### Rara — preço 60

Efeitos fortes, mas com condição: escudo de uma captura, movimento especial limitado, empurrão de uma casa ou bônus econômico de +15 a +20 moedas. Uma ativação por 3 turnos.

### Épica — preço 90

Efeitos que mudam uma jogada: movimento bônus, teleporte, puxão, cópia ou imunidade parcial. Sempre com recarga de 4 a 6 turnos, uma ativação por turno e sem encadeamento infinito.

## Ajustes recomendados antes de liberar como versão definitiva

- Trocar o bônus do Alquimista de **+50** para **+20 moedas**, uma vez por turno.
- Limitar o Executor a **um movimento bônus por turno**, sem outro bônus em cadeia.
- Fazer Escudeiro, Sentinela, Bastião e Javali funcionarem no motor antes de comparar seus preços.
- Implementar recargas para todas as habilidades ativas.
- Aplicar o mesmo runtime para jogador e IA, mas contabilizar recompensas separadamente.
- Criar testes individuais para cada habilidade: ativação, recarga, bloqueio, captura, movimento inválido e reset após derrota.

## Conclusão

A estrutura visual, raridade e preço já existem, mas o equilíbrio só pode ser considerado pronto depois que as 30 habilidades tiverem efeitos reais, limites e testes. A próxima etapa segura é implementar as habilidades por grupos — tanques, atacantes e suportes — e testar cada grupo contra a formação normal antes de liberar todas juntas.
