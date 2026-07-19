/* ============================================================
   MÓDULO: TESTES.JS — Banco de Perguntas e Montagem de Testes
   Fase 6 — Sistema C.P.A
   Depende de: index.html (toast, cfm, logAct, jsPDF), escola.js (escolaPdfHeader, escolaPdfAssinatura)
   ============================================================ */

function gPerguntas(){return JSON.parse(localStorage.getItem('cpa_perguntas')||'[]')}
function sPerguntas(p){localStorage.setItem('cpa_perguntas',JSON.stringify(p))}

function renderTestes(){
  const el=document.getElementById('sec-testes');
  if(!el)return;
  el.innerHTML=`
  <div class="card"><div class="ct">➕ Nova Pergunta</div>
    <div class="fr">
      <div><div class="fl">Disciplina</div><input class="fi" id="pgDisc" type="text" placeholder="Ex: Matemática"></div>
      <div><div class="fl">Classe</div><select class="fi" id="pgClasse"><option value="">—</option><option>7ª</option><option>8ª</option><option>9ª</option><option>10ª</option><option>11ª</option><option>12ª</option></select></div>
    </div>
    <div class="fl">Enunciado *</div><textarea class="fi" id="pgEnun" rows="3" placeholder="Escreva a pergunta..." style="margin-bottom:9px;resize:vertical"></textarea>
    <div class="fr">
      <div><div class="fl">Tipo</div><select class="fi" id="pgTipo" onchange="mudarTipoPergunta()"><option value="aberta">✍️ Resposta Aberta</option><option value="multipla">🔘 Escolha Múltipla</option></select></div>
      <div><div class="fl">Valor (pontos)</div><input class="fi" id="pgValor" type="number" value="2" min="0" step="0.5"></div>
    </div>
    <div id="pgOpcoesWrap" style="display:none">
      <div class="fl">Opções (marque a correcta)</div>
      ${[0,1,2,3].map(i=>`<div style="display:flex;gap:7px;align-items:center;margin-bottom:6px"><input type="radio" name="pgCorreta" value="${i}" id="pgCorr${i}"><input class="fi" id="pgOp${i}" type="text" placeholder="Opção ${String.fromCharCode(65+i)}" style="flex:1;margin-bottom:0"></div>`).join('')}
    </div>
    <button class="btn bs" style="width:100%;margin-top:6px" onclick="addPergunta()">➕ Adicionar ao Banco</button>
  </div>

  <div class="card"><div class="ct">🗂️ Banco de Perguntas</div>
    <div class="fr">
      <div><div class="fl">Filtrar por Disciplina</div><input class="fi" id="fpDisc" type="text" placeholder="Todas" oninput="renderBancoPerguntas()"></div>
      <div><div class="fl">Filtrar por Classe</div><select class="fi" id="fpClasse" onchange="renderBancoPerguntas()"><option value="">Todas</option><option>7ª</option><option>8ª</option><option>9ª</option><option>10ª</option><option>11ª</option><option>12ª</option></select></div>
    </div>
    <div id="bancoPerguntasList"></div>
  </div>

  <div class="card"><div class="ct">📝 Montar Teste</div>
    <div class="fl">Título do Teste *</div><input class="fi" id="tstTitulo" type="text" placeholder="Ex: Teste de Avaliação — 1º Trimestre" style="margin-bottom:9px">
    <div style="font-size:.72rem;color:var(--mu);margin-bottom:8px">Marque, na lista acima, as perguntas a incluir (aparece uma caixa de selecção ao lado de cada uma).</div>
    <div class="bg"><button class="btn bp" onclick="gerarPDFTeste(false)">📄 Gerar Teste (sem respostas)</button><button class="btn bl" onclick="gerarPDFTeste(true)">🔑 Gerar Gabarito</button></div>
  </div>`;
  renderBancoPerguntas();
}

function mudarTipoPergunta(){
  document.getElementById('pgOpcoesWrap').style.display=document.getElementById('pgTipo').value==='multipla'?'block':'none';
}

function addPergunta(){
  const disciplina=document.getElementById('pgDisc').value.trim();
  const classe=document.getElementById('pgClasse').value;
  const enunciado=document.getElementById('pgEnun').value.trim();
  const tipo=document.getElementById('pgTipo').value;
  const valor=parseFloat(document.getElementById('pgValor').value)||0;
  if(!enunciado){toast('Escreva o enunciado da pergunta!','error');return}
  let opcoes=[],correta=null;
  if(tipo==='multipla'){
    opcoes=[0,1,2,3].map(i=>document.getElementById('pgOp'+i).value.trim());
    if(opcoes.some(o=>!o)){toast('Preencha as 4 opções!','error');return}
    const marcada=document.querySelector('input[name="pgCorreta"]:checked');
    if(!marcada){toast('Marque qual é a opção correcta!','error');return}
    correta=parseInt(marcada.value);
  }
  const perguntas=gPerguntas();
  perguntas.push({id:Date.now(),disciplina,classe,enunciado,tipo,valor,opcoes,correta});
  sPerguntas(perguntas);
  document.getElementById('pgEnun').value='';
  [0,1,2,3].forEach(i=>{const o=document.getElementById('pgOp'+i);if(o)o.value='';});
  toast('Pergunta adicionada ao banco!','success');
  logAct('Pergunta adicionada ao banco',disciplina+' — '+enunciado.slice(0,40));
  renderBancoPerguntas();
}

