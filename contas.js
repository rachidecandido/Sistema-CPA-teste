/* ============================================================
   MÓDULO: CONTAS.JS — Contas de Professor (Email/Senha)
   Fase 11 — Sistema C.P.A
   Depende de: index.html (PA, isAdm, gProfs, sProfs, activateProf, toast, cfm, logAct)
   Depende de: firebase-config.js (fbAuth, fbAuthSecundario, fbDB)
   ------------------------------------------------------------
   Permite a um professor entrar em QUALQUER dispositivo com o
   mesmo email e senha, mantendo acesso aos dados já lançados
   (identificados pelo mesmo "id" interno usado desde sempre).
   O PIN local continua a funcionar como atalho rápido no mesmo
   dispositivo, depois do primeiro login com email/senha.
   ============================================================ */

// ── PAINEL ADMINISTRADOR: Criar Conta de Professor (e do próprio Admin) ──
function renderContasProfessores(){
  const el=document.getElementById('contasProfWrap');
  if(!el)return;
  const profs=gProfs();
  const adm=gAdm();
  let html='';
  if(adm){
    html+=`<div class="hi" style="border-left:3px solid var(--gd,orange)">
      <div style="flex:1;min-width:0"><div class="hn">👑 ${adm.nome} (Administrador)</div><div class="hm">${adm.email?'✅ Conta activa: '+adm.email:'⚠️ Sem conta de email ainda'}</div></div>
      <div class="ha">${adm.email?'':`<button class="bsm bl" onclick="abrirCriarContaProfessor('admin','${adm.nome.replace(/'/g,"\\'")}')">🔑 Criar Conta</button>`}</div>
    </div>`;
  }
  if(!profs.length&&!adm){el.innerHTML='<div class="empty">Nenhum perfil registado ainda.</div>';return}
  html+=profs.map(p=>`
    <div class="hi">
      <div style="flex:1;min-width:0"><div class="hn">${p.nome}</div><div class="hm">${p.email?'✅ Conta activa: '+p.email:'⚠️ Sem conta de email ainda'}</div></div>
      <div class="ha">${p.email?'':`<button class="bsm bl" onclick="abrirCriarContaProfessor(${p.id},'${p.nome.replace(/'/g,"\\'")}')">🔑 Criar Conta</button>`}</div>
    </div>`).join('');
  el.innerHTML=html;
}

let _perfilParaContaId=null,_perfilParaContaNome=null;
function abrirCriarContaProfessor(perfilId,nome){
  if(!fbAuthSecundario||!fbDBSecundario){toast('Função indisponível: a instância segura do Firebase não carregou.','error');return}
  _perfilParaContaId=perfilId;
  _perfilParaContaNome=nome;
  document.getElementById('contaNomeProf').textContent=nome;
  document.getElementById('contaEmailProf').value='';
  document.getElementById('contaSenhaProf').value='';
  document.getElementById('contaErroProf').style.display='none';
  document.getElementById('moContaProf').classList.add('open');
}

async function confirmarCriarContaProfessor(){
  const email=document.getElementById('contaEmailProf').value.trim();
  const senha=document.getElementById('contaSenhaProf').value;
  const erroEl=document.getElementById('contaErroProf');
  erroEl.style.display='none';
  if(!email||!senha){erroEl.textContent='Preencha o email e a senha.';erroEl.style.display='block';return}
  if(senha.length<6){erroEl.textContent='A senha deve ter pelo menos 6 caracteres.';erroEl.style.display='block';return}
  const ehAdmin=_perfilParaContaId==='admin';
  try{
    const cred=await fbAuthSecundario.createUserWithEmailAndPassword(email,senha);
    const uid=cred.user.uid;
    const profs=gProfs();
    const perfil=ehAdmin?gAdm():profs.find(p=>p.id===_perfilParaContaId);
    // Usa a base de dados ligada à instância SECUNDÁRIA: é essa que está
    // autenticada como o utilizador recém-criado neste preciso momento, por
    // isso é a única que tem permissão para escrever a ficha dele agora.
    const dbParaEscrita=fbDBSecundario||fbDB;
    await dbParaEscrita.collection('professores').doc(uid).set({
      id:ehAdmin?'admin':_perfilParaContaId,
      nome:_perfilParaContaNome,
      pin:perfil?.pin||'',
      av:perfil?.av||(ehAdmin?'👑':'👨‍🏫'),
      email,
      isAdm:ehAdmin
    });
    // marca localmente que este perfil já tem conta (só para mostrar no painel)
    if(ehAdmin){
      const adm=gAdm();if(adm){adm.email=email;localStorage.setItem('cpa_adm',JSON.stringify(adm));}
    }else if(perfil){perfil.email=email;sProfs(profs);}
    await fbAuthSecundario.signOut(); // limpa a sessão da instância secundária
    logAct('Conta criada',_perfilParaContaNome+' — '+email+' (UID: '+uid+')');
    toast('Conta criada! (UID: '+uid.slice(0,8)+'...) Informe a senha definida.','success');
    closeModal('moContaProf');
    renderContasProfessores();
  }catch(e){
    console.error(e);
    const mapa={
      'auth/email-already-in-use':'Já existe uma conta com este email.',
      'auth/invalid-email':'Email inválido.',
      'auth/weak-password':'Senha muito fraca (mínimo 6 caracteres).'
    };
    erroEl.textContent=mapa[e.code]||('Erro: '+(e.message||e.code));
    erroEl.style.display='block';
  }
}

// ── ECRÃ DE LOGIN (professor entra em qualquer dispositivo) ──
function abrirLoginEmailProfessor(){
  document.getElementById('loginEmailProf').value='';
  document.getElementById('loginSenhaProf').value='';
  document.getElementById('loginErroProf').style.display='none';
  document.getElementById('moLoginProf').classList.add('open');
}

async function confirmarLoginEmailProfessor(){
  if(!fbAuth){toast('Não foi possível ligar ao servidor. Verifique a internet.','error');return}
  const email=document.getElementById('loginEmailProf').value.trim();
  const senha=document.getElementById('loginSenhaProf').value;
  const erroEl=document.getElementById('loginErroProf');
  erroEl.style.display='none';
  if(!email||!senha){erroEl.textContent='Preencha o email e a senha.';erroEl.style.display='block';return}
  try{
    const cred=await fbAuth.signInWithEmailAndPassword(email,senha);
    const doc=await fbDB.collection('professores').doc(cred.user.uid).get();
    if(!doc.exists){
      erroEl.innerHTML='Conta autenticada, mas sem perfil de professor associado. Contacte o administrador.<br><span style="font-size:.65rem;opacity:.7">(UID: '+cred.user.uid+')</span>';
      erroEl.style.display='block';
      await fbAuth.signOut();
      return;
    }
    const d=doc.data();
    if(d.isAdm){
      const adm={nome:d.nome,pin:d.pin,email:d.email};
      localStorage.setItem('cpa_adm',JSON.stringify(adm));
      closeModal('moLoginProf');
      activateAdm();
      toast('Sessão de administrador iniciada com sucesso!','success');
      return;
    }
    const perfil={id:d.id,nome:d.nome,pin:d.pin,av:d.av||'👨‍🏫',email:d.email};
    // Guarda também localmente, para o atalho de PIN funcionar neste dispositivo a partir de agora
    const profs=gProfs();
    if(!profs.find(p=>p.id===perfil.id)){profs.push(perfil);sProfs(profs);}
    closeModal('moLoginProf');
    activateProf(perfil);
    toast('Sessão iniciada com sucesso!','success');
  }catch(e){
    console.error(e);
    const mapa={
      'auth/invalid-email':'Email inválido.',
      'auth/user-not-found':'Conta não encontrada.',
      'auth/wrong-password':'Senha incorrecta.',
      'auth/invalid-credential':'Email ou senha incorrectos.'
    };
    erroEl.textContent=mapa[e.code]||('Erro: '+(e.message||e.code));
    erroEl.style.display='block';
  }
}

function recuperarSenhaProfessor(){
  const email=document.getElementById('loginEmailProf').value.trim();
  if(!email){toast('Insira o email primeiro.','error');return}
  fbAuth.sendPasswordResetEmail(email).then(()=>{
    toast('Email de recuperação enviado!','success');
  }).catch(e=>toast('Erro: '+(e.message||e.code),'error'));
}

// Garante que o Painel Administrador mostra o quadro de contas de professores
const _origRenderAdm2=renderAdm;
renderAdm=function(){_origRenderAdm2();if(typeof renderContasProfessores==='function')renderContasProfessores();};
