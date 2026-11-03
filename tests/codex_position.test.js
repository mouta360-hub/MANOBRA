const assert = require('node:assert/strict');
const fs = require('node:fs');
const src = fs.readFileSync('www/roguelike_ui.js','utf8');
assert.match(src, /querySelector\('\.layout \.side \.bar'\)/);
assert.match(src, /controls\.appendChild\(holder\)/);
assert.doesNotMatch(src, /appDiv\.prepend\(menuBar\)/);
console.log('PASS: Codex fica junto aos controles e nao acima do tabuleiro');
