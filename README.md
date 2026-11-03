# Manobra 1.0

Jogo de tabuleiro para 2 jogadores (contra a IA, no mesmo celular, entre dois celulares por Bluetooth ou online pela internet), em HTML/JavaScript, empacotado para Android com Capacitor.

## Atualizações desta versão

- A IA usa mais de 6.000 combinações de nomes e sobrenomes fictícios, com 20 avatares. Os perfis são escolhidos aleatoriamente e não se repetem dentro do mesmo campeonato; continuam sendo bots internamente e não representam usuários reais.
- O placar da partida mostra nome, avatar, vez atual, total de peças e a divisão entre ataque e defesa.
- A tela de resultado identifica o vencedor pelo nome e avatar. A classificação do campeonato também mostra os avatares dos participantes.
- O ícone que aparece na área de trabalho do Android é baseado no tabuleiro e nas peças do Manobra. `assets/manobra-icon-base.png` é convertido para todas as densidades, inclusive as pastas `mipmap-*-v4` e o foreground do adaptive icon usados pelo Capacitor, pelo script `tools/make_icons.py`.
- O jogo online continua sendo uma partida entre dois jogadores. Um terceiro amigo não consegue assistir à partida em andamento nesta versão; o app informa isso na tela online.

## Testar rápido
Abra `www/index.html` no navegador do celular (de preferência com o celular deitado) ou do computador. Testes: `npm test` (precisa de Node). No navegador o Bluetooth não aparece; ele só existe no app Android.

## Gerar o APK (grátis, sem instalar nada)
1. Crie uma conta em github.com e um repositório novo (pode ser privado).
2. Envie todos os arquivos desta pasta para o repositório (botão "Add file > Upload files"). A pasta `.github` precisa ir junto.
3. Abra a aba **Actions**, escolha **Gerar APK do Manobra** e clique em **Run workflow**.
4. Quando terminar (uns 5 a 10 minutos), abra a execução e baixe **manobra-apk** em "Artifacts". Dentro do zip está o `app-debug.apk`.
5. Passe o APK para o celular e instale (o Android pede para permitir "instalar apps de fontes desconhecidas").

## Gerar o APK no seu computador (alternativa)
Precisa de Node 22, JDK 21 e Android Studio (SDK).
```
npm install
npx cap add android
python3 tools/patch_android.py android --bluetooth
python3 tools/make_icons.py android/app/src/main/res
npx cap sync android
cd android && ./gradlew assembleDebug
```
O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Jogar por Bluetooth (dois celulares com o app instalado)
1. Ligue o Bluetooth nos dois e **pareie** um com o outro em Configurações > Bluetooth (só na primeira vez).
2. Celular A: **Jogar por Bluetooth > Criar partida**. Ele joga de Brancas e espera.
3. Celular B: **Jogar por Bluetooth > Entrar numa partida** e escolher o celular A na lista. Joga de Pretas.
4. Cada um monta as próprias peças em segredo; o jogo começa quando os dois tocarem em **Pronto**.
5. As jogadas são enviadas pelo Bluetooth e os dois tabuleiros ficam sempre iguais. Ao sair, o outro volta ao menu.

Se o módulo de Bluetooth não compilar no GitHub, o workflow gera o APK sem ele (o resto funciona) e guarda o relatório de erro em **manobra-bluetooth-erro**. O resumo da execução diz qual dos dois saiu.

## Jogar online (pela internet)
1. Os dois celulares precisam de internet (Wi-Fi ou dados).
2. Celular A: **Jogar online > Criar partida**. Aparece um código de 4 letras. Ele joga de Brancas.
3. Celular B: **Jogar online**, digita o código e toca em **Entrar**. Joga de Pretas.
4. Montagem em segredo e jogadas sincronizadas, igual ao Bluetooth.

Como funciona: usa a biblioteca gratuita PeerJS, que só ajuda um celular a achar o outro; as jogadas passam direto entre os aparelhos. A biblioteca é baixada na hora de jogar (precisa de internet). Em algumas redes (certos planos de celular, Wi-Fi de empresa) a conexão direta pode não se formar; o app avisa e a saída é trocar de rede. O serviço gratuito não tem garantia de funcionamento 24h.
Também funciona no navegador (abra o `Manobra.html` nos dois celulares).

