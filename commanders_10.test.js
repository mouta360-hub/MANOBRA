const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const memory={};const ctx={window:{localStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},addEventListener(){}},document:{getElementById(){return null}},setTimeout(){},setInterval(){},Math,Date,console};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/www/roguelike_adventure.js','utf8'),ctx);
assert.equal(vm.runInContext('ROGUE_COMMANDERS.length',ctx),10);
for(let n=0;n<10;n++){memory.manobra_roguelike_commanders_v1=JSON.stringify({wins:n});assert.equal(vm.runInContext('ROGUE_COMMANDERS.filter(c=>rogueCommanderUnlocked(c.id)).length',ctx),n+1);}
const r=ctx.window.RoguelikeRun;
r.commanderId='mercador';assert.equal(vm.runInContext('rogueShopPrice("anything")',ctx),30);
r.commanderId='novato';assert.equal(vm.runInContext('rogueShopPrice("anything")',ctx),35);
r.active=true;r.act=1;r.gold=30;r.commanderId='cartografo';r.map=[];ctx.openRoguelikeMap=()=>{};vm.runInContext('rogueNextAct()',ctx);assert.equal(r.gold,45);
r.gold=30;r.commanderId='campista';r.mapRow=-1;r.mapCol=1;r.visited=[];const node={id:'rest',row:0,col:1,type:'rest',cleared:false,next:[]};r.map=[[node]];vm.runInContext('chooseRoguelikeNode("rest")',ctx);assert.equal(r.gold,55);
r.gold=30;r.commanderId='diplomata';r.mapRow=-1;r.map=[[{id:'event',row:0,col:1,type:'event',cleared:false,next:[]}]];vm.runInContext('chooseRoguelikeNode("event")',ctx);assert.ok(r.gold>=50&&r.gold<=80);
console.log('10 comandantes: progressão, preços, mapa, descanso e eventos OK');
