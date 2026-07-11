/* ============================================================
   MÓDULO: EXTRAS.JS — Modo de Exame + Entrada por QR Code
   Fase 1 — Sistema C.P.A
   Depende das bibliotecas CDN: qrcode.min.js (geração) e jsQR (leitura)
   ============================================================ */

// ── MODO DE EXAME ──
// Bloqueia a navegação (drawer + bottom-nav) para evitar que o aluno,
// ao usar o dispositivo do professor durante um teste, aceda a notas ou dados.
// Para sair, é necessário re-inserir o PIN do perfil activo.
function isExamMode(){return localStorage.getItem('cpa_exam')==='1'}

function toggleExamMode(){
  if(isExamMode()){
    abrirPinSairExame();
  }else{
    cfm('Isto vai ocultar a navegação e bloquear o acesso a notas/histórico até introduzir novamente o seu PIN. Use isto ao entregar o dispositivo a um aluno durante um teste.',()=>{
      localStorage.setItem('cpa_exam','1');
      applyExamModeUI();
      logAct('Modo de Exame activado');
      toast('🔒 Modo de Exame activado.','warn');
    },'🔒','Activar Modo de Exame','🔒 Activar','bg2');
  }
}

// Modal próprio para sair do Modo de Exame — não usa window.prompt(), porque
// muitos navegadores/apps embutidos (WebViews) bloqueiam-no silenciosamente,
// fazendo parecer que o botão "não faz nada".
function injectExamPinModal(){
  if(document.getElementById('moExamPin'))return;
  const div=document.createElement('div');
  div.className='mo';
  div.id='moExamPin';
  div.style.alignItems='center';
  div.innerHTML=`<div class="md" style="border-radius:17px;max-width:305px;text-align:center;padding:22px 17px;max-height:none">
    <div style="font-size:2rem;margin-bottom:7px">🔒</div>
    <div style="font-weight:800;font-size:.95rem;margin-bottom:11px">Insira o PIN para desactivar o Modo de Exame</div>
    <input type="password" inputmode="numeric" maxlength="4" id="examPinInput" class="fi" style="text-align:center;font-size:1.3rem;letter-spacing:8px;margin-bottom:6px" placeholder="••••">
    <div id="examPinErr" style="color:var(--dg);font-size:.72rem;min-height:16px;margin-bottom:8px"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn bl" onclick="document.getElementById('moExamPin').classList.remove('open')">✕ Cancelar</button>
      <button class="btn bg2" onclick="confirmarSairExame()">🔓 Desactivar</button>
    </div>
  </div>`;
  document.body.appendChild(div);
}
function abrirPinSairExame(){
  injectExamPinModal();
  document.getElementById('examPinErr').textContent='';
  document.getElementById('examPinInput').value='';
  document.getElementById('moExamPin').classList.add('open');
  setTimeout(()=>document.getElementById('examPinInput')?.focus(),100);
}
function confirmarSairExame(){
  const pin=document.getElementById('examPinInput').value;
  const chk=isAdm?gAdm()?.pin:PA?.pin;
  if(!chk){
    // Ninguém tinha sessão activa (ex: app acabou de ser aberta) — pede para
    // qualquer PIN de professor ou do admin cadastrado, para não deixar o
    // dispositivo permanentemente bloqueado.
    const admPin=gAdm()?.pin;
    const profs=gProfs();
    const valido=pin===admPin||profs.some(p=>p.pin===pin);
    if(!valido){document.getElementById('examPinErr').textContent='PIN incorrecto!';return}
  }else if(pin!==chk){
    document.getElementById('examPinErr').textContent='PIN incorrecto!';
    return;
  }
  localStorage.setItem('cpa_exam','0');
  document.getElementById('moExamPin').classList.remove('open');
  applyExamModeUI();
  logAct('Modo de Exame desactivado');
  toast('Modo de Exame desactivado.','success');
}

