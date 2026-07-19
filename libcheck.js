/* ============================================================
   MÓDULO: LIBCHECK.JS — Verificação de Bibliotecas Externas
   Fase 9 — Sistema C.P.A
   ------------------------------------------------------------
   Usado antes de qualquer geração de PDF ou Excel, para mostrar um
   aviso claro em vez de a app "travar" em silêncio quando a
   biblioteca não chegou a carregar (rede lenta/instável).
   ============================================================ */

function bibliotecaPDFDisponivel(){
  if(typeof window.jspdf!=='undefined'&&window.jspdf.jsPDF)return true;
  toast('A biblioteca de PDF não carregou (ligação lenta ou instável). Recarregue a página e tente novamente.','error');
  return false;
}

function bibliotecaExcelDisponivel(){
  if(typeof XLSX!=='undefined')return true;
  toast('A biblioteca de Excel não carregou (ligação lenta ou instável). Recarregue a página e tente novamente.','error');
  return false;
}
