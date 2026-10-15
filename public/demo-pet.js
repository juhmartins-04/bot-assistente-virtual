(function () {
 "use strict";
 var config = JSON.parse(document.getElementById("demo-config").textContent);
 window.ATENDENTE_CONFIG = config;
 var root = document.documentElement;
 var themeButton = document.getElementById("theme-toggle");
 var status = document.getElementById("assistant-status");
 var note = document.getElementById("mode-note");
 var openButtons = document.querySelectorAll("[data-open-assistant]");
 var modeButtons = document.querySelectorAll("[data-mode]");
 var ready = false;
 function applyTheme(theme) {
  root.dataset.theme = theme;
  themeButton.setAttribute("aria-pressed", String(theme === "dark"));
  themeButton.textContent = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";
  document.querySelector('meta[name="theme-color"]').setAttribute("content", theme === "dark" ? "#111e26" : "#F7F4EC");
 }
 try { var saved = localStorage.getItem("pronto_demo_tema"); if (saved === "dark" || saved === "light") applyTheme(saved); } catch (_) {}
 themeButton.addEventListener("click", function () {
  var next = root.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem("pronto_demo_tema", next); } catch (_) {}
 });
 function selectMode(mode) {
  root.dataset.demoMode = mode;
  modeButtons.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.mode === mode)); });
  note.textContent = mode === "pagina" ? "Modo Só página: o assistente fica oculto. As informações e o contato continuam disponíveis." : "Você está vendo o pacote Página + assistente.";
  openButtons.forEach(function (button) {
   button.textContent = mode === "pagina" ? "Comparar com página + assistente ↗" : "Experimentar o assistente ↗";
  });
 }
 modeButtons.forEach(function (button) { button.addEventListener("click", function () { selectMode(button.dataset.mode); }); });
 document.querySelectorAll("[data-mode-choice]").forEach(function (button) { button.addEventListener("click", function () {
  selectMode(button.dataset.modeChoice);
  document.getElementById("conteudo").scrollIntoView({block:"start"});
 }); });
 openButtons.forEach(function (button) { button.addEventListener("click", function () {
  if (!ready) return;
  selectMode("completo");
  var panel = document.querySelector(".avw-panel");
  var fab = document.querySelector(".avw-fab");
  if (panel && fab && !panel.classList.contains("is-open")) fab.click();
  var first = document.querySelector(".avw-option");
  if (first) first.focus();
 }); });
 document.querySelectorAll("[data-whatsapp]").forEach(function (link) {
  link.href = "https://wa.me/" + config.numeroWhatsApp + "?text=" + encodeURIComponent(config.transferirMensagemWhatsPt);
  link.target = "_blank"; link.rel = "noopener noreferrer";
 });
 var widget = document.createElement("script");
 widget.src = "/atendente-virtual-widget.js";
 widget.async = true;
 widget.addEventListener("load", function () {
  ready = Boolean(document.querySelector("[data-atendente-widget]"));
  openButtons.forEach(function (button) { button.disabled = !ready; });
  status.textContent = ready ? "Pronto para testar. A demo não solicita contato nem registra conversas." : "O assistente não carregou. Você pode consultar as informações da página e falar com a Juh abaixo.";
 });
 widget.addEventListener("error", function () {
  status.textContent = "Não foi possível carregar o assistente. Recarregue a página ou use o contato da Juh abaixo.";
 });
 document.body.appendChild(widget);
})();
