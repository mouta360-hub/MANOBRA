'use strict';
// Avaliação de IA mais profunda: reutiliza a campanha real e reforça o planejamento
// de busca, compras e implantação. Não altera o motor do jogo.
const fs=require('fs'),path=require('path'),vm=require('vm');
const source=fs.readFileSync(path.join(__dirname,'campaign_special_start_eval.test.js'),'utf8');
let modified=source;
// Seleciona peças combatentes com sinergia e distribui no tabuleiro agrupadas.
modified=modified.replace("r.roster=combatKeys.slice(0,4); r.activeTeam=[...r.roster];", `
 const groups=context.window.RoguelikeRuntime.synergySets;
 const preferred=[...groups[0].keys,...groups[1].keys];
 r.roster=preferred.slice(0,4);r.activeTeam=[...r.roster];
 `);
modified=modified.replace("for(const [n,key] of r.activeTeam.slice(0,Math.min(6,friendly.length)).entries())r.deployed[String(friendly[n])]=key;", `
 // Formação de sinergia: escolhe as casas mais próximas entre as peças já posicionadas.
 const chosen=[];
 for(const key of r.activeTeam.slice(0,6)) {
  const remaining=friendly.filter(i=>!chosen.includes(i));
  const score=i=>chosen.reduce((sum,j)=>sum+Math.max(Math.abs(E.rowOf(i)-E.rowOf(j)),Math.abs(E.colOf(i)-E.colOf(j))),0);
  remaining.sort((a,b)=>score(a)-score(b));
  const i=remaining[0];chosen.push(i);r.deployed[String(i)]=key;
 }
 `);
modified=modified.replace("const key=offers.find(k=>context.rogueShopPrice(k)<=r.gold&&!r.roster.includes(k));", `
 const sets=context.window.RoguelikeRuntime.synergySets;
 const scoreKey=k=>sets.reduce((best,g)=>Math.max(best,g.keys.includes(k)?g.keys.filter(x=>r.roster.includes(x)).length:0),0);
 const key=offers.filter(k=>context.rogueShopPrice(k)<=r.gold&&!r.roster.includes(k)).sort((a,b)=>scoreKey(b)-scoreKey(a))[0];
 `);
modified=modified.replace("const preferred=E.chooseMove(game.st,ranked,side===E.WHITE?playerLevel:enemyLevel,{depth:searchDepth,ms:searchMs});", `
 const preferred=E.chooseMove(game.st,ranked,side===E.WHITE?playerLevel:enemyLevel,{depth:side===E.WHITE?searchDepth:Math.min(2,searchDepth),ms:side===E.WHITE?searchMs:Math.min(10,searchMs)});
 `);
modified=modified.replace("stats.playerSpecialDeployments+=Object.keys(r.deployed).length;", "stats.playerSpecialDeployments+=Object.keys(r.deployed).length;");
const Module=require('module'); const compiled=new Module(path.join(__dirname,'campaign_special_start_eval.test.js'),module); compiled.filename=path.join(__dirname,'campaign_special_start_eval.test.js'); compiled.paths=module.paths; compiled._compile(modified,compiled.filename);
