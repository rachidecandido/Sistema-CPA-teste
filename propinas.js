/* ============================================================
   MÓDULO: PROPINAS.JS — Gestão de Propinas/Pagamentos por Aluno
   Fase 8 — Sistema C.P.A
   Depende de: index.html (dBol, toast, cfm, logAct, jsPDF), escola.js (gTurmas, escolaPdfHeader, escolaPdfAssinatura)
   ============================================================ */

function gPropinas(){return JSON.parse(localStorage.getItem('cpa_propinas')||'[]')}
function sPropinas(p){localStorage.setItem('cpa_propinas',JSON.stringify(p))}

function renderPropinas(){
  const el=document.getElementById('sec-propinas');
  if(!el)return;
  const turmas=gTurmas();
  const opts=turmas.length
    ?turmas.map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('')
    :[...new Set(dBol.map(b=>b.tr).filter(Boolean))].map(t=>`<option value="${t}">${t}</option>`).join('');
  const mesAtual=new Date().toISOString().slice(0,7);
  el.innerHTML=`
  <div class="card"><div class="ct">💵 Registar Pagamento</div>
    <div class="fr">
      <div><div class="fl">Turma</div><select class="fi" id="ppTurma" onchange="atualizarAlunosPropinas()"><option value="">— Seleccione —</option>${opts}</select></div>
      <div><div class="fl">Aluno</div><select class="fi" id="ppAluno"><option value="">—</option></select></div>
    </div>
    <div class="fr">
      <div><div class="fl">Mês de Referência</div><input class="fi" id="ppMes" type="month" value="${mesAtual}"></div>
      <div><div class="fl">Valor (MT)</div><input class="fi" id="ppValor" type="number" min="0" placeholder="Ex: 500"></div>
    </div>
    <div class="fr">
      <div><div class="fl">Método</div><select class="fi" id="ppMetodo"><option>Numerário</option><option>M-Pesa</option><option>e-Mola</option><option>Transferência Bancária</option></select></div>
      <div><div class="fl">Data do Pagamento</div><input class="fi" id="ppData" type="date"></div>
    </div>
    <button class="btn bs" style="width:100%" onclick="registarPropina()">💾 Registar Pagamento</button>
  </div>

  <div class="card"><div class="ct">⚠️ Alunos em Atraso (${mesAtual})</div>
    <div class="fl">Ver turma</div><select class="fi" id="ppTurmaAtraso" onchange="renderAtrasos()" style="margin-bottom:9px"><option value="">— Seleccione —</option>${opts}</select>
    <div id="atrasosList"></div>
  </div>

  <div class="card"><div class="ct">📋 Pagamentos Recentes</div><div id="propinasList"></div></div>`;
  document.getElementById('ppData').valueAsDate=new Date();
  renderListaPropinas();
}

function atualizarAlunosPropinas(){
  const turma=document.getElementById('ppTurma').value;
  const sel=document.getElementById('ppAluno');
  const alunos=dBol.filter(b=>b.tr===turma);
  sel.innerHTML='<option value="">—</option>'+alunos.map(a=>`<option value="${a.nm}">${a.nm}</option>`).join('');
}

function registarPropina(){
  const turma=document.getElementById('ppTurma').value;
  const alunoNome=document.getElementById('ppAluno').value;
  const mes=document.getElementById('ppMes').value;
  const valor=parseFloat(document.getElementById('ppValor').value);
  const metodo=document.getElementById('ppMetodo').value;
  const dataPagamento=document.getElementById('ppData').value;
  if(!turma||!alunoNome){toast('Seleccione a turma e o aluno!','error');return}
  if(!mes){toast('Seleccione o mês de referência!','error');return}
  if(!valor||valor<=0){toast('Insira um valor válido!','error');return}
  const propinas=gPropinas();
  propinas.push({id:Date.now(),alunoNome,turma,mes,valor,metodo,dataPagamento,dt:new Date().toLocaleDateString('pt-PT')});
  sPropinas(propinas);
  toast('Pagamento registado!','success');
  logAct('Propina registada',alunoNome+' — '+mes+' — '+valor+' MT');
  document.getElementById('ppValor').value='';
  renderListaPropinas();
  renderAtrasos();
}

