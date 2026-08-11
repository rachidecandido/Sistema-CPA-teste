/* ============================================================
   ALUNO.JS — Portal do Aluno (login por Matrícula + PIN)
   Fase 4 — Sistema C.P.A
   Depende de: firebase-config.js (fbDB)
   ============================================================ */

let alunoAtual=null;

function toastAl(msg,tipo='success'){
  const el=document.createElement('div');
  el.className='toastm'+(tipo==='error'?' error':'');
  el.textContent=msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.remove(),2600);
}
function mostrarErroAl(msg){
  const e=document.getElementById('errMsg');
  e.textContent=msg;e.style.display='block';
}

async function fazerLoginAluno(){
  const mt=document.getElementById('authMt').value.trim();
  const pin=document.getElementById('authPin').value.trim();
  document.getElementById('errMsg').style.display='none';
  if(!mt||!pin){mostrarErroAl('Preencha a matrícula e o PIN.');return}
  if(!fbDB){mostrarErroAl('Não foi possível ligar ao servidor ('+(window.firebaseInitError||'Firebase não iniciou')+'). Verifique a internet e recarregue a página.');return}
  try{
    const snap=await fbDB.collection('alunos').where('mt','==',mt).get();
    if(snap.empty){mostrarErroAl('Matrícula não encontrada.');return}
    const doc=snap.docs.find(d=>d.data().tipo==='bol'&&d.data().alunoPin===pin);
    if(!doc){mostrarErroAl('PIN incorrecto.');return}
    alunoAtual={id:doc.id,...doc.data()};
    sessionStorage.setItem('cpa_aluno_sessao',JSON.stringify(alunoAtual));
    mostrarPainelAluno();
  }catch(e){
    console.error(e);
    mostrarErroAl('Erro: '+(e.message||e.code||'falha desconhecida')+'. Verifique a internet e tente novamente.');
  }
}

function sairAluno(){
  sessionStorage.removeItem('cpa_aluno_sessao');
  alunoAtual=null;
  document.getElementById('authArea').style.display='block';
  document.getElementById('appArea').style.display='none';
  document.getElementById('authMt').value='';
  document.getElementById('authPin').value='';
}

function mostrarPainelAluno(){
  document.getElementById('authArea').style.display='none';
  document.getElementById('appArea').style.display='block';
  document.getElementById('quemEsta').textContent='🎓 '+alunoAtual.nm;
  renderNotasAluno();
  carregarMateriaisAluno();
  carregarNotificacoesAluno();
  carregarPropinasAluno();
}

function closeModalAl(id){document.getElementById(id).classList.remove('open')}

