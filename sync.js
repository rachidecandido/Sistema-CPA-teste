/* ============================================================
   SYNC.JS — Sincronização com Firebase + Encarregados de Educação
   Fase 2 — Sistema C.P.A
   Depende de: firebase-config.js (fbDB), index.html (PA, db, dBol, saveDB, saveBolDB, toast, logAct)
   ============================================================ */

// ── ESTADO DE SINCRONIZAÇÃO ──
let syncEmAndamento=false;
function marcarSyncUI(status,detalhe){
  let el=document.getElementById('syncBadge');
  if(!el){
    el=document.createElement('div');
    el.id='syncBadge';
    el.style.cssText='position:fixed;top:8px;right:8px;z-index:9997;font-size:.6rem;padding:3px 8px;border-radius:12px;font-weight:700;transition:.3s';
    document.body.appendChild(el);
  }
  if(status==='ok'){el.textContent='☁️ Sincronizado';el.style.background='rgba(16,185,129,.85)';el.style.color='#fff';setTimeout(()=>{if(el)el.style.opacity='0'},2500);}
  else if(status==='syncing'){el.style.opacity='1';el.textContent='🔄 A sincronizar...';el.style.background='rgba(0,153,255,.85)';el.style.color='#fff';}
  else if(status==='off'){el.style.opacity='1';el.textContent='📵 Sem ligação — guardado localmente';el.style.background='rgba(245,158,11,.9)';el.style.color='#222';}
  else if(status==='error'){el.style.opacity='1';el.textContent='⚠️ Erro: '+(detalhe||'sincronização');el.style.background='rgba(239,68,68,.9)';el.style.color='#fff';}
}

// ── ENVIAR UM ALUNO (CPA ou BOLETIM) PARA O FIRESTORE ──
// Protegido contra conflitos: se este mesmo professor tiver editado o mesmo
// aluno noutro dispositivo mais recentemente, NÃO sobrescreve — em vez disso
// traz essa versão mais recente para este dispositivo. Isto evita que, ao
// usar o Sistema C.P.A em dois telemóveis, uma alteração feita num apague
// silenciosamente uma alteração mais recente feita no outro.
async function syncAlunoToFirebase(entry,tipo){
  if(!PA)return;
  try{
    marcarSyncUI('syncing');
    const docId=`${PA.id}_${tipo}_${entry.id}`;
    const ref=fbDB.collection('alunos').doc(docId);
    const existente=await ref.get();
    if(existente.exists){
      const remoto=existente.data();
      const remotoTs=remoto.updatedAt&&remoto.updatedAt.toMillis?remoto.updatedAt.toMillis():0;
      const localTs=entry._syncedAt||0;
      if(remotoTs>localTs+2000){ // margem de 2s para evitar falsos positivos do próprio dispositivo
        aplicarVersaoRemotaLocal(remoto,tipo);
        marcarSyncUI('ok');
        toast('⚠️ Este aluno tinha uma alteração mais recente feita noutro dispositivo — foi mantida essa versão.','info');
        return;
      }
    }
    await ref.set({
      ...entry,
      tipo,
      professorId:PA.id,
      professorNome:PA.nome,
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    },{merge:true});
    entry._syncedAt=Date.now();
    marcarSyncUI('ok');
    // se for boletim e o aluno reprovou, cria notificação para o encarregado (se vinculado)
    if(tipo==='bol'&&entry.apv===false&&entry.encEmail){
      await criarNotificacaoEncarregado(entry.encEmail,entry.nm,`⚠️ ${entry.nm} obteve média ${entry.mg?.toFixed(1)} e está em situação de REPROVADO no período ${entry.pd||''}.`);
    }
  }catch(e){
    console.error(e);
    marcarSyncUI(navigator.onLine?'error':'off',e.message||e.code);
  }
}

// Aplica localmente uma versão vinda do Firebase (usada quando se detecta que
// o servidor tem dados mais recentes do que os deste dispositivo)
function aplicarVersaoRemotaLocal(remoto,tipo){
  remoto._syncedAt=Date.now();
  if(tipo==='cpa'&&typeof db!=='undefined'){
    const idx=db.findIndex(x=>x.id===remoto.id);
    if(idx>=0)db[idx]=remoto;else db.push(remoto);
    localStorage.setItem(dbK(PA.id),JSON.stringify(db));
  }else if(tipo==='bol'&&typeof dBol!=='undefined'){
    const idx=dBol.findIndex(x=>x.id===remoto.id);
    if(idx>=0)dBol[idx]=remoto;else dBol.push(remoto);
    localStorage.setItem(dbBK(PA.id),JSON.stringify(dBol));
  }
  if(typeof renderDB==='function')renderDB();
}

