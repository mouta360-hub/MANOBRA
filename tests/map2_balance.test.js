const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../www/roguelike_adventure.js'),'utf8');
const keys = ['escudeiro','sentinela','bastiao','muralha','rebatedor','tita_de_aco','baluarte','lancer','assassino_sombras','berserker','executor','cavaleiro_errante','ceifador','predador','duelista','vento_cortante','cacador_cabecas','ima_tatico','xama_dos_ventos','manipulador','oraculo','sacerdote_da_luz'];
const ctx = {window:{addEventListener:()=>{}},SPECIAL_PIECES_CATALOG:Object.fromEntries(keys.map(k=>[k,{name:k}])),Math,Date,console,setTimeout:()=>{},document:{getElementById:()=>null}};
vm.createContext(ctx);vm.runInContext(source,ctx);
const run = ctx.window.RoguelikeRun;
for(const [act,floor,type,expected] of [[1,8,'boss',6],[2,1,'battle',1],[2,4,'battle',2],[2,7,'elite',3],[2,8,'boss',5],[3,8,'boss',6]]) {
 run.act=act;run.floor=floor;run.activeTeam=[];run.pendingNode={type};
 ctx.prepareRoguelikeEnemy();
 assert.equal(run.enemyTeam.length,expected,`act=${act}, floor=${floor}, type=${type}`);
}
console.log('Map 2 enemy special-piece scaling passed');
