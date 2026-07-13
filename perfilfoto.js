/* ============================================================
   MÓDULO: PERFILFOTO.JS — Foto de Perfil via Câmera
   Fase 3 — Sistema C.P.A
   Depende de: index.html (PA, isAdm, gProfs, sProfs, gAdm, toast, logAct)
   ============================================================ */

function handleFotoPerfil(evt){
  const file=evt.target.files[0];
  if(!file)return;
  if(file.size>8000000){toast('Imagem muito grande! Escolha uma foto até 8MB.','error');return}
  const r=new FileReader();
  r.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      // Recorta ao centro (quadrado) e reduz para 240x240 — a foto de perfil
      // nunca precisa de mais resolução do que isso, e assim o ficheiro final
      // fica muito mais leve (poucos KB, em vez de vários MB da câmara).
      const TAM=240;
      const lado=Math.min(img.width,img.height);
      const offX=(img.width-lado)/2,offY=(img.height-lado)/2;
      const canvas=document.createElement('canvas');
      canvas.width=TAM;canvas.height=TAM;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,offX,offY,lado,lado,0,0,TAM,TAM);
      const foto=canvas.toDataURL('image/jpeg',0.75);
      guardarFotoPerfil(foto);
    };
    img.onerror=()=>toast('Não foi possível processar esta imagem.','error');
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
}

function guardarFotoPerfil(foto){
  if(isAdm){
    const adm=gAdm();
    adm.foto=foto;
    localStorage.setItem('cpa_adm',JSON.stringify(adm));
  }else if(PA){
    const profs=gProfs();
    const idx=profs.findIndex(p=>p.id===PA.id);
    if(idx>=0){profs[idx].foto=foto;sProfs(profs);PA.foto=foto;}
  }else{toast('Entre num perfil primeiro!','error');return}
  aplicarAvatarActual();
  renderFotoPerfilPrev();
  logAct('Foto de perfil actualizada');
  toast('Foto de perfil actualizada!','success');
}

function renderFotoPerfilPrev(){
  const el=document.getElementById('fotoPerfilPrev');
  if(!el)return;
  const foto=isAdm?gAdm()?.foto:PA?.foto;
  el.innerHTML=foto?`<img src="${foto}" style="width:100%;height:100%;object-fit:cover">`:(isAdm?'👑':(PA?.av||'👨‍🏫'));
}

// Actualiza o avatar redondo do topo do menu (drawer) com a foto, se existir
function aplicarAvatarActual(){
  const dAv=document.getElementById('dAv');
  if(!dAv)return;
  const foto=isAdm?gAdm()?.foto:PA?.foto;
  if(foto){
    dAv.innerHTML=`<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }else{
    dAv.innerHTML='';
    dAv.textContent=isAdm?'👑':(PA?.av||'👨‍🏫');
  }
}

const _origActivateProf4=activateProf;
activateProf=function(prof){_origActivateProf4(prof);aplicarAvatarActual();renderFotoPerfilPrev();};
const _origActivateAdm3=activateAdm;
activateAdm=function(){_origActivateAdm3();aplicarAvatarActual();renderFotoPerfilPrev();};

// Também mostra a foto na lista de perfis (Perfil → Perfis de Professor)
const _origRenderPf=typeof renderPf==='function'?renderPf:null;
if(_origRenderPf){
  renderPf=function(){
    _origRenderPf();
    renderFotoPerfilPrev();
    const profs=gProfs();
    document.querySelectorAll('#pfList > div').forEach((div,i)=>{
      const p=profs[i];
      if(p&&p.foto){
        const avEl=div.querySelector('div');
        if(avEl)avEl.innerHTML=`<img src="${p.foto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      }
    });
  };
}
