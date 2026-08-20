import React from "react";
import { Sun, Moon } from "lucide-react";

// variante "dark": pra usar sobre um fundo sempre escuro (barra lateral),
// que não pode reagir ao próprio data-theme. variante "auto" (padrão):
// pra usar sobre uma superfície que já troca de cor com o tema.
export default function BotaoTema({ tema, alternar, variante = "auto" }) {
  return (
    <button
      type="button"
      onClick={alternar}
      className={"theme-toggle " + (variante === "dark" ? "theme-toggle-dark" : "")}
      aria-label={tema === "dark" ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      title={tema === "dark" ? "Usar tema claro" : "Usar tema escuro"}
    >
      {tema === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
