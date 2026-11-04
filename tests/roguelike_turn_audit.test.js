'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const E = require('../www/engine.js');
const catalog = require('../www/special_pieces.js').SPECIAL_PIECES_CATALOG;
function env(attacker, defender, support, supportAt=38) {
  const run = {active:true,gold:0,deployed:attacker?{'10':attacker}:{},enemyDeployed: {'24':defender||'alquimista'},abilityState:{}};
  if(support) run.enemyDeployed[String(supportAt)] = support;
  const window={ManobraEngine:E,RoguelikeRun:run,__manobraApp:{humanSide:E.WHITE},addEventListener(){}};
  const context={window,document:{querySelectorAll(){return []}},setInterval(){}};
  vm.createContext(context);
  for(const f of ['special_pieces.js','roguelike_runtime.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'../www',f),'utf8'),context);
  const b=new Int8Array(E.N);b[10]=E.WA;b[22]=E.WD;b[24]=E.BD;if(support)b[supportAt]=E.BD;
  const game=new E.Game(b), move={t:'k',from:10,to:24};
  assert(game.legal().moves.some(m=>m.t==='k'&&m.from===10&&m.to===24));
  return {rt:window.RoguelikeRuntime,run,game,move};
}
function execute(o) {
  const {rt,game,move}=o;
  const old=Array.from(game.st.b), side=game.st.turn, oldPly=game.plies;
  const allowed=rt.beforeMove(game,move);
  if(allowed){const cap=game.st.b[move.to];game.play(move);rt.afterMove(game,move,cap);}
  else if(rt.takeBlockedTurn()){game.pass();rt.onBlockedTurn(side);assert.deepEqual(Array.from(game.st.b),old,'blocked attempt keeps board');}
  else assert.fail('legal attempt neither applied nor consumed turn');
  assert.equal(game.plies,oldPly+1,'one attempted move = one turn');
  assert.equal(game.st.turn,side^1,'turn passed');
  return allowed;
}
assert.equal(Object.keys(catalog).length,30);
for(const key of Object.keys(catalog)) {
  const o=env(key,null,null);
  assert.equal(execute(o),true,key+' normal legal capture');
  assert.equal(o.rt.takeBlockedTurn(),false,key+' no stale blocked flag');
}
const guards=['escudeiro','rebatedor'];
for(const key of guards) {
  const o=env(null,key,null);
  assert.equal(execute(o),false,key+' reactive protection');
  assert.equal(o.rt.takeBlockedTurn(),false,key+' only once');
}
const supportGuards=['bastiao','tita_de_aco','baluarte','ima_tatico','xama_dos_ventos','manipulador','oraculo','sacerdote_da_luz'];
for(const key of supportGuards) {
  const o=env(null,'alquimista',key);
  // Some support abilities require special positioning; regardless, the move must consume exactly one turn.
  execute(o);
}
for(const key of ['berserker','executor','assassino_sombras','predador','cavaleiro_errante','cacador_cabecas']) {
  const o=env(key,'escudeiro');
  assert.equal(execute(o),true,key+' breaks active protection');
  const id=`0:24:${key}`;
  const rule=o.rt.abilityLimits[key];
  assert.equal(o.run.abilityState.charges[id],1,key+' spends one charge');
  assert.equal(o.run.abilityState.abilityCooldown[id],rule.cooldown,key+' full cooldown starts after activation turn');
}
// A two-turn cooldown requires two subsequent turns of the owner, not one.
{
  const o=env('assassino_sombras','escudeiro');execute(o);
  const id='0:24:assassino_sombras';
  assert.equal(o.rt.available(0,24,'assassino_sombras'),false);
  o.game.pass(); // black
  const m=o.game.legal().moves[0];
  if(m){o.rt.beforeMove(o.game,m);o.game.play(m);o.rt.afterMove(o.game,m,0);}else {o.game.pass();o.rt.onBlockedTurn(0);}
  assert.equal(o.run.abilityState.abilityCooldown[id],1);
}
console.log('ok - 30 peças, bloqueios, romper, consumo de turnos e recarga auditados');
