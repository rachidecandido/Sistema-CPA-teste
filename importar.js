/* ============================================================
   MÓDULO: IMPORTAR.JS — Importação em Massa de Alunos (CSV/Excel)
   Fase 6 — Sistema C.P.A
   Depende de: index.html (dBol, saveBolDB, toast, cfm, logAct), escola.js (gTurmas)
   ------------------------------------------------------------
   Formato esperado do ficheiro (separado por vírgulas ou por
   ponto-e-vírgula, a primeira linha é o cabeçalho):
     Nome,Matricula
     João Alberto,2024001
     Maria Fernanda,2024002
   A coluna Matrícula é opcional.
   ============================================================ */

let _importPreview=[];

function renderImportar(){
  const el=document.getElementById('sec-imp');
  if(!el)return;
  const turmas=gTurmas();
  const opts=turmas.length
    ?turmas.map(t=>`<option value="${t.nome}" data-cl="${t.classe||''}">${t.nome}</option>`).join('')
    :[...new Set(dBol.map(b=>b.tr).filter(Boolean))].map(t=>`<option value="${t}">${t}</option>`).join('');
  el.innerHTML=`
  <div class="card"><div class="ct">📥 Importação em Massa de Alunos</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Importe uma lista de alunos de uma vez, a partir dum ficheiro CSV (feito no Excel, Google Sheets ou bloco de notas).</div>
    <button class="btn bl" style="width:100%;margin-bottom:11px;font-size:.72rem" onclick="baixarModeloCSV()">⬇️ Baixar Modelo CSV</button>
    <div class="fr">
      <div><div class="fl">Turma de Destino</div><select class="fi" id="impTurma" onchange="if(_importPreview.length)renderPreviewImportacao()"><option value="">— Seleccione —</option>${opts}</select></div>
      <div><div class="fl">Classe</div><select class="fi" id="impClasse"><option value="">—</option><option>7ª</option><option>8ª</option><option>9ª</option><option>10ª</option><option>11ª</option><option>12ª</option></select></div>
    </div>
    <div class="fr">
      <div><div class="fl">Ano Lectivo</div><input class="fi" id="impAno" type="text" value="2025/2026"></div>
      <div><div class="fl">Turno</div><select class="fi" id="impTurno"><option>Manhã</option><option>Tarde</option><option>Noite</option></select></div>
    </div>
    <div class="fl">Ficheiro CSV</div>
    <input type="file" class="fi" id="impFile" accept=".csv,text/csv" style="margin-bottom:9px" onchange="processarCSV(event)">
    <div id="impPreviewWrap"></div>
  </div>`;
}

function baixarModeloCSV(){
  const conteudo='Nome,Matricula\nJoão Alberto,2024001\nMaria Fernanda,2024002\n';
  const blob=new Blob(['\ufeff'+conteudo],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='modelo_importacao_alunos.csv';
  a.click();
}

// Parser simples de CSV (aceita vírgula ou ponto-e-vírgula como separador)
function parseCSVSimples(texto){
  const linhas=texto.split(/\r?\n/).filter(l=>l.trim());
  if(!linhas.length)return [];
  const sep=linhas[0].includes(';')?';':',';
  const header=linhas[0].split(sep).map(h=>h.trim().toLowerCase().replace(/^\ufeff/,''));
  const idxNome=header.findIndex(h=>h.includes('nome'));
  const idxMt=header.findIndex(h=>h.includes('matr'));
  if(idxNome<0)return null; // formato inválido
  return linhas.slice(1).map(l=>{
    const cols=l.split(sep).map(c=>c.trim());
    return {nome:cols[idxNome]||'',mt:idxMt>=0?(cols[idxMt]||''):''};
  }).filter(r=>r.nome);
}

function processarCSV(evt){
  const file=evt.target.files[0];
  if(!file)return;
  const r=new FileReader();
  r.onload=e=>{
    const linhas=parseCSVSimples(e.target.result);
    if(linhas===null){
      toast('Ficheiro inválido: a primeira linha deve ter uma coluna "Nome".','error');
      document.getElementById('impPreviewWrap').innerHTML='';
      return;
    }
    if(!linhas.length){
      toast('Nenhum aluno encontrado no ficheiro.','error');
      return;
    }
    _importPreview=linhas;
    renderPreviewImportacao();
  };
  r.onerror=()=>toast('Não foi possível ler o ficheiro.','error');
  r.readAsText(file,'UTF-8');
}

function renderPreviewImportacao(){
  const wrap=document.getElementById('impPreviewWrap');
  const turma=document.getElementById('impTurma').value;
  const existentes=turma?new Set(dBol.filter(b=>b.tr===turma).map(b=>b.nm.toLowerCase())):new Set();
  const linhasHTML=_importPreview.map((r,i)=>{
    const duplicado=existentes.has(r.nome.toLowerCase());
    return `<tr><td style="text-align:left">${r.nome}</td><td>${r.mt||'—'}</td><td>${duplicado?'⚠️ já existe':'✅ novo'}</td></tr>`;
  }).join('');
  const nDuplicados=_importPreview.filter(r=>existentes.has(r.nome.toLowerCase())).length;
  wrap.innerHTML=`
    <div style="font-size:.76rem;margin:9px 0"><b>${_importPreview.length}</b> alunos encontrados no ficheiro${nDuplicados?` — <span style="color:var(--wn)">${nDuplicados} já existem nesta turma e serão ignorados</span>`:''}.</div>
    <div class="tw" style="max-height:260px;overflow-y:auto"><table><thead><tr><th style="text-align:left">Nome</th><th>Matrícula</th><th>Estado</th></tr></thead><tbody>${linhasHTML}</tbody></table></div>
    <button class="btn bs" style="width:100%;margin-top:9px" onclick="confirmarImportacao()">✅ Confirmar Importação</button>
  `;
}

function confirmarImportacao(){
  const turma=document.getElementById('impTurma').value;
  const classe=document.getElementById('impClasse').value;
  const an=document.getElementById('impAno').value.trim();
  const tn=document.getElementById('impTurno').value;
  if(!turma){toast('Seleccione a turma de destino!','error');return}
  if(!_importPreview.length){toast('Carregue um ficheiro primeiro!','error');return}
  const existentes=new Set(dBol.filter(b=>b.tr===turma).map(b=>b.nm.toLowerCase()));
  let count=0;
  _importPreview.forEach(r=>{
    if(existentes.has(r.nome.toLowerCase()))return; // ignora duplicados
    dBol.push({
      id:Date.now()+Math.floor(Math.random()*10000),
      nm:r.nome,
      mt:r.mt||'',
      tr:turma,cl:classe,an,tn,pd:'Anual',
      notas:{},mg:0,apv:false,
      dt:new Date().toLocaleDateString('pt-PT')
    });
    count++;
  });
  saveBolDB();
  logAct('Importação em massa de alunos',turma+' — '+count+' alunos adicionados');
  toast(count+' alunos importados com sucesso!','success');
  _importPreview=[];
  document.getElementById('impPreviewWrap').innerHTML='';
  document.getElementById('impFile').value='';
}
