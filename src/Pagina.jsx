import React, { useEffect, useState } from "react";
import { MapPin, Clock, MessageCircle, Instagram } from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";
import { useTema } from "./useTema";
import BotaoTema from "./BotaoTema";

function gerarLinkWhats(numero, mensagem) {
  return "https://wa.me/" + (numero || "") + "?text=" + encodeURIComponent(mensagem || "");
}

function linkMapa(endereco) {
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(endereco);
}

function IconeCircular({ href, cor, children, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-10 h-10 rounded-full flex items-center justify-center"
      style={{ backgroundColor: cor, color: "#fff" }}
    >
      {children}
    </a>
  );
}

function BlocoHorarioEndereco({ dados, cor }) {
  if (!dados.horarioFuncionamento && !dados.endereco) return null;
  return (
    <div className="card p-5 flex flex-col gap-3">
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
  );
}

export default function Pagina({ publicId }) {
  const { tema, alternar: alternarTema } = useTema();
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
  const layout = dados.layout || "classico";
  const servicos = (dados.servicos || []).filter((s) => s && s.trim());
  const itensCardapio = (dados.itensCardapio || []).filter((i) => i?.nome && i.nome.trim());

  return (
    <div className="min-h-screen font-sans text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}>
      <div className="fixed top-4 right-4">
        <BotaoTema tema={tema} alternar={alternarTema} />
      </div>
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

        {/* Cartão de contato: bem enxuto, troca o card de horário/endereço
            por uma linha de ícones (Instagram/Maps), sem cartão nenhum. */}
        {layout === "cartao" ? (
          (dados.instagramUrl || dados.endereco) && (
            <div className="flex items-center justify-center gap-3">
              {dados.instagramUrl && (
                <IconeCircular href={dados.instagramUrl} cor={cor} label="Instagram">
                  <Instagram size={18} />
                </IconeCircular>
              )}
              {dados.endereco && (
                <IconeCircular href={linkMapa(dados.endereco)} cor={cor} label="Ver no mapa">
                  <MapPin size={18} />
                </IconeCircular>
              )}
            </div>
          )
        ) : (
          <BlocoHorarioEndereco dados={dados} cor={cor} />
        )}

        {layout === "servicos" && servicos.length > 0 && (
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-2.5">
              {servicos.map((s, i) => (
                <div key={i} className="rounded-lg p-3 text-center text-sm font-medium" style={{ backgroundColor: TOKENS.tealSoft, color: TOKENS.teal }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {layout === "cardapio" && itensCardapio.length > 0 && (
          <div className="card p-5 flex flex-col gap-3">
            {itensCardapio.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 pb-3 border-b last:border-b-0 last:pb-0" style={{ borderColor: TOKENS.border }}>
                <span>{item.nome}</span>
                {item.preco && <strong>{item.preco}</strong>}
              </div>
            ))}
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
