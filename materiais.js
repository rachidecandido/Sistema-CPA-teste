/* ============================================================
   MÓDULO: MATERIAIS.JS — Materiais de Apoio (Professor)
   Fase 4/6 — Sistema C.P.A
   Depende de: index.html (PA, toast, logAct), escola.js (gTurmas),
   sync.js (fbDB via firebase-config.js)
   ------------------------------------------------------------
   Os ficheiros são guardados directamente no Firestore (sem usar
   Firebase Storage, que exige o plano Blaze). Cada documento do
   Firestore tem um limite RÍGIDO de 1MB — por isso, para ficheiros
   maiores que ~900KB, dividimos o conteúdo em vários pedaços
   ("chunks"), guardados como sub-documentos, e juntamo-los de novo
   automaticamente na hora de descarregar. Isto permite ficheiros
   até 5MB sem precisar de Storage nem cartão de crédito.
   ============================================================ */

const LIMITE_MATERIAL_BYTES=5*1024*1024; // 5MB
const TAMANHO_CHUNK=700*1024; // ~700 mil caracteres por pedaço (seguro para o limite de 1MB do Firestore)

function renderMateriais(){
  const el=document.getElementById('sec-mat');
  if(!el)return;
  const turmas=gTurmas();
  const opts=turmas.length
    ?turmas.map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('')
    :[...new Set(dBol.map(b=>b.tr).filter(Boolean))].map(t=>`<option value="${t}">${t}</option>`).join('');
  el.innerHTML=`
  <div class="card"><div class="ct">📚 Enviar Material de Apoio</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Fica visível para os alunos e encarregados da turma seleccionada, no respectivo portal.</div>
    <div class="fr">
      <div><div class="fl">Turma</div><select class="fi" id="matTurma"><option value="">— Seleccione —</option>${opts}</select></div>
      <div><div class="fl">Disciplina</div><input class="fi" id="matDisc" type="text" placeholder="Ex: Matemática"></div>
    </div>
    <div class="fl">Título *</div><input class="fi" id="matTitulo" type="text" placeholder="Ex: Ficha de Exercícios 3" style="margin-bottom:7px">
    <div class="fl">Descrição</div><input class="fi" id="matDesc" type="text" placeholder="Opcional..." style="margin-bottom:9px">
    <div class="fl">Tipo de Material</div>
    <select class="fi" id="matTipo" onchange="mudarTipoMaterial()" style="margin-bottom:9px">
      <option value="arquivo">📎 Ficheiro (PDF, imagem — até 5MB)</option>
      <option value="link">🔗 Link (ex: vídeo do YouTube, Google Drive)</option>
      <option value="texto">📝 Texto (aviso ou instrução simples)</option>
    </select>
    <div id="matCampoArquivo"><input type="file" class="fi" id="matArquivo" accept=".pdf,image/*,.doc,.docx" style="margin-bottom:9px"></div>
    <div id="matCampoLink" style="display:none"><input class="fi" id="matLink" type="url" placeholder="https://..." style="margin-bottom:9px"></div>
    <div id="matCampoTexto" style="display:none"><textarea class="fi" id="matTexto" rows="4" placeholder="Escreva o texto/aviso..." style="margin-bottom:9px;resize:vertical"></textarea></div>
    <button class="btn bs" style="width:100%" onclick="enviarMaterial()">📤 Enviar Material</button>
  </div>
  <div class="card"><div class="ct">📂 Materiais Enviados</div><div id="matList"></div></div>`;
  carregarMateriaisProfessor();
}

function mudarTipoMaterial(){
  const tipo=document.getElementById('matTipo').value;
  document.getElementById('matCampoArquivo').style.display=tipo==='arquivo'?'block':'none';
  document.getElementById('matCampoLink').style.display=tipo==='link'?'block':'none';
  document.getElementById('matCampoTexto').style.display=tipo==='texto'?'block':'none';
}

