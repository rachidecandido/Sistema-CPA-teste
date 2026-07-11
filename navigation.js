/* ============================================================
   NAVIGATION.JS — Navegação Profissional + Confirmação de Saída
   Fase 5 — Sistema C.P.A
   Depende de: index.html (goto, PA, isAdm)
   ------------------------------------------------------------
   Comportamento do botão "Voltar" do telemóvel/navegador:
   - Anda passo a passo pelas secções realmente visitadas (como
     um aplicativo nativo profissional), não salta logo para a
     página inicial.
   - Quando já não há mais nada no histórico (voltou tudo), pergunta
     se quer sair do aplicativo.
   ============================================================ */

const HOME_SEC='cpa',HOME_TAB=0;
let _navFromPop=false;
let _secAtualNav=HOME_SEC;

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

function respExit(sair){
  document.getElementById('moExit').classList.remove('open');
  if(!sair){
    // o utilizador quer ficar: recria uma barreira no histórico para o próximo "voltar"
    history.pushState({sec:HOME_SEC,ti:HOME_TAB},'','');
  }
  // se sair=true, não fazemos nada: a navegação de saída já tinha ocorrido
  // e ao não recolocarmos uma barreira, o próximo "voltar" sai mesmo do app.
}

function initExitGuard(){
  injectExitModal();
  _secAtualNav=HOME_SEC;
  history.replaceState({sec:HOME_SEC,ti:HOME_TAB},'','');
}

// ── EMPILHA UMA NOVA SECÇÃO NO HISTÓRICO ──
// Chamado sempre que o utilizador navega para uma secção diferente da actual
// (via menu ☰, barra inferior, ou qualquer botão), para que o "Voltar" possa
// desfazer esse passo especificamente — como um aplicativo nativo.
const _origGoto=goto;
goto=function(sec,ti){
  _origGoto(sec,ti);
  if(!(PA||isAdm))return;
  if(!_navFromPop&&sec!==_secAtualNav){
    history.pushState({sec,ti},'','');
  }
  _navFromPop=false;
  _secAtualNav=sec;
  atualizarDestaqueDrawer(sec);
};

window.addEventListener('popstate',function(e){
  if(!(PA||isAdm))return; // ninguém autenticado: comportamento normal do navegador
  if(e.state&&e.state.sec){
    _navFromPop=true;
    goto(e.state.sec,e.state.ti);
  }else{
    // histórico esgotado: pergunta se quer sair
    document.getElementById('moExit').classList.add('open');
  }
});

// Sempre que o utilizador entra num perfil (professor ou admin), inicia a guarda de saída
const _origActivateProf3=activateProf;
activateProf=function(prof){_origActivateProf3(prof);initExitGuard();};
const _origActivateAdm2=activateAdm;
activateAdm=function(){_origActivateAdm2();initExitGuard();};

// ── DESTACA NO MENU ☰ A SECÇÃO ONDE SE ESTÁ ──
function atualizarDestaqueDrawer(sec){
  document.querySelectorAll('.di').forEach(b=>b.classList.remove('di-active'));
  const alvo=[...document.querySelectorAll('.di')].find(b=>{
    const onclick=b.getAttribute('onclick')||'';
    return onclick.includes(`goto('${sec}'`)||onclick.includes(`goto("${sec}"`);
  });
  if(alvo)alvo.classList.add('di-active');
}

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
