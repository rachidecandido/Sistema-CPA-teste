/* ============================================================
   MÓDULO: VISITANTE.JS — Modo Visitante/Inspector (só leitura)
   Fase 12 — Sistema C.P.A
   ------------------------------------------------------------
   Útil para mostrar o sistema a um inspector do Ministério da
   Educação (ou qualquer visita) sem risco de alterarem dados
   por engano. Bloqueia as funções de gravação mais usadas —
   continua a dar-se a navegar e a ver tudo normalmente.
   ============================================================ */

function isModoVisitante(){return localStorage.getItem('cpa_visitante')==='1'}

function renderModoVisitante(){
  const el=document.getElementById('visitanteWrap');
  if(!el)return;
  const activo=isModoVisitante();
  el.innerHTML=`
  <div class="card"><div class="ct">👁️ Modo Visitante/Inspector</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Bloqueia a gravação de alterações (notas, turmas, calendário, propinas, testes, etc.) — útil para mostrar o sistema a um inspector ou visita, sem risco de mexerem em dados por engano. A navegação continua normal.</div>
    ${activo
      ?'<button class="btn bd" style="width:100%" onclick="desactivarModoVisitante()">🔓 Desactivar Modo Visitante</button>'
      :'<button class="btn bg2" style="width:100%" onclick="activarModoVisitante()">👁️ Activar Modo Visitante</button>'}
  </div>`;
}

function activarModoVisitante(){
  cfm('Isto vai bloquear a gravação de qualquer alteração (notas, turmas, calendário, propinas, testes, dados da escola) até desactivar. A navegação e visualização continuam normais.',()=>{
    localStorage.setItem('cpa_visitante','1');
    logAct('Modo Visitante activado');
    toast('👁️ Modo Visitante activado — alterações estão bloqueadas.','warn');
    renderModoVisitante();
    atualizarFaixaVisitante();
  },'👁️','Activar Modo Visitante','👁️ Activar','bg2');
}

function desactivarModoVisitante(){
  localStorage.setItem('cpa_visitante','0');
  logAct('Modo Visitante desactivado');
  toast('Modo Visitante desactivado.','success');
  renderModoVisitante();
  atualizarFaixaVisitante();
}

function atualizarFaixaVisitante(){
  let faixa=document.getElementById('faixaVisitante');
  if(isModoVisitante()){
    if(!faixa){
      faixa=document.createElement('div');
      faixa.id='faixaVisitante';
      faixa.style.cssText='background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;text-align:center;padding:6px;font-size:.68rem;font-weight:700;flex-shrink:0';
      faixa.textContent='👁️ MODO VISITANTE — apenas leitura, alterações não são guardadas';
      const app=document.getElementById('app');
      if(app)app.insertBefore(faixa,app.querySelector('.content'));
    }
  }else if(faixa){
    faixa.remove();
  }
}

// Bloqueia o efeito das funções de gravação mais usadas quando o Modo
// Visitante está activo — a acção parece funcionar na hora, mas nada fica
// guardado, e aparece um aviso a lembrar disso.
function protegerContraEscrita(nomeFuncao){
  if(typeof window[nomeFuncao]!=='function')return;
  const original=window[nomeFuncao];
  window[nomeFuncao]=function(...args){
    if(isModoVisitante()){
      toast('👁️ Modo Visitante activo — esta alteração não foi guardada.','warn');
      return;
    }
    return original.apply(this,args);
  };
}
['saveDB','saveBolDB','sTurmas','sCalEventos','sPerguntas','sPropinas','sEscola','sFreq','sProfs'].forEach(protegerContraEscrita);

// Aplica a faixa do Modo Visitante assim que a página carrega, se já estiver activo
if(isModoVisitante())document.addEventListener('DOMContentLoaded',atualizarFaixaVisitante);
const _origActivateProfVisit=activateProf;
activateProf=function(prof){_origActivateProfVisit(prof);atualizarFaixaVisitante();};
const _origActivateAdmVisit=activateAdm;
activateAdm=function(){_origActivateAdmVisit();atualizarFaixaVisitante();};
const _origRenderAdmVis=renderAdm;
renderAdm=function(){_origRenderAdmVis();if(typeof renderModoVisitante==='function')renderModoVisitante();};
