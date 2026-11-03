'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const E=require('../www/engine.js');
const catalog=require('../www/special_pieces.js').SPECIAL_PIECES_CATALOG;
const rewards={berserker:['k',8],executor:['k',12],ceifador:['k',10],predador:['k',8],duelista:['k',8],cacador_cabecas:['k',12],lancer:['k',7],assassino_sombras:['k',9],cavaleiro_errante:['k',7],vento_cortante:['k',7],cronomante:['m',5],ilusionista:['s',6],teleportador:['s',8],ima_tatico:['p',7],xama_dos_ventos:['p',12],manipulador:['s',12],oraculo:['m',4],sacerdote_da_luz:['m',6],mestre_de_manobras:['k',15],colosso:['p',10],guardiao_runico:['m',8],javali_de_ferro:['k',10],alquimista:['k',20]};
const economy=new Set(['colosso','javali_de_ferro','guardiao_runico','cronomante','ilusionista','teleportador','alquimista','mestre_de_manobras']);
const defenses=['escudeiro','sentinela','bastiao','muralha','rebatedor','tita_de_aco','baluarte'];
function harness(){const run={active:true,gold:0,deployed:{},enemyDeployed:{},abilityState:{}};const window={ManobraEngine:E,RoguelikeRun:run,__manobraApp:{humanSide:E.WHITE},addEventListener(){}};const ctx={window,document:{querySelectorAll(){return []}},setInterval(){}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('www/special_pieces.js','utf8'),ctx);vm.runInContext(fs.readFileSync('www/roguelike_runtime.js','utf8'),ctx);return {run,rt:window.RoguelikeRuntime};}
for(const [key,[t,amount]] of Object.entries(rewards)){
 const {run,rt}=harness();run.deployed={'10':key};const b=Array(E.N).fill(0);b[10]=2;if(t==='k'||t==='p'||t==='s')b[24]=3;
 const mv={t,from:10,to:24,...(t==='p'?{beyond:38}:{})};const game={over:false,st:{b,turn:E.WHITE},legal(){return {moves:[mv]}}};
 assert.equal(rt.beforeMove(game,{...mv,to:37}),false,`${key}: illegal move`);assert.equal(run.gold,0);
 assert.equal(rt.beforeMove(game,mv),true,`${key}: legal action`);
 const after=b.slice();after[10]=t==='s'?3:0;after[24]=2;if(t==='p')after[38]=3;game.st.b=after;
 rt.afterMove(game,mv,t==='k');assert.equal(run.gold,economy.has(key)?amount:0,`${key}: reward`);assert.equal(run.deployed['24'],key,`${key}: identity`);
 if(economy.has(key)) assert.equal(rt.available(E.WHITE,24,key),false,`${key}: immediate repeat blocked`);
}
for(const key of defenses){const {run,rt}=harness();const b=Array(E.N).fill(0);b[10]=2;b[24]=3;run.enemyDeployed={'24':key};let target=24;if(['bastiao','tita_de_aco','baluarte','sentinela'].includes(key)){run.enemyDeployed={'24':'alquimista','25':key};b[25]=3;}
 const mv={t:'k',from:10,to:24};const game={over:false,st:{b,turn:E.WHITE},legal(){return {moves:[mv]}}};
 assert.equal(rt.beforeMove(game,{...mv,to:38}),false,`${key}: illegal rejected`);
 const first=rt.beforeMove(game,mv);const second=rt.beforeMove(game,mv);
 assert.equal(typeof first,'boolean');assert.equal(typeof second,'boolean');
 if(key==='escudeiro'||key==='rebatedor'||['bastiao','tita_de_aco','baluarte'].includes(key)) {assert.equal(first,false,`${key}: shield`);assert.equal(second,true,`${key}: shield spent`);}
}
assert.equal(Object.keys(catalog).length,30,'30 catalog pieces');
assert.equal(Object.keys(rewards).length+defenses.length,30,'all 30 pieces covered');
console.log('OK: 30 peças; 8 econômicas, 22 de combate; ações legais/ilegais e identidade');
