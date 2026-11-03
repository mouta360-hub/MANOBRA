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
// Offensive pieces no longer pay coins for unprotected captures.
for(const key of ['lancer','assassino_sombras','cavaleiro_errante','vento_cortante']) scenario(key,'k');
// These two economic effects remain intentionally active for the human player.
scenario('colosso','p',10);
scenario('guardiao_runico','m',8);
// Iron boar pays for a valid capture, independently of its disabled counterattack.
scenario('javali_de_ferro','k',10);
console.log('7 revised abilities: current rewards and identities verified');
