const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('www/app.js','utf8');
const ui = fs.readFileSync('www/roguelike_ui.js','utf8');
const catalog = fs.readFileSync('www/special_pieces.js','utf8');
test('IA e Aventura não iniciam relógio humano', () => {
  assert.match(app, /app\.mode !== 'ai' &&/);
  assert.match(app, /app\.moveDeadline = humanToMove \? Date\.now\(\) \+ moveMs\(\) : 0/);
});
test('Codex contém exemplo de combate para todas as 30 peças reais', () => {
  const ctx = {window: {addEventListener() {}}, document: {}};
  vm.createContext(ctx);
  vm.runInContext(catalog + '\n' + ui + '\n;globalThis.check = Object.keys(SPECIAL_PIECES_CATALOG).map(k => [k, codexCombatExample(k), SPECIAL_PIECES_CATALOG[k].description]);', ctx);
  assert.equal(ctx.check.length, 30);
  for (const [key, example, description] of ctx.check) {
    assert.ok(example.length > 45, key);
    assert.ok(description, key);
  }
  assert.doesNotMatch(ui, /const SPECIAL_PIECES_PT_BR/);
});
