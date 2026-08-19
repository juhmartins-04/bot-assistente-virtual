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
    }).catch(function () { /* falha de rede: não interrompe a conversa */ });
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
    if (!config || document.querySelector("[data-atendente-widget]")) return;

    var idioma = config.idiomaPadrao || ((navigator.language || "pt").toLowerCase().startsWith("en") ? "en" : "pt");
    var cor = config.corPrimaria || "#2f6f62";
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

    function linkWhats(mensagem) {
      var numero = config.numeroWhatsApp || "";
      return "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensagem || "");
    }

    var root = document.createElement("div");
    root.dataset.atendenteWidget = "true";
    root.innerHTML = `
      <style>
        [data-atendente-widget] { position: fixed; right: 18px; bottom: 18px; z-index: 99999; font-family: Inter, system-ui, sans-serif; color: #1c2430; }
        [data-atendente-widget] * { box-sizing: border-box; }
        .avw-panel { display: none; width: min(340px, calc(100vw - 32px)); overflow: hidden; border: 1px solid #dde3e1; border-radius: 16px; background: #fff; box-shadow: 0 22px 52px rgba(28,36,48,.22); }
        .avw-panel.is-open { display: block; }
        .avw-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: var(--avw-cor); color: #fff; }
        .avw-title { font-size: 14px; font-weight: 700; margin: 0; }
        .avw-close, .avw-fab, .avw-option { border: 0; cursor: pointer; font: inherit; }
        .avw-close { background: rgba(255,255,255,.18); color: #fff; border-radius: 999px; width: 28px; height: 28px; }
        .avw-body { display: grid; gap: 10px; padding: 14px; background: #f8faf9; max-height: 340px; overflow-y: auto; }
        .avw-msg { max-width: 92%; padding: 9px 11px; border: 1px solid #dde3e1; border-radius: 12px; background: #fff; font-size: 13px; line-height: 1.4; white-space: pre-wrap; }
        .avw-options { display: grid; gap: 8px; margin-top: 2px; }
        .avw-option { width: 100%; padding: 9px 10px; border: 1px solid var(--avw-cor); border-radius: 10px; background: #fff; color: #1c2430; text-align: left; font-size: 13px; }
        .avw-fab { display: inline-flex; align-items: center; justify-content: center; margin-top: 10px; padding: 12px 16px; border-radius: 999px; background: var(--avw-cor); color: #fff; box-shadow: 0 14px 34px rgba(28,36,48,.24); font-weight: 700; }
        .avw-link-btn { display: inline-flex; align-items: center; justify-content: center; width: 100%; padding: 9px 10px; border-radius: 10px; background: var(--avw-cor); color: #fff; font-weight: 700; font-size: 13px; text-decoration: none; }
        .avw-lead { display: grid; gap: 8px; padding: 10px; border: 1px solid #dde3e1; border-radius: 12px; background: #fff; }
        .avw-lead input { width: 100%; padding: 8px 9px; border: 1px solid #dde3e1; border-radius: 8px; font-size: 13px; font-family: inherit; }
        .avw-lead-acoes { display: flex; gap: 8px; }
        .avw-lead-continuar { flex: 1; padding: 8px 10px; border-radius: 8px; background: var(--avw-cor); color: #fff; font-size: 13px; font-weight: 700; text-align: center; text-decoration: none; }
        .avw-lead-pular { padding: 8px 10px; border-radius: 8px; background: transparent; color: #5b6672; font-size: 12px; }
        .avw-lead-aviso { margin: 0; font-size: 11px; line-height: 1.4; color: #5b6672; }
      </style>
      <section class="avw-panel" aria-live="polite">
        <header class="avw-head">
          <h2 class="avw-title"></h2>
          <button class="avw-close" type="button" aria-label="${textos.fechar}">x</button>
        </header>
        <div class="avw-body"></div>
      </section>
      <button class="avw-fab" type="button">${textos.iniciar}</button>
    `;
    // Cor aplicada via propriedade CSS customizada (não como texto do
    // <style>): um valor malicioso em corPrimaria não tem como escapar
    // pra fora do contexto de valor de propriedade CSS dessa forma.
    root.style.setProperty("--avw-cor", cor);

    var panel = root.querySelector(".avw-panel");
    var body = root.querySelector(".avw-body");
    var fab = root.querySelector(".avw-fab");
    var close = root.querySelector(".avw-close");
    root.querySelector(".avw-title").textContent = config.nomeNegocio || "Atendente virtual";

    function renderInicio() {
      body.innerHTML = "";
      var saudacao = document.createElement("div");
      saudacao.className = "avw-msg";
      saudacao.textContent = t(config.saudacao);
      body.appendChild(saudacao);

      var options = document.createElement("div");
      options.className = "avw-options";

      (config.opcoes || []).forEach(function (opcao) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "avw-option";
        button.textContent = t(opcao.label);
        button.addEventListener("click", function () { responder(opcao); });
        options.appendChild(button);
      });

      var transferir = document.createElement("button");
      transferir.type = "button";
      transferir.className = "avw-option";
      transferir.textContent = t(config.transferirLabel);
      transferir.addEventListener("click", function () {
        pedirContatoEAbrir(
          textos.whatsapp,
          linkWhats(t(config.transferirMensagemWhats)),
          t(config.transferirLabel)
        );
      });
      options.appendChild(transferir);
      body.appendChild(options);
    }

    function responder(opcao) {
      registrarEvento("opcao_clicada", t(opcao.label));

      if (opcao.tipo === "resposta") {
        var msg = document.createElement("div");
        msg.className = "avw-msg";
        msg.textContent = t(opcao.resposta);
        body.appendChild(msg);
        return;
      }

      if (opcao.tipo === "whatsapp") {
        pedirContatoEAbrir(textos.whatsapp, linkWhats(t(opcao.mensagemWhats)), t(opcao.label));
        return;
      }

      abrirLink(idioma === "en" ? "Open calendar" : "Abrir agenda", opcao.linkAgenda);
    }

    function abrirLink(label, url) {
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
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
    }

    // Antes de ir pro WhatsApp, oferece (sem obrigar) deixar nome e
    // telefone — assim quem desiste de mandar a mensagem no fim não
    // some sem deixar contato nenhum pro dono do negócio.
    function pedirContatoEAbrir(label, url, opcaoLabel) {
      var seguro = urlSegura(url);
      var caixa = document.createElement("div");
      caixa.className = "avw-lead";
      caixa.innerHTML = `
        <input type="text" class="avw-lead-nome" placeholder="${textos.nome}" autocomplete="name" />
        <input type="tel" class="avw-lead-telefone" placeholder="${textos.telefone}" autocomplete="tel" />
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
      continuar.textContent = label;
      continuar.href = seguro || "#";

      function seguirParaWhats() {
        registrarEvento("handoff_whatsapp", opcaoLabel);
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
          msg.appendChild(link);
        } else {
          msg.textContent = label;
        }
        body.appendChild(msg);
        body.scrollTop = body.scrollHeight;
      }

      continuar.addEventListener("click", function () {
        registrarLead(nomeInput.value.trim(), telefoneInput.value.trim(), opcaoLabel);
        seguirParaWhats();
      });
      pular.addEventListener("click", function (e) {
        e.preventDefault();
        seguirParaWhats();
      });

      body.appendChild(caixa);
      body.scrollTop = body.scrollHeight;
    }

    fab.addEventListener("click", function () {
      panel.classList.add("is-open");
      fab.style.display = "none";
      renderInicio();
      registrarEvento("abertura");
    });

    close.addEventListener("click", function () {
      panel.classList.remove("is-open");
      fab.style.display = "inline-flex";
    });

    document.body.appendChild(root);
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
