const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const catalog = require('../www/special_pieces.js').SPECIAL_PIECES_CATALOG;
const code = fs.readFileSync(require('path').join(__dirname, '../www/roguelike_runtime.js'), 'utf8');
const cases = [
 ['cronomante','m',5],['ilusionista','s',6],['teleportador','s',8],
 ['ima_tatico','p',7],['xama_dos_ventos','p',12],['manipulador','s',12],
 ['oraculo','m',4],['sacerdote_da_luz','m',6],['mestre_de_manobras','k',15]
];
function simulate(key,type,cap) {
 const board = Array(117).fill(0); board[15]=1; board[16]=1;
 const run = {active:true,gold:0,deployed:{15:key},enemyDeployed:{},abilityState:{}};
 const engine={WHITE:0,BLACK:1,N:117,sideOf:v=>v===1?0:1,Game:function(){}};
 engine.Game.prototype.legal=()=>({moves:[]});
 const context={SPECIAL_PIECES_CATALOG:catalog,window:{RoguelikeRun:run,ManobraEngine:engine,__manobraApp:{humanSide:0},addEventListener(){}},document:{querySelectorAll(){return []}},setInterval(){}};
 vm.createContext(context);vm.runInContext(code,context);
 const game={st:{b:board}};const mv={from:15,to:16,t:type};
 run.abilityState.pending={attacker:key,attackerSide:0,from:15,to:16};
 context.window.RoguelikeRuntime.afterMove(game,mv,cap);
 return {gold:run.gold,charges:run.abilityState.charges};
}
for (const [key,type,gold] of cases) {
 assert.strictEqual(simulate(key,type,type==='k').gold,gold,`${key} deve premiar ação permitida`);
 const other=type==='m'?'s':'m';
 assert.strictEqual(simulate(key,other,false).gold,0,`${key} não deve premiar ação errada`);
}
assert.strictEqual(simulate('mestre_de_manobras','k',false).gold,0,'sem captura efetiva, sem recompensa');
console.log('ok - 9 habilidades de suporte: acionamento e ausência de bônus indevido');
