const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const catalog = require('../www/special_pieces.js').SPECIAL_PIECES_CATALOG;
const runtime = fs.readFileSync(path.join(root, 'www/roguelike_runtime.js'), 'utf8');
const match = runtime.match(/const ABILITY_LIMITS = Object\.freeze\((\{[\s\S]*?\})\);/);
assert.ok(match, 'Tabela de limites encontrada');
const limits = vm.runInNewContext('(' + match[1] + ')');
const names = Object.keys(catalog);
assert.equal(names.length, 30);
assert.deepEqual(Object.keys(limits).sort(), names.sort(), '30 peças têm limites definidos');
for (const [name, rule] of Object.entries(limits)) {
  assert.ok(Number.isInteger(rule.uses) && rule.uses >= 1 && rule.uses <= 3, name + ' usos');
  assert.ok(Number.isInteger(rule.cooldown) && rule.cooldown >= 0 && rule.cooldown <= 3, name + ' recarga');
  if (rule.uses === 1) assert.equal(rule.cooldown, 0, name + ' uso único');
}
// A persistência de cargas e recargas é verificada por simulação em roguelike_swap_capture.test.js.
assert.ok(runtime.includes('function afterMove('), 'transferência processada após a jogada');
console.log('ok - limites de todas as 30 peças, faixas e persistência ao mover');
