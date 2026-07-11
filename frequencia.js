/* ============================================================
   MÓDULO: FREQUENCIA.JS — Mapa de Frequência/Assiduidade
   Fase 3 — Sistema C.P.A
   Depende de: index.html (dBol, toast, cfm, logAct), escola.js (gTurmas)
   ============================================================ */

function gFreq(){return JSON.parse(localStorage.getItem('cpa_freq')||'[]')}
function sFreq(f){localStorage.setItem('cpa_freq',JSON.stringify(f))}

function renderFrequencia(){
  const el=document.getElementById('sec-freq');
  if(!el)return;
  const turmas=gTurmas();
  const opts=turmas.length
    ?turmas.map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('')
    :[...new Set(dBol.map(b=>b.tr).filter(Boolean))].map(t=>`<option value="${t}">${t}</option>`).join('');
  el.innerHTML=`
  <div class="card"><div class="ct">📋 Registar Presença</div>
    <div class="fr">
      <div><div class="fl">Turma</div><select class="fi" id="frTurma" onchange="buildFreqTable()"><option value="">— Seleccione —</option>${opts}</select></div>
      <div><div class="fl">Data</div><input class="fi" id="frData" type="date" onchange="buildFreqTable()"></div>
    </div>
    <div id="frTableWrap"></div>
    <button class="btn bs" style="width:100%;margin-top:9px" onclick="salvarFrequencia()">💾 Guardar Presença do Dia</button>
  </div>
  <div class="card"><div class="ct">📊 Mapa de Assiduidade</div>
    <div class="fl">Turma</div><select class="fi" id="frTurmaMapa" onchange="renderMapaAssiduidade()" style="margin-bottom:9px"><option value="">— Seleccione —</option>${opts}</select>
    <div id="mapaAssidWrap"></div>
    <button class="btn bp" style="width:100%;margin-top:9px" onclick="pdfFrequencia()">📄 Exportar PDF</button>
  </div>`;
  document.getElementById('frData').valueAsDate=new Date();
  buildFreqTable();
}

function buildFreqTable(){
  const wrap=document.getElementById('frTableWrap');
  if(!wrap)return;
  const turma=document.getElementById('frTurma').value;
  const data=document.getElementById('frData').value;
  if(!turma){wrap.innerHTML='<div class="empty">Seleccione uma turma.</div>';return}
  const alunos=dBol.filter(b=>b.tr===turma);
  if(!alunos.length){wrap.innerHTML='<div class="empty">Nenhum aluno guardado nesta turma ainda (lance primeiro no Boletim ou Pauta).</div>';return}
  const registo=gFreq().find(r=>r.turma===turma&&r.data===data);
  wrap.innerHTML=alunos.map(a=>{
    const presente=registo?registo.presencas[a.nm]!==false:true;
    return `<div class="hi" style="cursor:pointer" onclick="toggleFreqAluno(this)" data-nome="${a.nm}" data-presente="${presente}"><div style="flex:1;min-width:0"><div class="hn">${a.nm}</div></div><div class="st ${presente?'tap':'trp'}">${presente?'✅ Presente':'❌ Falta'}</div></div>`;
  }).join('');
}
function toggleFreqAluno(el){
  const presente=el.dataset.presente==='true';
  el.dataset.presente=(!presente).toString();
  const st=el.querySelector('.st');
  st.className='st '+(!presente?'tap':'trp');
  st.textContent=!presente?'✅ Presente':'❌ Falta';
}
function salvarFrequencia(){
  const turma=document.getElementById('frTurma').value;
  const data=document.getElementById('frData').value;
  if(!turma||!data){toast('Seleccione turma e data!','error');return}
  const presencas={};
  document.querySelectorAll('#frTableWrap .hi').forEach(el=>{
    presencas[el.dataset.nome]=el.dataset.presente==='true';
  });
  const freq=gFreq();
  const idx=freq.findIndex(r=>r.turma===turma&&r.data===data);
  const registo={turma,data,presencas};
  if(idx>=0)freq[idx]=registo;else freq.push(registo);
  sFreq(freq);
  logAct('Presença registada',turma+' — '+data);
  toast('Presença guardada!','success');
  renderMapaAssiduidade();
}

function calcAssiduidade(turma){
  const registos=gFreq().filter(r=>r.turma===turma);
  const alunos=[...new Set(dBol.filter(b=>b.tr===turma).map(b=>b.nm))];
  return alunos.map(nm=>{
    let presencas=0,total=0;
    registos.forEach(r=>{total++;if(r.presencas[nm]!==false)presencas++;});
    const pct=total>0?Math.round(presencas/total*100):100;
    return {nm,presencas,faltas:total-presencas,total,pct};
  });
}

function renderMapaAssiduidade(){
  const wrap=document.getElementById('mapaAssidWrap');
  if(!wrap)return;
  const turma=document.getElementById('frTurmaMapa').value;
  if(!turma){wrap.innerHTML='<div class="empty">Seleccione uma turma.</div>';return}
  const dados=calcAssiduidade(turma);
  if(!dados.length){wrap.innerHTML='<div class="empty">Sem registos de presença ainda para esta turma.</div>';return}
  wrap.innerHTML=dados.map(d=>`<div class="dr2"><div class="dl">${d.nm}</div><div class="db"><div class="df" style="width:${d.pct}%;background:${d.pct>=75?'var(--ok)':d.pct>=50?'var(--wn)':'var(--dg)'}"></div></div><div class="dc">${d.pct}% (${d.faltas} falta${d.faltas!==1?'s':''})</div></div>`).join('');
}

function pdfFrequencia(){
  const turma=document.getElementById('frTurmaMapa').value;
  if(!turma){toast('Seleccione uma turma!','error');return}
  const dados=calcAssiduidade(turma);
  if(!dados.length){toast('Sem dados de presença para esta turma!','error');return}
  const {jsPDF}=window.jspdf,doc=new jsPDF(),c=[0,201,167];
  doc.setFillColor(...c);doc.rect(0,0,210,16,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(12);doc.setFont(undefined,'bold');
  doc.text('MAPA DE FREQUÊNCIA / ASSIDUIDADE',105,10.5,{align:'center'});
  doc.setTextColor(0);
  let y=typeof escolaPdfHeader==='function'?escolaPdfHeader(doc,27):27;
  doc.setFontSize(10);doc.setFont(undefined,'normal');
  doc.text(`Turma: ${turma}  |  Data de emissão: ${new Date().toLocaleDateString('pt-PT')}`,20,y+3);
  doc.autoTable({
    startY:y+10,
    head:[['Aluno','Presenças','Faltas','Total de Dias','% Assiduidade']],
    body:dados.map(d=>[d.nm,d.presencas,d.faltas,d.total,d.pct+'%']),
    headStyles:{fillColor:c},
    styles:{fontSize:9,halign:'center'},
    columnStyles:{0:{halign:'left'}},
    didParseCell:(dt)=>{
      if(dt.column.index===4&&dt.section==='body'){
        const pct=parseInt(dt.cell.text[0]);
        dt.cell.styles.textColor=pct>=75?[16,185,129]:pct>=50?[245,158,11]:[239,68,68];
        dt.cell.styles.fontStyle='bold';
      }
    }
  });
  if(typeof escolaPdfAssinatura==='function')escolaPdfAssinatura(doc,doc.lastAutoTable.finalY+18);
  doc.setFontSize(8);doc.setTextColor(150);
  doc.text('© 2026 C.A.C.T — Sistema C.P.A',105,290,{align:'center'});
  window.open(URL.createObjectURL(doc.output('blob')),'_blank');
  toast('PDF de frequência gerado!','success');
}
