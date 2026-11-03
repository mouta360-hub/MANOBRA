'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={window:{addEventListener(){},RoguelikeRun:{activeTeam:[],act:1,floor:1,pendingNode:{type:'battle'},enemyTeam:[],enemyDeployed:{}}},console,Math,Date,setTimeout:()=>0,document:{getElementById:()=>null},showRoguelikeToast(){}};
vm.createContext(context);
for(const file of ['special_pieces.js','roguelike_adventure.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../www',file),'utf8'),context);
const r=context.window.RoguelikeRun;
for(const act of [1,2,3])for(const kind of ['battle','boss']){
 r.act=act;r.floor=8;r.pendingNode={type:kind};r.activeTeam=[];
 const variants=new Set(),deployments=new Set();
 for(let i=0;i<60;i++){
  context.prepareRoguelikeEnemy();
  assert.equal(r.enemyTeam.length,act===2?(kind==='boss'?5:3):(kind==='boss'?6:Math.min(6,1+Math.floor(7/2)+(act-1))));
  assert.equal(new Set(r.enemyTeam).size,r.enemyTeam.length);
  const combatOnly=new Set(['escudeiro','sentinela','bastiao','muralha','rebatedor','tita_de_aco','baluarte','lancer','assassino_sombras','berserker','executor','cavaleiro_errante','ceifador','predador','duelista','vento_cortante','cacador_cabecas','ima_tatico','xama_dos_ventos','manipulador','oraculo','sacerdote_da_luz']);
  assert(r.enemyTeam.every(key=>combatOnly.has(key)), 'inimigo recebeu peça sem habilidade de combate');
  variants.add([...r.enemyTeam].sort().join('|'));
  const positions=Array.from({length:20},(_,j)=>j+50);
  const deployed=context.rogueRandomEnemyDeployment(positions,r.enemyTeam);
  assert.equal(Object.keys(deployed).length,r.enemyTeam.length);
  assert.equal(new Set(Object.keys(deployed)).size,r.enemyTeam.length);
  deployments.add(Object.keys(deployed).sort().join('|'));
 }
 assert(variants.size>1,`${act} ${kind}: composição fixa`);
 assert(deployments.size>1,`${act} ${kind}: implantação fixa`);
 console.log(`ato ${act} ${kind}: ${variants.size} composições e ${deployments.size} implantações em 60 sorteios`);
}
console.log('PASS: sorteio independente em todos os atos, incluindo chefões');
