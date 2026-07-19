/* ============================================================
   MÓDULO: DUPLICADOS.JS — Detector de Alunos Duplicados
   Fase 10 — Sistema C.P.A
   Depende de: index.html (dBol, saveBolDB, toast, cfm, logAct)
   ------------------------------------------------------------
   Encontra alunos que provavelmente são a mesma pessoa lançada
   duas vezes (erro de digitação, acentos, espaços a mais) dentro
   da mesma turma, e permite juntar os dois registos num só.
   ============================================================ */

// Remove acentos, espaços a mais e maiúsculas — para comparar nomes de forma justa
function normalizarNome(nm){
  return (nm||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g,' ');
}

// Distância de Levenshtein simples — mede quantas letras precisam de mudar
// para uma palavra virar a outra (usado para detectar erros de digitação)
function distanciaLevenshtein(a,b){
  const m=a.length,n=b.length;
  const d=Array.from({length:m+1},()=>new Array(n+1).fill(0));
  for(let i=0;i<=m;i++)d[i][0]=i;
  for(let j=0;j<=n;j++)d[0][j]=j;
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const custo=a[i-1]===b[j-1]?0:1;
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+custo);
    }
  }
  return d[m][n];
}

function renderDuplicados(){
  const el=document.getElementById('sec-dup');
  if(!el)return;
  el.innerHTML=`
  <div class="card"><div class="ct">🔍 Detector de Alunos Duplicados</div>
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:10px">Procura, dentro de cada turma, nomes muito parecidos que provavelmente são o mesmo aluno lançado duas vezes (por engano de digitação, acentos ou espaços).</div>
    <button class="btn bs" style="width:100%" onclick="procurarDuplicados()">🔍 Procurar Duplicados</button>
    <div id="dupResultado" style="margin-top:11px"></div>
  </div>`;
}

function procurarDuplicados(){
  const el=document.getElementById('dupResultado');
  el.innerHTML='<div class="empty">A procurar...</div>';
  const turmas=[...new Set(dBol.map(b=>b.tr).filter(Boolean))];
  const pares=[];
  turmas.forEach(turma=>{
    const alunos=dBol.filter(b=>b.tr===turma);
    for(let i=0;i<alunos.length;i++){
      for(let j=i+1;j<alunos.length;j++){
        const n1=normalizarNome(alunos[i].nm),n2=normalizarNome(alunos[j].nm);
        if(!n1||!n2)continue;
        const iguais=n1===n2;
        const parecidos=!iguais&&distanciaLevenshtein(n1,n2)<=2&&Math.min(n1.length,n2.length)>3;
        if(iguais||parecidos){
          pares.push({turma,a:alunos[i],b:alunos[j],exato:iguais});
        }
      }
    }
  });
  if(!pares.length){el.innerHTML='<div class="empty">✅ Não foram encontrados alunos duplicados.</div>';return}
  el.innerHTML=pares.map((p,idx)=>`
    <div class="card" style="background:var(--c2);margin-bottom:9px">
      <div style="font-size:.72rem;color:${p.exato?'var(--dg)':'var(--wn)'};font-weight:700;margin-bottom:7px">${p.exato?'⚠️ Nomes idênticos':'🔸 Nomes muito parecidos'} — Turma ${p.turma}</div>
      <div style="display:flex;gap:9px;margin-bottom:9px">
        <div style="flex:1;background:var(--c1,var(--bg));border-radius:8px;padding:8px;font-size:.74rem">
          <b>${p.a.nm}</b><br>Média: ${(p.a.mg||0).toFixed(1)} · ${Object.keys(p.a.notas||{}).length} disciplinas
        </div>
        <div style="flex:1;background:var(--c1,var(--bg));border-radius:8px;padding:8px;font-size:.74rem">
          <b>${p.b.nm}</b><br>Média: ${(p.b.mg||0).toFixed(1)} · ${Object.keys(p.b.notas||{}).length} disciplinas
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
        <button class="btn bi" style="font-size:.68rem" onclick="juntarDuplicados(${p.a.id},${p.b.id})">🔗 Manter "${p.a.nm.split(' ')[0]}..."</button>
        <button class="btn bi" style="font-size:.68rem" onclick="juntarDuplicados(${p.b.id},${p.a.id})">🔗 Manter "${p.b.nm.split(' ')[0]}..."</button>
      </div>
      <button class="btn bl" style="width:100%;margin-top:7px;font-size:.68rem" onclick="this.closest('.card').remove()">Não juntar, são alunos diferentes</button>
    </div>
  `).join('');
}

// Junta dois registos: mantém o "manterId" e completa as notas em falta com
// os dados do outro registo (não apaga notas já lançadas no que fica).
function juntarDuplicados(manterId,removerId){
  cfm('Os dois registos vão ser fundidos num só. As notas do que for removido preenchem as disciplinas em falta no que ficar. Esta acção não pode ser desfeita. Continuar?',()=>{
    const manterIdx=dBol.findIndex(x=>x.id===manterId);
    const removerIdx=dBol.findIndex(x=>x.id===removerId);
    if(manterIdx<0||removerIdx<0){toast('Registo não encontrado.','error');return}
    const manter=dBol[manterIdx],remover=dBol[removerIdx];
    manter.notas=manter.notas||{};
    Object.entries(remover.notas||{}).forEach(([disc,n])=>{
      if(!manter.notas[disc]||(!manter.notas[disc].t1&&!manter.notas[disc].t2&&!manter.notas[disc].t3)){
        manter.notas[disc]=n;
      }
    });
    // recalcula a média do registo final
    let sm=0,qt=0;
    Object.values(manter.notas).forEach(n=>{
      const vs=[n.t1,n.t2,n.t3].filter(v=>v>0);
      if(vs.length){const md=vs.reduce((s,v)=>s+v,0)/vs.length;n.media=md;sm+=md;qt++;}
    });
    manter.mg=qt>0?sm/qt:0;
    manter.apv=manter.mg>=10;
    manter.mt=manter.mt||remover.mt;
    manter.encEmail=manter.encEmail||remover.encEmail;
    manter.alunoPin=manter.alunoPin||remover.alunoPin;
    dBol.splice(removerIdx,1);
    saveBolDB();
    // Remove também o registo antigo do Firebase, para não voltar a aparecer
    if(typeof fbDB!=='undefined'&&fbDB&&typeof PA!=='undefined'&&PA){
      fbDB.collection('alunos').doc(`${PA.id}_bol_${removerId}`).delete().catch(e=>console.error(e));
    }
    logAct('Alunos duplicados fundidos',manter.nm);
    toast('Registos fundidos com sucesso!','success');
    procurarDuplicados();
  },'🔗','Juntar Registos Duplicados','🔗 Juntar','bc');
}
