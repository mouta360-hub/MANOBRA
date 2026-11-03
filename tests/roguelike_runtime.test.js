const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const engine = require('../www/engine.js');
const listeners = {};
const ctx = { console, setInterval(){}, window: {ManobraEngine:engine, addEventListener(n,fn){listeners[n]=fn}, RoguelikeRun:{active:true,deployed:{},enemyDeployed:{},abilityState:{}}}, document:{querySelectorAll(){return []}} };
ctx.window.window=ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('www/special_pieces.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('www/roguelike_runtime.js','utf8'),ctx);
const game = new engine.Game();
const legal = game.legal();
assert.ok(Array.isArray(legal.moves),'legal() deve retornar lista de jogadas');
assert.ok(legal.moves.every(m=>m.to<0 || engine.isDarkCell(m.to)),'somente casas válidas');
assert.equal(ctx.window.RoguelikeRuntime.beforeMove(game,{t:'m',from:0,to:14}),false, 'lance ilegal deve ser recusado');
console.log('ok - runtime roguelike integrado ao motor');
const catalog = vm.runInContext('SPECIAL_PIECES_CATALOG',ctx);
const limits = ctx.window.RoguelikeRuntime.abilityLimits;
assert.equal(Object.keys(catalog).length,30,'catálogo de 30 peças');
for (const [key, piece] of Object.entries(catalog)) {
  assert.equal(piece.id,key);
  assert.ok(piece.name && piece.description);
  assert.ok(limits[key] && Number.isInteger(limits[key].uses) && limits[key].uses > 0);
  assert.ok(Number.isInteger(limits[key].cooldown) && limits[key].cooldown >= 0);
}
assert.equal(ctx.window.RoguelikeRuntime.beforeMove(game,{t:'k',from:0,to:0}),false);
console.log('ok - catálogo, limites e 30 habilidades verificados estruturalmente');
