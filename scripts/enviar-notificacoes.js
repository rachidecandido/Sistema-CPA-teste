/* ============================================================
   ENVIAR-NOTIFICACOES.JS — Robô de Envio de Notificações Push
   Fase 13 — Sistema C.P.A
   ------------------------------------------------------------
   Corre nos servidores do GitHub (via GitHub Actions), não no
   telemóvel de ninguém. Lê os pedidos pendentes na colecção
   "push_queue" do Firestore e envia-os como notificações push
   reais para os telemóveis registados, usando a conta de serviço
   do Firebase (guardada em segredo no GitHub, nunca no código).
   ============================================================ */

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function main() {
  console.log('A verificar notificações pendentes...');
  const snap = await db.collection('push_queue').where('enviado', '==', false).limit(100).get();

  if (snap.empty) {
    console.log('Nada para enviar neste momento.');
    return;
  }

  console.log(`${snap.size} notificação(ões) pendente(s).`);

  for (const doc of snap.docs) {
    const pedido = doc.data();
    try {
      const tokensSnap = await db.collection('fcm_tokens')
        .where('destinatario', '==', pedido.destinatario)
        .get();

      if (tokensSnap.empty) {
        console.log(`Sem dispositivos registados para "${pedido.destinatario}" — a marcar como processado.`);
        await doc.ref.update({ enviado: true, motivo: 'sem_dispositivos_registados' });
        continue;
      }

      let sucesso = 0, falhas = 0;
      for (const tokenDoc of tokensSnap.docs) {
        const token = tokenDoc.data().token;
        try {
          await admin.messaging().send({
            token,
            notification: {
              title: pedido.titulo || 'Sistema C.P.A',
              body: pedido.corpo || ''
            }
          });
          sucesso++;
        } catch (erroEnvio) {
          falhas++;
          console.warn(`Falha ao enviar para um dispositivo de "${pedido.destinatario}":`, erroEnvio.message);
          // Token inválido/expirado — remove-o para não voltar a tentar
          if (erroEnvio.code === 'messaging/registration-token-not-registered') {
            await tokenDoc.ref.delete();
          }
        }
      }

      await doc.ref.update({
        enviado: true,
        enviadoEm: admin.firestore.FieldValue.serverTimestamp(),
        sucesso,
        falhas
      });
      console.log(`✔ "${pedido.titulo}" → ${pedido.destinatario}: ${sucesso} enviada(s), ${falhas} falha(s).`);
    } catch (erro) {
      console.error(`Erro ao processar notificação para "${pedido.destinatario}":`, erro.message);
      await doc.ref.update({ erro: erro.message });
    }
  }

  console.log('Concluído.');
}

main().catch(erro => {
  console.error('Erro fatal:', erro);
  process.exit(1);
});
    
