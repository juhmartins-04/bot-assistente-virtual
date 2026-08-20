import React, { useEffect, useState } from "react";
import { LogOut, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";
import { listarClientesAtribuidos, listarLeads, atualizarNotaLead } from "./storage";

// Painel reduzido pra quem foi convidado como colaborador de atendimento:
// só enxerga os clientes atribuídos a ele, e só pode ver os contatos
// captados e anotar o que foi combinado/resolvido — nunca edita o menu,
// muda status/plano, exclui cliente ou convida outra pessoa.
export default function PainelColaborador({ sessao }) {
  const [clientes, setClientes] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [clienteId, setClienteId] = useState(null);
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    listarClientesAtribuidos()
      .then(setClientes)
      .catch(() => setClientes([]))
      .finally(() => setCarregado(true));
  }, []);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId) || null;

  useEffect(() => {
    if (!clienteSelecionado) {
      setLeads([]);
      return;
    }
    listarLeads(clienteSelecionado.public_id)
      .then(setLeads)
      .catch(() => setLeads([]));
  }, [clienteSelecionado]);

  async function salvarNota(lead, nota, statusAtendimento) {
    try {
      await atualizarNotaLead(lead.id, nota, statusAtendimento);
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, nota, status_atendimento: statusAtendimento } : l)));
    } catch {
      /* falha ao salvar nota: sem toast dedicado, tentativa silenciosa */
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}>
      {/* Fundo fixo (não usa TOKENS.ink): mesma barra lateral sempre escura do painel principal. */}
      <aside className="w-full md:w-64 shrink-0 p-5 flex flex-col gap-4 text-white" style={{ backgroundColor: "#1C2430" }}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: TOKENS.amber }} />
          <span className="font-semibold text-base">Prontô</span>
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
              style={{ backgroundColor: clienteId === c.id ? TOKENS.inkSoft : "transparent" }}
            >
              {c.nome_negocio}
            </button>
          ))}
        </div>

        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white"
        >
          <LogOut size={13} /> Sair ({sessao.user.email})
        </button>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
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
            {leads.length === 0 && <p style={{ color: TOKENS.muted }}>Nenhum contato ainda.</p>}
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border bg-white p-4 flex flex-col gap-2" style={{ borderColor: TOKENS.border }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {lead.nome || "(sem nome)"}{lead.telefone ? ` · ${lead.telefone}` : ""}
                  </span>
                  <span className="text-xs" style={{ color: TOKENS.muted }}>
                    {new Date(lead.criado_em).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                {lead.opcao_label && (
                  <p className="text-xs" style={{ color: TOKENS.muted }}>Opção escolhida: {lead.opcao_label}</p>
                )}
                <textarea
                  defaultValue={lead.nota || ""}
                  placeholder="O que foi combinado ou resolvido nessa conversa"
                  rows={2}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: TOKENS.border }}
                  onBlur={(e) => salvarNota(lead, e.target.value, lead.status_atendimento)}
                />
                <label className="flex items-center gap-2 text-xs" style={{ color: TOKENS.muted }}>
                  <input
                    type="checkbox"
                    checked={lead.status_atendimento === "respondido"}
                    onChange={(e) => salvarNota(lead, lead.nota, e.target.checked ? "respondido" : "pendente")}
                  />
                  Já respondido
                </label>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
