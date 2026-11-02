# Manobra para Windows

O layout desktop é ativado automaticamente em telas com pelo menos 900 px de largura. O tabuleiro fica grande e centralizado; o placar, contador e controles ficam no painel lateral.

## Testar no navegador

Na pasta do projeto, abra `www/index.html` em uma janela larga do Windows. Para evitar restrições de áudio e recursos online, é melhor usar um servidor local:

```bash
npx http-server www -p 8080
```

Depois abra `http://localhost:8080`.

## Executar como aplicativo desktop

No Windows com Node.js instalado:

```bash
cd desktop
npm install
npm start
```

## Gerar instalador

```bash
cd desktop
npm install
npm run dist
```

Os arquivos `.exe` serão criados em `desktop/dist/`, normalmente com uma versão instalável NSIS e uma versão portátil.
