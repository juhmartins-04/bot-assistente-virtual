(function () {
  // Preenchido a partir do .env deste projeto — é a chave "publishable"
  // do Supabase, protegida por RLS (ver supabase-schema.sql). Ela é
  // pública por natureza, assim como já era antes dentro do bundle do
  // painel; não é segredo, o controle de acesso vem da policy no banco.
  var SUPABASE_URL = "https://rnlgvlmwwncfrfywszaf.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_x40vbDCMSrdE7uiNGK0U8Q_ODc99VlB";

  if (document.querySelector("[data-atendente-widget]")) return;

  var scriptAtual = document.currentScript;
  var siteId = scriptAtual && scriptAtual.dataset.site;
  if (scriptAtual && scriptAtual.isConnected === false) return;

  function urlSegura(url) {
    if (!url) return null;
    try {
      var u = new URL(url, window.location.href);
      return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
    } catch {
      return null;
    }
  }

  function chamarSupabase(caminho, corpo) {
    if (!siteId) return; // modo local/preview: sem backend, sem eventos/leads
    fetch(SUPABASE_URL + "/rest/v1/" + caminho, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corpo),
    }).then(function (r) { if (!r.ok) console.warn("Prontô: interação não registrada (" + r.status + ")."); }).catch(function () { /* falha de rede: não interrompe a conversa */ });
  }

  function registrarEvento(tipo, opcaoLabel) {
    chamarSupabase("eventos", { public_id: siteId, tipo: tipo, opcao_label: opcaoLabel || null });
  }

  function registrarLead(nome, telefone, opcaoLabel) {
    if (!nome && !telefone) return;
    chamarSupabase("leads", {
      public_id: siteId,
      nome: nome || null,
      telefone: telefone || null,
      opcao_label: opcaoLabel || null,
    });
  }

  function montar(config) {
    if (!config || config.incluiAssistente === false || (scriptAtual && scriptAtual.isConnected === false) || document.querySelector("[data-atendente-widget]")) return;

    var idioma = config.idiomaPadrao;
    if (idioma !== "pt" && idioma !== "en") {
      idioma = (navigator.language || "pt").toLowerCase().startsWith("en") ? "en" : "pt";
    }
    var cor = /^#[0-9a-f]{6}$/i.test(config.corPrimaria || '') ? config.corPrimaria : '#2f6f62';
    var canais = [1, 3, 5].map(function (i) {
      var v = parseInt(cor.slice(i, i + 2), 16) / 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    var luminancia = canais[0] * .2126 + canais[1] * .7152 + canais[2] * .0722;
    var textoMarca = luminancia > .179 ? '#000000' : '#ffffff';
    var textos = {
      fechar: idioma === "en" ? "Close" : "Fechar",
      iniciar: idioma === "en" ? "Start chat" : "Iniciar conversa",
      whatsapp: idioma === "en" ? "Continue on WhatsApp" : "Continuar no WhatsApp",
      nome: idioma === "en" ? "Your name (optional)" : "Seu nome (opcional)",
      telefone: idioma === "en" ? "Your phone (optional)" : "Seu telefone (opcional)",
      continuar: idioma === "en" ? "Continue" : "Continuar",
      pular: idioma === "en" ? "Skip" : "Pular",
      avisoPrivacidade: idioma === "en"
        ? "Used only so this business can get back to you."
        : "Usado só pra esse negócio poder te retornar.",
    };

    function t(valor) {
      return valor?.[idioma] || valor?.pt || valor?.en || "";
    }

    // O app salva cada texto como dois campos separados (ex: "labelPt" /
    // "labelEn"), não como um objeto aninhado { pt, en }. Esta função
    // monta esse objeto a partir do prefixo, pra reusar t() sem mudar
    // todos os pontos que dependem dele.
    function tp(objeto, prefixo) {
      return t({ pt: objeto?.[prefixo + "Pt"], en: objeto?.[prefixo + "En"] });
    }

    function linkWhats(mensagem) {
      var numero = config.numeroWhatsApp || "";
      return "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensagem || "");
    }

    var root = document.createElement("div");
    root.dataset.atendenteWidget = "true";
    root.innerHTML = `
      <style>
        [data-atendente-widget] {
          --avw-texto: #1c2430;
          --avw-fundo-painel: #fff;
          --avw-fundo-corpo: #f8faf9;
          --avw-fundo-bolha: #fff;
          --avw-borda: #dde3e1;
          --avw-muted: #5b6672;
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) [data-atendente-widget] {
            --avw-texto: #e9eeec;
            --avw-fundo-painel: #1a2226;
            --avw-fundo-corpo: #12181b;
            --avw-fundo-bolha: #222c30;
            --avw-borda: #2b3538;
            --avw-muted: #8fa09b;
          }
        }
        [data-theme="dark"] [data-atendente-widget] {
            --avw-texto: #e9eeec;
            --avw-fundo-painel: #1a2226;
            --avw-fundo-corpo: #12181b;
            --avw-fundo-bolha: #222c30;
            --avw-borda: #2b3538;
            --avw-muted: #8fa09b;
        }
        [data-atendente-widget] { position: fixed; right: 18px; bottom: 18px; z-index: 99999; font-family: Inter, system-ui, sans-serif; color: var(--avw-texto); }
        [data-atendente-widget] * { box-sizing: border-box; }
        .avw-panel { display: none; width: min(340px, calc(100vw - 32px)); overflow: hidden; border: 1px solid var(--avw-borda); border-radius: 16px; background: var(--avw-fundo-painel); box-shadow: 0 22px 52px rgba(28,36,48,.22); }
        .avw-panel.is-open { display: block; }
        .avw-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--avw-cor); color: var(--avw-on-brand); }
        .avw-title { font-size: 14px; font-weight: 700; margin: 0; }
        .avw-close, .avw-fab, .avw-option { border: 0; cursor: pointer; font: inherit; }
        .avw-close { background: rgba(255,255,255,.18); color: var(--avw-on-brand); border-radius: 999px; width: 44px; height: 44px; flex-shrink: 0; }
        .avw-body { display: grid; gap: 10px; padding: 14px; background: var(--avw-fundo-corpo); max-height: min(340px, calc(100dvh - 130px)); overflow-y: auto; }
        .avw-msg { max-width: 92%; padding: 9px 11px; border: 1px solid var(--avw-borda); border-radius: 12px; background: var(--avw-fundo-bolha); color: var(--avw-texto); font-size: 13px; line-height: 1.4; white-space: pre-wrap; }
        .avw-options { display: grid; gap: 8px; margin-top: 2px; }
        .avw-option { width: 100%; padding: 9px 10px; border: 1px solid var(--avw-cor); border-radius: 10px; background: var(--avw-fundo-bolha); color: var(--avw-texto); text-align: left; font-size: 14px; min-height: 44px; }
        .avw-fab { display: inline-flex; align-items: center; justify-content: center; margin-top: 10px; padding: 12px 16px; border-radius: 999px; background: var(--avw-cor); color: var(--avw-on-brand); box-shadow: 0 14px 34px rgba(28,36,48,.24); font-weight: 700; }
        .avw-link-btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 9px 10px; border-radius: 10px; background: var(--avw-cor); color: var(--avw-on-brand); font-weight: 700; font-size: 13px; text-decoration: none; }
        .avw-lead { display: grid; gap: 8px; padding: 10px; border: 1px solid var(--avw-borda); border-radius: 12px; background: var(--avw-fundo-bolha); }
        .avw-lead input { width: 100%; padding: 8px 9px; border: 1px solid var(--avw-borda); border-radius: 8px; font-size: 16px; min-height: 44px; font-family: inherit; color: var(--avw-texto); background: var(--avw-fundo-bolha); }
        .avw-lead-acoes { display: flex; gap: 8px; }
        .avw-lead-continuar { flex: 1; padding: 8px 10px; border-radius: 8px; background: var(--avw-cor); color: var(--avw-on-brand); font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; }
        .avw-lead-pular { padding: 8px 10px; border-radius: 8px; background: transparent; color: var(--avw-muted); font-size: 12px; }
        .avw-lead-aviso { margin: 0; font-size: 11px; line-height: 1.4; color: var(--avw-muted); }
        [data-atendente-widget] :focus-visible { outline: 3px solid var(--avw-texto); outline-offset: 3px; }
        .avw-fab, .avw-link-btn, .avw-lead-continuar, .avw-lead-pular { min-height: 44px; }
        .avw-head :focus-visible { outline-color: var(--avw-on-brand); outline-offset: -4px; }
        @media (prefers-reduced-motion: reduce) { [data-atendente-widget] * { transition: none !important; transform: none !important; } }
      </style>
      <section class="avw-panel" id="pronto-chat-panel" aria-live="polite">
        <header class="avw-head">
          <h2 class="avw-title"></h2>
          <button class="avw-close" type="button" aria-label="${textos.fechar}">x</button>
        </header>
        <div class="avw-body"></div>
      </section>
      <button class="avw-fab" type="button" aria-controls="pronto-chat-panel" aria-expanded="false">${textos.iniciar}</button>
    `;
    // Cor aplicada via propriedade CSS customizada (não como texto do
    // <style>): um valor malicioso em corPrimaria não tem como escapar
    // pra fora do contexto de valor de propriedade CSS dessa forma.
    root.style.setProperty("--avw-cor", cor);
    root.style.setProperty("--avw-on-brand", textoMarca);

    var panel = root.querySelector(".avw-panel");
    var body = root.querySelector(".avw-body");
    var fab = root.querySelector(".avw-fab");
    var close = root.querySelector(".avw-close");
    root.querySelector(".avw-title").textContent = config.nomeNegocio || "Atendente virtual";
    panel.setAttribute("aria-label", config.nomeNegocio || "Atendente virtual");

    function renderInicio() {
      body.innerHTML = "";
      var saudacao = document.createElement("div");
      saudacao.className = "avw-msg";
      saudacao.textContent = tp(config, "saudacao");
      body.appendChild(saudacao);

      var options = document.createElement("div");
      options.className = "avw-options";

      (config.opcoes || []).forEach(function (opcao) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "avw-option";
        button.textContent = tp(opcao, "label");
        button.addEventListener("click", function () { responder(opcao); });
        options.appendChild(button);
      });

      var transferir = document.createElement("button");
      transferir.type = "button";
      transferir.className = "avw-option";
      transferir.textContent = tp(config, "transferirLabel");
      transferir.addEventListener("click", function () {
        pedirContatoEAbrir(
          textos.whatsapp,
          linkWhats(tp(config, "transferirMensagemWhats")),
          tp(config, "transferirLabel")
        );
      });
      options.appendChild(transferir);
      body.appendChild(options);
    }

    function responder(opcao) {
      registrarEvento("opcao_clicada", tp(opcao, "label"));

      if (opcao.tipo === "resposta") {
        var msg = document.createElement("div");
        msg.className = "avw-msg";
        msg.textContent = tp(opcao, "resposta");
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
        return;
      }

      if (opcao.tipo === "whatsapp") {
        pedirContatoEAbrir(textos.whatsapp, linkWhats(tp(opcao, "mensagemWhats")), tp(opcao, "label"));
        return;
      }

      abrirLink(idioma === "en" ? "Open calendar" : "Abrir agenda", opcao.linkAgenda);
    }

    function abrirLink(label, url, aoClicar) {
      var seguro = urlSegura(url);
      var msg = document.createElement("div");
      msg.className = "avw-msg";
      if (!seguro) {
        msg.textContent = label;
        body.appendChild(msg);
        return;
      }
      msg.innerHTML = `<a class="avw-link-btn" target="_blank" rel="noopener noreferrer"></a>`;
      var link = msg.querySelector("a");
      link.href = seguro;
      link.textContent = label;
      if (aoClicar) link.addEventListener("click", aoClicar);
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    // Antes de ir pro WhatsApp, oferece (sem obrigar) deixar nome e
    // telefone — assim quem desiste de mandar a mensagem no fim não
    // some sem deixar contato nenhum pro dono do negócio.
    function pedirContatoEAbrir(label, url, opcaoLabel) {
      // A demonstração usa o mesmo widget, mas não solicita contato.
      if (config.capturarContato === false) {
        abrirLink(label, url, function () {
          registrarEvento("handoff_whatsapp", opcaoLabel);
        });
        return;
      }
      var seguro = urlSegura(url);
      var caixa = document.createElement("div");
      caixa.className = "avw-lead";
      caixa.innerHTML = `
        <input type="text" maxlength="120" aria-label="${textos.nome}" class="avw-lead-nome" placeholder="${textos.nome}" autocomplete="name" />
        <input type="tel" maxlength="30" aria-label="${textos.telefone}" class="avw-lead-telefone" placeholder="${textos.telefone}" autocomplete="tel" />
        <p class="avw-lead-aviso">${textos.avisoPrivacidade}</p>
        <div class="avw-lead-acoes">
          <a class="avw-lead-continuar" target="_blank" rel="noopener noreferrer"></a>
          <button type="button" class="avw-lead-pular">${textos.pular}</button>
        </div>
      `;
      var nomeInput = caixa.querySelector(".avw-lead-nome");
      var telefoneInput = caixa.querySelector(".avw-lead-telefone");
      var continuar = caixa.querySelector(".avw-lead-continuar");
      var pular = caixa.querySelector(".avw-lead-pular");
      // label vem de texto livre configurado no painel (nome da opção /
      // rótulo do botão) — nunca interpolar em innerHTML, sempre por
      // textContent, senão uma tag embutida no texto executaria no site
      // do cliente pra qualquer visitante.
      var privacidade = document.createElement("a");
      privacidade.textContent = idioma === "en" ? "Privacy" : "Privacidade";
      privacidade.href = new URL("/privacidade" + (siteId ? "?negocio=" + encodeURIComponent(siteId) : ""), scriptAtual && scriptAtual.src ? scriptAtual.src : window.location.href).href;
      privacidade.target = "_blank"; privacidade.rel = "noopener noreferrer";
      caixa.querySelector(".avw-lead-aviso").appendChild(document.createTextNode(" "));
      caixa.querySelector(".avw-lead-aviso").appendChild(privacidade);
      continuar.textContent = label;
      continuar.href = seguro || "#";

      function seguirParaWhats(clicouNoLink) {
        // Mostrar o botão ou pular o formulário não confirma um clique.
        // Também não temos acesso ao envio da mensagem dentro do WhatsApp.
        if (clicouNoLink && seguro) registrarEvento("handoff_whatsapp", opcaoLabel);
        caixa.remove();
        var msg = document.createElement("div");
        msg.className = "avw-msg";
        if (seguro) {
          var link = document.createElement("a");
          link.className = "avw-link-btn";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.href = seguro;
          link.textContent = label;
          link.addEventListener("click", function () {
            registrarEvento("handoff_whatsapp", opcaoLabel);
          });
          msg.appendChild(link);
        } else {
          msg.textContent = label;
        }
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
      }

      continuar.addEventListener("click", function () {
        registrarLead(nomeInput.value.trim(), telefoneInput.value.trim(), opcaoLabel);
        seguirParaWhats(true);
      });
      pular.addEventListener("click", function (e) {
        e.preventDefault();
        seguirParaWhats();
      });

      body.appendChild(caixa);
      body.scrollTop = body.scrollHeight;
    }

    function abrirConversa(focar) {
      panel.classList.add("is-open");
      fab.style.display = "none";
      fab.setAttribute("aria-expanded", "true");
      renderInicio();
      var primeiraOpcao = body.querySelector(".avw-option");
      if (focar && primeiraOpcao) primeiraOpcao.focus();
      registrarEvento("abertura");
    }
    fab.addEventListener("click", function () { abrirConversa(true); });

    function fecharConversa() {
      panel.classList.remove("is-open");
      fab.style.display = "inline-flex";
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    }
    close.addEventListener("click", fecharConversa);
    root.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && panel.classList.contains("is-open")) {
        evento.preventDefault();
        fecharConversa();
      }
    });

    document.body.appendChild(root);
    // Na demonstração embutida, mostra o menu sem roubar o foco nem
    // rolar a página comercial automaticamente para o iframe.
    if (config.abertoInicialmente === true) abrirConversa(false);
  }

  // Modo local/preview: window.ATENDENTE_CONFIG já pronto na página
  // (usado por public/teste-widget.html). Sem rede, sem trial/status.
  if (window.ATENDENTE_CONFIG) {
    montar(window.ATENDENTE_CONFIG);
    return;
  }

  // Modo produção: a config vem do Supabase a cada carregamento, a
  // partir do public_id (data-site). Se o cliente estiver suspenso ou
  // o teste tiver vencido, a view "widget_config" não devolve linha
  // nenhuma e o widget simplesmente não aparece — é o botão de
  // desligar remoto, sem precisar tocar no site do cliente de novo.
  if (!siteId) return;

  var endpoint = SUPABASE_URL + "/rest/v1/widget_config?public_id=eq." + encodeURIComponent(siteId) + "&select=dados";
  fetch(endpoint, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (linhas) {
      var linha = linhas && linhas[0];
      if (linha && linha.dados) montar(linha.dados);
    })
    .catch(function () { /* falha de rede: não quebra o site do cliente */ });
})();
