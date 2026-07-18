/* ============================================================
   MÓDULO: DOCUMENTOS.JS — Evolução, Previsão, Certificado, Declaração
   Fase 3 — Sistema C.P.A
   Depende de: index.html (dBol, gEscola/escolaPdfHeader/escolaPdfAssinatura de escola.js, toast)
   ============================================================ */

// ── NOTIFICAR ENCARREGADO POR WHATSAPP ──
// Não temos o número de telefone do encarregado guardado (só o email para o
// Portal), por isso abre o WhatsApp com a mensagem pronta e deixa o professor
// escolher o contacto manualmente.
function notificarWhatsApp(alunoId){
  const b=dBol.find(x=>x.id===alunoId);
  if(!b){toast('Aluno não encontrado.','error');return}
  const situ=b.apv?'✅ está APROVADO(A)':'⚠️ está em situação de REPROVADO(A)';
  const msg=`Olá! Informamos que o(a) aluno(a) *${b.nm}* (${b.tr||'—'}, ${b.pd||'—'}) ${situ}, com média de ${(b.mg||0).toFixed(1)} valores.\n\nSistema C.P.A — ${b.cl||''}ª Classe`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

let gEvolBol=null;

// ── EVOLUÇÃO DO ALUNO ENTRE TRIMESTRES (gráfico de linha) + PREVISÃO ──
function verEvolucaoBol(alunoId){
  const b=dBol.find(x=>x.id===alunoId);
  if(!b||!b.notas){toast('Sem notas lançadas para este aluno.','error');return}
  const trimestres=['t1','t2','t3'];
  const medias=trimestres.map(t=>{
    const vals=Object.values(b.notas).map(n=>n[t]).filter(v=>v>0);
    return vals.length?+(vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(2):null;
  });

  let previsaoTxt='';
  if(medias[0]!=null&&medias[1]!=null&&medias[2]==null){
    const tendencia=medias[1]-medias[0];
    const prev=Math.max(0,Math.min(20,medias[1]+tendencia));
    previsaoTxt=`<div style="background:var(--c2);border-radius:9px;padding:10px;margin-top:10px;font-size:.76rem"><b>📈 Previsão (estimativa) para o 3º Trimestre:</b> ${prev.toFixed(1)} valores — com base na tendência entre o 1º e o 2º trimestre. <span style="color:var(--mu)">Isto é apenas uma estimativa e não substitui a avaliação real.</span></div>`;
  }else if(medias.every(m=>m!=null)){
    const media3=medias.reduce((s,v)=>s+v,0)/3;
    previsaoTxt=`<div style="background:var(--c2);border-radius:9px;padding:10px;margin-top:10px;font-size:.76rem"><b>📊 Resultado Final (já com os 3 trimestres):</b> ${media3.toFixed(1)} valores — ${media3>=10?'✅ Situação de aprovação':'⚠️ Situação de risco'}.</div>`;
  }

  document.getElementById('moDocsB').innerHTML=`<div style="font-weight:800;font-size:.95rem;margin-bottom:9px">📈 Evolução de ${b.nm}</div><div class="cw"><canvas id="gEvlBol"></canvas></div>${previsaoTxt}`;
  document.getElementById('moDocs').classList.add('open');
  setTimeout(()=>{
    const ctx=document.getElementById('gEvlBol').getContext('2d');
    if(gEvolBol)gEvolBol.destroy();
    gEvolBol=new Chart(ctx,{
      type:'line',
      data:{labels:['1º Trimestre','2º Trimestre','3º Trimestre'],datasets:[{label:b.nm,data:medias,borderColor:'#00c9a7',backgroundColor:'rgba(0,201,167,.15)',tension:.35,fill:true,spanGaps:false}]},
      options:{scales:{y:{beginAtZero:true,max:20}},plugins:{legend:{display:false}}}
    });
  },150);
}

// ── HISTÓRICO DO ALUNO AO LONGO DE VÁRIOS ANOS LECTIVOS ──
async function verHistoricoAnosAluno(alunoId){
  const b=dBol.find(x=>x.id===alunoId);
  if(!b){toast('Aluno não encontrado.','error');return}
  document.getElementById('moDocsB').innerHTML=`<div style="font-weight:800;font-size:.95rem;margin-bottom:9px">🗂️ Histórico de ${b.nm}</div><div class="empty">A procurar registos de anos anteriores...</div>`;
  document.getElementById('moDocs').classList.add('open');
  try{
    const snap=await fbDB.collection('alunos').where('nm','==',b.nm).where('tipo','==','bol').get();
    const registos=snap.docs.map(d=>d.data()).filter(r=>r.an);
    // agrupa por ano lectivo, ficando só com o registo mais recente de cada ano
    const porAno={};
    registos.forEach(r=>{
      if(!porAno[r.an]||( r.dt&&(!porAno[r.an].dt||r.dt>porAno[r.an].dt)))porAno[r.an]=r;
    });
    const anos=Object.keys(porAno).sort();
    if(anos.length<=1){
      document.getElementById('moDocsB').innerHTML=`<div style="font-weight:800;font-size:.95rem;margin-bottom:9px">🗂️ Histórico de ${b.nm}</div><div class="empty">Só há registos para um ano lectivo (${anos[0]||b.an||'—'}). O histórico mostra-se automaticamente quando houver mais do que um ano lançado para este aluno.</div>`;
      return;
    }
    const linhas=anos.map(an=>{
      const r=porAno[an];
      return `<tr><td style="text-align:left">${an}</td><td>${r.cl||'—'}</td><td>${r.tr||'—'}</td><td style="font-weight:700;color:${r.mg>=10?'var(--ok)':'var(--dg)'}">${(r.mg||0).toFixed(1)}</td><td>${r.apv?'✅ Aprovado':'❌ Reprovado'}</td></tr>`;
    }).join('');
    document.getElementById('moDocsB').innerHTML=`
      <div style="font-weight:800;font-size:.95rem;margin-bottom:9px">🗂️ Histórico de ${b.nm}</div>
      <div class="tw"><table><thead><tr><th style="text-align:left">Ano</th><th>Classe</th><th>Turma</th><th>Média</th><th>Situação</th></tr></thead><tbody>${linhas}</tbody></table></div>
      <div class="cw" style="margin-top:12px"><canvas id="gHistAnos"></canvas></div>`;
    setTimeout(()=>{
      const ctx=document.getElementById('gHistAnos').getContext('2d');
      new Chart(ctx,{type:'line',data:{labels:anos,datasets:[{label:'Média por Ano Lectivo',data:anos.map(a=>porAno[a].mg||0),borderColor:'#00c9a7',backgroundColor:'rgba(0,201,167,.15)',tension:.3,fill:true}]},options:{scales:{y:{beginAtZero:true,max:20}},plugins:{legend:{display:false}}}});
    },150);
  }catch(e){
    console.error(e);
    document.getElementById('moDocsB').innerHTML=`<div class="empty">Erro ao carregar histórico. Verifique a internet.</div>`;
  }
}

// ── CERTIFICADO DE APROVAÇÃO / CONCLUSÃO ──
function gerarCertificado(alunoId){
  const b=dBol.find(x=>x.id===alunoId);
  if(!b){toast('Aluno não encontrado.','error');return}
  if(!b.apv){toast('Só é possível gerar certificado para alunos aprovados.','error');return}
  const {jsPDF}=window.jspdf,doc=new jsPDF('landscape');
  doc.setFillColor(0,201,167);doc.rect(0,0,297,210,'F');
  doc.setFillColor(255,255,255);doc.rect(8,8,281,194,'F');
  doc.setDrawColor(0,201,167);doc.setLineWidth(1.2);doc.rect(12,12,273,186);
  const esc=typeof gEscola==='function'?gEscola():null;
  doc.setTextColor(40,40,40);
  if(esc&&esc.logo){try{doc.addImage(esc.logo,'PNG',134,20,29,29);}catch(e){}}
  doc.setFontSize(11);doc.setFont(undefined,'bold');
  doc.text(esc&&esc.nome?esc.nome:'ESCOLA SECUNDÁRIA',148,esc&&esc.logo?55:28,{align:'center'});
  doc.setFontSize(26);doc.setTextColor(0,153,110);doc.text('CERTIFICADO DE APROVAÇÃO',148,74,{align:'center'});
  doc.setDrawColor(0,201,167);doc.setLineWidth(.6);doc.line(90,80,207,80);
  doc.setFontSize(12);doc.setTextColor(80);doc.setFont(undefined,'normal');
  doc.text('Certifica-se que',148,95,{align:'center'});
  doc.setFontSize(19);doc.setTextColor(20);doc.setFont(undefined,'bold');
  doc.text(b.nm,148,108,{align:'center'});
  doc.setFontSize(12);doc.setTextColor(80);doc.setFont(undefined,'normal');
  doc.text(`obteve aproveitamento na ${b.cl||'—'} Classe, turma ${b.tr||'—'}, no ano lectivo de ${b.an||'—'},`,148,120,{align:'center'});
  doc.text(`com média global de ${(b.mg||0).toFixed(1)} valores, estando apto(a) a prosseguir os seus estudos.`,148,128,{align:'center'});
  doc.setFontSize(9);doc.setTextColor(140);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-PT')}`,148,150,{align:'center'});
  if(typeof escolaPdfAssinatura==='function')escolaPdfAssinatura(doc,172);
  window.open(URL.createObjectURL(doc.output('blob')),'_blank');
  toast('Certificado gerado!','success');
  if(typeof logAct==='function')logAct('Certificado de aprovação gerado',b.nm);
}

// ── DECLARAÇÃO DE NOTAS PARA O ENCARREGADO DE EDUCAÇÃO ──
function gerarDeclaracao(alunoId){
  const b=dBol.find(x=>x.id===alunoId);
  if(!b){toast('Aluno não encontrado.','error');return}
  const esc=typeof gEscola==='function'?gEscola():null;
  const {jsPDF}=window.jspdf,doc=new jsPDF();
  const c=[0,201,167];
  doc.setFillColor(...c);doc.rect(0,0,210,16,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(12);doc.setFont(undefined,'bold');
  doc.text('DECLARAÇÃO DE NOTAS',105,10.5,{align:'center'});
  doc.setTextColor(0);
  let y=escolaPdfHeader?escolaPdfHeader(doc,27):27;
  doc.setFontSize(10);doc.setFont(undefined,'normal');
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-PT')}`,20,y+3);
  y+=14;
  doc.setFontSize(11);
  const texto=`Para os devidos efeitos, declara-se que o(a) aluno(a) ${b.nm}, com o nº de matrícula ${b.mt||'—'}, encontra-se regularmente matriculado(a) na ${b.cl||'—'} Classe, turma ${b.tr||'—'}, turno da ${b.tn||'—'}, no ano lectivo de ${b.an||'—'}, tendo obtido as notas abaixo discriminadas no período: ${b.pd||'—'}.`;
  doc.text(texto,20,y,{maxWidth:170,lineHeightFactor:1.5});
  y+=32;
  const rows=Object.entries(b.notas||{}).filter(([d,n])=>n.t1||n.t2||n.t3).map(([d,n])=>[d,n.t1||'—',n.t2||'—',n.t3||'—',n.media>0?n.media.toFixed(1):'—']);
  doc.autoTable({startY:y,head:[['Disciplina','1ºT','2ºT','3ºT','Média']],body:rows,headStyles:{fillColor:c},styles:{fontSize:9,halign:'center'},columnStyles:{0:{halign:'left'}}});
  const yFinal=doc.lastAutoTable.finalY+10;
  doc.setFontSize(11);doc.setFont(undefined,'bold');
  doc.text(`Média Global: ${(b.mg||0).toFixed(2)} valores — ${b.apv?'APROVADO(A)':'REPROVADO(A)'}`,105,yFinal,{align:'center'});
  if(typeof escolaPdfAssinatura==='function')escolaPdfAssinatura(doc,yFinal+22);
  doc.setFontSize(8);doc.setTextColor(150);
  doc.text('Esta declaração destina-se ao(à) Encarregado(a) de Educação · © 2026 C.A.C.T — Sistema C.P.A',105,285,{align:'center'});
  window.open(URL.createObjectURL(doc.output('blob')),'_blank');
  toast('Declaração gerada!','success');
  if(typeof logAct==='function')logAct('Declaração de notas gerada',b.nm);
}
