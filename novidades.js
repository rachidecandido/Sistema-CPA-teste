/* ============================================================
   NOVIDADES.JS — Horário das aulas, aviso de faltas, lembretes de
   provas e cópia de segurança automática na nuvem
   Sistema C.P.A
   Depende de: index.html, sync.js (criarNotificacaoEncarregado), frequencia.js, calendario.js
   ============================================================ */

const DIAS_SEMANA=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

/* ───────────── 1. HORÁRIO DAS AULAS ───────────── */
function gHorario(){return JSON.parse(localStorage.getItem('cpa_horario')||'[]')}
function sHorario(h){localStorage.setItem('cpa_horario',JSON.stringify(h))}

function opcoesTurmasHorario(){
  const turmas=typeof gTurmas==='function'?gTurmas().map(t=>t.nome):[];
  const extra=[...new Set(dBol.map(b=>b.tr).filter(Boolean))];
  return [...new Set([...turmas,...extra])];
}

function renderHorario(){
  const el=document.getElementById('sec-horario');
  if(!el)return;
  const opts=opcoesTurmasHorario().map(t=>`<option value="${t}">${t}</option>`).join('');
  el.innerHTML=`
  <div class="card"><div class="ct">📍 As Minhas Aulas de Hoje</div><div id="hrHoje"></div></div>
  <div class="card"><div class="ct">➕ Nova Aula no Horário</div>
    <div class="fr">
      <div><div class="fl">Turma *</div><select class="fi" id="hrTurma"><option value="">— Seleccione —</option>${opts}</select></div>
      <div><div class="fl">Dia *</div><select class="fi" id="hrDia">${[1,2,3,4,5,6].map(i=>`<option value="${i}">${DIAS_SEMANA[i]}</option>`).join('')}</select></div>
    </div>
    <div class="fr">
      <div><div class="fl">Início *</div><input class="fi" id="hrIni" type="time" value="07:30"></div>
      <div><div class="fl">Fim *</div><input class="fi" id="hrFim" type="time" value="08:15"></div>
    </div>
    <div class="fr">
      <div><div class="fl">Disciplina *</div><input class="fi" id="hrDisc" type="text" placeholder="Ex: Matemática"></div>
      <div><div class="fl">Sala</div><input class="fi" id="hrSala" type="text" placeholder="Opcional"></div>
    </div>
    <button class="btn bc" style="width:100%;margin-top:6px" onclick="adicionarAula()">➕ Adicionar ao Horário</button>
  </div>
  <div class="card"><div class="ct">🗓️ Horário por Turma</div>
    <select class="fi" id="hrFiltro" onchange="renderListaHorario()" style="margin-bottom:9px"><option value="">— Todas as turmas —</option>${opts}</select>
    <div id="hrLista"></div>
  </div>`;
  renderListaHorario();
  pullHorarioFirebase();
}

function renderListaHorario(){
  const lista=document.getElementById('hrLista'),hoje=document.getElementById('hrHoje');
  if(!lista)return;
  const filtro=document.getElementById('hrFiltro')?document.getElementById('hrFiltro').value:'';
  const todas=gHorario();
  const linha=a=>`<div class="hi"><div style="flex:1;min-width:0"><div class="hn">${a.inicio}–${a.fim} · ${a.disciplina}</div><div class="hm">${a.turma}${a.sala?' · Sala '+a.sala:''}</div></div><div class="ha"><button class="bsm sx" onclick="delAula('${a.id}')">✕</button></div></div>`;
  const dHoje=new Date().getDay();
  const aulasHoje=todas.filter(a=>a.dia===dHoje).sort((a,b)=>a.inicio.localeCompare(b.inicio));
  if(hoje)hoje.innerHTML=aulasHoje.length?aulasHoje.map(linha).join(''):`<div class="empty">${dHoje===0?'Hoje é domingo — sem aulas.':'Sem aulas registadas para hoje.'}</div>`;
  const vis=todas.filter(a=>!filtro||a.turma===filtro);
  if(!vis.length){lista.innerHTML='<div class="empty">Ainda não há aulas no horário.</div>';return}
  lista.innerHTML=[1,2,3,4,5,6].map(d=>{
    const doDia=vis.filter(a=>a.dia===d).sort((a,b)=>a.inicio.localeCompare(b.inicio));
    if(!doDia.length)return '';
    return `<div style="font-weight:700;font-size:.78rem;margin:10px 0 5px;color:var(--ac)">${DIAS_SEMANA[d]}</div>`+doDia.map(linha).join('');
  }).join('');
}

