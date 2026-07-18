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

const EMAILJS_PUBLIC_KEY='W4dv9lIko7FUShx_Q'.trim();
const EMAILJS_SERVICE_ID='service_kzibvea'.trim();
const EMAILJS_TEMPLATE_ID='template_jzmd9de'.trim();

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
    <button class="btn bs" style="width:100%;margin-bottom:8px" onclick="enviarRelatorioMensal()">📧 Gerar e Enviar Relatório Agora</button>
    <button class="btn bl" style="width:100%" onclick="partilharRelatorioWhatsApp()">📱 Partilhar Resumo por WhatsApp</button>
  </div>`;
  garantirLembreteRelatorioNoCalendario();
}

// Garante que existe sempre um lembrete no Calendário Escolar para o dia 1
// do próximo mês, para não se esquecer de enviar o relatório — recria-o
// automaticamente todos os meses (não precisa de fazer nada manualmente).
function garantirLembreteRelatorioNoCalendario(){
  if(typeof gCalEventos!=='function'||typeof sCalEventos!=='function')return;
  const hoje=new Date();
  const proximoDia1=new Date(hoje.getFullYear(),hoje.getMonth()+(hoje.getDate()>1?1:0),1);
  const dataStr=proximoDia1.toISOString().slice(0,10);
  const eventos=gCalEventos();
  const jaExiste=eventos.some(e=>e._lembreteRelatorio&&e.data===dataStr);
  if(jaExiste)return;
  eventos.push({
    id:Date.now(),
    titulo:'📧 Enviar Relatório Mensal aos encarregados/director',
    tipo:'outro',
    data:dataStr,
    turma:'',
    desc:'Lembrete automático do Sistema C.P.A — Painel Administrador → Enviar Relatório.',
    _lembreteRelatorio:true
  });
  sCalEventos(eventos);
}

async function gerarConteudoRelatorio(){
  const esc=typeof gEscola==='function'?gEscola():null;
  const nomeEscola=esc?.nome||'Escola';
  const hoje=new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});

  // Vai buscar os alunos de TODOS os professores directamente ao Firebase —
  // usar apenas a variável local "dBol" só mostraria os alunos do perfil
  // que estiver ligado no momento (ex: o Administrador, que normalmente
  // não lança notas), dando sempre "0 alunos" para quem gera o relatório.
  let alunosBol=[];
  try{
    const snap=await fbDB.collection('alunos').where('tipo','==','bol').get();
    alunosBol=snap.docs.map(d=>d.data());
  }catch(e){
    console.error(e);
    toast('Aviso: não consegui buscar os alunos ao Firebase, o relatório pode estar incompleto.','error');
    alunosBol=typeof dBol!=='undefined'?dBol:[]; // recurso local, se o Firebase falhar
  }

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

// Versão em texto simples do relatório (sem tags HTML), para partilhar por
// WhatsApp — o WhatsApp não interpreta HTML, por isso as tags <b>/<br>
// apareceriam literalmente se usássemos o mesmo texto do email.
async function gerarResumoTextoPlano(){
  const html=await gerarConteudoRelatorio();
  return html
    .replace(/<br\s*\/?>/g,'\n')
    .replace(/<b>/g,'*').replace(/<\/b>/g,'*') // negrito do WhatsApp usa asteriscos
    .replace(/<[^>]+>/g,'');
}

function partilharRelatorioWhatsApp(){
  toast('A preparar resumo...','info');
  gerarResumoTextoPlano().then(texto=>{
    const url='https://wa.me/?text='+encodeURIComponent(texto);
    window.open(url,'_blank');
  });
}

function enviarRelatorioMensal(){
  if(!garantirEmailJS()){
    toast('Biblioteca de email não carregou. Verifique a internet e recarregue a página.','error');
    return;
  }
  cfm('Vai ser enviado um relatório com o estado actual da escola por email. Continuar?',async()=>{
    toast('A preparar relatório...','info');
    const conteudo=await gerarConteudoRelatorio();
    toast('A enviar relatório...','info');
    emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{conteudo},{publicKey:EMAILJS_PUBLIC_KEY}).then(()=>{
      toast('Relatório enviado com sucesso!','success');
      logAct('Relatório mensal enviado por email');
    }).catch(err=>{
      console.error(err);
      const detalhe=[err.status,err.text||err.message].filter(Boolean).join(' — ');
      toast('Erro ao enviar: '+(detalhe||'falha desconhecida'),'error');
    });
  },'📧','Enviar Relatório Mensal','📧 Enviar Agora','bc');
}
