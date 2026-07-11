/* ============================================================
   MÓDULO: ESCOLA.JS — Cadastro da Escola + Gestão de Turmas
   Fase 1 — Sistema C.P.A
   Depende de: index.html (toast, cfm, closeModal, logAct, goto, D79, D1012)
   ============================================================ */

// ── DADOS DA ESCOLA (armazenamento) ──
function gEscola(){return JSON.parse(localStorage.getItem('cpa_escola')||'null')}
function sEscola(e){localStorage.setItem('cpa_escola',JSON.stringify(e))}

// ── TURMAS (armazenamento) ──
function gTurmas(){return JSON.parse(localStorage.getItem('cpa_turmas')||'[]')}
function sTurmas(t){localStorage.setItem('cpa_turmas',JSON.stringify(t))}

// ── RENDER: SECÇÃO ESCOLA ──
function renderEscola(){
  const el=document.getElementById('sec-escola');
  if(!el)return;
  const e=gEscola()||{};
  el.innerHTML=`
  <div class="card"><div class="ct">🏫 Dados da Escola</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:11px">Estes dados aparecem no cabeçalho dos PDFs oficiais (CPA, Boletim, Pauta de Turma).</div>
    <div style="text-align:center;margin-bottom:11px">
      <div id="escLogoPrev" style="width:78px;height:78px;border-radius:14px;background:var(--c2);border:2px dashed var(--br);margin:0 auto 8px;display:flex;align-items:center;justify-content:center;overflow:hidden">${e.logo?`<img src="${e.logo}" style="width:100%;height:100%;object-fit:cover">`:'<span style="font-size:1.6rem">🖼️</span>'}</div>
      <input type="file" id="escLogoFile" accept="image/*" style="display:none" onchange="handleEscolaLogo(event)">
      <button class="btn bl" style="font-size:.7rem" onclick="document.getElementById('escLogoFile').click()">📷 Carregar Logótipo</button>
    </div>
    <div><div class="fl">Nome da Escola *</div><input class="fi" id="escNome" type="text" placeholder="Ex: Escola Secundária de Nipepe" value="${e.nome||''}" style="margin-bottom:7px"></div>
    <div><div class="fl">Nome do Director(a) *</div><input class="fi" id="escDir" type="text" placeholder="Ex: Director João Manuel" value="${e.director||''}" style="margin-bottom:7px"></div>
    <div><div class="fl">Morada / Localização</div><input class="fi" id="escMorada" type="text" placeholder="Ex: Nipepe, Niassa" value="${e.morada||''}" style="margin-bottom:7px"></div>
    <div class="fr">
      <div><div class="fl">NUIT</div><input class="fi" id="escNuit" type="text" placeholder="Opcional" value="${e.nuit||''}"></div>
      <div><div class="fl">Contacto</div><input class="fi" id="escContacto" type="text" placeholder="Telefone/Email" value="${e.contacto||''}"></div>
    </div>
    <button class="btn bc" style="width:100%;margin-top:6px" onclick="salvarEscola()">💾 Guardar Dados da Escola</button>
  </div>

  <div class="card"><div class="ct">🏷️ Gestão de Turmas</div>
    <div class="fr">
      <div><div class="fl">Nome da Turma</div><input class="fi" id="turNome" type="text" placeholder="Ex: 10ª A"></div>
      <div><div class="fl">Classe</div><select class="fi" id="turClasse"><option value="">—</option><option>7ª</option><option>8ª</option><option>9ª</option><option>10ª</option><option>11ª</option><option>12ª</option></select></div>
    </div>
    <div class="fr">
      <div><div class="fl">Turno</div><select class="fi" id="turTurno"><option>Manhã</option><option>Tarde</option><option>Noite</option></select></div>
      <div><div class="fl">Ano Lectivo</div><input class="fi" id="turAno" type="text" placeholder="2025/2026" value="2025/2026"></div>
    </div>
    <div class="fl">Disciplinas desta turma (opcional — uma por linha)</div>
    <textarea class="fi" id="turDisc" rows="3" placeholder="Deixe vazio para usar as disciplinas padrão da classe. Ou escreva uma disciplina por linha para personalizar (ex: turma técnica com disciplinas próprias)." style="margin-bottom:9px;resize:vertical"></textarea>
    <button class="btn bs" style="width:100%;margin-bottom:11px" onclick="criarTurma()">➕ Criar Turma</button>
    <div id="turList"></div>
  </div>`;
  renderTurmas();
}

