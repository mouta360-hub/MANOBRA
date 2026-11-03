const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync(require('node:path').join(__dirname, '../www/roguelike_adventure.js'), 'utf8');
const keys = ['tita_de_aco','cronomante','mestre_de_manobras','teleportador','ilusionista','baluarte','berserker','executor','oraculo','alquimista','colosso','guardiao_runico','cavaleiro_errante','escudeiro'];
const ctx = {window:{addEventListener:()=>{}}, SPECIAL_PIECES_CATALOG:Object.fromEntries(keys.map(k=>[k,{name:k}])), Math, Date, console, setTimeout:()=>{}, document:{getElementById:(id)=>id==='roguelike-floating-btn-container'?{innerHTML:'',style:{}}:null}, updateFloatingAdventureButton:()=>{}, closeRoguelikeAdventure:()=>{}, showRoguelikeToast:()=>{}};
vm.createContext(ctx); vm.runInContext(src,ctx);
for(let i=0;i<40;i++) {
 const map=ctx.generateRoguelikeMap();
 assert.equal(map.length,8);
 assert.ok(map[7].every(n=>n.type==='boss'));
 assert.ok(map.slice(0,7).flat().every(n=>n.type!=='boss'));
}
const r=ctx.window.RoguelikeRun;
r.active=true;r.act=1;r.floor=8;r.gold=30;r.activeTeam=[];r.pendingNode={id:'boss',type:'boss',row:7,col:1,cleared:false};r.visited=[];
ctx.prepareRoguelikeEnemy();
assert.equal(r.enemyTeam.length,6);
assert.ok(r.enemyTeam.every(k=>ctx.getRoguelikePieceRarity(k).price>=60));
ctx.window._inRoguelikeBattle=true;
ctx.onRoguelikeVictory();
assert.equal(r.gold,160);assert.equal(r.pendingNode,null);assert.equal(r.visited.length,1);
console.log('Boss stage: map, enemy roster, victory and reward passed');
