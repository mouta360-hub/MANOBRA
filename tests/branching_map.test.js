const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync(require('node:path').join(__dirname,'../www/roguelike_adventure.js'),'utf8');
const ctx = {window:{addEventListener:()=>{}},Math,Date,console,document:{getElementById:()=>null},setTimeout:()=>{}};
vm.createContext(ctx);vm.runInContext(src,ctx);
let counts = new Set();
for(let i=0;i<200;i++) {
 const map=ctx.generateRoguelikeMap();
 assert.equal(map.length,8);assert.equal(map[7].length,1);assert.equal(map[7][0].type,'boss');
 assert.ok(map.slice(1,7).some(nodes=>nodes.some(n=>n.type==='shop')), 'shop must appear in an intermediate stage');
 for(let row=0;row<7;row++) {
  const targets=new Set(map[row+1].map(n=>n.id));
  for(const node of map[row]) {assert.ok(node.next.length>=1&&node.next.length<=3);counts.add(node.next.length);for(const id of node.next)assert.ok(targets.has(id));}
  for(const node of map[row+1])assert.ok(map[row].some(n=>n.next.includes(node.id)));
 }
 const run=ctx.window.RoguelikeRun;run.map=map;run.mapRow=-1;assert.ok(map[0].every(n=>ctx.rogueAvailable(n)));
 for(let row=0;row<7;row++) {
  run.mapRow=row;run.mapCol=map[row][0].col;
  for(const n of map[row+1])assert.equal(ctx.rogueAvailable(n),map[row][0].next.includes(n.id));
 }
}
assert.ok(counts.has(1)&&counts.has(2)&&counts.has(3));
console.log('Branching map: 200 maps, reachable paths, 1/2/3 exits, shops and bosses passed');
