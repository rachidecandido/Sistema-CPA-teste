/* ============================================================
   ENCARREGADO.JS — Portal do Encarregado de Educação
   Fase 2 — Sistema C.P.A
   Depende de: firebase-config.js (fbAuth, fbDB)
   ============================================================ */

let encEmailAtual=null;

function toastEnc(msg,tipo='success'){
  const el=document.createElement('div');
  el.className='toastm'+(tipo==='error'?' error':'');
  el.textContent=msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(),2600);
}

function mostrarErro(msg){
  const e=document.getElementById('errMsg');
  e.textContent=msg;e.style.display='block';
}

// ── AUTENTICAÇÃO ──
function fazerLogin(){
  const email=document.getElementById('authEmail').value.trim();
  const senha=document.getElementById('authSenha').value;
  if(!email||!senha){mostrarErro('Preencha email e palavra-passe.');return}
  document.getElementById('errMsg').style.display='none';
  fbAuth.signInWithEmailAndPassword(email,senha).catch(err=>{
    mostrarErro(traduzErro(err.code));
  });
}
function fazerRegisto(){
  const email=document.getElementById('authEmail').value.trim();
  const senha=document.getElementById('authSenha').value;
  if(!email||!senha){mostrarErro('Preencha email e palavra-passe.');return}
  if(senha.length<6){mostrarErro('A palavra-passe deve ter pelo menos 6 caracteres.');return}
  document.getElementById('errMsg').style.display='none';
  fbAuth.createUserWithEmailAndPassword(email,senha).then(()=>{
    toastEnc('Conta criada com sucesso!');
  }).catch(err=>{
    mostrarErro(traduzErro(err.code));
  });
}
function recuperarSenha(){
  const email=document.getElementById('authEmail').value.trim();
  if(!email){mostrarErro('Insira o seu email primeiro.');return}
  fbAuth.sendPasswordResetEmail(email).then(()=>{
    toastEnc('Email de recuperação enviado!');
  }).catch(err=>mostrarErro(traduzErro(err.code)));
}
function sairConta(){fbAuth.signOut();}

function traduzErro(code){
  const map={
    'auth/invalid-email':'Email inválido.',
    'auth/user-not-found':'Conta não encontrada.',
    'auth/wrong-password':'Palavra-passe incorrecta.',
    'auth/email-already-in-use':'Já existe uma conta com este email. Tente entrar.',
    'auth/weak-password':'Palavra-passe muito fraca (mínimo 6 caracteres).',
    'auth/invalid-credential':'Email ou palavra-passe incorrectos.'
  };
  return map[code]||'Erro: '+code;
}

// ── ESTADO DE SESSÃO ──
fbAuth.onAuthStateChanged(user=>{
  if(user){
    encEmailAtual=user.email.toLowerCase();
    document.getElementById('authArea').style.display='none';
    document.getElementById('appArea').style.display='block';
    document.getElementById('quemEsta').textContent='👤 '+user.email;
    carregarNotificacoes();
    carregarAlunos();
  }else{
    encEmailAtual=null;
    document.getElementById('authArea').style.display='block';
    document.getElementById('appArea').style.display='none';
  }
});

