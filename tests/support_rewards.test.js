'use strict';
// Regressão do Ímã Tático: Campo Magnético é proteção, não recompensa econômica.
// Substitui expectativas de moedas de uma versão antiga do jogo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../www/engine.js');
function scenario() {
  const run = {active:true, gold:0, deployed:{}, enemyDeployed:{}, abilityState:{}};
  const win = {ManobraEngine:E, RoguelikeRun:run, __manobraApp:{humanSide:E.WHITE}, addEventListener(){}};
  const ctx = {window:win, document:{querySelectorAll(){return [];}}, setInterval(){}};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../www/special_pieces.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../www/roguelike_runtime.js'),'utf8'),ctx);
  const attacker = E.idx(4,4), victim = E.idx(3,3), support = E.idx(3,4);
  const board = new Int8Array(E.N);
  board[attacker]=E.WA; board[E.idx(5,5)]=E.WD;
  board[victim]=E.BD; board[support]=E.BD;
  run.enemyDeployed[String(support)]='ima_tatico';
  const game = new E.Game(board);
  const mv = game.cur.moves.find(m=>m.t==='k'&&m.from===attacker&&m.to===victim);
  assert(mv,'o motor deve autorizar a captura antes da proteção');
  return {run,rt:win.RoguelikeRuntime,game,mv,board:Array.from(board),support};
}
{
  const {run,rt,game,mv,board,support}=scenario();
  assert.equal(rt.beforeMove(game,mv),false,'Ímã Tático bloqueia captura do aliado comum');
  assert.equal(run.gold,0,'proteção não concede moedas');
  const id=`${E.BLACK}:${support}:ima_tatico`;
  assert.equal(run.abilityState.charges[id],1,'uma carga consumida');
  assert.equal(run.abilityState.abilityCooldown[id],2,'recarga inicial de dois turnos');
  assert.equal(rt.resolveBlockedMove(game),true,'ataque bloqueado consome turno');
  assert.deepEqual(Array.from(game.st.b),board,'nenhuma peça é removida');
  assert.equal(game.plies,1,'exatamente um turno consumido');
  assert.equal(run.gold,0,'não há recompensa após o bloqueio');
}
{
  const {run,rt,game,mv,support}=scenario();
  const id=`${E.BLACK}:${support}:ima_tatico`;
  run.abilityState.charges={[id]:1};
  run.abilityState.abilityCooldown={[id]:2};
  assert.equal(rt.beforeMove(game,mv),true,'em recarga, o Ímã não bloqueia novamente');
  assert.equal(run.abilityState.charges[id],1,'recarga não gasta carga');
  assert.equal(run.gold,0,'sem moedas durante recarga');
}
{
  const {run,rt,game,mv,support}=scenario();
  const id=`${E.BLACK}:${support}:ima_tatico`;
  run.abilityState.charges={[id]:2};
  assert.equal(rt.beforeMove(game,mv),true,'com duas cargas gastas, não bloqueia');
  assert.equal(run.abilityState.charges[id],2,'limite de usos preservado');
  assert.equal(run.gold,0);
}
{
  const {run,rt,game,mv}=scenario();
  assert.equal(rt.beforeMove(game,{...mv,to:E.idx(1,1)}),false,'jogada ilegal rejeitada');
  assert.equal(rt.resolveBlockedMove(game),false,'jogada ilegal não consome turno');
  assert.equal(Object.keys(run.abilityState.charges||{}).length,0,'jogada ilegal não gasta habilidade');
  assert.equal(run.gold,0);
}
console.log('OK: Ímã Tático protege aliado comum, consome turno/carga, respeita recarga/limite e não gera moedas');
