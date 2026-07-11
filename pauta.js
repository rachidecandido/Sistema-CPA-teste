/* ============================================================
   MÓDULO: PAUTA.JS — Pauta de Turma / Aproveitamento / Comparação / Alertas
   Fase 1 — Sistema C.P.A
   Depende de: index.html (db, dBol, PA, D79, D1012, saveBolDB, toast, cfm, logAct)
   Depende de: escola.js (gTurmas, escolaPdfHeader, escolaPdfAssinatura)
   ============================================================ */

let gPautaChart=null;

function renderPauta(){
  const el=document.getElementById('sec-pauta');
  if(!el)return;
  const turmas=gTurmas();
  const turmasOpts=turmas.length
    ? turmas.map(t=>`<option value="${t.nome}" data-cl="${t.classe||''}">${t.nome}</option>`).join('')
    : [...new Set(dBol.map(b=>b.tr).filter(Boolean))].map(t=>`<option value="${t}">${t}</option>`).join('');

  el.innerHTML=`
  <div class="card"><div class="ct">📚 Pauta de Turma</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Lance as notas de todos os alunos de uma turma, numa única tabela.</div>
    <div class="fr">
      <div><div class="fl">Turma</div><select class="fi" id="ptTurma" onchange="buildPautaTable()"><option value="">— Seleccione —</option>${turmasOpts}</select></div>
      <div><div class="fl">Classe</div><select class="fi" id="ptClasse" onchange="buildPautaTable()"><option value="">—</option><option>7ª</option><option>8ª</option><option>9ª</option><option>10ª</option><option>11ª</option><option>12ª</option></select></div>
    </div>
    <div class="fr">
      <div><div class="fl">Trimestre</div><select class="fi" id="ptTrim" onchange="buildPautaTable()"><option value="t1">1º Trimestre</option><option value="t2">2º Trimestre</option><option value="t3">3º Trimestre</option></select></div>
      <div><div class="fl">Ano Lectivo</div><input class="fi" id="ptAno" type="text" value="2025/2026"></div>
    </div>
    <div style="display:flex;gap:7px;margin-bottom:10px">
      <input class="fi" id="ptNovoAluno" type="text" placeholder="Nome do novo aluno..." style="flex:1">
      <button class="btn bi" style="width:auto;padding:9px 13px" onclick="addAlunoPauta()">➕</button>
    </div>
    <div style="font-size:.68rem;color:var(--mu);margin-bottom:7px">🎤 Toque num campo de nota e depois no botão de microfone para ditar o valor por voz.</div>
    <div id="ptTableWrap"></div>
    <div class="bg" style="margin-top:9px"><button class="btn bs" onclick="salvarPauta()">💾 Guardar Pauta Completa</button><button class="btn bp" onclick="pdfPauta()">📄 PDF Oficial</button><button class="btn bl" onclick="ditarNotaPauta()">🎤 Ditar Nota</button></div>
  </div>

  <div class="card"><div class="ct">📈 Aproveitamento da Turma</div><div id="ptAprov"></div></div>
  <div class="card"><div class="ct">⚖️ Comparação Entre Turmas</div><div class="cw"><canvas id="gCompTurmas"></canvas></div></div>
  <div class="card"><div class="ct">⚠️ Alertas de Risco de Reprovação</div><div id="ptAlertas"></div></div>
  `;
  buildPautaTable();
  renderComparacaoTurmas();
  renderAlertasRisco();
}

function pautaAlunos(){
  const turma=document.getElementById('ptTurma')?.value||'';
  if(!turma)return [];
  return dBol.filter(b=>b.tr===turma);
}

// Devolve as disciplinas da turma: se o professor definiu uma lista própria em
// "Gestão de Turmas" usa essa; senão usa a lista padrão da classe (D79/D1012).
function disciplinasDaTurma(turmaNome,classe){
  const turma=gTurmas().find(t=>t.nome===turmaNome);
  if(turma&&turma.disciplinas&&turma.disciplinas.length)return turma.disciplinas;
  return classe&&parseInt(classe)<=9?D79:D1012;
}

