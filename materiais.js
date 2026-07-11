/* ============================================================
   MÓDULO: MATERIAIS.JS — Materiais de Apoio (Professor)
   Fase 4 — Sistema C.P.A
   Depende de: index.html (PA, toast, logAct), escola.js (gTurmas),
   sync.js (fbDB via firebase-config.js)
   ------------------------------------------------------------
   Os ficheiros são guardados directamente no Firestore (sem usar
   Firebase Storage, que agora exige o plano Blaze). Por isso há um
   limite de ~900KB por ficheiro — suficiente para a maioria dos PDFs
   de exercícios e imagens, mas não para vídeos ou ficheiros grandes.
   ============================================================ */

const LIMITE_MATERIAL_BYTES=900*1024;

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
      <option value="arquivo">📎 Ficheiro (PDF, imagem — até 900KB)</option>
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
    if(file.size>LIMITE_MATERIAL_BYTES){toast('Ficheiro muito grande! Máximo 900KB. Tente comprimir a imagem/PDF.','error');return}
    const r=new FileReader();
    r.onload=e=>{
      salvarMaterialFirestore({...base,conteudoBase64:e.target.result,nomeArquivo:file.name,mimeType:file.type});
    };
    r.readAsDataURL(file);
  }
}

async function salvarMaterialFirestore(material){
  try{
    await fbDB.collection('materiais').add(material);
    toast('Material enviado com sucesso!','success');
    logAct('Material de apoio enviado',material.titulo+' — '+material.turma);
    document.getElementById('matTitulo').value='';
    document.getElementById('matDesc').value='';
    if(document.getElementById('matLink'))document.getElementById('matLink').value='';
    if(document.getElementById('matTexto'))document.getElementById('matTexto').value='';
    if(document.getElementById('matArquivo'))document.getElementById('matArquivo').value='';
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
      return `<div class="hi"><div style="font-size:1.2rem;width:28px;text-align:center">${icones[m.tipo]||'📄'}</div><div style="flex:1;min-width:0"><div class="hn">${m.titulo}</div><div class="hm">${[m.turma,m.disciplina].filter(Boolean).join(' · ')}</div></div><div class="ha"><button class="bsm sx" onclick="removerMaterial('${doc.id}')">✕</button></div></div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar materiais.</div>';console.error(e);}
}

function removerMaterial(id){
  cfm('Este material deixará de estar visível para alunos e encarregados.',async()=>{
    try{
      await fbDB.collection('materiais').doc(id).delete();
      toast('Material removido.','info');
      carregarMateriaisProfessor();
    }catch(e){toast('Erro ao remover.','error');console.error(e);}
  },'🗑','Remover Material','🗑 Remover','bd');
}
