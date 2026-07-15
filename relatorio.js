/* ============================================================
   MÓDULO: RELATORIO.JS — Relatório Mensal por Email
   Fase 7 — Sistema C.P.A
   Depende de: index.html (db, dBol, toast, cfm, logAct), escola.js (gEscola, gTurmas),
   calendario.js (gCalEventos), materiais (Firestore, via sync.js/fbDB)
   ------------------------------------------------------------
   Usa o EmailJS (conta gratuita, sem necessidade de cartão) para
   enviar um resumo mensal por email — accionado manualmente pelo
   professor/administrador, já que uma página estática (GitHub Pages)
   não tem um servidor próprio para disparar isto sozinha todos os
   meses. Pode ser enviado sempre que quiser, com um toque.
   ============================================================ */

const EMAILJS_PUBLIC_KEY='rhZQOcClJoomkajV8';
const EMAILJS_SERVICE_ID='service_kzibvea';
const EMAILJS_TEMPLATE_ID='template_jzmd9de';

let _emailjsIniciado=false;
function garantirEmailJS(){
  if(_emailjsIniciado)return true;
  if(typeof emailjs==='undefined')return false;
  emailjs.init({publicKey:EMAILJS_PUBLIC_KEY});
  _emailjsIniciado=true;
  return true;
}

function renderRelatorioCard(){
  const el=document.getElementById('relatorioCardWrap');
  if(!el)return;
  el.innerHTML=`
  <div class="card"><div class="ct">📧 Relatório Mensal por Email</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Gera um resumo do estado actual da escola (aprovação, alunos em risco, materiais, eventos) e envia por email. Não é automático por calendário — toque sempre que quiser enviar um relatório actualizado.</div>
    <button class="btn bs" style="width:100%" onclick="enviarRelatorioMensal()">📧 Gerar e Enviar Relatório Agora</button>
  </div>`;
}

function gerarConteudoRelatorio(){
  const esc=typeof gEscola==='function'?gEscola():null;
  const nomeEscola=esc?.nome||'Escola';
  const hoje=new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});

  const alunosBol=typeof dBol!=='undefined'?dBol:[];
  const totalBol=alunosBol.length;
  const aprovados=alunosBol.filter(b=>b.apv).length;
  const reprovados=totalBol-aprovados;
  const percAprov=totalBol?Math.round(aprovados/totalBol*100):0;
  const mediaGeral=totalBol?(alunosBol.reduce((s,b)=>s+(b.mg||0),0)/totalBol).toFixed(1):'—';

  const emRisco=alunosBol.filter(b=>b.mg>0&&b.mg<10).sort((a,b)=>a.mg-b.mg).slice(0,15);

  const turmas=[...new Set(alunosBol.map(b=>b.tr).filter(Boolean))];
  const resumoTurmas=turmas.map(t=>{
    const al=alunosBol.filter(b=>b.tr===t);
    const media=(al.reduce((s,b)=>s+(b.mg||0),0)/al.length).toFixed(1);
    const apv=Math.round(al.filter(b=>b.apv).length/al.length*100);
    return `${t}: média ${media}, ${apv}% aprovação (${al.length} alunos)`;
  });

  const eventos=(typeof gCalEventos==='function'?gCalEventos():[]).filter(e=>e.data>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,8);

  let html=`<b>Escola:</b> ${nomeEscola}<br><b>Data do relatório:</b> ${hoje}<br><br>`;
  html+=`<b>📊 Resumo Geral</b><br>`;
  html+=`Total de alunos com boletim: ${totalBol}<br>`;
  html+=`Aprovados: ${aprovados} (${percAprov}%) · Reprovados: ${reprovados}<br>`;
  html+=`Média geral da escola: ${mediaGeral}<br><br>`;

  if(resumoTurmas.length){
    html+=`<b>🏷️ Resumo por Turma</b><br>${resumoTurmas.join('<br>')}<br><br>`;
  }

  if(emRisco.length){
    html+=`<b>⚠️ Alunos em Risco de Reprovação (média mais baixa)</b><br>`;
    html+=emRisco.map(b=>`${b.nm} (${b.tr||'—'}) — média ${b.mg.toFixed(1)}`).join('<br>');
    html+=`<br><br>`;
  }else{
    html+=`<b>✅ Nenhum aluno em risco de reprovação neste momento.</b><br><br>`;
  }

  if(eventos.length){
    html+=`<b>📅 Próximos Eventos no Calendário</b><br>`;
    html+=eventos.map(e=>{
      const d=new Date(e.data+'T00:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit'});
      return `${d} — ${e.titulo}${e.turma?' ('+e.turma+')':''}`;
    }).join('<br>');
  }

  return html;
}

function enviarRelatorioMensal(){
  if(!garantirEmailJS()){
    toast('Biblioteca de email não carregou. Verifique a internet e recarregue a página.','error');
    return;
  }
  const conteudo=gerarConteudoRelatorio();
  cfm('Vai ser enviado um relatório com o estado actual da escola por email. Continuar?',()=>{
    toast('A enviar relatório...','info');
    emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{conteudo}).then(()=>{
      toast('Relatório enviado com sucesso!','success');
      logAct('Relatório mensal enviado por email');
    }).catch(err=>{
      console.error(err);
      toast('Erro ao enviar: '+(err.text||err.message||'falha desconhecida'),'error');
    });
  },'📧','Enviar Relatório Mensal','📧 Enviar Agora','bc');
}