function buildPautaTable(){
  const wrap=document.getElementById('ptTableWrap');
  if(!wrap)return;
  const turma=document.getElementById('ptTurma').value;
  const classe=document.getElementById('ptClasse').value;
  const trim=document.getElementById('ptTrim').value;
  if(!turma){wrap.innerHTML='<div class="empty">Seleccione uma turma para começar.</div>';return}
  const disc=disciplinasDaTurma(turma,classe);
  let alunos=pautaAlunos();
  // Alunos ainda não guardados nesta sessão (adicionados manualmente) ficam em memória temporária
  window._pautaTemp=window._pautaTemp||[];
  const nomesExistentes=new Set(alunos.map(a=>a.nm.toLowerCase()));
  window._pautaTemp=window._pautaTemp.filter(n=>!nomesExistentes.has(n.toLowerCase()));
  const todosNomes=[...alunos.map(a=>a.nm),...window._pautaTemp];
  if(!todosNomes.length){wrap.innerHTML='<div class="empty">Nenhum aluno nesta turma ainda. Adicione pelo campo acima.</div>';return}

  let head=`<tr><th style="text-align:left">Aluno</th>${disc.map(d=>`<th>${d.split(' ')[0]}</th>`).join('')}<th>Média</th></tr>`;
  let rows=todosNomes.map(nm=>{
    const existente=alunos.find(a=>a.nm===nm);
    const notas=existente?.notas||{};
    const cells=disc.map(d=>{
      const v=notas[d]?.[trim]||'';
      return `<td><input type="number" class="it pt-in" min="0" max="20" data-aluno="${nm}" data-disc="${d}" value="${v}"></td>`;
    }).join('');
    const media=existente?(existente.mg||0).toFixed(1):'—';
    return `<tr data-nome="${nm}"><td style="text-align:left;font-weight:600">${nm}</td>${cells}<td class="mc">${media}</td></tr>`;
  }).join('');
  wrap.innerHTML=`<div class="tw"><table><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
  wrap.querySelectorAll('.pt-in').forEach(inp=>{
    inp.addEventListener('focus',()=>{_vozAlvoPauta=inp;});
  });
}

// ── DITAR NOTA POR VOZ ──
// Toque num campo de nota para o "seleccionar" e depois toque neste botão;
// o valor falado (ex: "quinze") é convertido em número e preenchido no campo.
let _vozAlvoPauta=null;
function ditarNotaPauta(){
  if(!_vozAlvoPauta){toast('Toque primeiro num campo de nota na tabela!','error');return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('Reconhecimento de voz não suportado neste navegador.','error');return}
  const rec=new SR();
  rec.lang='pt-PT';
  rec.maxAlternatives=3;
  toast('🎤 A ouvir... diga o valor da nota.','info');
  rec.onresult=(e)=>{
    const texto=e.results[0][0].transcript.trim();
    const num=parseFloat(texto.replace(',','.').match(/\d+([.,]\d+)?/)?.[0]);
    if(!isNaN(num)&&num>=0&&num<=20){
      _vozAlvoPauta.value=num;
      toast('Nota reconhecida: '+num,'success');
    }else{
      toast('Não consegui perceber um número válido (0-20). Ouvido: "'+texto+'"','error');
    }
  };
  rec.onerror=()=>toast('Erro no reconhecimento de voz.','error');
  rec.start();
}

function addAlunoPauta(){
  const nm=document.getElementById('ptNovoAluno').value.trim();
  if(!nm){toast('Insira o nome do aluno!','error');return}
  if(!document.getElementById('ptTurma').value){toast('Seleccione a turma primeiro!','error');return}
  window._pautaTemp=window._pautaTemp||[];
  window._pautaTemp.push(nm);
  document.getElementById('ptNovoAluno').value='';
  buildPautaTable();
}

function salvarPauta(){
  const turma=document.getElementById('ptTurma').value;
  const classe=document.getElementById('ptClasse').value;
  const trim=document.getElementById('ptTrim').value;
  const an=document.getElementById('ptAno').value.trim();
  if(!turma){toast('Seleccione uma turma!','error');return}
  if(!PA){toast('Entre num perfil de professor!','error');return}
  const rows=document.querySelectorAll('#ptTableWrap tbody tr');
  let count=0;
  rows.forEach(tr=>{
    const nm=tr.dataset.nome;
    let idx=dBol.findIndex(x=>x.nm.toLowerCase()===nm.toLowerCase()&&x.tr===turma);
    let entry=idx>=0?{...dBol[idx]}:{id:Date.now()+Math.floor(Math.random()*1000),nm,tr:turma,cl:classe,an,pd:'Anual',tn:'Manhã',notas:{}};
    tr.querySelectorAll('.pt-in').forEach(inp=>{
      const disc=inp.dataset.disc,v=parseFloat(inp.value);
      if(!entry.notas[disc])entry.notas[disc]={};
      if(inp.value!=='')entry.notas[disc][trim]=v;
    });
    // recalcula média global do aluno
    let sm=0,qt=0;
    Object.values(entry.notas).forEach(n=>{
      const vs=[n.t1,n.t2,n.t3].filter(v=>v>0);
      if(vs.length){const md=vs.reduce((s,v)=>s+v,0)/vs.length;n.media=md;sm+=md;qt++;}
    });
    entry.mg=qt>0?sm/qt:0;
    entry.apv=entry.mg>=10;
    entry.dt=new Date().toLocaleDateString('pt-PT');
    if(idx>=0)dBol[idx]=entry;else dBol.push(entry);
    count++;
  });
  saveBolDB();
  window._pautaTemp=[];
  logAct('Pauta de turma guardada',turma+' — '+count+' alunos');
  toast(count+' alunos guardados na pauta!','success');
  buildPautaTable();
  renderComparacaoTurmas();
  renderAlertasRisco();
}

// ── APROVEITAMENTO DA TURMA ──
function renderAproveitamentoTurma(){
  // mantido por compatibilidade; a versão activa está dentro de renderPauta via ptAprov
}
function calcAproveitamento(turma){
  const alunos=dBol.filter(b=>b.tr===turma);
  if(!alunos.length)return null;
  const totalApv=alunos.filter(a=>a.apv).length;
  const percGeral=Math.round(totalApv/alunos.length*100);
  const porDisc={};
  alunos.forEach(a=>{
    Object.entries(a.notas||{}).forEach(([d,n])=>{
      if(!n.media)return;
      if(!porDisc[d])porDisc[d]={apv:0,tot:0};
      porDisc[d].tot++;
      if(n.media>=10)porDisc[d].apv++;
    });
  });
  return {total:alunos.length,percGeral,porDisc};
}

// Chamado quando a tabela da pauta é (re)construída
const _origBuildPautaTable=buildPautaTable;
buildPautaTable=function(){
  _origBuildPautaTable();
  const turma=document.getElementById('ptTurma')?.value;
  const aprovEl=document.getElementById('ptAprov');
  if(!aprovEl)return;
  if(!turma){aprovEl.innerHTML='<div class="empty">Seleccione uma turma acima.</div>';return}
  const r=calcAproveitamento(turma);
  if(!r){aprovEl.innerHTML='<div class="empty">Sem dados guardados para esta turma ainda.</div>';return}
  let html=`<div class="sg" style="margin-bottom:10px"><div class="sc2"><div class="sn ${r.percGeral>=50?'ok':'am'}">${r.percGeral}%</div><div class="sl">Aprovação Geral</div></div><div class="sc2"><div class="sn te">${r.total}</div><div class="sl">Total Alunos</div></div></div>`;
  html+=Object.entries(r.porDisc).map(([d,v])=>{
    const pc=Math.round(v.apv/v.tot*100);
    return `<div class="dr2"><div class="dl">${d}</div><div class="db"><div class="df" style="width:${pc}%;background:${pc>=50?'var(--ok)':'var(--dg)'}"></div></div><div class="dc">${pc}%</div></div>`;
  }).join('');
  aprovEl.innerHTML=html;
};

// ── COMPARAÇÃO ENTRE TURMAS ──
function renderComparacaoTurmas(){
  const canvas=document.getElementById('gCompTurmas');
  if(!canvas)return;
  const turmas=[...new Set(dBol.map(b=>b.tr).filter(Boolean))];
  if(!turmas.length){canvas.parentElement.innerHTML='<div class="empty">Sem dados suficientes para comparar turmas.</div>';return}
  const medias=turmas.map(t=>{
    const al=dBol.filter(b=>b.tr===t);
    return al.reduce((s,a)=>s+(a.mg||0),0)/al.length;
  });
  if(gPautaChart)gPautaChart.destroy();
  gPautaChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:turmas,datasets:[{label:'Média da Turma',data:medias.map(m=>+m.toFixed(2)),backgroundColor:medias.map(m=>m>=10?'#10b981':'#ef4444'),borderRadius:6}]},
    options:{scales:{y:{beginAtZero:true,max:20}},plugins:{legend:{display:false}}}
  });
}

// ── ALERTAS DE RISCO DE REPROVAÇÃO ──
function renderAlertasRisco(){
  const el=document.getElementById('ptAlertas');
  if(!el)return;
  const risco=dBol.filter(b=>b.mg>0&&b.mg<10).sort((a,b)=>a.mg-b.mg);
  const riscoCPA=db.filter(a=>Math.max(a.mA,a.mB,a.mC)<10);
  if(!risco.length&&!riscoCPA.length){el.innerHTML='<div class="empty">✅ Nenhum aluno em risco de reprovação neste momento.</div>';return}
  let html='';
  risco.forEach(b=>{
    html+=`<div class="al"><div style="font-size:1.2rem">⚠️</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.82rem">${b.nm}</div><div style="font-size:.68rem;color:var(--mu)">${[b.tr,b.cl].filter(Boolean).join(' · ')} · Média: ${b.mg.toFixed(1)}</div></div></div>`;
  });
  riscoCPA.forEach(a=>{
    html+=`<div class="al"><div style="font-size:1.2rem">⚠️</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.82rem">${a.nm}</div><div style="font-size:.68rem;color:var(--mu)">${[a.tr,a.cl].filter(Boolean).join(' · ')} · Sem grupo com média ≥10 (CPA)</div></div></div>`;
  });
  el.innerHTML=html;
}

