import React, { useEffect, useState } from "react";
import { MapPin, Clock, MessageCircle } from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";

function gerarLinkWhats(numero, mensagem) {
  return "https://wa.me/" + (numero || "") + "?text=" + encodeURIComponent(mensagem || "");
}

function linkMapa(endereco) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(endereco);
}

export default function Pagina({ publicId }) {
  const [estado, setEstado] = useState("carregando"); // carregando | ok | indisponivel
  const [dados, setDados] = useState(null);

  useEffect(() => {
    let cancelado = false;
    supabase
      .from("widget_config")
      .select("dados")
      .eq("public_id", publicId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error || !data) {
          setEstado("indisponivel");
          return;
        }
        setDados(data.dados);
        setEstado("ok");
      });
    return () => { cancelado = true; };
  }, [publicId]);

  useEffect(() => {
    if (estado !== "ok") return;
    if (dados?.incluiAssistente === false) return; // plano "Só Página": sem o widget de chat
    if (document.querySelector("[data-atendente-widget]")) return;
    const script = document.createElement("script");
    script.src = "/atendente-virtual-widget.js";
    script.dataset.site = publicId;
    script.defer = true;
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [estado, publicId, dados]);

  if (estado === "carregando") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.muted }}>
        Carregando...
      </div>
    );
  }

  if (estado === "indisponivel") {
    return (
      <div className="flex min-h-screen items-center justify-center text-center p-6 text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.muted }}>
        Esta página está temporariamente indisponível.
      </div>
    );
  }

  const cor = dados.corPrimaria || TOKENS.teal;

  return (
    <div className="min-h-screen font-sans text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}>
      <div className="max-w-xl mx-auto px-6 py-16 flex flex-col gap-8">
        <header className="flex flex-col items-center gap-3 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: cor }}
          >
            {(dados.nomeNegocio || "?").charAt(0)}
          </div>
          <h1 className="text-2xl font-semibold">{dados.nomeNegocio}</h1>
          {dados.sobreNegocio && (
            <p className="max-w-md" style={{ color: TOKENS.muted }}>{dados.sobreNegocio}</p>
          )}
        </header>

        {(dados.horarioFuncionamento || dados.endereco) && (
          <div className="rounded-xl border bg-white p-5 flex flex-col gap-3" style={{ borderColor: TOKENS.border }}>
            {dados.horarioFuncionamento && (
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: cor }} />
                <span>{dados.horarioFuncionamento}</span>
              </div>
            )}
            {dados.endereco && (
              <a
                href={linkMapa(dados.endereco)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 underline"
                style={{ color: TOKENS.ink }}
              >
                <MapPin size={16} style={{ color: cor }} />
                <span>{dados.endereco}</span>
              </a>
            )}
          </div>
        )}

        <a
          href={gerarLinkWhats(dados.numeroWhatsApp, dados.transferirMensagemWhatsPt)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-white"
          style={{ backgroundColor: cor }}
        >
          <MessageCircle size={18} /> Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
