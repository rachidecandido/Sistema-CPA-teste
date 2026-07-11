/* ============================================================
   NAVIGATION.JS — Página Inicial + Confirmação de Saída
   Fase 1 — Sistema C.P.A
   Depende de: index.html (goto, PA, isAdm)
   ------------------------------------------------------------
   Comportamento do botão "Voltar" do telemóvel/navegador:
   - Se estiver numa secção diferente da inicial (CPA) → volta à
     secção inicial, sem fechar o aplicativo.
   - Se já estiver na secção inicial → pergunta se quer sair.
   ============================================================ */

const HOME_SEC='cpa',HOME_TAB=0;
let _navFromPop=false;

// Injecta o modal de confirmação de saída (não depende do modal cfm existente,
// para não interferir com outras confirmações do sistema)
function injectExitModal(){
  if(document.getElementById('moExit'))return;
  const div=document.createElement('div');
  div.className='mo';
  div.id='moExit';
  div.style.alignItems='center';
  div.innerHTML=`<div class="md" style="border-radius:17px;max-width:305px;text-align:center;padding:22px 17px;max-height:none">
    <div style="font-size:2.2rem;margin-bottom:9px">🚪</div>
    <div style="font-weight:800;font-size:1rem;margin-bottom:7px">Sair do Sistema C.P.A?</div>
    <div style="font-size:.8rem;color:var(--mu);margin-bottom:16px">Os seus dados já estão guardados. Pode voltar a entrar a qualquer momento.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn bl" onclick="respExit(false)">✕ Ficar</button>
      <button class="btn bd" onclick="respExit(true)">🚪 Sair</button>
    </div>
  </div>`;
  document.body.appendChild(div);
}

function secAtiva(){
  const el=document.querySelector('.sec.active');
  return el?el.id.replace('sec-',''):'';
}

function respExit(sair){
  document.getElementById('moExit').classList.remove('open');
  if(!sair){
    // o utilizador quer ficar: recria uma barreira no histórico para o próximo "voltar"
    history.pushState({sec:HOME_SEC},'','');
  }
  // se sair=true, não fazemos nada: a navegação de saída já tinha ocorrido
  // e ao não recolocarmos uma barreira, o próximo "voltar" sai mesmo do app.
}

function initExitGuard(){
  injectExitModal();
  history.pushState({sec:HOME_SEC},'','');
}

window.addEventListener('popstate',function(){
  if(!(PA||isAdm))return; // ninguém autenticado: comportamento normal do navegador
  const atual=secAtiva();
  if(atual&&atual!==HOME_SEC){
    _navFromPop=true;
    goto(HOME_SEC,HOME_TAB);
    history.pushState({sec:HOME_SEC},'','');
  }else{
    document.getElementById('moExit').classList.add('open');
  }
});

// Sempre que o utilizador entra num perfil (professor ou admin), inicia a guarda de saída
const _origActivateProf3=activateProf;
activateProf=function(prof){_origActivateProf3(prof);initExitGuard();};
const _origActivateAdm2=activateAdm;
activateAdm=function(){_origActivateAdm2();initExitGuard();};

// ── EXPIRAÇÃO DE SESSÃO POR INACTIVIDADE ──
// Por defeito, 10 minutos sem toques/cliques/teclas fazem logout automático.
// Para mudar o tempo, ajuste IDLE_LIMIT_MS abaixo (em milissegundos).
const IDLE_LIMIT_MS=10*60*1000;
let _ultimaActividade=Date.now();
['click','touchstart','keydown','mousemove','scroll'].forEach(evt=>{
  window.addEventListener(evt,()=>{_ultimaActividade=Date.now();},{passive:true});
});
setInterval(()=>{
  if((PA||isAdm)&&Date.now()-_ultimaActividade>IDLE_LIMIT_MS){
    PA=null;isAdm=false;db=[];dBol=[];
    document.getElementById('app').style.display='none';
    showPinSel();
    toast('Sessão expirada por inactividade. Entre novamente.','info');
  }
},30000);