// ── PUXAR TODOS OS ALUNOS DO PROFESSOR ACTUAL DO FIRESTORE ──
async function pullAlunosFromFirebase(){
  if(!PA)return;
  try{
    marcarSyncUI('syncing');
    const snap=await fbDB.collection('alunos').where('professorId','==',PA.id).get();
    snap.forEach(doc=>{
      const d=doc.data();
      d._syncedAt=Date.now();
      if(d.tipo==='cpa'){
        const idx=db.findIndex(x=>x.id===d.id);
        if(idx>=0)db[idx]={...db[idx],...d};else db.push(d);
      }else if(d.tipo==='bol'){
        const idx=dBol.findIndex(x=>x.id===d.id);
        if(idx>=0)dBol[idx]={...dBol[idx],...d};else dBol.push(d);
      }
    });
    saveDB();saveBolDB();
    marcarSyncUI('ok');
  }catch(e){
    console.error(e);
    marcarSyncUI(navigator.onLine?'error':'off',e.message||e.code);
  }
}

// ── LIGA A SINCRONIZAÇÃO AUTOMÁTICA AOS PONTOS DE GRAVAÇÃO EXISTENTES ──
const _origSaveDB=saveDB;
saveDB=function(){
  _origSaveDB();
  // Sincroniza TODOS os registos, não só o último — corrige um erro em que
  // alterações a alunos que não fossem o último do array nunca chegavam ao
  // Firestore (ex: vincular encarregado/PIN a um aluno lançado há mais tempo).
  db.forEach(entry=>syncAlunoToFirebase(entry,'cpa'));
};
const _origSaveBolDB=saveBolDB;
saveBolDB=function(){
  _origSaveBolDB();
  dBol.forEach(entry=>syncAlunoToFirebase(entry,'bol'));
};
// Puxa dados assim que o professor entra no perfil
const _origActivateProf2=activateProf;
activateProf=function(prof){_origActivateProf2(prof);pullAlunosFromFirebase();};

// ── SINCRONIZAR PAUTA DE TURMA (usada por pauta.js) ──
async function syncPautaFirebase(alunosArray){
  for(const a of alunosArray)await syncAlunoToFirebase(a,'bol');
}

// ── ESCOLA (dados partilhados entre todos os professores) ──
async function syncEscolaFirebase(escola){
  try{await fbDB.collection('config').doc('escola').set(escola,{merge:true});}catch(e){console.error(e);}
}
async function pullEscolaFirebase(){
  try{
    const doc=await fbDB.collection('config').doc('escola').get();
    if(doc.exists){sEscola(doc.data());if(typeof renderEscola==='function')renderEscola();}
  }catch(e){console.error(e);}
}
const _origSalvarEscola=typeof salvarEscola==='function'?salvarEscola:null;
if(_origSalvarEscola){
  salvarEscola=function(){
    _origSalvarEscola();
    const e=gEscola();
    if(e)syncEscolaFirebase(e);
  };
}

// ── TURMAS (sincronizadas entre dispositivos) ──
async function syncTurmasFirebase(){
  try{
    const turmas=gTurmas();
    if(!turmas.length)return;
    const batch=fbDB.batch();
    turmas.forEach(t=>batch.set(fbDB.collection('turmas').doc(String(t.id)),t,{merge:true}));
    await batch.commit();
  }catch(e){console.error(e);}
}
async function pullTurmasFirebase(){
  try{
    const snap=await fbDB.collection('turmas').get();
    if(snap.empty)return;
    const locais=gTurmas();
    snap.forEach(doc=>{
      const remota=doc.data();
      const idx=locais.findIndex(t=>String(t.id)===doc.id);
      if(idx>=0)locais[idx]=remota;else locais.push(remota);
    });
    _origSTurmas(locais);
    if(typeof renderTurmas==='function')renderTurmas();
  }catch(e){console.error(e);}
}
const _origSTurmas=typeof sTurmas==='function'?sTurmas:null;
if(_origSTurmas){
  sTurmas=function(t){_origSTurmas(t);syncTurmasFirebase();};
}

// ── CALENDÁRIO ESCOLAR (sincronizado entre dispositivos) ──
async function syncCalendarioFirebase(){
  try{
    const eventos=gCalEventos();
    if(!eventos.length)return;
    const batch=fbDB.batch();
    eventos.forEach(ev=>batch.set(fbDB.collection('calendario').doc(String(ev.id)),ev,{merge:true}));
    await batch.commit();
  }catch(e){console.error(e);}
}
async function pullCalendarioFirebase(){
  try{
    const snap=await fbDB.collection('calendario').get();
    if(snap.empty)return;
    const locais=gCalEventos();
    snap.forEach(doc=>{
      const remoto=doc.data();
      const idx=locais.findIndex(ev=>String(ev.id)===doc.id);
      if(idx>=0)locais[idx]=remoto;else locais.push(remoto);
    });
    _origSCalEventos(locais);
    if(typeof renderListaCal==='function')renderListaCal();
  }catch(e){console.error(e);}
}
const _origSCalEventos=typeof sCalEventos==='function'?sCalEventos:null;
if(_origSCalEventos){
  sCalEventos=function(e){_origSCalEventos(e);syncCalendarioFirebase();};
}

