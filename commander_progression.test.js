const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const mem={};const window={RoguelikeRun:{active:true,commanderId:'novato'},__manobraApp:{humanSide:0},localStorage:{getItem:k=>mem[k]||null,setItem:(k,v)=>mem[k]=v},addEventListener(){}};
const ctx={window,document:{getElementById(){return null}},Math,Date,console,setTimeout(){},setInterval(){}};vm.createContext(ctx);
for(const f of ['www/roguelike_adventure.js','www/roguelike_runtime.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
assert.equal(vm.runInContext('ROGUE_COMMANDERS.length',ctx),10);
for(let n=0;n<10;n++){mem.manobra_roguelike_commanders_v1=JSON.stringify({wins:n});assert.equal(vm.runInContext('ROGUE_COMMANDERS.filter(c=>rogueCommanderUnlocked(c.id)).length',ctx),n+1);}
const rt=window.RoguelikeRuntime;
const check=(commander,key,uses,cooldown)=>{window.RoguelikeRun.commanderId=commander;assert.deepEqual(JSON.parse(JSON.stringify(rt.effectiveAbilityLimit(0,key))),{uses,cooldown});};
check('novato','escudeiro',1,0);check('guardiao','escudeiro',2,0);check('campista','bastiao',2,0);check('diplomata','cronomante',2,0);check('cacador','berserker',3,3);check('cartografo','ceifador',3,3);check('artifice','ceifador',4,2);check('artifice','escudeiro',3,0);
window.RoguelikeRun.commanderId='artifice';assert.equal(rt.effectiveAbilityLimit(1,'ceifador').uses,2,'enemy must not receive bonuses');
assert.equal(rt.available(0,3,'ceifador'),true);const st=window.RoguelikeRun.abilityState;st.charges['0:3:ceifador']=3;assert.equal(rt.available(0,3,'ceifador'),true);st.charges['0:3:ceifador']=4;assert.equal(rt.available(0,3,'ceifador'),false);
window.RoguelikeRun.commanderId='mercador';assert.equal(vm.runInContext('rogueShopPrice("anything")',ctx),25);
window.RoguelikeRun.commanderId='novato';assert.equal(vm.runInContext('rogueShopPrice("anything")',ctx),35);
console.log('OK: 10 unlocks, player-only piece perks, cooldown, usage, shop prices');
