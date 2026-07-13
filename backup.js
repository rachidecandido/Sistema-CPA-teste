/* ============================================================
   MÓDULO: BACKUP.JS — Cópia de Segurança Completa
   Fase 7 — Sistema C.P.A
   Depende de: index.html (toast, cfm, logAct, gProfs, dbK, dbBK)
   ------------------------------------------------------------
   Reúne TODOS os dados guardados neste dispositivo (escola,
   turmas, calendário, perguntas, perfis de professores e as
   notas de cada um) num único ficheiro .json, para nunca perder
   nada — mesmo que o Firebase ou o telemóvel falhem.
   ============================================================ */

const CHAVES_BACKUP_SIMPLES=['cpa_escola','cpa_turmas','cpa_calendario','cpa_perguntas','cpa_profs','cpa_adm','cpa_freq','cpa_log'];

function renderBackup(){
  const el=document.getElementById('sec-backup');
  if(!el)return;
  el.innerHTML=`
  <div class="card"><div class="ct">💾 Cópia de Segurança</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:12px">Guarda uma cópia de TUDO o que está neste dispositivo (dados da escola, turmas, calendário, banco de perguntas, professores e todas as notas) num único ficheiro. Guarde este ficheiro num lugar seguro (ex: Google Drive, email para si mesmo).</div>
    <button class="btn bs" style="width:100%;margin-bottom:9px" onclick="exportarBackupCompleto()">⬇️ Descarregar Cópia de Segurança</button>
    <div style="font-size:.68rem;color:var(--mu);margin:11px 0 7px">Já tem um ficheiro de cópia de segurança? Restaure aqui:</div>
    <input type="file" class="fi" id="backupFile" accept=".json" style="margin-bottom:9px">
    <button class="btn bd" style="width:100%" onclick="restaurarBackup()">⬆️ Restaurar Cópia de Segurança</button>
    <div style="font-size:.66rem;color:var(--wn);margin-top:8px">⚠️ Restaurar substitui os dados actuais deste dispositivo pelos do ficheiro.</div>
  </div>`;
}

function exportarBackupCompleto(){
  const backup={
    versao:1,
    dataExportacao:new Date().toISOString(),
    dados:{}
  };
  CHAVES_BACKUP_SIMPLES.forEach(k=>{
    const v=localStorage.getItem(k);
    if(v!==null)backup.dados[k]=v;
  });
  // Notas de cada professor + administrador (guardadas com chaves próprias por ID)
  const profs=gProfs();
  const idsExtra=[...profs.map(p=>p.id)];
  const adm=typeof gAdm==='function'?gAdm():null;
  if(adm)idsExtra.push('adm');
  backup.notasPorPerfil={};
  idsExtra.forEach(id=>{
    const cpaK=dbK(id),bolK=dbBK(id);
    const cpaV=localStorage.getItem(cpaK);
    const bolV=localStorage.getItem(bolK);
    if(cpaV||bolV)backup.notasPorPerfil[id]={cpa:cpaV||'[]',bol:bolV||'[]'};
  });

  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  const dataStr=new Date().toISOString().slice(0,10);
  a.href=URL.createObjectURL(blob);
  a.download=`backup_sistema_cpa_${dataStr}.json`;
  a.click();
  toast('Cópia de segurança descarregada!','success');
  logAct('Cópia de segurança exportada');
}

function restaurarBackup(){
  const file=document.getElementById('backupFile').files[0];
  if(!file){toast('Escolha um ficheiro de cópia de segurança primeiro!','error');return}
  const r=new FileReader();
  r.onload=e=>{
    let backup;
    try{backup=JSON.parse(e.target.result);}catch(err){toast('Ficheiro inválido — não é uma cópia de segurança válida.','error');return}
    if(!backup.dados){toast('Ficheiro inválido — formato não reconhecido.','error');return}
    cfm(`Isto vai substituir TODOS os dados actuais deste dispositivo pelos da cópia de ${backup.dataExportacao?new Date(backup.dataExportacao).toLocaleString('pt-PT'):'data desconhecida'}. Esta acção não pode ser desfeita. Continuar?`,()=>{
      Object.entries(backup.dados).forEach(([k,v])=>localStorage.setItem(k,v));
      if(backup.notasPorPerfil){
        Object.entries(backup.notasPorPerfil).forEach(([id,notas])=>{
          localStorage.setItem(dbK(id),notas.cpa||'[]');
          localStorage.setItem(dbBK(id),notas.bol||'[]');
        });
      }
      toast('Cópia de segurança restaurada! A recarregar...','success');
      logAct('Cópia de segurança restaurada');
      setTimeout(()=>location.reload(),1200);
    },'⚠️','Restaurar Cópia de Segurança','⚠️ Restaurar e Substituir','bd');
  };
  r.onerror=()=>toast('Não foi possível ler o ficheiro.','error');
  r.readAsText(file,'UTF-8');
}