function handleEscolaLogo(evt){
  const file=evt.target.files[0];
  if(!file)return;
  if(file.size>1500000){toast('Imagem muito grande! Use até 1.5MB.','error');return}
  const r=new FileReader();
  r.onload=e=>{
    document.getElementById('escLogoPrev').innerHTML=`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    window._escLogoTmp=e.target.result;
  };
  r.readAsDataURL(file);
}

function salvarEscola(){
  const nome=document.getElementById('escNome').value.trim();
  const director=document.getElementById('escDir').value.trim();
  if(!nome){toast('Insira o nome da escola!','error');return}
  if(!director){toast('Insira o nome do director!','error');return}
  const prev=gEscola()||{};
  const e={
    nome,director,
    morada:document.getElementById('escMorada').value.trim(),
    nuit:document.getElementById('escNuit').value.trim(),
    contacto:document.getElementById('escContacto').value.trim(),
    logo:window._escLogoTmp||prev.logo||null
  };
  sEscola(e);
  logAct('Dados da escola actualizados',nome);
  toast('Dados da escola guardados!','success');
}

function criarTurma(){
  const nome=document.getElementById('turNome').value.trim();
  const classe=document.getElementById('turClasse').value;
  const turno=document.getElementById('turTurno').value;
  const an=document.getElementById('turAno').value.trim();
  const discTxt=document.getElementById('turDisc').value.trim();
  const disciplinas=discTxt?discTxt.split('\n').map(d=>d.trim()).filter(Boolean):[];
  if(!nome){toast('Insira o nome da turma!','error');return}
  const turmas=gTurmas();
  if(turmas.find(t=>t.nome.toLowerCase()===nome.toLowerCase()&&t.an===an)){toast('Já existe uma turma com esse nome neste ano!','error');return}
  turmas.push({id:Date.now(),nome,classe,turno,an,disciplinas});
  sTurmas(turmas);
  document.getElementById('turNome').value='';
  document.getElementById('turDisc').value='';
  logAct('Turma criada',nome+' — '+classe+'ª classe'+(disciplinas.length?' ('+disciplinas.length+' disciplinas personalizadas)':''));
  toast('Turma criada!','success');
  renderTurmas();
}

function renderTurmas(){
  const el=document.getElementById('turList');
  if(!el)return;
  const turmas=gTurmas();
  if(!turmas.length){el.innerHTML='<div class="empty">Nenhuma turma criada ainda.</div>';return}
  el.innerHTML=turmas.map(t=>{
    const nAlunosCPA=(typeof db!=='undefined'?db:[]).filter(a=>a.tr===t.nome).length;
    const nAlunosBol=(typeof dBol!=='undefined'?dBol:[]).filter(b=>b.tr===t.nome).length;
    return `<div class="hi"><div style="flex:1;min-width:0"><div class="hn">${t.nome} ${t.classe?'— '+t.classe+'ª Classe':''}</div><div class="hm">${[t.turno,t.an].filter(Boolean).join(' · ')} · 👥 ${Math.max(nAlunosCPA,nAlunosBol)} alunos com registos</div></div><div class="ha"><button class="bsm sx" onclick="delTurma(${t.id})">✕</button></div></div>`;
  }).join('');
}

function delTurma(id){
  cfm('A turma será removida da lista (os dados dos alunos já lançados não serão apagados).',()=>{
    sTurmas(gTurmas().filter(t=>t.id!==id));
    renderTurmas();
    toast('Turma removida.','info');
  },'🗑','Remover Turma','🗑 Remover','bd');
}

// ── Helper usado pelos PDFs (CPA, Boletim, Pauta) para inserir cabeçalho oficial ──
function escolaPdfHeader(doc,startY){
  const e=gEscola();
  if(!e||!e.nome)return startY;
  let y=startY;
  doc.setFontSize(9);
  doc.setFont(undefined,'bold');
  doc.setTextColor(40,40,40);
  if(e.logo){try{doc.addImage(e.logo,'PNG',20,y-6,14,14);}catch(err){}}
  doc.text(e.nome,e.logo?38:20,y);
  doc.setFont(undefined,'normal');
  doc.setFontSize(8);
  doc.setTextColor(100);
  const linha2=[e.morada,e.contacto,e.nuit?'NUIT: '+e.nuit:''].filter(Boolean).join('  |  ');
  if(linha2)doc.text(linha2,e.logo?38:20,y+5);
  return y+12;
}
function escolaPdfAssinatura(doc,y){
  const e=gEscola();
  if(!e||!e.director)return;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.setFont(undefined,'normal');
  doc.text('_______________________________',20,y);
  doc.text('O Director: '+e.director,20,y+6);
}