async function adicionarAula(){
  if(!PA){toast('Entre num perfil de professor!','error');return}
  const turma=document.getElementById('hrTurma').value;
  const dia=parseInt(document.getElementById('hrDia').value);
  const inicio=document.getElementById('hrIni').value;
  const fim=document.getElementById('hrFim').value;
  const disciplina=document.getElementById('hrDisc').value.trim();
  const sala=document.getElementById('hrSala').value.trim();
  if(!turma||!inicio||!fim||!disciplina){toast('Preencha turma, horas e disciplina!','error');return}
  if(fim<=inicio){toast('A hora de fim tem de ser depois do início!','error');return}
  const aula={id:String(Date.now()),turma,dia,inicio,fim,disciplina,sala};
  const h=gHorario();h.push(aula);sHorario(h);
  document.getElementById('hrDisc').value='';
  logAct('Aula adicionada ao horário',turma+' — '+DIAS_SEMANA[dia]+' '+inicio);
  toast('Aula adicionada!','success');
  renderListaHorario();
  try{
    await fbDB.collection('horario').doc(aula.id).set({...aula,professorId:PA.id,professorNome:PA.nome,updatedAt:Date.now()});
  }catch(e){console.error(e);}
}
function delAula(id){
  cfm('Esta aula será removida do horário.',()=>{
    sHorario(gHorario().filter(a=>a.id!==id));
    renderListaHorario();
    if(typeof fbDB!=='undefined'&&fbDB)fbDB.collection('horario').doc(id).delete().catch(e=>console.error(e));
    toast('Aula removida.','info');
  },'🗑','Remover Aula','🗑 Remover','bd');
}
async function pullHorarioFirebase(){
  if(typeof fbDB==='undefined'||!fbDB||!PA)return;
  try{
    const snap=await fbDB.collection('horario').where('professorId','==',PA.id).get();
    const remotas=snap.docs.map(d=>{const x=d.data();return {id:String(x.id),turma:x.turma,dia:x.dia,inicio:x.inicio,fim:x.fim,disciplina:x.disciplina,sala:x.sala||''}});
    // aulas só locais (criadas sem ligação) sobem para a nuvem
    const ids=new Set(remotas.map(a=>a.id));
    gHorario().filter(a=>!ids.has(a.id)).forEach(a=>{
      remotas.push(a);
      fbDB.collection('horario').doc(a.id).set({...a,professorId:PA.id,professorNome:PA.nome,updatedAt:Date.now()}).catch(()=>{});
    });
    sHorario(remotas);
    renderListaHorario();
  }catch(e){console.error(e);}
}

/* ───────────── 2. AVISO DE FALTA AO ENCARREGADO ───────────── */
const _salvarFrequenciaNov=salvarFrequencia;
salvarFrequencia=function(){
  const turma=document.getElementById('frTurma').value;
  const data=document.getElementById('frData').value;
  _salvarFrequenciaNov();
  if(turma&&data)avisarFaltas(turma,data);
};
async function avisarFaltas(turma,data){
  if(typeof fbDB==='undefined'||!fbDB||!PA)return;
  try{
    const todos=gFreq().filter(r=>r.turma===turma&&r.data<=data).sort((a,b)=>b.data.localeCompare(a.data));
    const reg=todos.find(r=>r.data===data);
    if(!reg)return;
    const dataFmt=new Date(data+'T00:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long'});
    let avisos=0;
    for(const [nm,p] of Object.entries(reg.presencas)){
      if(p!==false)continue;
      const a=dBol.find(b=>b.nm===nm&&b.tr===turma);
      if(!a||!(a.encEmail||a.mt))continue;
      let seguidas=0;
      for(const r of todos){if(r.presencas[nm]===false)seguidas++;else break;}
      const reforco=seguidas>=3;
      const texto=reforco
        ?`🚨 ${nm} tem ${seguidas} faltas seguidas (a última em ${dataFmt}). Por favor contacte a escola.`
        :`❌ ${nm} faltou às aulas no dia ${dataFmt}.`;
      const ok=await criarNotificacaoEncarregado(a.encEmail,nm,texto,a.mt,{idFixo:`falta_${PA.id}_${a.id}_${data}${reforco?'_r'+seguidas:''}`,expiraDias:7});
      if(ok)avisos++;
    }
    if(avisos)toast(avisos+' encarregado(s)/aluno(s) avisado(s) das faltas.','success');
  }catch(e){console.error(e);}
}

