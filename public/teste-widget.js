(function () {
  var campo = document.getElementById('campoSite');
  var indicador = document.getElementById('indicadorModo');
  function extrairPublicId(texto) {
    var t = String(texto || '').trim();
    var atributo = t.match(/data-site=["']([0-9a-f-]{36})["']/i);
    var id = atributo ? atributo[1] : t;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
  }
  var original = new URLSearchParams(window.location.search).get('site');
  var siteId = extrairPublicId(original);
  campo.value = original || '';
  document.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = extrairPublicId(campo.value);
    if (!id) { indicador.textContent = 'Informe um identificador válido ou o código gerado no painel.'; campo.focus(); return; }
    window.location.assign('/teste-widget.html?site=' + encodeURIComponent(id));
  });
  if (original && !siteId) { indicador.textContent = 'Identificador inválido. Use o código gerado pelo painel.'; return; }
  window.addEventListener('pronto:widget-status', function (e) {
    var mensagens = {
      pronto: siteId ? 'Assistente carregado. Teste sem registrar contatos ou eventos.' : 'Exemplo fictício. O WhatsApp fala com a Juh sobre o Prontô.',
      indisponivel: 'Assistente indisponível: confira publicação, plano e validade do teste no painel.',
      erro: 'Não foi possível carregar. Confira conexão, identificador e publicação; depois recarregue a página.'
    };
    indicador.textContent = mensagens[e.detail.estado] || '';
  });
  if (!siteId) window.ATENDENTE_CONFIG = {
    nomeNegocio: 'Negócio fictício · teste do Prontô', corPrimaria: '#386951',
    numeroWhatsApp: '5541995472287', idiomaPadrao: 'pt', capturarContato: false,
    saudacaoPt: 'Olá! Escolha uma dúvida para testar. Este é um exemplo fictício.',
    transferirLabelPt: 'Falar com a Juh sobre o Prontô',
    transferirMensagemWhatsPt: 'Oi, Juh! Testei o assistente e quero conhecer o Prontô.',
    opcoes: [
      { labelPt: 'Como funciona?', tipo: 'resposta', respostaPt: 'O visitante escolhe uma pergunta, consulta a informação aprovada e pode seguir para o WhatsApp do negócio.' },
      { labelPt: 'Preciso trocar meu site?', tipo: 'resposta', respostaPt: 'O assistente é acrescentado ao site existente após conferir compatibilidade e autorização. O site continua na hospedagem atual.' },
      { labelPt: 'Este teste registra dados?', tipo: 'resposta', respostaPt: 'Não. Esta página de teste não registra contatos nem eventos de uso. O widget da versão oficial pode ter coleta opcional.' }
    ]
  };
  indicador.textContent = 'Carregando assistente para conferência…';
  var script = document.createElement('script');
  script.src = '/atendente-virtual-widget.js';
  if (siteId) { script.dataset.site = siteId; script.dataset.preview = 'true'; }
  script.addEventListener('error', function () { indicador.textContent = 'O código do assistente não carregou. Recarregue a página.'; });
  document.body.appendChild(script);
})();