// ── NOTIFICAÇÕES DO ALUNO ──
async function carregarNotificacoesAluno(){
  const el=document.getElementById('notifAlunoList');
  if(!el)return;
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('notificacoes').where('alunoMt','==',alunoAtual.mt).limit(50).get();
    if(snap.empty){el.innerHTML='<div class="empty">Sem notificações.</div>';return}
    const docsOrdenados=snap.docs.sort((a,b)=>(b.data().data?.seconds||0)-(a.data().data?.seconds||0)).slice(0,20);
    el.innerHTML=docsOrdenados.map(doc=>{
      const n=doc.data();
      const dt=n.data?.toDate?n.data.toDate().toLocaleDateString('pt-PT'):'';
      return `<div class="notif" style="position:relative;padding-right:34px">${n.texto}<div style="color:var(--mu);font-size:.66rem;margin-top:4px">${dt}</div><span onclick="apagarNotificacaoAluno('${doc.id}')" style="position:absolute;top:8px;right:8px;cursor:pointer;font-size:.85rem;color:var(--mu)">✕</span></div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro: '+(e.message||e.code||'falha desconhecida')+'</div>';console.error(e);}
}
async function apagarNotificacaoAluno(id){
  try{
    await fbDB.collection('notificacoes').doc(id).delete();
    carregarNotificacoesAluno();
  }catch(e){toastAl('Erro ao apagar notificação.','error');console.error(e);}
}

// ── SITUAÇÃO DE PROPINAS DO ALUNO ──
async function carregarPropinasAluno(){
  const el=document.getElementById('propinasAlunoList');
  if(!el)return;
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('propinas').where('alunoNome','==',alunoAtual.nm).get();
    if(snap.empty){el.innerHTML='<div class="empty">Nenhum pagamento registado ainda.</div>';return}
    const resultados=snap.docs.map(d=>d.data()).sort((a,b)=>(b.mes||'').localeCompare(a.mes||''));
    el.innerHTML=resultados.slice(0,12).map(p=>`<div class="notif" style="background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3)">✅ ${p.mes} — ${p.valor} MT (${p.metodo})</div>`).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar propinas.</div>';console.error(e);}
}

// ── ALTERAR PIN ──
function abrirAlterarPin(){
  document.getElementById('pinAtual').value='';
  document.getElementById('pinNovo').value='';
  document.getElementById('pinErro').style.display='none';
  document.getElementById('moPin').classList.add('open');
}
async function confirmarAlterarPin(){
  const atual=document.getElementById('pinAtual').value;
  const novo=document.getElementById('pinNovo').value;
  const erroEl=document.getElementById('pinErro');
  erroEl.style.display='none';
  if(atual!==alunoAtual.alunoPin){erroEl.textContent='PIN actual incorrecto.';erroEl.style.display='block';return}
  if(!/^\d{4}$/.test(novo)){erroEl.textContent='O novo PIN deve ter exactamente 4 dígitos.';erroEl.style.display='block';return}
  try{
    await fbDB.collection('alunos').doc(alunoAtual.id).update({alunoPin:novo});
    alunoAtual.alunoPin=novo;
    sessionStorage.setItem('cpa_aluno_sessao',JSON.stringify(alunoAtual));
    closeModalAl('moPin');
    toastAl('PIN alterado com sucesso!','success');
  }catch(e){
    erroEl.textContent='Erro: '+(e.message||e.code);
    erroEl.style.display='block';
  }
}

function renderNotasAluno(){
  const b=alunoAtual;
  const el=document.getElementById('notasCard');
  let rows='';
  Object.entries(b.notas||{}).forEach(([disc,n])=>{
    if(!n.t1&&!n.t2&&!n.t3)return;
    rows+=`<tr><td>${disc}</td><td>${n.t1||'—'}</td><td>${n.t2||'—'}</td><td>${n.t3||'—'}</td><td style="font-weight:700;color:${n.media>=10?'var(--ok)':'var(--dg)'}">${n.media>0?n.media.toFixed(1):'—'}</td></tr>`;
  });
  el.innerHTML=`
    <div class="mediaBox">
      <div class="n" style="color:${b.apv?'var(--ok)':'var(--dg)'}">${(b.mg||0).toFixed(1)}</div>
      <div style="font-size:.72rem;color:var(--mu)">Média Global</div>
      <span class="st ${b.apv?'apv':'rep'}">${b.apv?'✅ APROVADO':'❌ REPROVADO'}</span>
    </div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:9px">${[b.tr,b.cl&&b.cl+'ª Classe',b.tn,b.an,b.pd].filter(Boolean).join(' · ')}</div>
    ${rows?`<table><thead><tr><th>Disciplina</th><th>1ºT</th><th>2ºT</th><th>3ºT</th><th>Média</th></tr></thead><tbody>${rows}</tbody></table>`:'<div class="empty">Sem notas lançadas ainda.</div>'}
  `;
}

async function carregarMateriaisAluno(){
  const el=document.getElementById('matAlunoList');
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('materiais').where('turma','==',alunoAtual.tr).get();
    if(snap.empty){el.innerHTML='<div class="empty">Nenhum material disponível para a sua turma ainda.</div>';return}
    const docs=snap.docs.sort((a,b)=>(b.data().data?.seconds||0)-(a.data().data?.seconds||0));
    el.innerHTML=docs.map(doc=>{
      const m=doc.data();
      let acao='';
      if(m.tipo==='link')acao=`<a href="${m.link}" target="_blank">🔗 Abrir Link</a>`;
      else if(m.tipo==='arquivo'){
        acao=m.totalChunks
          ?`<span class="abrirTxt" onclick="baixarMaterialChunked('${doc.id}','${m.nomeArquivo.replace(/'/g,"\\'")}',this)">⬇️ Descarregar</span>`
          :`<a href="${m.conteudoBase64}" download="${m.nomeArquivo}">⬇️ Descarregar</a>`;
      }
      else acao=`<span class="abrirTxt" onclick="this.nextElementSibling.style.display='block';this.style.display='none'">📝 Ler Texto</span><div style="display:none;font-size:.76rem;margin-top:6px;white-space:pre-wrap">${m.texto}</div>`;
      const dataEnv=m.data?.toDate?m.data.toDate().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'';
      return `<div class="matItem"><div class="tt">${m.titulo}</div><div class="ds">${[m.disciplina,m.professorNome].filter(Boolean).join(' · ')}${dataEnv?' · 📅 '+dataEnv:''}${m.descricao?' — '+m.descricao:''}</div>${acao}</div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar materiais.</div>';console.error(e);}
}

// Mantém sessão activa ao recarregar a página (dentro da mesma aba)
(function(){
  const salvo=sessionStorage.getItem('cpa_aluno_sessao');
  if(salvo){
    try{alunoAtual=JSON.parse(salvo);mostrarPainelAluno();}catch(e){}
  }
})();

// Reconstrói um ficheiro grande a partir dos seus pedaços ("chunks") e inicia o download
async function baixarMaterialChunked(materialId,nomeArquivo,elClicado){
  const textoOriginal=elClicado.textContent;
  elClicado.textContent='⏳ A preparar...';
  try{
    const snap=await fbDB.collection('materiais').doc(materialId).collection('chunks').get();
    if(snap.empty){toastAl('Não foi possível encontrar as partes deste ficheiro.','error');elClicado.textContent=textoOriginal;return}
    const chunksOrdenados=snap.docs.sort((a,b)=>parseInt(a.id)-parseInt(b.id));
    const dataUrlCompleta=chunksOrdenados.map(d=>d.data().data).join('');
    const a=document.createElement('a');
    a.href=dataUrlCompleta;
    a.download=nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    elClicado.textContent=textoOriginal;
  }catch(e){
    console.error(e);
    toastAl('Erro ao descarregar o ficheiro.','error');
    elClicado.textContent=textoOriginal;
  }
}