/* ───────────── 3. LEMBRETES DE PROVAS/ENTREGAS/REUNIÕES ───────────── */
// Avisa alunos e encarregados da turma até 3 dias antes (uma vez por evento).
// Corre quando o professor entra e quando abre o Calendário.
async function verificarLembretesCalendario(){
  if(typeof fbDB==='undefined'||!fbDB||!PA)return;
  try{
    const hoje=new Date(new Date().toISOString().slice(0,10)+'T00:00:00');
    const tipos={exame:'📝 Prova/Exame',entrega:'📥 Entrega',reuniao:'👥 Reunião'};
    for(const ev of gCalEventos()){
      if(!ev.turma||!tipos[ev.tipo])continue;
      const dias=Math.round((new Date(ev.data+'T00:00:00')-hoje)/86400000);
      if(dias<0||dias>3)continue;
      const quando=dias===0?'HOJE':dias===1?'amanhã':'em '+dias+' dias';
      const alunos=dBol.filter(b=>b.tr===ev.turma&&(b.encEmail||b.mt));
      for(const a of alunos){
        await criarNotificacaoEncarregado(a.encEmail,a.nm,`⏰ Lembrete: ${tipos[ev.tipo]} "${ev.titulo}" — ${quando} (${new Date(ev.data+'T00:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long'})}).`,a.mt,{idFixo:`lemb_${ev.id}_${a.id}`,expiraDias:4});
      }
    }
  }catch(e){console.error(e);}
}
const _renderCalendarioNov=renderCalendario;
renderCalendario=function(){_renderCalendarioNov();verificarLembretesCalendario();};

