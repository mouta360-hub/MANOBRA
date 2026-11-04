'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../www/engine.js');
function setup(defender, support) {
  const run = {active:true, deployed:{}, enemyDeployed:{24:defender}, abilityState:{}};
  if (support) run.enemyDeployed[38] = support;
  const window = {ManobraEngine:E, RoguelikeRun:run, __manobraApp:{humanSide:E.WHITE}, addEventListener(){}};
  const context = {window, document:{querySelectorAll(){return []}}, setInterval(){}};
  vm.createContext(context);
  for (const name of ['special_pieces.js','roguelike_runtime.js']) vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../www',name),'utf8'), context);
  const board = new Int8Array(E.N); board[10]=E.WA; board[22]=E.WD; board[24]=E.BD; if (support) board[38]=E.BD;
  const game = new E.Game(board);
  const move = {t:'k',from:10,to:24};
  assert(game.legal().moves.some(m=>m.t===move.t && m.from===move.from && m.to===move.to));
  return {rt:window.RoguelikeRuntime,game,move,run};
}
for (const [defender,support] of [['escudeiro',null],['rebatedor',null],['alquimista','bastiao']]) {
  const {rt,game,move} = setup(defender,support);
  assert.equal(rt.beforeMove(game,move),false,defender+' blocks');
  assert.equal(rt.takeBlockedTurn(),true,'blocked move must consume turn');
  assert.equal(rt.takeBlockedTurn(),false,'turn must be consumed only once');
  const original=Array.from(game.st.b);
  const side=game.st.turn;
  game.pass(); rt.onBlockedTurn(side);
  assert.equal(game.st.turn,side^1);
  assert.equal(game.plies,1);
  assert.deepEqual(Array.from(game.st.b),original,'pieces must not move');
  game.pass();
  assert.equal(rt.beforeMove(game,move),true,'protection consumed, next attempt is allowed');
  assert.equal(rt.takeBlockedTurn(),false);
}
{
 const {rt,game}=setup('escudeiro',null);
 assert.equal(rt.beforeMove(game,{t:'k',from:10,to:38}),false);
 assert.equal(rt.takeBlockedTurn(),false,'illegal move must not consume turn');
}
console.log('ok - proteções bloqueiam a captura e consomem somente uma vez o turno; lances ilegais não');
