/* ============================================================
   MÓDULO: ESTATISTICAS.JS — Estatísticas de Utilização (Painel Admin)
   Fase 3 — Sistema C.P.A
   Depende de: index.html (gProfs, dbK, dbBK, renderAdm)
   ============================================================ */

let gStatsProfChart=null;

function renderEstatisticasUso(){
  const canvas=document.getElementById('gStatsProf');
  const resumo=document.getElementById('admStatsResumo');
  if(!canvas)return;
  const profs=gProfs();
  if(!profs.length){canvas.parentElement.innerHTML='<div class="empty">Sem professores registados ainda.</div>';return}

  const dados=profs.map(p=>{
    const a=JSON.parse(localStorage.getItem(dbK(p.id))||'[]');
    const b=JSON.parse(localStorage.getItem(dbBK(p.id))||'[]');
    return {nome:p.nome,total:a.length+b.length};
  });

  // Professor mais activo (mais registos lançados)
  const maisActivo=dados.reduce((max,d)=>d.total>max.total?d:max,dados[0]);
  // Acções registadas no log local, nos últimos 7 dias
  const logs=JSON.parse(localStorage.getItem('cpa_log')||'[]');
  const seteDiasAtras=Date.now()-7*24*60*60*1000;
  const logsRecentes=logs.filter(l=>{
    const t=Date.parse(l.dt?.split(' ')[0]?.split('/').reverse().join('-')||'');
    return !isNaN(t)?t>=seteDiasAtras:true;
  });

  resumo.innerHTML=`👑 Professor mais activo: <b>${maisActivo?.nome||'—'}</b> (${maisActivo?.total||0} registos) · 📋 ${logs.length} acções registadas neste dispositivo (${logsRecentes.length} nos últimos 7 dias)`;

  if(gStatsProfChart)gStatsProfChart.destroy();
  gStatsProfChart=new Chart(canvas.getContext('2d'),{
    type:'bar',
    data:{labels:dados.map(d=>d.nome),datasets:[{label:'Alunos lançados',data:dados.map(d=>d.total),backgroundColor:'#00c9a7',borderRadius:6}]},
    options:{indexAxis:'y',scales:{x:{beginAtZero:true}},plugins:{legend:{display:false}}}
  });
}

// Estas estatísticas reflectem apenas os dados guardados NESTE dispositivo
// (localStorage). Para uma visão agregada entre dispositivos, seria necessário
// consultar o Firestore (colecção "alunos"), o que pode ser activado depois.
const _origRenderAdm=renderAdm;
renderAdm=function(){_origRenderAdm();renderEstatisticasUso();if(typeof renderRelatorioCard==='function')renderRelatorioCard();};
