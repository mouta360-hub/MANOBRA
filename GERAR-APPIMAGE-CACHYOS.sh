#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js e npm não encontrados. No CachyOS instale com: sudo pacman -S nodejs npm"
  exit 1
fi
cd desktop
npm install
npm run dist:linux
printf '\nAppImage gerado em: %s\n' "$(pwd)/dist"
ls -lh dist/*.AppImage
