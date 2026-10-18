/* ============================================================
   PORTAL-EXTRAS.JS — partilhado pelo Portal do Aluno e do Encarregado
   Horário das aulas, próximas datas, monitor de notificações e teste
   Depende de: firebase-config.js (fbDB), push.js
   ============================================================ */

const DIAS_PT=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

function htmlHorarioTurma(aulas){
  if(!aulas.length)return '<div class="empty">Horário ainda não publicado.</div>';
  const hoje=new Date().getDay();
  return [1,2,3,4,5,6].map(d=>{
    const doDia=aulas.filter(a=>a.dia===d).sort((a,b)=>a.inicio.localeCompare(b.inicio));
    if(!doDia.length)return '';
    return `<div style="font-weight:700;font-size:.76rem;margin:9px 0 5px;color:${d===hoje?'var(--ac)':'var(--mu)'}">${DIAS_PT[d]}${d===hoje?' · HOJE':''}</div>`+
      doDia.map(a=>`<div class="notif" style="background:rgba(255,255,255,.04);border-color:${d===hoje?'var(--ac)':'rgba(255,255,255,.1)'}"><b>${a.inicio}–${a.fim}</b> · ${a.disciplina}${a.sala?' · Sala '+a.sala:''}</div>`).join('');
  }).join('');
}
async function carregarHorarioPortal(turmas,elId){
  const el=document.getElementById(elId);
  if(!el)return;
  turmas=[...new Set(turmas.filter(Boolean))];
  if(!turmas.length){el.innerHTML='<div class="empty">Sem turma associada.</div>';return}
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    let html='';
    for(const t of turmas){
      const snap=await fbDB.collection('horario').where('turma','==',t).get();
      html+=(turmas.length>1?`<div style="font-weight:800;font-size:.8rem;margin-top:6px">${t}</div>`:'')+htmlHorarioTurma(snap.docs.map(d=>d.data()));
    }
    el.innerHTML=html;
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar horário.</div>';console.error(e);}
}

async function carregarDatasPortal(turmas,elId){
  const el=document.getElementById(elId);
  if(!el)return;
  turmas=[...new Set(turmas.filter(Boolean))];
  el.innerHTML='<div class="empty">A carregar...</div>';
  try{
    const mapa={};
    for(const t of [...turmas,'']){
      const snap=await fbDB.collection('calendario').where('turma','==',t).get();
      snap.forEach(d=>{mapa[d.id]=d.data();});
    }
    const hojeStr=new Date().toISOString().slice(0,10);
    const hoje=new Date(hojeStr+'T00:00:00');
    const ic={exame:'📝',entrega:'📥',reuniao:'👥',feriado:'🏖️',outro:'📌'};
    const eventos=Object.values(mapa).filter(e=>e.data>=hojeStr).sort((a,b)=>a.data.localeCompare(b.data)).slice(0,10);
    if(!eventos.length){el.innerHTML='<div class="empty">Sem datas importantes próximas.</div>';return}
    el.innerHTML=eventos.map(e=>{
      const dias=Math.round((new Date(e.data+'T00:00:00')-hoje)/86400000);
      const q=dias===0?'<b style="color:var(--wn)">Hoje!</b>':dias===1?'Amanhã':'em '+dias+' dias';
      return `<div class="notif" style="background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1)">${ic[e.tipo]||'📌'} <b>${e.titulo}</b><div style="font-size:.7rem;color:var(--mu);margin-top:3px">${new Date(e.data+'T00:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long'})} · ${q}${e.turma?' · '+e.turma:''}</div></div>`;
    }).join('');
  }catch(e){el.innerHTML='<div class="empty">Erro ao carregar datas.</div>';console.error(e);}
}

// ── MONITOR DE NOTIFICAÇÕES (reforço) ──
// Enquanto o portal está aberto, verifica a cada minuto se há avisos novos e
// mostra-os no ecrã (e como notificação do telemóvel se a app estiver em
// segundo plano). Funciona mesmo que o envio push demore ou falhe.
let _monitorNotif=null;
function iniciarMonitorNotificacoes(chave,consulta,aoHaNovas){
  if(_monitorNotif)clearInterval(_monitorNotif);
  let vistas=[];
  let primeira=true;
  try{const g=localStorage.getItem(chave);if(g){vistas=JSON.parse(g);primeira=false;}}catch(e){}
  const set=new Set(vistas);
  async function ciclo(){
    try{
      const docs=await consulta();
      const validas=docs.filter(d=>{const x=d.data();return !(x.expiraEm&&x.expiraEm<Date.now())});
      const novas=validas.filter(d=>!set.has(d.id));
      if(!primeira&&novas.length){
        novas.forEach(d=>mostrarAvisoLocal(d.data().texto,d.id));
        if(aoHaNovas)aoHaNovas();
      }
      validas.forEach(d=>set.add(d.id));
      primeira=false;
      try{localStorage.setItem(chave,JSON.stringify([...set].slice(-300)));}catch(e){}
    }catch(e){/* sem rede: tenta no próximo ciclo */}
  }
  ciclo();
  _monitorNotif=setInterval(ciclo,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)ciclo();});
  window.addEventListener('online',ciclo);
}
function mostrarAvisoLocal(texto,id){
  try{
    if(document.hidden&&'Notification' in window&&Notification.permission==='granted'&&navigator.serviceWorker){
      navigator.serviceWorker.getRegistration().then(r=>{if(r)r.showNotification('Sistema C.P.A',{body:texto,icon:'icon-192.png',badge:'icon-192.png',tag:id});});
    }else{
      const box=document.getElementById('toasts');
      if(box){const el=document.createElement('div');el.className='toastm';el.style.background='var(--wn)';el.textContent='🔔 '+texto;box.appendChild(el);setTimeout(()=>el.remove(),6000);}
    }
  }catch(e){}
}

// ── TESTE DE NOTIFICAÇÕES NESTE DISPOSITIVO ──
async function testarNotificacoesPortal(destinatario,tipo,tst){
  try{
    if(!('Notification' in window)){tst('Este navegador não suporta notificações.','error');return}
    if(Notification.permission!=='granted'){
      const ok=await ativarNotificacoesPush(destinatario,tipo,tst,fbDB);
      if(!ok)return;
    }else{
      await pushAutoRegistar(destinatario,tipo,tst,fbDB,'avisoPush');
    }
    const snap=await fbDB.collection('fcm_tokens').where('destinatario','==',destinatario).get();
    await enfileirarPushNotificacao(destinatario,'Sistema C.P.A','🔔 Teste: se vê isto, as notificações estão a funcionar neste dispositivo.');
    tst(`Dispositivos registados: ${snap.size}. Teste enviado — chega em poucos minutos.`,'success');
  }catch(e){console.error(e);tst('Erro no teste: '+(e.message||e.code),'error');}
}