function renderListaPropinas(){
  const el=document.getElementById('propinasList');
  if(!el)return;
  const propinas=gPropinas().sort((a,b)=>b.id-a.id).slice(0,30);
  if(!propinas.length){el.innerHTML='<div class="empty">Nenhum pagamento registado ainda.</div>';return}
  el.innerHTML=propinas.map(p=>`<div class="hi"><div style="flex:1;min-width:0"><div class="hn">${p.alunoNome}</div><div class="hm">${[p.turma,p.mes,p.metodo].filter(Boolean).join(' · ')} — ${p.valor} MT</div></div><div class="ha"><button class="bsm bl" onclick="gerarReciboPropina(${p.id})">🧾</button><button class="bsm sx" onclick="delPropina(${p.id})">✕</button></div></div>`).join('');
}

function delPropina(id){
  cfm('Este registo de pagamento será removido.',()=>{
    sPropinas(gPropinas().filter(p=>p.id!==id));
    renderListaPropinas();
    renderAtrasos();
    toast('Registo removido.','info');
  },'🗑','Remover Pagamento','🗑 Remover','bd');
}

function renderAtrasos(){
  const el=document.getElementById('atrasosList');
  if(!el)return;
  const turma=document.getElementById('ppTurmaAtraso').value;
  if(!turma){el.innerHTML='<div class="empty">Seleccione uma turma.</div>';return}
  const mesAtual=new Date().toISOString().slice(0,7);
  const alunos=dBol.filter(b=>b.tr===turma);
  const propinas=gPropinas().filter(p=>p.turma===turma&&p.mes===mesAtual);
  const pagos=new Set(propinas.map(p=>p.alunoNome));
  const emAtraso=alunos.filter(a=>!pagos.has(a.nm));
  if(!emAtraso.length){el.innerHTML='<div class="empty">✅ Todos os alunos desta turma já pagaram este mês.</div>';return}
  el.innerHTML=emAtraso.map(a=>`<div class="al"><div style="font-size:1.2rem">⚠️</div><div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.82rem">${a.nm}</div><div style="font-size:.68rem;color:var(--mu)">Sem pagamento registado para ${mesAtual}</div></div></div>`).join('');
}

function gerarReciboPropina(id){
  const p=gPropinas().find(x=>x.id===id);
  if(!p){toast('Registo não encontrado.','error');return}
  if(!bibliotecaPDFDisponivel())return;
  const {jsPDF}=window.jspdf,doc=new jsPDF(),c=[0,201,167];
  doc.setFillColor(...c);doc.rect(0,0,210,16,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(12);doc.setFont(undefined,'bold');
  doc.text('RECIBO DE PAGAMENTO',105,10.5,{align:'center'});
  doc.setTextColor(0);
  let y=typeof escolaPdfHeader==='function'?escolaPdfHeader(doc,27):27;
  y+=10;
  doc.setFontSize(11);doc.setFont(undefined,'normal');
  doc.text(`Recibo Nº: ${p.id}`,20,y);y+=8;
  doc.text(`Aluno(a): ${p.alunoNome}`,20,y);y+=8;
  doc.text(`Turma: ${p.turma}`,20,y);y+=8;
  doc.text(`Mês de referência: ${p.mes}`,20,y);y+=8;
  doc.text(`Método de pagamento: ${p.metodo}`,20,y);y+=8;
  doc.text(`Data do pagamento: ${p.dataPagamento||p.dt}`,20,y);y+=14;
  doc.setFontSize(15);doc.setFont(undefined,'bold');
  doc.text(`Valor Pago: ${p.valor.toFixed(2)} MT`,20,y);y+=20;
  if(typeof escolaPdfAssinatura==='function')escolaPdfAssinatura(doc,y+10);
  doc.setFontSize(8);doc.setTextColor(150);
  doc.text('© 2026 C.A.C.T — Sistema C.P.A',105,290,{align:'center'});
  window.open(URL.createObjectURL(doc.output('blob')),'_blank');
  toast('Recibo gerado!','success');
  logAct('Recibo de propina gerado',p.alunoNome);
}
