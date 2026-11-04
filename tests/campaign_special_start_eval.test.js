'use strict';
// Simulação de campanha: compra, implantação e efeitos reais de peças especiais.
// Não substitui teste visual nem uma campanha completa controlada por jogador.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../www/engine.js');
const runs=Number(process.env.CAMPAIGN_RUNS||8), safetyPlies=Number(process.env.CAMPAIGN_SAFETY_PLIES||2400);
const playerLevel=process.env.CAMPAIGN_PLAYER_LEVEL||'hard';
const searchDepth=Number(process.env.CAMPAIGN_DEPTH||2), searchMs=Number(process.env.CAMPAIGN_SEARCH_MS||12);
const avoidCycles=process.env.CAMPAIGN_AVOID_CYCLES!=='0';
const catalog={};
const context={window:null,console,Math,Date,setTimeout:()=>0,setInterval:()=>0,clearInterval:()=>{},document:{getElementById:()=>({innerHTML:'',style:{},remove(){}}),createElement:()=>({}),querySelectorAll:()=>[],body:{appendChild(){}}},SPECIAL_PIECES_CATALOG:catalog};
const storage=new Map();
context.window={ManobraEngine:E,addEventListener(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},__manobraApp:{humanSide:E.WHITE},showRoguelikeToast(){}};
vm.createContext(context);
for(const file of ['special_pieces.js','roguelike_adventure.js','roguelike_runtime.js']) vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../www',file),'utf8'),context,{filename:file});
// Top-level const do catálogo fica disponível ao runtime pelo contexto VM.
const keys=vm.runInContext('Object.keys(SPECIAL_PIECES_CATALOG)',context);
assert.equal(keys.length,30);
const stats={masteryUpgrades:0,maxMastery:1,runs,battles:0,wins:0,defeats:0,draws:0,completed:0,shops:0,purchases:0,playerSpecialDeployments:0,enemySpecialDeployments:0,enemyCompositions:[],enemyPositions:[],abilityTriggers:0,abilityUses:0,byAct:[{b:0,w:0},{b:0,w:0},{b:0,w:0}],safetyPlies,playerLevel,searchDepth,searchMs,avoidCycles,decisiveWins:0,adjudicatedWins:0,decisiveLosses:0,adjudicatedLosses:0,blockedMoves:0,shopOffers:0,loopDraws:0,inconclusive:0};
function fight(r,act){
 const pieces=new Int8Array(E.N);
 for(const side of [E.WHITE,E.BLACK])for(const p of E.presetSetup(side))pieces[p.i]=p.p;
 const game=new E.Game(pieces);context.window.__manobraApp.game=game;
 const recentMoves=new Map();
 r.deployed={};r.enemyDeployed={};r.abilityState={};
 const friendly=E.presetSetup(E.WHITE).map(p=>p.i),enemy=E.presetSetup(E.BLACK).map(p=>p.i);
 for(const [n,key] of r.activeTeam.slice(0,Math.min(6,friendly.length)).entries())r.deployed[String(friendly[n])]=key;
 r.enemyDeployed=context.rogueRandomEnemyDeployment(enemy,r.enemyTeam.slice(0,Math.min(6,enemy.length))); 
 stats.playerSpecialDeployments+=Object.keys(r.deployed).length;
 stats.enemySpecialDeployments+=Object.keys(r.enemyDeployed).length;
 stats.enemyCompositions.push([...r.enemyTeam].sort().join(','));
 stats.enemyPositions.push(Object.keys(r.enemyDeployed).sort((a,b)=>a-b).join(','));
 const rt=context.window.RoguelikeRuntime;
 // O motor Game.legal() aplica o desempate do looping: proíbe a jogada
 // repetitiva do lado que deve mudar. Não declarar empate por repetição aqui.
 const enemyLevel=act===1?'easy':act===2?'medium':'hard';
 while(!game.over&&game.plies<safetyPlies){
  const moves=game.cur.moves;if(!moves.length)break;
  const side=game.st.turn;
  // Considera bloqueios por habilidades defensivas, sem inventar jogadas.
  const ranked=moves.slice();
  const preferred=E.chooseMove(game.st,ranked,side===E.WHITE?playerLevel:enemyLevel,{depth:searchDepth,ms:searchMs});
  // Se a IA repetir o mesmo deslocamento muitas vezes, tenta outra jogada legal.
  // Isso é uma heurística do simulador, não uma mudança nas regras do Manobra.
  const repeated = m => recentMoves.get(`${side}:${m.from}:${m.to}:${m.t}`)||0;
  const alternatives=[preferred,...ranked.filter(m=>m!==preferred)];
  if(avoidCycles && repeated(preferred)>=2){alternatives.sort((a,b)=>repeated(a)-repeated(b));}
  let played=false;
  for(const mv of alternatives){
   const chargesBefore=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
   if(rt.beforeMove(game,mv)===false){stats.blockedMoves++;
    const chargesAfter=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
    if(chargesAfter>chargesBefore){stats.abilityTriggers+=chargesAfter-chargesBefore;}
    continue;
   }
   const captured=game.st.b[mv.to];game.play(mv);rt.afterMove(game,mv,captured);
   const moveKey=`${side}:${mv.from}:${mv.to}:${mv.t}`;recentMoves.set(moveKey,(recentMoves.get(moveKey)||0)+1);
   played=true;break;
  }
  if(!played)break;
 }
 stats.abilityUses+=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
 return game.over||{winner:null,reason:'simulacao_inconclusiva_limite_seguranca'};
}
for(let seed=0;seed<runs;seed++){
 storage.clear();context.startRoguelikeAdventure('novato');const r=context.window.RoguelikeRun;
 // Cenário experimental: jogador já possui quatro peças de combate. Não altera o jogo.
 const combatKeys=keys.filter(k=>!['mercador','banqueiro'].includes(k));
 r.roster=combatKeys.slice(0,4); r.activeTeam=[...r.roster];
 let alive=true;
 for(let act=1;act<=3&&alive;act++){
 if(act>1 && r.active && r.floor>8) context.rogueNextAct();
 for(let row=0;row<8&&alive;row++){
  const options=r.map[row].filter(n=>context.rogueAvailable(n));assert(options.length,'Rota inacessível');
  const node=options.find(n=>n.type==='shop')||options.find(n=>n.type==='treasure')||options[0];
  if(node.type==='shop'){
   context.chooseRoguelikeNode(node.id);stats.shops++;
   const offers=Array.from(context.rogueShopSelection(context.rogueShopId()));stats.shopOffers+=offers.length;
   const key=offers.find(k=>context.rogueShopPrice(k)<=r.gold&&!r.roster.includes(k));
   // Primeiro consolidar as peças que realmente entram no combate; só depois comprar novas.
   if(process.env.CAMPAIGN_TRY_MASTERY==='1') {
    for(const owned of [...r.roster].sort((a,b)=>context.rogueMasteryLevel(b)-context.rogueMasteryLevel(a))) {
     if(context.rogueMasteryLevel(owned)<3 && r.gold>=context.rogueUpgradeCost(owned)) {
      const before=context.rogueMasteryLevel(owned); context.upgradeRoguelikePiece(owned);
      if(context.rogueMasteryLevel(owned)>before){stats.masteryUpgrades++;stats.maxMastery=Math.max(stats.maxMastery,context.rogueMasteryLevel(owned));}
     }
    }
   }
   if(key && r.gold>=context.rogueShopPrice(key)){const before=r.gold,price=context.rogueShopPrice(key);context.buyRoguelikePiece(key,price,{});assert.equal(r.gold,before-price);stats.purchases++;}
   // Priorizar compras recentes, para testar a evolução em vez de apenas as peças iniciais.
   if(process.env.CAMPAIGN_TRY_MASTERY==='1') {
    for(const owned of r.roster) {
     const before=context.rogueMasteryLevel(owned);
     if(before<3 && r.gold>=context.rogueUpgradeCost(owned)) {
      context.upgradeRoguelikePiece(owned);
      const after=context.rogueMasteryLevel(owned);
      if(after>before){stats.masteryUpgrades++;stats.maxMastery=Math.max(stats.maxMastery,after);}
     }
    }
   }
   r.activeTeam=[...r.roster].sort((a,b)=>context.rogueMasteryLevel(b)-context.rogueMasteryLevel(a)).slice(0,6);
  }else if(['battle','elite','boss'].includes(node.type)){
   r.pendingNode=node;r.mapRow=node.row;r.mapCol=node.col;r.floor=node.row+1;context.window._inRoguelikeBattle=true;
   context.prepareRoguelikeEnemy();
   const result=fight(r,act);stats.battles++;stats.byAct[act-1].b++;
   if(result.reason==='simulacao_inconclusiva_limite_seguranca')stats.inconclusive++;
   if(result.winner===E.WHITE){stats.wins++;if(result.reason==='limite_jogadas_simulacao'||result.reason==='limite_jogadas')stats.adjudicatedWins++;else stats.decisiveWins++;stats.byAct[act-1].w++;context.onRoguelikeVictory();}
   else {if(result.winner===-1||result.winner==null)stats.draws++;else {stats.defeats++;if(result.reason==='limite_jogadas_simulacao'||result.reason==='limite_jogadas')stats.adjudicatedLosses++;else stats.decisiveLosses++;}alive=false;context.onRoguelikeDefeat();}
  }else context.chooseRoguelikeNode(node.id);
  assert(r.gold>=0);
 }
 if(alive&&r.active&&r.floor>8) context.rogueNextAct();
 }
 if(alive&&!r.active)stats.completed++;
}
console.log(JSON.stringify({...stats,uniqueEnemyCompositions:new Set(stats.enemyCompositions).size,uniqueEnemyPositions:new Set(stats.enemyPositions).size,enemyCompositions:undefined,enemyPositions:undefined,limitations:['IA usa motor real e peças especiais com efeitos automáticos de beforeMove/afterMove','compras e implantação de peças especiais são reais, mas seleção de loadout é heurística','não reproduz interface, escolhas humanas ou todos os poderes acionados manualmente','não existe vitória/derrota por limite; looping é resolvido por Game.legal; limite de segurança gera inconclusivo','IA escolhe lances por busca limitada e evita repetir movimentos; poderes manuais ainda não são acionados','chefões variam por ato e recebem seus modificadores de habilidade quando acionados']},null,2));
assert(stats.battles>0);assert(stats.playerSpecialDeployments>0||stats.purchases===0);assert.equal(stats.wins+stats.defeats+stats.draws,stats.battles);