function applyExamModeUI(){
  const active=isExamMode();
  const bn=document.querySelector('.bottom-nav');
  const drawerBtn=document.querySelector('header .hb[onclick="openDrawer()"]')||[...document.querySelectorAll('header .hb')].find(b=>b.getAttribute('onclick')==='openDrawer()');
  if(bn)bn.style.display=active?'none':'flex';
  if(drawerBtn)drawerBtn.style.display=active?'none':'inline-flex';
  let banner=document.getElementById('examBanner');
  if(active){
    if(!banner){
      banner=document.createElement('div');
      banner.id='examBanner';
      banner.style.cssText='background:linear-gradient(90deg,#ef4444,#b91c1c);color:#fff;text-align:center;padding:9px 6px;font-size:.7rem;font-weight:700;flex-shrink:0;cursor:pointer';
      banner.innerHTML='🔒 MODO DE EXAME ACTIVO — toque aqui para desactivar';
      banner.onclick=toggleExamMode;
      const app=document.getElementById('app');
      app.insertBefore(banner,app.querySelector('.content'));
    }
    // trava apenas na secção actual: esconde outras secções ao tentar goto()
    goto('cpa',0);
  }else if(banner){
    banner.remove();
  }
}

// ── ENTRADA POR QR CODE ──
// Cada professor pode gerar um QR (a partir do Perfil) que codifica {id, pin}.
// Na tela de selecção de PIN, o botão "Entrar com QR" abre a câmara e,
// ao detectar o código, entra automaticamente no perfil.

function gerarMeuQR(){
  if(!PA){toast('Disponível apenas para perfis de Professor.','error');return}
  if(typeof QRCode==='undefined'){toast('Biblioteca de QR não carregada.','error');return}
  const payload=JSON.stringify({id:PA.id,pin:PA.pin});
  document.getElementById('moQRB').innerHTML=`<div style="text-align:center"><div style="font-size:.82rem;color:var(--mu);margin-bottom:11px">Mostre este código para entrar rapidamente sem digitar o PIN.</div><div id="qrCanvasHolder" style="display:inline-block;background:#fff;padding:12px;border-radius:12px"></div><div style="font-size:.68rem;color:var(--mu);margin-top:10px">⚠️ Não partilhe este código — ele dá acesso ao seu perfil.</div></div>`;
  document.getElementById('moQR').classList.add('open');
  const holder=document.getElementById('qrCanvasHolder');
  holder.innerHTML='';
  new QRCode(holder,{text:payload,width:180,height:180,colorDark:'#0f1923',colorLight:'#ffffff'});
}

let qrStream=null;
function abrirLeitorQR(){
  document.getElementById('moQRScan').classList.add('open');
  const video=document.getElementById('qrVideo');
  navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(stream=>{
    qrStream=stream;
    video.srcObject=stream;
    video.play();
    requestAnimationFrame(tickQR);
  }).catch(()=>{
    toast('Não foi possível aceder à câmara.','error');
    closeModal('moQRScan');
  });
}
function fecharLeitorQR(){
  if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null}
  closeModal('moQRScan');
}
function tickQR(){
  const modal=document.getElementById('moQRScan');
  if(!modal||!modal.classList.contains('open'))return;
  const video=document.getElementById('qrVideo');
  const canvas=document.getElementById('qrCanvas');
  if(video.readyState===video.HAVE_ENOUGH_DATA){
    canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
    if(typeof jsQR!=='undefined'){
      const code=jsQR(imgData.data,imgData.width,imgData.height);
      if(code){
        try{
          const d=JSON.parse(code.data);
          const profs=gProfs();
          const p=profs.find(x=>x.id===d.id&&x.pin===d.pin);
          if(p){
            fecharLeitorQR();
            activateProf(p);
            toast('Entrada por QR bem-sucedida!','success');
            return;
          }
        }catch(e){}
      }
    }
  }
  requestAnimationFrame(tickQR);
}

// Aplica o estado do Modo de Exame assim que o perfil é activado
const _origActivateProf=activateProf;
activateProf=function(prof){_origActivateProf(prof);applyExamModeUI();};
const _origActivateAdm=activateAdm;
activateAdm=function(){_origActivateAdm();applyExamModeUI();};
