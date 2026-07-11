/* ============================================================
   FIREBASE-CONFIG.JS — Sistema C.P.A
   Liga a app ao projecto Firebase "sistema-cpa"
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyD8mE48xC8hvpT4J3I-eBwyNm2JZq-l69Q",
  authDomain: "sistema-cpa.firebaseapp.com",
  projectId: "sistema-cpa",
  storageBucket: "sistema-cpa.firebasestorage.app",
  messagingSenderId: "204689819846",
  appId: "1:204689819846:web:17f0b29a60099e0e4bafc7"
};

// Usa a versão "compat" do SDK (carregada via CDN no <head>), por isso
// esta inicialização funciona sem necessidade de bundler (npm/webpack).
// Usa a versão "compat" do SDK (carregada via CDN no <head>), por isso
// esta inicialização funciona sem necessidade de bundler (npm/webpack).
let fbAuth=null,fbDB=null;
try{
  if(typeof firebase==='undefined'){
    throw new Error('Bibliotecas do Firebase não carregaram (CDN bloqueado ou sem internet).');
  }
  firebase.initializeApp(firebaseConfig);
  fbAuth=firebase.auth ? firebase.auth() : null;
  fbDB=firebase.firestore();
  // Activa persistência offline: o app continua a funcionar sem internet
  // e sincroniza automaticamente assim que a ligação voltar.
  fbDB.enablePersistence({synchronizeTabs:true}).catch(err=>{
    console.warn('Persistência offline não disponível:',err.code);
  });
}catch(err){
  console.error('Erro ao iniciar o Firebase:',err);
  window.firebaseInitError=err.message||String(err);
}
