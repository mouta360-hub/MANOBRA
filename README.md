# Manobra 1.0

Jogo de tabuleiro para 2 jogadores (contra a IA, no mesmo celular, entre dois celulares por Bluetooth ou online pela internet), em HTML/JavaScript, empacotado para Android com Capacitor.

## Atualizações desta versão

- A IA usa perfis fictícios com nomes e avatares, como Rafael, Camila, Bruno e Juliana. Eles continuam sendo bots internamente; os nomes não representam usuários reais.
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
  - **Todos contra todos:** cada par joga uma vez. Vitória = 3 pontos. Desempate: confronto direto entre os empatados, depois saldo de peças, depois vitórias.
  - **Mata-mata:** chaveamento sorteado (quem perde está fora). Se não fechar 4 ou 8 jogadores, alguns passam direto na 1ª fase.
- Para jogar, cada um toca em **Jogar** ao lado da partida; quando os dois estiverem prontos ela começa (montagem em segredo, como sempre). Dá para jogar as partidas na ordem que quiserem.
- O celular do organizador é o **juiz**: confere cada jogada com as regras e decide sozinho quem venceu. Ele também joga. Jogada inválida ou fora de hora = derrota por W.O.
- Sair no meio de uma partida, ou cair a internet, dá W.O. ao adversário. O organizador pode **dar a vitória** a um jogador (partida travada) ou mandar **Refazer** uma partida já encerrada (no mata-mata, só se a fase seguinte ainda não começou).
- Se o organizador sair ou ficar sem internet, o campeonato termina para todos (não há servidor guardando nada). Quem cair pode voltar entrando com o mesmo código, desde que não tenha começado outra partida.

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
