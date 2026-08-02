/* ============================================================
   MÓDULO: PUSH.JS — Activação de Notificações Push
   Fase 13 — Sistema C.P.A
   ------------------------------------------------------------
   Pede permissão ao telemóvel, regista o dispositivo no Firebase
   Cloud Messaging, e guarda o "token" (identificador único deste
   telemóvel) no Firestore, para que o robô do GitHub Actions saiba
   para onde enviar cada notificação.
   ============================================================ */

const VAPID_KEY_CPA='BBz2ORDDprchRe4aqT2V-A53FtKr800uZk1CaxfZeEbmvREBFkMOzH5ekw4m_qmz_TQ-ZqLvRePoFO-4wOKbEi8';

async function ativarNotificacoesPush(destinatarioId,tipo,funcaoToast,funcaoDB){
  const tst=funcaoToast||(typeof toast==='function'?toast:console.log);
  const db=funcaoDB||fbDB;
  try{
    if(!('serviceWorker' in navigator)||!('Notification' in window)){
      tst('Este navegador não suporta notificações push.','error');
      return false;
    }
    if(typeof firebase==='undefined'||!firebase.messaging){
      tst('Biblioteca de notificações não carregou. Verifique a internet e recarregue.','error');
      return false;
    }
    const permissao=await Notification.requestPermission();
    if(permissao!=='granted'){
      tst('Permissão de notificações não concedida. Pode activar depois nas definições do navegador.','error');
      return false;
    }
    const registo=await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const messaging=firebase.messaging();
    const token=await messaging.getToken({vapidKey:VAPID_KEY_CPA,serviceWorkerRegistration:registo});
    if(!token){
      tst('Não foi possível obter o identificador de notificações.','error');
      return false;
    }
    await db.collection('fcm_tokens').doc(token).set({
      token,
      destinatario:destinatarioId,
      tipo,
      criadoEm:firebase.firestore.FieldValue.serverTimestamp()
    });
    tst('🔔 Notificações activadas neste dispositivo!','success');
    return true;
  }catch(e){
    console.error(e);
    tst('Erro ao activar notificações: '+(e.message||e.code||'falha desconhecida'),'error');
    return false;
  }
}

// Coloca um pedido de envio na "fila" que o robô do GitHub Actions vai
// processar dentro de poucos minutos. Não envia nada directamente — quem
// envia de facto é o robô, de forma segura, do lado do servidor.
async function enfileirarPushNotificacao(destinatarioId,titulo,corpo){
  try{
    await fbDB.collection('push_queue').add({
      destinatario:destinatarioId,
      titulo,
      corpo,
      enviado:false,
      criadoEm:firebase.firestore.FieldValue.serverTimestamp()
    });
  }catch(e){
    console.error('Erro ao enfileirar notificação push:',e);
  }
}