/* ───────────── 4. CÓPIA DE SEGURANÇA AUTOMÁTICA NA NUVEM ───────────── */
// Não inclui PINs/senhas (cpa_profs e cpa_adm) por segurança.
const CHAVES_BACKUP_NUVEM=['cpa_escola','cpa_turmas','cpa_calendario','cpa_perguntas','cpa_freq','cpa_horario','cpa_propinas'];
function montarBackupNuvem(){
  const dados={};
  CHAVES_BACKUP_NUVEM.forEach(k=>{const v=localStorage.getItem(k);if(v!==null)dados[k]=v;});
  const notas={cpa:localStorage.getItem(dbK(PA.id))||'[]',bol:localStorage.getItem(dbBK(PA.id))||'[]'};
  return JSON.stringify({versao:1,dataExportacao:new Date().toISOString(),dados,notas});
}
async function guardarBackupNuvem(silencioso){
  if(typeof fbDB==='undefined'||!fbDB||!PA){if(!silencioso)toast('Entre num perfil de professor com internet.','error');return false}
  try{
    const texto=montarBackupNuvem();
    const TAM=250000,partes=[];
    for(let i=0;i<texto.length;i+=TAM)partes.push(texto.slice(i,i+TAM));
    const ref=fbDB.collection('backups').doc(String(PA.id));
    const antigo=await ref.get();
    const nAnt=antigo.exists?(antigo.data().partes||0):0;
    for(let i=0;i<partes.length;i++)await ref.collection('partes').doc(String(i)).set({texto:partes[i]});
    await ref.set({professorId:PA.id,professorNome:PA.nome,partes:partes.length,tamanho:texto.length,atualizadoEm:Date.now()});
    for(let i=partes.length;i<nAnt;i++)await ref.collection('partes').doc(String(i)).delete();
    localStorage.setItem('cpa_bk_nuvem_'+PA.id,String(Date.now()));
    if(!silencioso)toast('Cópia de segurança guardada na nuvem!','success');
    atualizarInfoBackupNuvem();
    return true;
  }catch(e){
    console.error(e);
    if(!silencioso)toast('Erro ao guardar na nuvem: '+(e.message||e.code),'error');
    return false;
  }
}
async function restaurarBackupNuvem(){
  if(typeof fbDB==='undefined'||!fbDB||!PA){toast('Entre num perfil de professor com internet.','error');return}
  try{
    const ref=fbDB.collection('backups').doc(String(PA.id));
    const meta=await ref.get();
    if(!meta.exists){toast('Ainda não existe cópia na nuvem para este perfil.','error');return}
    const m=meta.data();
    cfm(`Isto vai substituir os dados deste dispositivo pela cópia da nuvem de ${new Date(m.atualizadoEm).toLocaleString('pt-PT')}. Continuar?`,async()=>{
      try{
        let texto='';
        for(let i=0;i<m.partes;i++){const p=await ref.collection('partes').doc(String(i)).get();texto+=p.exists?p.data().texto:'';}
        const b=JSON.parse(texto);
        Object.entries(b.dados).forEach(([k,v])=>localStorage.setItem(k,v));
        localStorage.setItem(dbK(PA.id),b.notas.cpa||'[]');
        localStorage.setItem(dbBK(PA.id),b.notas.bol||'[]');
        toast('Cópia restaurada! A recarregar...','success');
        logAct('Cópia de segurança restaurada da nuvem');
        setTimeout(()=>location.reload(),1200);
      }catch(e){console.error(e);toast('Cópia da nuvem incompleta ou inválida.','error');}
    },'⚠️','Restaurar da Nuvem','⚠️ Restaurar e Substituir','bd');
  }catch(e){console.error(e);toast('Erro: '+(e.message||e.code),'error');}
}
async function atualizarInfoBackupNuvem(){
  const el=document.getElementById('bkNuvemInfo');
  if(!el||!PA)return;
  try{
    const d=await fbDB.collection('backups').doc(String(PA.id)).get();
    el.textContent=d.exists?`Última cópia na nuvem: ${new Date(d.data().atualizadoEm).toLocaleString('pt-PT')}`:'Ainda não existe cópia na nuvem.';
  }catch(e){el.textContent='';}
}
const _renderBackupNov=renderBackup;
renderBackup=function(){
  _renderBackupNov();
  const el=document.getElementById('sec-backup');
  if(!el)return;
  el.insertAdjacentHTML('afterbegin',`<div class="card"><div class="ct">☁️ Cópia Automática na Nuvem</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">O sistema guarda sozinho uma cópia por semana (alunos, notas, turmas, horário, presenças…) quando entra. Se perder o telemóvel, entre noutro e restaure aqui. Os PINs e senhas não são incluídos.</div>
    <div id="bkNuvemInfo" style="font-size:.72rem;margin-bottom:9px"></div>
    <button class="btn bs" style="width:100%;margin-bottom:8px" onclick="guardarBackupNuvem(false)">☁️ Guardar Cópia na Nuvem Agora</button>
    <button class="btn bd" style="width:100%" onclick="restaurarBackupNuvem()">⬇️ Restaurar da Nuvem</button></div>`);
  atualizarInfoBackupNuvem();
};
function backupNuvemSeSemanal(){
  if(!PA)return;
  const ult=parseInt(localStorage.getItem('cpa_bk_nuvem_'+PA.id)||'0');
  if(Date.now()-ult>7*86400000)guardarBackupNuvem(true);
}

/* ───────────── ARRANQUE (ao entrar como professor) ───────────── */
const _activateProfNov=activateProf;
activateProf=function(prof){
  _activateProfNov(prof);
  setTimeout(()=>{pullHorarioFirebase();verificarLembretesCalendario();},4000);
  setTimeout(backupNuvemSeSemanal,15000);
};