## Perfil, avatar, amigos e convites
- No topo do menu: escolha seu **avatar** (20 opções) e o **apelido**. Os amigos veem o seu avatar na lista, no convite e no campeonato.
- Cada celular tem um **código pessoal** de 6 caracteres, fixo, salvo no aparelho (com apelido, avatar e amigos). Se o app for desinstalado, tudo se perde.
- Menu > **Amigos e convites**: adicione o amigo pelo código dele.
- **Status dos amigos** (atualiza sozinho a cada ~20 s com a tela Amigos aberta): 🟢 Online, 🟠 Em partida, 🟣 Em campeonato, ⚪ Offline. Quando um amigo volta a ficar online aparece um aviso.
- **Chamar:** toque em *Chamar* ao lado do amigo. Ele recebe o aviso **em qualquer tela do app** (menu, regras, campeonato...) e aceita ou recusa. Quem chama joga de Brancas; quem aceita, de Pretas.
- Quem está **em partida ou em campeonato** não é interrompido: o convite é recusado como "ocupado" e ele só recebe um aviso discreto.
- O app fica "online" sozinho assim que é aberto. Em *Amigos* dá para escolher **Invisível**: aí os amigos veem você offline e não conseguem te chamar.
- Limites: o app precisa estar **aberto** (não há aviso com o app fechado — isso exigiria contas e um servidor próprio); qualquer pessoa que souber o seu código pode ver seu status e chamar você, mas nada acontece sem você aceitar.

## Girar a tela
O app gira nos dois sentidos (retrato e paisagem, seguindo o sensor do celular). No tabuleiro, em paisagem o painel fica ao lado, aproveitando a tela toda.

## Campeonato (1 a 8 jogadores, pela internet)
- Menu > **Campeonato**. Um jogador toca em **Criar campeonato** e recebe um código de 4 letras; os outros tocam em **Entrar com código**.
- **Jogando sozinho:** o organizador pode tocar em **+ Adicionar robô** (até completar 8) e escolher o nível (fácil/médio/difícil). Se iniciar sem ninguém, entra 1 robô automaticamente. Partidas entre dois robôs são decididas por sorteio.
- O organizador escolhe o formato e toca em **Iniciar**:
  - **Todos contra todos:** cada par joga uma vez. Vitória = 3 pontos. O **saldo de peças** soma, em cada partida, as peças que o jogador vencedor tinha a mais que o adversário; numa derrota, a diferença entra negativa. Desempate: confronto direto entre os empatados, depois saldo de peças, depois vitórias.
  - **Mata-mata:** chaveamento sorteado (quem perde está fora). Se não fechar 4 ou 8 jogadores, alguns passam direto na 1ª fase.
- Para jogar, cada um toca em **Jogar** na partida da rodada atual; não é possível escolher uma rodada futura. Quando os dois estiverem prontos ela começa (montagem em segredo, como sempre). Depois que todas as partidas da rodada terminarem, a próxima é liberada.
- Quando uma partida da rodada chega à vez, cada jogador tem 2 minutos para tocar em **Jogar**. Quem não entrar nesse prazo perde por W.O. Depois de entrar, cada jogador tem mais 2 minutos para terminar a montagem; quando o tempo acaba, o juiz mantém as peças já colocadas, sorteia as que faltam e a partida começa normalmente — sem W.O. nem derrota.
- A tela mostra contadores regressivos separados: o tempo de **Você** e o tempo do **Adversário**, primeiro para entrar e depois para concluir a montagem. Quando um jogador termina, aparece como pronto enquanto o relógio do outro continua visível.
- Partidas entre dois robôs não são mais decididas por sorteio: os dois jogam lance a lance pelo mesmo motor do jogo, **uma partida por vez**, em segundo plano. A simulação não exibe o tabuleiro nem atrapalha quem está jogando uma partida humana. Quando uma termina, a próxima começa automaticamente. A contagem final de peças e o saldo são preservados normalmente.
- O celular do organizador é o **juiz**: confere cada jogada com as regras e decide sozinho quem venceu. Ele também joga. Jogada inválida ou fora de hora = derrota por W.O.
- Sair no meio de uma partida, não aparecer na partida atual ou cair a internet dá W.O. automático ao adversário. O resultado não pode ser alterado e a partida não pode ser refeita manualmente.
- Se o organizador sair ou ficar sem internet, o campeonato termina para todos (não há servidor guardando nada). Quem cair pode voltar entrando com o mesmo código, desde que não tenha começado outra partida.

