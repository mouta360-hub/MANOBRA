// Integration of map, shops, rewards, bosses and progression. Combat results are simulated,
// so this is NOT a balance or AI win-rate test.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const store=new Map(), modal={innerHTML:'',remove(){}};
const window={addEventListener(){},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
const ctx={window,Math,Date,console,setTimeout:fn=>fn(),setInterval:()=>0,clearInterval:()=>{},document:{getElementById:()=>modal,createElement:()=>modal,body:{appendChild(){}}},SPECIAL_PIECES_CATALOG:Object.fromEntries(Array.from({length:30},(_,i)=>['piece'+i,{name:'Piece '+i,symbol:'★'}]))};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('www/roguelike_adventure.js','utf8'),ctx);
ctx.startRoguelikeAdventure('novato');
const r=window.RoguelikeRun;let shops=0,battles=0,bosses=0,purchases=0;
for(let act=1;act<=3;act++){
 assert.equal(r.act,act);
 for(let row=0;row<8;row++){
  const options=r.map[row].filter(n=>ctx.rogueAvailable(n));assert(options.length,'No reachable next node');
  const node=options.find(n=>n.type==='shop')||options.find(n=>n.type==='treasure')||options[0];
  if(node.type==='shop'){
   // Use the actual route transition and shop purchase logic.
   ctx.chooseRoguelikeNode(node.id);shops++;
   const offers=Array.from(ctx.rogueShopSelection(ctx.rogueShopId()));
   assert(offers.length<=3);
   const affordable=offers.find(k=>ctx.rogueShopPrice(k)<=r.gold && !r.roster.includes(k));
   if(affordable){const old=r.gold;const price=ctx.rogueShopPrice(affordable);ctx.buyRoguelikePiece(affordable,price,{});assert.equal(r.gold,old-price);assert(r.roster.includes(affordable));purchases++;}
  }else if(['battle','elite','boss'].includes(node.type)){
   // Real combat is intentionally not replaced with a false claim of a victory.
   r.pendingNode=node;r.mapRow=node.row;r.mapCol=node.col;r.floor=node.row+1;
   window._inRoguelikeBattle=true;ctx.onRoguelikeVictory();battles++;if(node.type==='boss')bosses++;
  }else ctx.chooseRoguelikeNode(node.id);
  assert(r.gold>=0,'Negative gold');
 }
}
assert.equal(bosses,3);assert.equal(r.active,false);assert.equal(ctx.rogueReadProgress().wins,1);
console.log(`PASS campaign progression (combat outcomes simulated): ${battles} battles, ${bosses} bosses, ${shops} shops, ${purchases} purchases, 3 acts, victory saved`);