function enviarMaterial(){
  const turma=document.getElementById('matTurma').value;
  const disciplina=document.getElementById('matDisc').value.trim();
  const titulo=document.getElementById('matTitulo').value.trim();
  const descricao=document.getElementById('matDesc').value.trim();
  const tipo=document.getElementById('matTipo').value;
  if(!turma){toast('Seleccione a turma!','error');return}
  if(!titulo){toast('Insira o título do material!','error');return}
  if(!PA){toast('Entre num perfil de professor!','error');return}

  const base={turma,disciplina,titulo,descricao,tipo,professorId:PA.id,professorNome:PA.nome,data:firebase.firestore.FieldValue.serverTimestamp()};

  if(tipo==='link'){
    const link=document.getElementById('matLink').value.trim();
    if(!link){toast('Insira o link!','error');return}
    salvarMaterialFirestore({...base,link});
  }else if(tipo==='texto'){
    const texto=document.getElementById('matTexto').value.trim();
    if(!texto){toast('Escreva o texto!','error');return}
    salvarMaterialFirestore({...base,texto});
  }else{
    const file=document.getElementById('matArquivo').files[0];
    if(!file){toast('Seleccione um ficheiro!','error');return}
    if(file.size>LIMITE_MATERIAL_BYTES){toast('Ficheiro muito grande! Máximo 5MB. Tente comprimir a imagem/PDF, ou use "Link" para ficheiros maiores (ex: Google Drive).','error');return}
    const r=new FileReader();
    r.onload=e=>{
      enviarMaterialComChunks({...base,nomeArquivo:file.name,mimeType:file.type},e.target.result);
    };
    r.readAsDataURL(file);
  }
}

// Envia um ficheiro grande dividido em vários documentos ("chunks"), já que
// o Firestore não aceita documentos com mais de 1MB.
// Notifica, por push, todos os alunos e encarregados vinculados da turma
function notificarTurmaSobreMaterial(turma,titulo){
  if(typeof enfileirarPushNotificacao!=='function'||typeof dBol==='undefined')return;
  const alunosDaTurma=dBol.filter(b=>b.tr===turma);
  const jaAvisados=new Set();
  alunosDaTurma.forEach(a=>{
    if(a.mt&&!jaAvisados.has('mt_'+a.mt)){
      jaAvisados.add('mt_'+a.mt);
      enfileirarPushNotificacao(a.mt,'📚 Novo Material — '+turma,titulo);
    }
    if(a.encEmail&&!jaAvisados.has('em_'+a.encEmail)){
      jaAvisados.add('em_'+a.encEmail);
      enfileirarPushNotificacao(a.encEmail,'📚 Novo Material — '+turma,titulo);
    }
  });
}

async function enviarMaterialComChunks(materialSemConteudo,dataUrlCompleta){
  const docRef=fbDB.collection('materiais').doc(); // gera o ID sem publicar ainda
  try{
    const chunks=[];
    for(let i=0;i<dataUrlCompleta.length;i+=TAMANHO_CHUNK){
      chunks.push(dataUrlCompleta.slice(i,i+TAMANHO_CHUNK));
    }
    toast('A enviar ficheiro... ('+chunks.length+' partes)','info');
    // Escreve todos os pedaços primeiro; só depois de todos terem sucesso é
    // que o material fica visível — assim nunca aparece um material "partido"
    // se a internet cair a meio do envio.
    for(let i=0;i<chunks.length;i++){
      await docRef.collection('chunks').doc(String(i)).set({data:chunks[i]});
    }
    await docRef.set({...materialSemConteudo,totalChunks:chunks.length});
    toast('Material enviado com sucesso!','success');
    notificarTurmaSobreMaterial(materialSemConteudo.turma,materialSemConteudo.titulo);
    logAct('Material de apoio enviado',materialSemConteudo.titulo+' — '+materialSemConteudo.turma+' ('+chunks.length+' partes)');
    limparFormMaterial();
    carregarMateriaisProfessor();
  }catch(e){
    console.error(e);
    toast('Erro ao enviar material. Verifique a ligação à internet e tente novamente.','error');
    // Limpa quaisquer pedaços já escritos, para não deixar lixo incompleto
    try{
      const chunksSnap=await docRef.collection('chunks').get();
      const batch=fbDB.batch();
      chunksSnap.forEach(d=>batch.delete(d.ref));
      if(!chunksSnap.empty)await batch.commit();
    }catch(e2){console.error('Falha ao limpar pedaços incompletos:',e2);}
  }
}