function renderBancoPerguntas(){
  const el=document.getElementById('bancoPerguntasList');
  if(!el)return;
  const fDisc=(document.getElementById('fpDisc')?.value||'').toLowerCase();
  const fClasse=document.getElementById('fpClasse')?.value||'';
  const perguntas=gPerguntas().filter(p=>
    (!fDisc||p.disciplina.toLowerCase().includes(fDisc))&&
    (!fClasse||p.classe===fClasse)
  );
  if(!perguntas.length){el.innerHTML='<div class="empty">Nenhuma pergunta encontrada. Adicione perguntas acima.</div>';return}
  el.innerHTML=perguntas.map(p=>`
    <div class="hi">
      <input type="checkbox" class="pg-check" data-id="${p.id}" style="width:18px;height:18px;margin-right:9px">
      <div style="flex:1;min-width:0">
        <div class="hn">${p.enunciado.slice(0,60)}${p.enunciado.length>60?'…':''}</div>
        <div class="hm">${[p.disciplina,p.classe&&p.classe+'ª Classe',p.tipo==='multipla'?'🔘 Múltipla':'✍️ Aberta',p.valor+' pts'].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="ha"><button class="bsm sx" onclick="delPergunta(${p.id})">✕</button></div>
    </div>`).join('');
}

function delPergunta(id){
  cfm('Esta pergunta será removida do banco.',()=>{
    sPerguntas(gPerguntas().filter(p=>p.id!==id));
    renderBancoPerguntas();
    toast('Pergunta removida.','info');
  },'🗑','Remover Pergunta','🗑 Remover','bd');
}

function gerarPDFTeste(comRespostas){
  const titulo=document.getElementById('tstTitulo').value.trim();
  if(!titulo){toast('Insira o título do teste!','error');return}
  const idsSelecionados=[...document.querySelectorAll('.pg-check:checked')].map(c=>parseInt(c.dataset.id));
  if(!idsSelecionados.length){toast('Marque pelo menos uma pergunta na lista!','error');return}
  const perguntas=gPerguntas().filter(p=>idsSelecionados.includes(p.id));
  const totalPontos=perguntas.reduce((s,p)=>s+(p.valor||0),0);
  if(!bibliotecaPDFDisponivel())return;

  const {jsPDF}=window.jspdf,doc=new jsPDF(),c=[0,201,167];
  doc.setFillColor(...c);doc.rect(0,0,210,16,'F');
  doc.setTextColor(255,255,255);doc.setFontSize(12);doc.setFont(undefined,'bold');
  doc.text(comRespostas?'GABARITO DO TESTE':'TESTE DE AVALIAÇÃO',105,10.5,{align:'center'});
  doc.setTextColor(0);
  let y=typeof escolaPdfHeader==='function'?escolaPdfHeader(doc,27):27;
  doc.setFontSize(13);doc.setFont(undefined,'bold');
  doc.text(titulo,105,y+3,{align:'center'});
  y+=11;
  doc.setFontSize(9);doc.setFont(undefined,'normal');doc.setTextColor(100);
  doc.text(`Total: ${perguntas.length} perguntas · ${totalPontos} valores`,105,y,{align:'center'});
  y+=8;
  if(!comRespostas){
    doc.setFontSize(9);doc.text('Nome do Aluno: _______________________________________  Turma: _________  Data: ____/____/______',20,y);
    y+=10;
  }
  doc.setTextColor(0);

  perguntas.forEach((p,i)=>{
    if(y>265){doc.addPage();y=20;}
    doc.setFontSize(10);doc.setFont(undefined,'bold');
    const cabecalho=`${i+1}. (${p.valor} val.) `;
    doc.text(cabecalho,20,y);
    doc.setFont(undefined,'normal');
    const larguraTexto=170-doc.getTextWidth(cabecalho);
    const linhasEnun=doc.splitTextToSize(p.enunciado,larguraTexto);
    doc.text(linhasEnun,20+doc.getTextWidth(cabecalho),y);
    y+=linhasEnun.length*5+3;
    if(p.tipo==='multipla'){
      p.opcoes.forEach((op,idx)=>{
        const marca=comRespostas&&idx===p.correta?'✔ ':'';
        doc.setFont(undefined,comRespostas&&idx===p.correta?'bold':'normal');
        doc.setTextColor(comRespostas&&idx===p.correta?16:60,comRespostas&&idx===p.correta?150:60,comRespostas&&idx===p.correta?90:60);
        doc.text(`${marca}${String.fromCharCode(65+idx)}) ${op}`,26,y);
        doc.setTextColor(0);
        y+=6;
      });
      y+=3;
    }else{
      if(comRespostas){
        doc.setFont(undefined,'italic');doc.setTextColor(100);
        doc.text('(Resposta aberta — corrigir manualmente)',26,y);
        doc.setTextColor(0);
        y+=8;
      }else{
        doc.line(20,y+10,190,y+10);
        doc.line(20,y+18,190,y+18);
        y+=24;
      }
    }
    y+=3;
  });

  if(typeof escolaPdfAssinatura==='function'&&y<260)escolaPdfAssinatura(doc,Math.min(y+10,275));
  doc.setFontSize(8);doc.setTextColor(150);
  const totalPaginas=doc.internal.getNumberOfPages();
  for(let pg=1;pg<=totalPaginas;pg++){
    doc.setPage(pg);
    doc.text('© 2026 C.A.C.T — Sistema C.P.A · Página '+pg+'/'+totalPaginas,105,292,{align:'center'});
  }
  window.open(URL.createObjectURL(doc.output('blob')),'_blank');
  toast((comRespostas?'Gabarito':'Teste')+' gerado com sucesso!','success');
  logAct((comRespostas?'Gabarito':'Teste')+' gerado',titulo);
}
