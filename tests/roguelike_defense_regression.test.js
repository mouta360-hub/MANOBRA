const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../www/engine.js');
function load(defender, support) {
 const run={active:true,gold:0,deployed:{},enemyDeployed:{'24':defender},abilityState:{}};
 if(support)run.enemyDeployed['25']=support;
 const window={ManobraEngine:E,RoguelikeRun:run,__manobraApp:{humanSide:E.WHITE},addEventListener(){}};
 const ctx={window,document:{querySelectorAll(){return []}},setInterval(){}};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('www/special_pieces.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync('www/roguelike_runtime.js','utf8'),ctx);
 return {run,rt:window.RoguelikeRuntime};
}
function check(defender, support, expectedBlocked) {
 const {run,rt}=load(defender,support);
 const b=Array(E.N).fill(0);b[10]=2;b[24]=3;if(support)b[25]=3;
 const capture={t:'k',from:10,to:24};
 const game={over:false,st:{b,turn:E.WHITE},legal(){return {moves:[capture]}}};
 assert.equal(rt.beforeMove(game,{t:'k',from:10,to:37}),false,'illegal capture rejected');
 assert.equal(Object.keys(run.abilityState.charges||{}).length,0,'illegal capture consumes no charge');
 const first=rt.beforeMove(game,capture);
 assert.equal(first,!expectedBlocked,defender+' first capture');
 if(expectedBlocked){
   assert.equal(rt.beforeMove(game,capture),true,defender+' protection cannot trigger twice');
 }
}
check('escudeiro',null,true);
check('rebatedor',null,true); // diagonal capture blocked once
check('muralha',null,false); // target is not on back row
check('alquimista','bastiao',true); // adjacent guardian blocks ally capture
check('alquimista','tita_de_aco',true);
check('alquimista','baluarte',true);
console.log('ok - defesas: bloqueio único, ataques não elegíveis e movimentos ilegais');