// ── NOTIFICAÇÕES ──
async function carregarNotificacoes(){
  const el=document.getElementById('notifList');
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('notificacoes').where('encEmail','==',encEmailAtual).orderBy('data','desc').limit(20).get();
    if(snap.empty){el.innerHTML='<div class="empty">Sem notificações.</div>';return}
    el.innerHTML=snap.docs.map(doc=>{
      const n=doc.data();
      const dt=n.data?.toDate?n.data.toDate().toLocaleDateString('pt-PT'):'';
      return `<div class="notif">${n.texto}<div style="color:var(--mu);font-size:.66rem;margin-top:4px">${dt}</div></div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar notificações.</div>';console.error(e);}
}

// ── ALUNOS VINCULADOS ──
async function carregarAlunos(){
  const el=document.getElementById('alunosList');
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('alunos').where('encEmail','==',encEmailAtual).where('tipo','==','bol').get();
    if(snap.empty){el.innerHTML='<div class="empty">Nenhum educando vinculado ainda. Peça ao professor para vincular o seu email no Boletim do aluno.</div>';return}
    el.innerHTML=snap.docs.map(doc=>{
      const a=doc.data();
      const situ=a.apv?'apv':'rep';
      const lb=a.apv?'APROVADO':'REPROVADO';
      return `<div class="alunoCard" onclick='abrirDetalheAluno(${JSON.stringify(JSON.stringify(a))},"${doc.id}")'><div class="mg2">${(a.mg||0).toFixed(1)}</div><div class="nm">${a.nm}</div><div class="meta">${[a.tr,a.cl&&a.cl+'ª Classe',a.tn,a.an,a.pd].filter(Boolean).join(' · ')}</div><span class="st ${situ}">${lb}</span></div>`;
    }).join('');
    const turmas=[...new Set(snap.docs.map(doc=>doc.data().tr).filter(Boolean))];
    carregarMateriaisEncarregado(turmas);
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar dados. Verifique a ligação à internet.</div>';console.error(e);}
}

async function carregarMateriaisEncarregado(turmas){
  const el=document.getElementById('matEncList');
  if(!el)return;
  if(!turmas.length){el.innerHTML='<div class="empty">Sem turma associada ainda.</div>';return}
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const resultados=[];
    for(const t of turmas){
      const snap=await fbDB.collection('materiais').where('turma','==',t).get();
      snap.forEach(doc=>resultados.push(doc.data()));
    }
    if(!resultados.length){el.innerHTML='<div class="empty">Nenhum material disponível ainda.</div>';return}
    resultados.sort((a,b)=>(b.data?.seconds||0)-(a.data?.seconds||0));
    el.innerHTML=resultados.map(m=>{
      let acao='';
      if(m.tipo==='link')acao=`<a href="${m.link}" target="_blank">🔗 Abrir Link</a>`;
      else if(m.tipo==='arquivo')acao=`<a href="${m.conteudoBase64}" download="${m.nomeArquivo}">⬇️ Descarregar</a>`;
      else acao=`<span class="abrirTxt" onclick="this.nextElementSibling.style.display='block';this.style.display='none'">📝 Ler Texto</span><div style="display:none;font-size:.76rem;margin-top:6px;white-space:pre-wrap">${m.texto}</div>`;
      return `<div class="matItem"><div class="tt">${m.titulo}</div><div class="ds">${[m.turma,m.disciplina,m.professorNome].filter(Boolean).join(' · ')}</div>${acao}</div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar materiais.</div>';console.error(e);}
}

function abrirDetalheAluno(alunoJSONStr,docId){
  const a=JSON.parse(alunoJSONStr);
  let rows='';
  Object.entries(a.notas||{}).forEach(([disc,n])=>{
    if(!n.t1&&!n.t2&&!n.t3)return;
    rows+=`<tr><td style="padding:6px 4px;font-size:.76rem">${disc}</td><td style="text-align:center;padding:6px 2px;font-size:.76rem">${n.t1||'—'}</td><td style="text-align:center;padding:6px 2px;font-size:.76rem">${n.t2||'—'}</td><td style="text-align:center;padding:6px 2px;font-size:.76rem">${n.t3||'—'}</td><td style="text-align:center;padding:6px 2px;font-size:.76rem;font-weight:700;color:${n.media>=10?'var(--ok)':'var(--dg)'}">${n.media>0?n.media.toFixed(1):'—'}</td></tr>`;
  });
  document.getElementById('moDetalheBody').innerHTML=`
    <div style="font-weight:800;font-size:1rem;margin-bottom:4px">${a.nm}</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:12px">${[a.tr,a.cl&&a.cl+'ª Classe',a.tn,a.an,a.pd].filter(Boolean).join(' · ')}</div>
    <div style="background:var(--c2);border-radius:10px;padding:10px;margin-bottom:12px;text-align:center">
      <div style="font-size:1.6rem;font-weight:800;color:${a.apv?'var(--ok)':'var(--dg)'}">${a.apv?'✅ APROVADO':'❌ REPROVADO'}</div>
      <div style="font-size:.78rem;color:var(--mu);margin-top:2px">Média Global: ${(a.mg||0).toFixed(2)}</div>
    </div>
    ${rows?`<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><thead><tr><th style="text-align:left;font-size:.66rem;color:var(--mu);padding:5px 4px">Disciplina</th><th style="font-size:.66rem;color:var(--mu)">1ºT</th><th style="font-size:.66rem;color:var(--mu)">2ºT</th><th style="font-size:.66rem;color:var(--mu)">3ºT</th><th style="font-size:.66rem;color:var(--mu)">Média</th></tr></thead><tbody>${rows}</tbody></table>`:''}
    <button class="btn" onclick="abrirChatComProfessor(${a.id},'${(a.professorNome||'Professor').replace(/'/g,"\\'")}','${a.nm.replace(/'/g,"\\'")}')">💬 Falar com o Professor</button>
    <button class="btn sec" onclick="closeModalEnc('moDetalhe')">Fechar</button>
  `;
  document.getElementById('moDetalhe').classList.add('open');
}
function closeModalEnc(id){document.getElementById(id).classList.remove('open');}

// ── MENSAGENS (Encarregado ↔ Professor) ──
let chatAlunoId=null;
async function abrirChatComProfessor(alunoId,profNome,alunoNome){
  chatAlunoId=alunoId;
  closeModalEnc('moDetalhe');
  document.getElementById('moChatBody').innerHTML=`
    <div style="font-weight:700;font-size:.86rem;margin-bottom:9px">💬 ${profNome} — sobre ${alunoNome}</div>
    <div id="encThread" style="max-height:280px;overflow-y:auto;margin-bottom:10px"></div>
    <div style="display:flex;gap:7px">
      <input class="fi" id="encMsgTxt" type="text" placeholder="Escrever mensagem..." style="flex:1;margin-bottom:0">
      <button class="btn" style="width:auto;padding:10px 14px;margin-bottom:0" onclick="enviarMensagemEnc()">➤</button>
    </div>
    <button class="btn sec" style="margin-top:10px" onclick="closeModalEnc('moChat')">Fechar</button>
  `;
  document.getElementById('moChat').classList.add('open');
  await carregarChatEnc();
}
async function carregarChatEnc(){
  const thread=document.getElementById('encThread');
  thread.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('mensagens').where('alunoId','==',chatAlunoId).orderBy('data','asc').limit(100).get();
    if(snap.empty){thread.innerHTML='<div class="empty">Sem mensagens ainda. Envie a primeira!</div>';return}
    thread.innerHTML=snap.docs.map(doc=>{
      const m=doc.data();
      const minha=m.de==='encarregado';
      return `<div class="msgBubble" style="text-align:${minha?'right':'left'}"><span style="display:inline-block;background:${minha?'var(--ac)':'var(--c2)'};color:${minha?'#0f1923':'var(--tx)'};padding:7px 11px;border-radius:12px;font-size:.78rem;max-width:80%">${m.texto}</span></div>`;
    }).join('');
    thread.scrollTop=thread.scrollHeight;
  }catch(e){thread.innerHTML='<div class="empty">Erro ao carregar mensagens.</div>';console.error(e);}
}
async function enviarMensagemEnc(){
  const texto=document.getElementById('encMsgTxt').value.trim();
  if(!texto||!chatAlunoId)return;
  try{
    await fbDB.collection('mensagens').add({
      alunoId:chatAlunoId,
      encEmail:encEmailAtual,
      de:'encarregado',
      remetenteNome:encEmailAtual,
      texto,
      data:firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('encMsgTxt').value='';
    carregarChatEnc();
  }catch(e){toastEnc('Erro ao enviar mensagem.','error');console.error(e);}
}