// ── BANCO DE PERGUNTAS/TESTES (sincronizado entre dispositivos) ──
async function syncPerguntasFirebase(){
  try{
    const perguntas=gPerguntas();
    if(!perguntas.length)return;
    const batch=fbDB.batch();
    perguntas.forEach(p=>batch.set(fbDB.collection('perguntas').doc(String(p.id)),p,{merge:true}));
    await batch.commit();
  }catch(e){console.error(e);}
}
async function pullPerguntasFirebase(){
  try{
    const snap=await fbDB.collection('perguntas').get();
    if(snap.empty)return;
    const locais=gPerguntas();
    snap.forEach(doc=>{
      const remota=doc.data();
      const idx=locais.findIndex(p=>String(p.id)===doc.id);
      if(idx>=0)locais[idx]=remota;else locais.push(remota);
    });
    _origSPerguntas(locais);
    if(typeof renderBancoPerguntas==='function')renderBancoPerguntas();
  }catch(e){console.error(e);}
}
const _origSPerguntas=typeof sPerguntas==='function'?sPerguntas:null;
if(_origSPerguntas){
  sPerguntas=function(p){_origSPerguntas(p);syncPerguntasFirebase();};
}

// ── PROPINAS/PAGAMENTOS (sincronizados entre dispositivos) ──
async function syncPropinasFirebase(){
  try{
    const propinas=gPropinas();
    if(!propinas.length)return;
    const batch=fbDB.batch();
    propinas.forEach(p=>batch.set(fbDB.collection('propinas').doc(String(p.id)),p,{merge:true}));
    await batch.commit();
  }catch(e){console.error(e);}
}
async function pullPropinasFirebase(){
  try{
    const snap=await fbDB.collection('propinas').get();
    if(snap.empty)return;
    const locais=gPropinas();
    snap.forEach(doc=>{
      const remota=doc.data();
      const idx=locais.findIndex(p=>String(p.id)===doc.id);
      if(idx>=0)locais[idx]=remota;else locais.push(remota);
    });
    _origSPropinas(locais);
    if(typeof renderListaPropinas==='function')renderListaPropinas();
  }catch(e){console.error(e);}
}
const _origSPropinas=typeof sPropinas==='function'?sPropinas:null;
if(_origSPropinas){
  sPropinas=function(p){_origSPropinas(p);syncPropinasFirebase();};
}

// Puxa Turmas, Calendário, Perguntas e Propinas assim que o professor ou admin entra
const _origActivateProf6=activateProf;
activateProf=function(prof){_origActivateProf6(prof);pullPropinasFirebase();};
const _origActivateAdm5=activateAdm;
activateAdm=function(){_origActivateAdm5();pullPropinasFirebase();};

// Puxa Turmas, Calendário e Perguntas assim que o professor ou admin entra
const _origActivateProf5=activateProf;
activateProf=function(prof){_origActivateProf5(prof);pullTurmasFirebase();pullCalendarioFirebase();pullPerguntasFirebase();};
const _origActivateAdm4=activateAdm;
activateAdm=function(){_origActivateAdm4();pullTurmasFirebase();pullCalendarioFirebase();pullPerguntasFirebase();};

// ── VINCULAR ENCARREGADO DE EDUCAÇÃO A UM ALUNO ──
// Chamado a partir do Boletim: guarda o email do encarregado no registo do aluno
// para que ele possa vê-lo no Portal do Encarregado.
function vincularEncarregado(alunoId,email){
  const idx=dBol.findIndex(x=>x.id===alunoId);
  if(idx<0){toast('Aluno não encontrado!','error');return}
  dBol[idx].encEmail=email.trim().toLowerCase();
  saveBolDB();
  logAct('Encarregado vinculado',dBol[idx].nm+' — '+email);
  toast('Encarregado vinculado! O aluno já pode ser visto no Portal do Encarregado.','success');
}

// Activa o acesso do próprio aluno ao Portal do Aluno (login por Matrícula + PIN)
function definirAcessoAluno(alunoId,matricula,pin){
  const idx=dBol.findIndex(x=>x.id===alunoId);
  if(idx<0){toast('Aluno não encontrado!','error');return}
  matricula=matricula.trim();
  pin=pin.trim();
  if(!matricula){toast('Insira o número de matrícula!','error');return}
  if(!/^\d{4}$/.test(pin)){toast('O PIN deve ter exactamente 4 dígitos!','error');return}
  dBol[idx].mt=matricula;
  dBol[idx].alunoPin=pin;
  saveBolDB();
  logAct('Acesso do aluno activado',dBol[idx].nm+' — matrícula '+matricula);
  toast('Acesso do aluno activado! Ele já pode entrar no Portal do Aluno.','success');
}

