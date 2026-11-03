const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('../www/engine.js');
const run = {active:true,gold:0,deployed:{},enemyDeployed:{},abilityState:{}};
const window = {ManobraEngine:E,RoguelikeRun:run,__manobraApp:{humanSide:E.WHITE},addEventListener(){}};
const ctx = {window,document:{querySelectorAll(){return []}},setInterval(){}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('www/special_pieces.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('www/roguelike_runtime.js','utf8'),ctx);
const rt=window.RoguelikeRuntime;
function scenario(key, t, expectedGold=0) {
 run.gold=0;run.deployed={'10':key};run.enemyDeployed={};run.abilityState={};
 const before=Array(E.N).fill(0);before[10]=2;
 if(t==='k'||t==='p')before[24]=4;
 const move={t,from:10,to:24,...(t==='p'?{beyond:38}:{})};
 const game={over:false,st:{b:before,turn:E.WHITE},legal(){return {moves:[move]}}};
 assert.equal(rt.beforeMove(game,move),true,key+' legal');
 const after=before.slice();after[10]=0;after[24]=2;
 if(t==='p')after[38]=4;
 game.st.b=after;
 rt.afterMove(game,move,t==='k');
 assert.equal(run.gold,expectedGold,key+' economy');
 assert.equal(run.deployed['24'],key,key+' identity preserved');
}
// Offensive pieces now pierce reactive defenses; they do not mint gold on ordinary captures.
for(const key of ['berserker','executor','ceifador','predador','duelista','cacador_cabecas']) scenario(key,'k');
// A protection-piercing charge is consumed only when there is an actual protection to pierce.
console.log('6 offensive abilities: legal captures preserve identity, no obsolete gold reward');
