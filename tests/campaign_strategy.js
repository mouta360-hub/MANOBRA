'use strict';
// Estratégia exclusiva do simulador: não altera regras, lojas ou IA do jogo.
function chooseTeam(roster, mastery, catalog, slots=6) {
 const buckets={tank:[],attacker:[],support:[]};
 for(const key of roster){const type=catalog[key]?.category;if(buckets[type])buckets[type].push(key);}
 const score=k=>((mastery?.[k]||1)-1)*8+(catalog[k]?.passive?1:0);
 Object.values(buckets).forEach(arr=>arr.sort((a,b)=>score(b)-score(a)));
 const selected=[];
 for(const [type,cap] of [['tank',2],['attacker',3],['support',1]])selected.push(...buckets[type].splice(0,cap));
 const rest=Object.values(buckets).flat().sort((a,b)=>score(b)-score(a));
 return selected.concat(rest).slice(0,slots);
}
function planShop(run, offers, catalog, price, upgradeCost){
 const team=chooseTeam(run.roster,run.mastery,catalog);
 const counts={tank:0,attacker:0,support:0};
 for(const k of team)if(counts[catalog[k]?.category]!==undefined)counts[catalog[k].category]++;
 const budget=run.gold;
 const missing={tank:2-counts.tank,attacker:3-counts.attacker,support:1-counts.support};
 const buys=offers.filter(k=>!run.roster.includes(k)&&price(k)<=budget).sort((a,b)=>{
  const priority=k=>(missing[catalog[k]?.category]||0)>0?100:0;
  return (priority(b)-priority(a))+(price(a)-price(b));
 });
 const upgrade=team.filter(k=>(run.mastery?.[k]||1)<3&&upgradeCost(k)<=budget).sort((a,b)=>{
  const al=run.mastery?.[a]||1,bl=run.mastery?.[b]||1;
  return bl-al || upgradeCost(a)-upgradeCost(b);
 })[0];
 // Primeiro montar uma equipe variada. Depois priorizar evolução das peças em uso.
 if(buys.length && (team.length<3 || (missing[catalog[buys[0]]?.category]||0)>0 && team.length<6))return {kind:'buy',key:buys[0]};
 if(upgrade)return {kind:'upgrade',key:upgrade};
 if(buys.length && team.length<6)return {kind:'buy',key:buys[0]};
 return null;
}
module.exports={chooseTeam,planShop};