async function criarNotificacaoEncarregado(email,alunoNome,texto){
  try{
    await fbDB.collection('notificacoes').add({
      encEmail:email,
      alunoNome,
      texto,
      lida:false,
      data:firebase.firestore.FieldValue.serverTimestamp()
    });
  }catch(e){console.error(e);}
}

// ── SECÇÃO "MENSAGENS" (chamada pelo router goto()) ──
function renderMensagensSection(){
  const el=document.getElementById('sec-msg');
  if(!el)return;
  el.innerHTML=`<div class="card"><div class="ct">💬 Mensagens com Encarregados</div><div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Vincule o email do encarregado em Boletim → ver aluno, para poder conversar aqui.</div><div id="msgProfList"></div></div>`;
  renderMensagensProfessor();
}

// Lista de conversas visíveis ao professor (uma por aluno com encarregado vinculado)
function renderMensagensProfessor(){
  const container=document.getElementById('msgProfList');
  if(!container)return;
  const comEncarregado=dBol.filter(b=>b.encEmail);
  if(!comEncarregado.length){container.innerHTML='<div class="empty">Nenhum aluno tem encarregado vinculado ainda. Vincule em Boletim → detalhes do aluno.</div>';return}
  container.innerHTML=comEncarregado.map(a=>`<div class="hi" style="cursor:pointer" onclick="abrirConversaProf(${a.id},'${a.encEmail}','${a.nm.replace(/'/g,"\\'")}')"><div style="flex:1;min-width:0"><div class="hn">${a.nm}</div><div class="hm">👪 ${a.encEmail}</div></div><div class="ic">💬</div></div>`).join('');
}

let convAlunoIdAtual=null,convEncEmailAtual=null;
async function abrirConversaProf(alunoId,encEmail,nomeAluno){
  convAlunoIdAtual=alunoId;convEncEmailAtual=encEmail;
  document.getElementById('moMsgB').innerHTML=`<div style="font-size:.85rem;font-weight:700;margin-bottom:9px">💬 ${nomeAluno} — ${encEmail}</div><div id="msgThread" style="max-height:280px;overflow-y:auto;margin-bottom:10px"></div><div style="display:flex;gap:7px"><input class="fi" id="msgTexto" type="text" placeholder="Escrever mensagem..." style="flex:1"><button class="btn bc" style="width:auto;padding:9px 13px" onclick="enviarMensagemProf()">➤</button></div>`;
  document.getElementById('moMsg').classList.add('open');
  await carregarConversa(alunoId);
}
async function carregarConversa(alunoId){
  const thread=document.getElementById('msgThread');
  if(!thread)return;
  thread.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('mensagens').where('alunoId','==',alunoId).limit(100).get();
    if(snap.empty){thread.innerHTML='<div class="empty">Sem mensagens ainda.</div>';return}
    const docsOrdenados=snap.docs.sort((a,b)=>(a.data().data?.seconds||0)-(b.data().data?.seconds||0));
    thread.innerHTML=docsOrdenados.map(doc=>{
      const m=doc.data();
      const minha=m.de==='professor';
      const hora=m.data?.toDate?m.data.toDate().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
      return `<div style="text-align:${minha?'right':'left'};margin-bottom:9px"><span style="display:inline-block;background:${minha?'var(--ac)':'var(--c2)'};color:${minha?'#0f1923':'var(--tx)'};padding:7px 11px;border-radius:12px;font-size:.78rem;max-width:80%">${m.texto}</span><div style="font-size:.62rem;color:var(--mu);margin-top:2px">${hora}</div></div>`;
    }).join('');
    thread.scrollTop=thread.scrollHeight;
  }catch(e){thread.innerHTML='<div class="empty">Erro: '+(e.message||e.code||'falha desconhecida')+'</div>';console.error(e);}
}
async function enviarMensagemProf(){
  const texto=document.getElementById('msgTexto').value.trim();
  if(!texto||!convAlunoIdAtual)return;
  try{
    await fbDB.collection('mensagens').add({
      alunoId:convAlunoIdAtual,
      encEmail:convEncEmailAtual,
      de:'professor',
      remetenteNome:PA?.nome||'Professor',
      texto,
      data:firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('msgTexto').value='';
    carregarConversa(convAlunoIdAtual);
  }catch(e){toast('Erro ao enviar mensagem.','error');console.error(e);}
}
