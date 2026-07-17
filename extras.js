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
  const dadosOriginais=JSON.stringify({id:PA.id,pin:PA.pin,nome:PA.nome});
  // Codifica em Base64 antes de gerar o QR: a biblioteca de geração de QR usada
  // tem um problema conhecido com certos caracteres (incluindo acentos), que
  // pode corromper o código sem isso ser visível a olho nu — a câmara então
  // não consegue ler, mesmo o código parecendo normal no ecrã. Base64 evita
  // isto por usar sempre um conjunto simples e seguro de caracteres.
  const payload=btoa(unescape(encodeURIComponent(dadosOriginais)));
  document.getElementById('moQRB').innerHTML=`<div style="text-align:center"><div style="font-size:.82rem;color:var(--mu);margin-bottom:11px">Mostre este código para entrar rapidamente sem digitar o PIN — funciona neste dispositivo, e também para <b>levar o seu perfil para outro telemóvel</b> (as notas já lançadas continuam a aparecer).</div><div id="qrCanvasHolder" style="display:inline-block;background:#fff;padding:12px;border-radius:12px"></div><div style="font-size:.68rem;color:var(--mu);margin:10px 0 4px">⚠️ Não partilhe este código — ele dá acesso ao seu perfil.</div><div class="fl" style="text-align:left;margin-top:9px">Sem câmara? Copie este código de texto:</div><textarea class="fi" readonly onclick="this.select()" style="font-size:.68rem;resize:none" rows="2">${payload}</textarea></div>`;
  document.getElementById('moQR').classList.add('open');
  const holder=document.getElementById('qrCanvasHolder');
  holder.innerHTML='';
  new QRCode(holder,{text:payload,width:180,height:180,colorDark:'#0f1923',colorLight:'#ffffff'});
}

let qrStream=null;
function abrirLeitorQR(){
  garantirJsQR(()=>{
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
  });
}

// Garante que a biblioteca jsQR está disponível antes de usar a câmara/galeria.
// Se o servidor principal (jsdelivr) falhar, tenta automaticamente um segundo
// servidor (cdnjs) antes de desistir — cobre casos de rede instável.
let _jsQRTentativaFeita=false;
function garantirJsQR(callback){
  if(typeof jsQR!=='undefined'){callback();return}
  if(_jsQRTentativaFeita){
    toast('A biblioteca de leitura de QR não carregou (ligação lenta ou instável). Recarregue a página e tente novamente.','error');
    return;
  }
  _jsQRTentativaFeita=true;
  toast('A preparar leitor de QR...','info');
  const s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
  s.onload=()=>{
    if(typeof jsQR!=='undefined')callback();
    else toast('Não foi possível carregar a biblioteca de QR. Verifique a internet.','error');
  };
  s.onerror=()=>toast('Não foi possível carregar a biblioteca de QR. Verifique a internet.','error');
  document.head.appendChild(s);
}
function fecharLeitorQR(){
  if(qrStream){qrStream.getTracks().forEach(t=>t.stop());qrStream=null}
  closeModal('moQRScan');
}
let _ultimoQRLido=null;
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
    const code=jsQR(imgData.data,imgData.width,imgData.height);
    if(code&&code.data!==_ultimoQRLido){
      _ultimoQRLido=code.data;
      fecharLeitorQR();
      handleQRDetectado(code.data);
      return;
    }
  }
  requestAnimationFrame(tickQR);
}

// Processa o texto lido de um QR (venha da câmara ou de uma imagem da galeria)
// ── IMPORTAR PERFIL POR CÓDIGO DE TEXTO (alternativa sem câmara) ──
function abrirImportarCodigo(){
  document.getElementById('importCodInput').value='';
  document.getElementById('moImportCod').classList.add('open');
}
function importarPorCodigo(){
  const texto=document.getElementById('importCodInput').value.trim();
  if(!texto){toast('Cole o código primeiro!','error');return}
  closeModal('moImportCod');
  handleQRDetectado(texto);
}

function handleQRDetectado(qrTexto){
  let d;
  try{
    // Formato novo: texto vem codificado em Base64 (mais seguro para QR)
    d=JSON.parse(decodeURIComponent(escape(atob(qrTexto))));
  }catch(e1){
    try{
      // Formato antigo (códigos gerados antes desta correcção): texto simples
      d=JSON.parse(qrTexto);
    }catch(e2){
      toast('Código lido não é um QR válido do Sistema C.P.A.','error');
      return;
    }
  }
  try{
    if(!d.id||!d.pin){throw new Error('formato inválido')}
    const profs=gProfs();
    let p=profs.find(x=>x.id===d.id&&x.pin===d.pin);
    if(p){
      activateProf(p);
      toast('Entrada por QR bem-sucedida!','success');
      return;
    }
    // Perfil não existe neste dispositivo: se o QR trouxer o nome, é um QR
    // de "levar perfil" — importa-o mantendo o mesmo ID, para que os dados
    // já sincronizados no Firebase reapareçam automaticamente.
    if(d.nome){
      cfm(`Importar o perfil de "${d.nome}" para este dispositivo? As notas já lançadas por este professor vão aparecer automaticamente assim que houver internet.`,()=>{
        const novoPerfil={id:d.id,pin:d.pin,nome:d.nome,av:d.av||'👨‍🏫'};
        profs.push(novoPerfil);
        sProfs(profs);
        activateProf(novoPerfil);
        logAct('Perfil importado via QR',d.nome);
        toast('Perfil importado! A sincronizar os dados...','success');
      },'📲','Importar Perfil de Professor','📲 Importar','bc');
    }else{
      toast('Este QR não corresponde a nenhum perfil neste dispositivo.','error');
    }
  }catch(e){
    toast('Código lido não é um QR válido do Sistema C.P.A.','error');
  }
}

// Carregar uma imagem da galeria em vez de usar a câmara
function lerQRDaGaleria(evt){
  const file=evt.target.files[0];
  if(!file)return;
  garantirJsQR(()=>{
    const r=new FileReader();
    r.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=img.width;canvas.height=img.height;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);
        const code=jsQR(imgData.data,imgData.width,imgData.height);
        if(code){
          fecharLeitorQR();
          handleQRDetectado(code.data);
        }else{
          toast('Não foi possível encontrar um QR nesta imagem. Tente outra foto, mais nítida.','error');
        }
      };
      img.onerror=()=>toast('Não foi possível abrir esta imagem.','error');
      img.src=e.target.result;
    };
    r.readAsDataURL(file);
  });
}

// Aplica o estado do Modo de Exame assim que o perfil é activado
const _origActivateProf=activateProf;
activateProf=function(prof){_origActivateProf(prof);applyExamModeUI();};
const _origActivateAdm=activateAdm;
activateAdm=function(){_origActivateAdm();applyExamModeUI();};