function limparFormMaterial(){
  document.getElementById('matTitulo').value='';
  document.getElementById('matDesc').value='';
  if(document.getElementById('matLink'))document.getElementById('matLink').value='';
  if(document.getElementById('matTexto'))document.getElementById('matTexto').value='';
  if(document.getElementById('matArquivo'))document.getElementById('matArquivo').value='';
}

async function salvarMaterialFirestore(material){
  try{
    await fbDB.collection('materiais').add(material);
    toast('Material enviado com sucesso!','success');
    notificarTurmaSobreMaterial(material.turma,material.titulo);
    logAct('Material de apoio enviado',material.titulo+' — '+material.turma);
    limparFormMaterial();
    carregarMateriaisProfessor();
  }catch(e){
    console.error(e);
    toast('Erro ao enviar material. Verifique a ligação à internet.','error');
  }
}

async function carregarMateriaisProfessor(){
  const el=document.getElementById('matList');
  if(!el||!PA)return;
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const snap=await fbDB.collection('materiais').where('professorId','==',PA.id).get();
    if(snap.empty){el.innerHTML='<div class="empty">Nenhum material enviado ainda.</div>';return}
    const docs=snap.docs.sort((a,b)=>(b.data().data?.seconds||0)-(a.data().data?.seconds||0));
    const icones={arquivo:'📎',link:'🔗',texto:'📝'};
    el.innerHTML=docs.map(doc=>{
      const m=doc.data();
      const dataEnv=m.data?.toDate?m.data.toDate().toLocaleString('pt-PT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
      return `<div class="hi"><div style="font-size:1.2rem;width:28px;text-align:center">${icones[m.tipo]||'📄'}</div><div style="flex:1;min-width:0"><div class="hn">${m.titulo}</div><div class="hm">${[m.turma,m.disciplina].filter(Boolean).join(' · ')}${dataEnv?' · 📅 '+dataEnv:''}</div></div><div class="ha"><button class="bsm bl" onclick="partilharMaterialWhatsApp('${m.titulo.replace(/'/g,"\\'")}','${(m.turma||'').replace(/'/g,"\\'")}','${m.tipo}','${(m.link||'').replace(/'/g,"\\'")}')">📱</button><button class="bsm sx" onclick="removerMaterial('${doc.id}')">✕</button></div></div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar materiais.</div>';console.error(e);}
}

// Partilha um aviso sobre o material por WhatsApp. Ficheiros/textos não podem
// ser anexados directamente (o WhatsApp Web não suporta isso via link), por
// isso o aviso aponta para o Portal do Aluno/Encarregado onde já está disponível.
function partilharMaterialWhatsApp(titulo,turma,tipo,link){
  let msg=`📚 Novo material de apoio disponível: "${titulo}"${turma?' — Turma '+turma:''}.\n`;
  msg+=tipo==='link'&&link
    ?`Aceda directamente aqui: ${link}`
    :`Consulte no Portal do Aluno/Encarregado do Sistema C.P.A.`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

function removerMaterial(id){
  cfm('Este material deixará de estar visível para alunos e encarregados.',async()=>{
    try{
      const chunksSnap=await fbDB.collection('materiais').doc(id).collection('chunks').get();
      const batch=fbDB.batch();
      chunksSnap.forEach(doc=>batch.delete(doc.ref));
      if(!chunksSnap.empty)await batch.commit();
      await fbDB.collection('materiais').doc(id).delete();
      toast('Material removido.','info');
      carregarMateriaisProfessor();
    }catch(e){toast('Erro ao remover.','error');console.error(e);}
  },'🗑','Remover Material','🗑 Remover','bd');
}
