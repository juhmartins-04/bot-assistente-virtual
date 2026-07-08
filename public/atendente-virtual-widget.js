(function () {
  const config = window.ATENDENTE_CONFIG;
  if (!config || document.querySelector("[data-atendente-widget]")) return;

  const idioma = config.idiomaPadrao || ((navigator.language || "pt").toLowerCase().startsWith("en") ? "en" : "pt");
  const cor = config.corPrimaria || "#2f6f62";
  const textos = {
    fechar: idioma === "en" ? "Close" : "Fechar",
    iniciar: idioma === "en" ? "Start chat" : "Iniciar conversa",
    whatsapp: idioma === "en" ? "Continue on WhatsApp" : "Continuar no WhatsApp",
  };

  function t(valor) {
    return valor?.[idioma] || valor?.pt || valor?.en || "";
  }

  function linkWhats(mensagem) {
    const numero = config.numeroWhatsApp || "";
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensagem || "");
  }

  const root = document.createElement("div");
  root.dataset.atendenteWidget = "true";
  root.innerHTML = `
    <style>
      [data-atendente-widget] { position: fixed; right: 18px; bottom: 18px; z-index: 99999; font-family: Inter, system-ui, sans-serif; color: #1c2430; }
      [data-atendente-widget] * { box-sizing: border-box; }
      .avw-panel { display: none; width: min(340px, calc(100vw - 32px)); overflow: hidden; border: 1px solid #dde3e1; border-radius: 16px; background: #fff; box-shadow: 0 22px 52px rgba(28,36,48,.22); }
      .avw-panel.is-open { display: block; }
      .avw-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; background: ${cor}; color: #fff; }
      .avw-title { font-size: 14px; font-weight: 700; margin: 0; }
      .avw-close, .avw-fab, .avw-option { border: 0; cursor: pointer; font: inherit; }
      .avw-close { background: rgba(255,255,255,.18); color: #fff; border-radius: 999px; width: 28px; height: 28px; }
      .avw-body { display: grid; gap: 10px; padding: 14px; background: #f8faf9; }
      .avw-msg { max-width: 92%; padding: 9px 11px; border: 1px solid #dde3e1; border-radius: 12px; background: #fff; font-size: 13px; line-height: 1.4; white-space: pre-wrap; }
      .avw-options { display: grid; gap: 8px; margin-top: 2px; }
      .avw-option { width: 100%; padding: 9px 10px; border: 1px solid ${cor}; border-radius: 10px; background: #fff; color: #1c2430; text-align: left; font-size: 13px; }
      .avw-fab { display: inline-flex; align-items: center; justify-content: center; margin-top: 10px; padding: 12px 16px; border-radius: 999px; background: ${cor}; color: #fff; box-shadow: 0 14px 34px rgba(28,36,48,.24); font-weight: 700; }
      .avw-link { color: ${cor}; font-weight: 700; }
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

  const panel = root.querySelector(".avw-panel");
  const body = root.querySelector(".avw-body");
  const fab = root.querySelector(".avw-fab");
  const close = root.querySelector(".avw-close");
  root.querySelector(".avw-title").textContent = config.nomeNegocio || "Atendente virtual";

  function renderInicio() {
    body.innerHTML = "";
    const saudacao = document.createElement("div");
    saudacao.className = "avw-msg";
    saudacao.textContent = t(config.saudacao);
    body.appendChild(saudacao);

    const options = document.createElement("div");
    options.className = "avw-options";

    (config.opcoes || []).forEach((opcao) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "avw-option";
      button.textContent = t(opcao.label);
      button.addEventListener("click", () => responder(opcao));
      options.appendChild(button);
    });

    const transferir = document.createElement("button");
    transferir.type = "button";
    transferir.className = "avw-option";
    transferir.textContent = t(config.transferirLabel);
    transferir.addEventListener("click", () => abrirLink(textos.whatsapp, linkWhats(t(config.transferirMensagemWhats))));
    options.appendChild(transferir);
    body.appendChild(options);
  }

  function responder(opcao) {
    if (opcao.tipo === "resposta") {
      const msg = document.createElement("div");
      msg.className = "avw-msg";
      msg.textContent = t(opcao.resposta);
      body.appendChild(msg);
      return;
    }

    if (opcao.tipo === "whatsapp") {
      abrirLink(textos.whatsapp, linkWhats(t(opcao.mensagemWhats)));
      return;
    }

    abrirLink(idioma === "en" ? "Open calendar" : "Abrir agenda", opcao.linkAgenda);
  }

  function abrirLink(label, url) {
    const msg = document.createElement("div");
    msg.className = "avw-msg";
    msg.innerHTML = `<a class="avw-link" target="_blank" rel="noopener noreferrer"></a>`;
    const link = msg.querySelector("a");
    link.href = url || "#";
    link.textContent = label;
    body.appendChild(msg);
  }

  fab.addEventListener("click", () => {
    panel.classList.add("is-open");
    fab.style.display = "none";
    renderInicio();
  });

  close.addEventListener("click", () => {
    panel.classList.remove("is-open");
    fab.style.display = "inline-flex";
  });

  document.body.appendChild(root);
})();
