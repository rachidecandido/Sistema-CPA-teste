/* ============================================================
   MÓDULO: CALENDARIO.JS — Calendário Escolar
   Fase 1 — Sistema C.P.A
   ============================================================ */

function gCalEventos(){return JSON.parse(localStorage.getItem('cpa_calendario')||'[]')}
function sCalEventos(e){localStorage.setItem('cpa_calendario',JSON.stringify(e))}

const CAL_TIPOS={exame:{ic:'📝',cor:'var(--dg)',lb:'Exame'},entrega:{ic:'📥',cor:'var(--ac2)',lb:'Entrega'},reuniao:{ic:'👥',cor:'var(--pu)',lb:'Reunião'},feriado:{ic:'🏖️',cor:'var(--wn)',lb:'Feriado'},outro:{ic:'📌',cor:'var(--mu)',lb:'Outro'}};

function renderCalendario(){
  const el=document.getElementById('sec-cal');
  if(!el)return;
  el.innerHTML=`
  <div class="card"><div class="ct">🗓️ Novo Evento</div>
    <div class="fr"><div><div class="fl">Título *</div><input class="fi" id="calTit" type="text" placeholder="Ex: Exame de Matemática"></div>
      <div><div class="fl">Tipo</div><select class="fi" id="calTipo"><option value="exame">📝 Exame</option><option value="entrega">📥 Entrega</option><option value="reuniao">👥 Reunião</option><option value="feriado">🏖️ Feriado</option><option value="outro">📌 Outro</option></select></div></div>
    <div class="fr"><div><div class="fl">Data *</div><input class="fi" id="calData" type="date"></div>
      <div><div class="fl">Turma (opcional)</div><input class="fi" id="calTurma" type="text" placeholder="Ex: 10ª A"></div></div>
    <div><div class="fl">Descrição</div><input class="fi" id="calDesc" type="text" placeholder="Opcional..."></div>
    <button class="btn bc" style="width:100%;margin-top:8px" onclick="criarEventoCal()">➕ Adicionar ao Calendário</button>
  </div>
  <div class="card"><div class="ct">📅 Próximos Eventos</div><div id="calList"></div></div>
  `;
  document.getElementById('calData').valueAsDate=new Date();
  renderListaCal();
}

function criarEventoCal(){
  const titulo=document.getElementById('calTit').value.trim();
  const tipo=document.getElementById('calTipo').value;
  const data=document.getElementById('calData').value;
  const turma=document.getElementById('calTurma').value.trim();
  const desc=document.getElementById('calDesc').value.trim();
  if(!titulo){toast('Insira o título do evento!','error');return}
  if(!data){toast('Insira a data!','error');return}
  const eventos=gCalEventos();
  eventos.push({id:Date.now(),titulo,tipo,data,turma,desc});
  sCalEventos(eventos);
  ['calTit','calTurma','calDesc'].forEach(id=>document.getElementById(id).value='');
  logAct('Evento adicionado ao calendário',titulo+' — '+data);
  toast('Evento adicionado!','success');
  renderListaCal();
  // Reuniões associadas a uma turma notificam automaticamente os encarregados vinculados
  if(tipo==='reuniao'&&turma&&typeof fbDB!=='undefined'&&fbDB){
    notificarEncarregadosReuniao(titulo,data,turma,desc);
  }
}

async function notificarEncarregadosReuniao(titulo,data,turma,desc){
  try{
    const dataFmt=new Date(data+'T00:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
    const alunosDaTurma=(typeof dBol!=='undefined'?dBol:[]).filter(b=>b.tr===turma&&(b.encEmail||b.mt));
    if(!alunosDaTurma.length)return;
    const avisados=new Set();
    let contador=0;
    for(const a of alunosDaTurma){
      const chave=(a.encEmail||'')+'|'+(a.mt||'');
      if(avisados.has(chave))continue;
      avisados.add(chave);
      await fbDB.collection('notificacoes').add({
        encEmail:a.encEmail||null,
        alunoMt:a.mt||null,
        alunoNome:a.nm,
        texto:`📅 Reunião marcada: "${titulo}" no dia ${dataFmt}${desc?' — '+desc:''}`,
        lida:false,
        data:firebase.firestore.FieldValue.serverTimestamp()
      });
      if(typeof enfileirarPushNotificacao==='function'){
        if(a.encEmail)enfileirarPushNotificacao(a.encEmail,'📅 Reunião — Sistema C.P.A',`"${titulo}" no dia ${dataFmt}`);
        if(a.mt)enfileirarPushNotificacao(a.mt,'📅 Reunião — Sistema C.P.A',`"${titulo}" no dia ${dataFmt}`);
      }
      contador++;
    }
    if(contador)toast(contador+' aluno(s)/encarregado(s) notificado(s) da reunião.','success');
  }catch(e){console.error(e);}
}

function renderListaCal(){
  const el=document.getElementById('calList');
  if(!el)return;
  const hoje=new Date().toISOString().slice(0,10);
  const eventos=gCalEventos().filter(e=>e.data>=hoje).sort((a,b)=>a.data.localeCompare(b.data));
  const passados=gCalEventos().filter(e=>e.data<hoje).length;
  if(!eventos.length){el.innerHTML=`<div class="empty">Nenhum evento futuro agendado.${passados?' ('+passados+' eventos já passaram)':''}</div>`;return}
  el.innerHTML=eventos.map(e=>{
    const t=CAL_TIPOS[e.tipo]||CAL_TIPOS.outro;
    const dObj=new Date(e.data+'T00:00:00');
    const dataFmt=dObj.toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'});
    const diasRestantes=Math.ceil((dObj-new Date(hoje+'T00:00:00'))/86400000);
    return `<div class="hi"><div style="font-size:1.3rem;width:30px;text-align:center">${t.ic}</div><div style="flex:1;min-width:0"><div class="hn">${e.titulo}</div><div class="hm">${dataFmt} ${e.turma?'· Turma: '+e.turma:''} ${diasRestantes===0?'· <b>Hoje!</b>':diasRestantes===1?'· Amanhã':'· em '+diasRestantes+' dias'}</div>${e.desc?`<div style="font-size:.68rem;color:var(--mu);margin-top:2px">${e.desc}</div>`:''}</div><div class="ha"><button class="bsm sx" onclick="delEventoCal(${e.id})">✕</button></div></div>`;
  }).join('');
}

function delEventoCal(id){
  cfm('Este evento será removido do calendário.',()=>{
    sCalEventos(gCalEventos().filter(e=>e.id!==id));
    renderListaCal();
    toast('Evento removido.','info');
  },'🗑','Remover Evento','🗑 Remover','bd');
}
