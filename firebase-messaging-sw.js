/* ============================================================
   FIREBASE-MESSAGING-SW.JS — Service Worker de Notificações Push
   Fase 13 — Sistema C.P.A
   ------------------------------------------------------------
   Este ficheiro corre em segundo plano no navegador, mesmo com a
   app fechada, e é o que permite às notificações chegarem ao
   telemóvel. Tem de estar na RAIZ do site (mesma pasta do
   index.html), com este nome exacto.
   ============================================================ */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD8mE48xC8hvpT4J3I-eBwyNm2JZq-l69Q",
  authDomain: "sistema-cpa.firebaseapp.com",
  projectId: "sistema-cpa",
  storageBucket: "sistema-cpa.firebasestorage.app",
  messagingSenderId: "204689819846",
  appId: "1:204689819846:web:17f0b29a60099e0e4bafc7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || 'Sistema C.P.A';
  const opcoes = {
    body: payload.notification?.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png'
  };
  self.registration.showNotification(titulo, opcoes);
});
