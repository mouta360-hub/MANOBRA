# Gerar AppImage no CachyOS

Abra um terminal na pasta MANOBRA-main e execute:

```bash
chmod +x GERAR-APPIMAGE-CACHYOS.sh
./GERAR-APPIMAGE-CACHYOS.sh
```

É necessário ter Node.js e npm instalados e acesso à internet na primeira compilação. Se faltar npm: `sudo pacman -S nodejs npm`.

O arquivo final ficará em `desktop/dist/`. Para executar: `chmod +x desktop/dist/*.AppImage` e `./desktop/dist/*.AppImage`.

Este pacote foi preparado, mas a compilação AppImage precisa ser realizada e testada no Linux.
