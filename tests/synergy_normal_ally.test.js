const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const E=require('../www/engine.js');
const run={active:true,deployed:{},enemyDeployed:{},abilityState:{}};
const window={ManobraEngine:E,RoguelikeRun:run,__manobraApp:{humanSide:E.WHITE},addEventListener(){}};
const ctx={window,document:{querySelectorAll(){return []}},setInterval(){}};vm.createContext(ctx);
for(const file of ['special_pieces.js','roguelike_runtime.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../www',file),'utf8'),ctx);
const rt=window.RoguelikeRuntime;
function battle(attacker,partner,protector,victimSpecial=false){run.deployed={'40':attacker,'68':partner};run.enemyDeployed={'41':protector};if(victimSpecial)run.enemyDeployed['28']='alquimista';run.abilityState={};const b=Array(E.N).fill(0);b[40]=2;b[68]=2;b[41]=3;b[28]=3;const mv={t:'k',from:40,to:28};return {game:{over:false,st:{b,turn:E.WHITE},legal(){return {moves:[mv]}}},mv};}
for(const [name,a,p] of [['Caçada','assassino_sombras','predador'],['Fúria','berserker','cavaleiro_errante']]){
 for(const victimSpecial of [false,true]){
  const x=battle(a,p,'bastiao',victimSpecial);
  assert.equal(rt.beforeMove(x.game,x.mv),true,`${name}: deveria romper proteção de Bastião sobre ${victimSpecial?'especial':'peça comum'}`);
  assert.equal(run.abilityState.charges[`0:40:${a}`],1,`${name}: consumir carga`);
  assert.equal(run.abilityState.charges['1:41:bastiao']||0,0,`${name}: não consumir proteção rompida`);
 }
}
console.log('ok - ruptura sobre peças comuns e especiais protegidas');
// Sem parceiro, a proteção deve bloquear a captura de uma peça comum.
{
 const x=battle('assassino_sombras','predador','bastiao');
 delete run.deployed['68'];x.game.st.b[68]=0;
 // Ataque vertical: Assassino não tem ruptura individual, isolando a sinergia.
 x.game.st.b[27]=3;x.game.st.b[28]=0;x.mv.to=27;
 assert.equal(rt.beforeMove(x.game,x.mv),false,'sem parceiro, Bastião deve proteger peça comum');
 assert.equal(run.abilityState.charges['1:41:bastiao'],1);
}
// Sem protetor, não há proteção a romper nem gasto de habilidade.
{
 const x=battle('assassino_sombras','predador','bastiao');
 delete run.enemyDeployed['41'];x.game.st.b[41]=0;
 assert.equal(rt.beforeMove(x.game,x.mv),true);
 assert.equal(run.abilityState.charges['0:40:assassino_sombras']||0,0);
}
// Uma jogada não permitida pelo motor nunca deve consumir habilidade.
{
 const x=battle('assassino_sombras','predador','bastiao');
 x.game.legal=()=>({moves:[]});
 assert.equal(rt.beforeMove(x.game,x.mv),false);
 assert.equal(run.abilityState.charges['0:40:assassino_sombras']||0,0);
}
console.log('ok - casos negativos: sem parceiro, sem proteção, jogada ilegal');