## Desempenho do juiz (partidas entre robôs)
- As partidas **robô contra robô** rodam num **Web Worker** (`www/engine-worker.js`), fora da tela principal: o celular do organizador não trava e a rodada anda rápido (num campeonato de 8 jogadores com 7 robôs, as 21 partidas entre robôs terminam em poucos segundos; a tela principal nunca parou mais que alguns milissegundos).
- Se o Worker não existir ou falhar (ou ficar mudo por 15 s), o juiz continua sozinho na tela principal, em fatias curtas com pausa (mais lento, mas sem travar).
- Cada lance simulado usa busca curta (15 ms). Se uma partida entre robôs passar de **240 lances** sem acabar (robôs difíceis repetindo lances para sempre), ela é decidida por quem tem mais peças (depois mais peças em ataque; empate total, sorteio). Antes, essas partidas podiam não terminar nunca e a rodada ficava parada.
- O robô que joga contra uma pessoa pensa no máximo 0,9 s por lance. O botão **Pular** da simulação termina a partida sem congelar a tela.
- Ao voltar do segundo plano (ou de outro app), a tela e os contadores se atualizam na hora.

## Tempo por jogada (1 min 30 s)
- Cada jogada humana tem no máximo **1 minuto e 30 segundos**. O contador (⏱) aparece no placar, fica vermelho nos últimos 10 s e **zera a cada jogada**, valendo para os dois jogadores.
- Quando o tempo acaba, o jogador **perde a vez**: o tabuleiro não muda e a vez passa para o adversário (sem derrota e sem W.O.). O relógio recomeça para o outro.
- Não há relógio na vez do robô.
- **Campeonato:** quem tira a vez é o juiz (organizador), mesmo que o celular de quem demorou esteja travado ou sem sinal; os dois celulares recebem o aviso e continuam iguais. Em partidas sem juiz (contra a IA, mesmo celular, Bluetooth, online) o celular de quem está na vez faz isso e avisa o outro.

## Campeonato offline, salvar e tela acesa
- **Sem internet:** em *Campeonato > Criar campeonato*, o app cria um campeonato offline (só contra robôs). Não precisa de código nem de Wi-Fi.
- **Salvar quando quiser:** em campeonatos só com robôs há o botão **Salvar campeonato neste celular** (na tela do campeonato) e **💾 Salvar** (durante a partida). Nada é salvo sozinho. Para continuar depois: *Campeonato > Continuar campeonato salvo* (volta direto para a partida, no mesmo lance).
- **Tela sempre acesa:** na montagem, na partida e na tela do campeonato o celular não apaga a tela. Ao voltar ao menu, ele volta ao comportamento normal. No Android isso usa o plugin `native/ManobraScreenPlugin.java`, instalado por `tools/patch_android.py`.

## Sons
Os sons são criados pelo próprio app (nada para baixar): mover, eliminar, empurrar, trocar de lugar, virar de modo, eliminar defesa, vitória e derrota. Dá para ligar/desligar no menu ou no botão Som durante a partida.

## Para publicar na Play Store
O APK "debug" serve para instalar e testar. Para a loja é preciso gerar um app assinado (AAB) no Android Studio. Troque também o `appId` em `capacitor.config.json` (`com.manobra.game`) por um seu.

## Interpretações das regras usadas
- Brancas ficam embaixo e começam. Terreno das brancas: linhas 6 a 9; das pretas: linhas 1 a 4. A linha vermelha só aparece na montagem.
- Modo ataque se move/elimina/vira defesa só com peça amiga na diagonal ao lado, checado antes do lance.
- Defesa empurra o inimigo uma casa na mesma direção (se a casa de trás estiver livre) ou troca de lugar com ele. Nenhuma peça deslocada vai parar numa casa principal.
- Sétima peça em defesa: o adversário pode gastar a jogada eliminando uma defesa do infrator.
- Objetivo 1: todas as peças de ataque do oponente sem nenhuma peça amiga ao lado e o oponente sem peças de defesa para reconectá-las.
- Quem fica sem movimentos possíveis perde.
- Efeito looping: posição repetida pela 3ª vez; quem perde o desempate (menos peças, mais peças em ataque, dono do terreno do lance) é proibido de repetir.
