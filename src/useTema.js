import { useEffect, useState } from "react";

const CHAVE = "pronto-tema";

function temaSalvo() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHAVE);
}

function sistemaEscuro() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Tema claro/escuro do site: por padrão segue o sistema da pessoa, mas
// ela pode escolher manualmente pelo botão — a escolha fica salva no
// navegador (localStorage) e passa a valer sempre, mesmo se o sistema
// mudar depois.
export function useTema() {
  const [tema, setTema] = useState(() => temaSalvo() || (sistemaEscuro() ? "dark" : "light"));

  useEffect(() => {
    const salvo = temaSalvo();
    if (salvo) document.documentElement.setAttribute("data-theme", salvo);

    if (salvo) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const ouvir = (e) => setTema(e.matches ? "dark" : "light");
    media.addEventListener("change", ouvir);
    return () => media.removeEventListener("change", ouvir);
  }, []);

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    localStorage.setItem(CHAVE, novo);
    document.documentElement.setAttribute("data-theme", novo);
  }

  return { tema, alternar };
}
