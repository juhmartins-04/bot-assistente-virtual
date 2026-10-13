import React, { useEffect, useState } from "react";
import { LogOut, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";
import { useTema } from "./useTema";
import BotaoTema from "./BotaoTema";
import Resultados from "./Resultados";
import { listarClientesAtribuidos, listarLeads, atualizarNotaLead } from "./storage";

// Painel reduzido pra quem foi convidado como colaborador de atendimento:
// só enxerga os clientes atribuídos a ele, e só pode ver os contatos
// captados e anotar o que foi combinado/resolvido — nunca edita o menu,
// muda status/plano, exclui cliente ou convida outra pessoa.
export default function PainelColaborador({ sessao }) {
  const { tema, alternar: alternarTema } = useTema();
  const [clientes, setClientes] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [clienteId, setClienteId] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    listarClientesAtribuidos()
      .then(setClientes)
      .catch(() => setErro("Não foi possível carregar seus clientes atribuídos."))
      .finally(() => setCarregado(true));
  }, []);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId) || null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}>
      {/* Cores fixas (não usam TOKENS) nesta barra lateral: mesmo fundo
          sempre escuro do painel principal, então os acentos aqui dentro
          também precisam de valores fixos, não dos tokens que trocam de
          tom no modo escuro do site. */}
      <aside className="w-full md:w-64 shrink-0 p-5 flex flex-col gap-4 text-white" style={{ backgroundColor: "#1C2430" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: "#B57A22" }} />
          <span className="font-semibold text-base flex-1">Prontô</span>
          <BotaoTema tema={tema} alternar={alternarTema} variante="dark" />
        </div>
        <p className="text-xs opacity-60 -mt-2">Painel de atendimento</p>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
          {!carregado && <p className="text-xs opacity-60">Carregando...</p>}
          {carregado && clientes.length === 0 && (
            <p className="text-xs opacity-60 leading-relaxed">Nenhum cliente foi atribuído a você ainda.</p>
          )}
          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => setClienteId(c.id)}
              className="text-left px-3 py-2 rounded-lg text-sm truncate"
              style={{ backgroundColor: clienteId === c.id ? "#2A3441" : "transparent" }}
            >
              {c.nome_negocio}
            </button>
          ))}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="btn btn-ghost-dark justify-start px-1.5 py-1.5 text-xs border-t border-white/10 pt-3 mt-1"
        >
          <LogOut size={13} /> Sair ({sessao.user.email})
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {erro && <p role="alert">{erro}</p>}
        {!clienteSelecionado && (
          <div className="max-w-md mx-auto mt-20 text-center flex flex-col items-center gap-3">
            <MessageCircle size={32} style={{ color: TOKENS.teal }} />
            <h1 className="text-lg font-semibold">Escolha um cliente</h1>
            <p style={{ color: TOKENS.muted }}>Selecione um cliente na lista pra ver os contatos captados por ele.</p>
          </div>
        )}

        {clienteSelecionado && (
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            <h1 className="text-lg font-semibold">{clienteSelecionado.nome_negocio}</h1>
            <Resultados key={clienteSelecionado.public_id} publicId={clienteSelecionado.public_id} nome={clienteSelecionado.nome_negocio} />
          </div>
        )}
      </main>
    </div>
  );
}