// ── PDF OFICIAL DA PAUTA ──
function pdfPauta(){
  const turma=document.getElementById('ptTurma').value;
  const classe=document.getElementById('ptClasse').value;
  const trim=document.getElementById('ptTrim').value;
  if(!turma){toast('Seleccione uma turma!','error');return}
  const alunos=dBol.filter(b=>b.tr===turma);
  if(!alunos.length){toast('Sem alunos guardados nesta turma!','error');return}
  const disc=disciplinasDaTurma(turma,classe);
  const {jsPDF}=window.jspdf,doc=new jsPDF('landscape'),c=[0,201,167];
  doc.setFillColor(...c);doc.rect(0,0,297,16,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(12);doc.setFont(undefined,'bold');
  doc.text('PAUTA OFICIAL DE TURMA',148,10.5,{align:'center'});
  doc.setTextColor(0);
  let y=escolaPdfHeader(doc,25);
  doc.setFontSize(10);doc.setFont(undefined,'normal');
  doc.text(`Turma: ${turma}  |  Classe: ${classe||'—'}  |  Trimestre: ${trim.toUpperCase()}  |  Data: ${new Date().toLocaleDateString('pt-PT')}`,20,y+4);
  doc.autoTable({
    startY:y+10,
    head:[['#','Nome',...disc.map(d=>d.split(' ')[0]),'Média','Situação']],
    body:alunos.map((a,i)=>[i+1,a.nm,...disc.map(d=>a.notas?.[d]?.[trim]||'—'),(a.mg||0).toFixed(1),a.apv?'APROVADO':'REPROVADO']),
    headStyles:{fillColor:c,fontSize:7},
    styles:{fontSize:7,halign:'center'},
    columnStyles:{1:{halign:'left'}},
    didParseCell:(dt)=>{
      const lastCol=disc.length+3;
      if(dt.column.index===lastCol&&dt.section==='body'){dt.cell.styles.textColor=dt.cell.text[0]==='APROVADO'?[16,185,129]:[239,68,68];dt.cell.styles.fontStyle='bold'}
    }
  });
  escolaPdfAssinatura(doc,doc.lastAutoTable.finalY+18);
  doc.setFontSize(8);doc.setTextColor(150);
  doc.text('© 2026 C.A.C.T — Sistema C.P.A',148,205,{align:'center'});
  window.open(URL.createObjectURL(doc.output('blob')),'_blank');
  toast('PDF da Pauta gerado!','success');
  logAct('PDF de pauta gerado',turma);
}
