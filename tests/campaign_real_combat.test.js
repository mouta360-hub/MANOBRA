'use strict';
// Simulação de campanha: compra, implantação e efeitos reais de peças especiais.
// Não substitui teste visual nem uma campanha completa controlada por jogador.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../www/engine.js');
const {chooseTeam,planShop}=require('./campaign_strategy.js');
const runs=Number(process.env.CAMPAIGN_RUNS||8), safetyPlies=Number(process.env.CAMPAIGN_SAFETY_PLIES||2400);
const playerLevel=process.env.CAMPAIGN_PLAYER_LEVEL||'hard';
const searchDepth=Number(process.env.CAMPAIGN_DEPTH||2), searchMs=Number(process.env.CAMPAIGN_SEARCH_MS||12);
const avoidCycles=process.env.CAMPAIGN_AVOID_CYCLES!=='0';
let catalog={};
const context={window:null,console,Math,Date,setTimeout:()=>0,setInterval:()=>0,clearInterval:()=>{},document:{getElementById:()=>({innerHTML:'',remove(){}}),createElement:()=>({}),querySelectorAll:()=>[],body:{appendChild(){}}},SPECIAL_PIECES_CATALOG:catalog};
const storage=new Map();
context.window={ManobraEngine:E,addEventListener(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},__manobraApp:{humanSide:E.WHITE},showRoguelikeToast(){}};
vm.createContext(context);
for(const file of ['special_pieces.js','roguelike_adventure.js','roguelike_runtime.js']) vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../www',file),'utf8'),context,{filename:file});
// Top-level const do catálogo fica disponível ao runtime pelo contexto VM.
catalog=vm.runInContext('SPECIAL_PIECES_CATALOG',context);
const keys=Object.keys(catalog);
assert.equal(keys.length,30);
const stats={runs,abilityOpportunities:0,abilityPreferredMoves:0,abilityEffectsObserved:0,battles:0,wins:0,defeats:0,draws:0,completed:0,shops:0,purchases:0,playerSpecialDeployments:0,enemySpecialDeployments:0,abilityTriggers:0,abilityUses:0,byAct:[{b:0,w:0},{b:0,w:0},{b:0,w:0}],safetyPlies,playerLevel,searchDepth,searchMs,avoidCycles,decisiveWins:0,adjudicatedWins:0,decisiveLosses:0,adjudicatedLosses:0,blockedMoves:0,shopOffers:0,loopDraws:0,inconclusive:0,abortedCampaigns:0,upgrades:0,mastery3:0,shopPlans:0,balancedTeams:0};
function fight(r,act){
 const pieces=new Int8Array(E.N);
 for(const side of [E.WHITE,E.BLACK])for(const p of E.presetSetup(side))pieces[p.i]=p.p;
 const game=new E.Game(pieces);context.window.__manobraApp.game=game;
 const recentMoves=new Map();
 r.deployed={};r.enemyDeployed={};r.abilityState={};
 const friendly=E.presetSetup(E.WHITE).map(p=>p.i),enemy=E.presetSetup(E.BLACK).map(p=>p.i);
 r.activeTeam=chooseTeam(r.roster,r.mastery,catalog);
 if(r.activeTeam.length>=3 && new Set(r.activeTeam.map(k=>catalog[k]?.category)).size>=2)stats.balancedTeams++;
 for(const [n,key] of r.activeTeam.slice(0,Math.min(6,friendly.length)).entries())r.deployed[String(friendly[n])]=key;
 for(const [n,key] of r.enemyTeam.slice(0,Math.min(6,enemy.length)).entries())r.enemyDeployed[String(enemy[n])]=key;
 stats.playerSpecialDeployments+=Object.keys(r.deployed).length;
 stats.enemySpecialDeployments+=Object.keys(r.enemyDeployed).length;
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
  // As habilidades atuais são ativadas por eventos de jogadas legais, não por
  // um comando manual separado. Valorizar oportunidades reais para acioná-las.
  const currentBag=side===E.WHITE?r.deployed:r.enemyDeployed;
  const abilityState=r.abilityState||{};
  function opportunity(m){
   const key=currentBag?.[String(m.from)];
   if(!key)return 0;
   const available=rt.available(side,m.from,key);
   if(!available)return 0;
   const offense=['berserker','executor','ceifador','predador','duelista','cacador_cabecas','lancer','assassino_sombras','cavaleiro_errante','vento_cortante','alquimista'];
   const support={cronomante:['m'],oraculo:['m'],sacerdote_da_luz:['m'],guardiao_runico:['m'],ilusionista:['s'],teleportador:['s'],manipulador:['s'],ima_tatico:['p'],xama_dos_ventos:['p'],colosso:['p'],mestre_de_manobras:['k','x'],javali_de_ferro:['k']};
   return (offense.includes(key)&&['k','x'].includes(m.t))||(support[key]||[]).includes(m.t)?1:0;
  }
  const opportunities=ranked.filter(opportunity);
  stats.abilityOpportunities+=opportunities.length;
  const alternatives=[preferred,...ranked.filter(m=>m!==preferred)];
  // Se houver uma oportunidade legal que não foi escolhida pela busca, testá-la
  // primeiro em parte dos turnos. Nunca fabricar jogadas nem ignorar o motor.
  if(side===E.WHITE&&opportunities.length&&game.plies%3===0){
   const candidate=opportunities.find(m=>repeated(m)<2);
   if(candidate){alternatives.splice(alternatives.indexOf(candidate),1);alternatives.unshift(candidate);stats.abilityPreferredMoves++;}
  }
  if(avoidCycles && repeated(preferred)>=2){alternatives.sort((a,b)=>repeated(a)-repeated(b));}
  let played=false;
  for(const mv of alternatives){
   const chargesBefore=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
   if(rt.beforeMove(game,mv)===false){stats.blockedMoves++;
    const chargesAfter=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
    if(chargesAfter>chargesBefore){stats.abilityTriggers+=chargesAfter-chargesBefore;}
    continue;
   }
   const captured=game.st.b[mv.to];
   const usesBefore=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
   game.play(mv);rt.afterMove(game,mv,captured);
   const usesAfter=Object.values(r.abilityState?.charges||{}).reduce((a,b)=>a+b,0);
   if(usesAfter>usesBefore)stats.abilityEffectsObserved+=usesAfter-usesBefore;
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
 let alive=true;
 for(let act=1;act<=3&&alive;act++){
 if(act>1 && r.active && r.floor>8) context.rogueNextAct();
 for(let row=0;row<8&&alive;row++){
  const options=r.map[row].filter(n=>context.rogueAvailable(n));assert(options.length,'Rota inacessível');
  const node=options.find(n=>n.type==='shop')||options.find(n=>n.type==='treasure')||options[0];
  if(node.type==='shop'){
   context.chooseRoguelikeNode(node.id);stats.shops++;
   const offers=Array.from(context.rogueShopSelection(context.rogueShopId()));stats.shopOffers+=offers.length;
   // Executar decisões válidas da loja, reavaliando orçamento e composição.
   for(let decision=0;decision<3;decision++){
    const plan=planShop(r,offers,catalog,k=>context.rogueShopPrice(k),k=>context.rogueUpgradeCost(k));
    if(!plan)break;
    stats.shopPlans++;
    if(plan.kind==='buy'){
     const before=r.gold,price=context.rogueShopPrice(plan.key);
     context.buyRoguelikePiece(plan.key,price,{});
     assert.equal(r.gold,before-price);stats.purchases++;
    }else{
     const before=r.mastery?.[plan.key]||1;
     context.upgradeRoguelikePiece(plan.key);
     assert.equal(r.mastery?.[plan.key],before+1);stats.upgrades++;
     if(r.mastery[plan.key]===3)stats.mastery3++;
    }
   }
   r.activeTeam=chooseTeam(r.roster,r.mastery,catalog);
  }else if(['battle','elite','boss'].includes(node.type)){
   r.pendingNode=node;r.mapRow=node.row;r.mapCol=node.col;r.floor=node.row+1;context.window._inRoguelikeBattle=true;
   context.prepareRoguelikeEnemy();
   const result=fight(r,act);stats.battles++;stats.byAct[act-1].b++;
   if(result.reason==='simulacao_inconclusiva_limite_seguranca'){stats.inconclusive++;stats.abortedCampaigns++;alive=false;break;}
   if(result.winner===E.WHITE){stats.wins++;if(result.reason==='limite_jogadas_simulacao'||result.reason==='limite_jogadas')stats.adjudicatedWins++;else stats.decisiveWins++;stats.byAct[act-1].w++;context.onRoguelikeVictory();}
   else {if(result.winner===-1||result.winner==null)stats.draws++;else {stats.defeats++;if(result.reason==='limite_jogadas_simulacao'||result.reason==='limite_jogadas')stats.adjudicatedLosses++;else stats.decisiveLosses++;}alive=false;context.onRoguelikeDefeat();}
  }else context.chooseRoguelikeNode(node.id);
  assert(r.gold>=0);
 }
 if(alive&&r.active&&r.floor>8) context.rogueNextAct();
 }
 if(alive&&!r.active)stats.completed++;
}
console.log(JSON.stringify({...stats,limitations:['IA usa motor real e peças especiais com efeitos automáticos de beforeMove/afterMove','compras e implantação de peças especiais são reais, mas seleção de loadout é heurística','não reproduz interface, escolhas humanas ou todos os poderes acionados manualmente','não existe vitória/derrota por limite; looping é resolvido por Game.legal; limite de segurança gera inconclusivo','IA favorece oportunidades de ativação por jogada legal; não há comando manual independente no runtime atual','chefões variam por ato e recebem seus modificadores de habilidade quando acionados']},null,2));
assert(stats.battles>0);assert(stats.playerSpecialDeployments>0||stats.purchases===0);assert.equal(stats.wins+stats.defeats+stats.draws+stats.inconclusive,stats.battles);
