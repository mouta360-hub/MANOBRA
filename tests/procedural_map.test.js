const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync(require('node:path').join(__dirname, '../www/roguelike_adventure.js'), 'utf8');
const ctx = { window: { addEventListener() {} }, Math, Date, console };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const signatures = new Set();
for (let run = 0; run < 300; run++) {
  const map = vm.runInContext('generateRoguelikeMap()', ctx);
  assert.equal(map.length, 8);
  assert.equal(map[7].length, 1);
  assert.equal(map[7][0].type, 'boss');
  assert(map[0].every(n => n.type === 'battle'));
  const types = map.flat().map(n => n.type);
  for (const type of ['shop', 'elite', 'treasure', 'event', 'rest']) assert(types.includes(type), type);
  for (let row = 0; row < 7; row++) {
    const nextIds = new Set(map[row + 1].map(n => n.id));
    for (const node of map[row]) {
      assert(node.next.length >= 1 && node.next.length <= 3);
      assert(node.next.every(id => nextIds.has(id)));
    }
    for (const node of map[row + 1]) assert(map[row].some(n => n.next.includes(node.id)));
  }
  signatures.add(map.map(row => row.map(n => `${n.col}:${n.type}:${n.next.map(id => map[n.row + 1]?.find(x => x.id === id)?.col).join('')}`).join('|')).join('/'));
}
assert(signatures.size > 100, `Pouca variedade: ${signatures.size}`);
console.log(`PASS: 300 mapas válidos, ${signatures.size} configurações distintas`);
