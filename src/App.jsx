import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Copy, Check, MessageCircle, Calendar,
  Globe2, ChevronDown, ChevronUp, Building2, Save, Sparkles,
  Download, Upload, ExternalLink
} from "lucide-react";
import { storageGet, storageSet } from "./storage";


const TOKENS = {
  ink: "#1C2430",
  inkSoft: "#2A3441",
  canvas: "#EEF2F1",
  amber: "#C98A2E",
  amberDeep: "#9C6A1E",
  teal: "#2F6F62",
  tealSoft: "#E4EDEB",
  border: "#DDE3E1",
  muted: "#5B6672"
};

const TIPOS = [
  { valor: "resposta", label: "Responde na hora (no site)" },
  { valor: "whatsapp", label: "Manda pro WhatsApp" },
  { valor: "agenda", label: "Abre link de agenda" }
];

function novoIdCliente() {
  return "c" + Date.now() + Math.floor(Math.random() * 1000);
}

function clienteEmBranco() {
  return {
    id: novoIdCliente(),
    nomeNegocio: "",
    corPrimaria: "#21c3cb",
    numeroWhatsApp: "",
    idiomaPadrao: "auto",
    saudacaoPt: "Olá! 👋 Como posso ajudar?",
    saudacaoEn: "Hi! 👋 How can I help?",
    transferirLabelPt: "Falar com atendente",
    transferirLabelEn: "Talk to someone",
    transferirMensagemWhatsPt: "Olá! Vim pelo site e gostaria de falar com um atendente.",
    transferirMensagemWhatsEn: "Hi! I came from the website and would like to talk to someone.",
    opcoes: [
      { id: "o1", labelPt: "Horário de funcionamento", labelEn: "Opening hours", tipo: "resposta",
        respostaPt: "Funcionamos de segunda a sábado, das 9h às 18h.", respostaEn: "We're open Monday to Saturday, 9am to 6pm.",
        mensagemWhatsPt: "", mensagemWhatsEn: "", linkAgenda: "" },
      { id: "o2", labelPt: "Agendar horário", labelEn: "Book an appointment", tipo: "agenda",
        respostaPt: "", respostaEn: "", mensagemWhatsPt: "", mensagemWhatsEn: "",
        linkAgenda: "https://cal.com/seu-estabelecimento" }
    ]
  };
}

function gerarLinkWhats(numero, mensagem) {
  return "https://wa.me/" + (numero || "SEU_NUMERO") + "?text=" + encodeURIComponent(mensagem || "");
}

function jsStr(v) {
  return JSON.stringify(v || "");
}

function normalizarUrlBase(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function gerarCodigo(c, widgetBaseUrl) {
  const idiomaLinha = c.idiomaPadrao === "auto" ? "null" : jsStr(c.idiomaPadrao);
  const widgetSrc = normalizarUrlBase(widgetBaseUrl) || "COLOQUE_AQUI_A_URL";
  const opcoesJs = c.opcoes.map((o, i) => {
    const chave = String(i + 1);
    let campo = "";
    if (o.tipo === "resposta") {
      campo = `resposta: { pt: ${jsStr(o.respostaPt)}, en: ${jsStr(o.respostaEn)} }`;
    } else if (o.tipo === "whatsapp") {
      campo = `mensagemWhats: { pt: ${jsStr(o.mensagemWhatsPt)}, en: ${jsStr(o.mensagemWhatsEn)} }`;
    } else {
      campo = `linkAgenda: ${jsStr(o.linkAgenda)}`;
    }
    return `    { chave: "${chave}", label: { pt: ${jsStr(o.labelPt)}, en: ${jsStr(o.labelEn)} }, tipo: "${o.tipo}",\n      ${campo} }`;
  }).join(",\n");

  return `<script>
window.ATENDENTE_CONFIG = {
  nomeNegocio: ${jsStr(c.nomeNegocio)},
  corPrimaria: ${jsStr(c.corPrimaria)},
  numeroWhatsApp: ${jsStr(c.numeroWhatsApp)},
  idiomaPadrao: ${idiomaLinha},
  saudacao: { pt: ${jsStr(c.saudacaoPt)}, en: ${jsStr(c.saudacaoEn)} },
  transferirLabel: { pt: ${jsStr(c.transferirLabelPt)}, en: ${jsStr(c.transferirLabelEn)} },
  transferirMensagemWhats: { pt: ${jsStr(c.transferirMensagemWhatsPt)}, en: ${jsStr(c.transferirMensagemWhatsEn)} },
  opcoes: [
${opcoesJs}
  ]
};
</script>
<script src="${widgetSrc}/atendente-virtual-widget.js"></script>`;
}

function validarCliente(c) {
  const erros = [];
  if (!c.nomeNegocio.trim()) erros.push("Informe o nome do estabelecimento.");
  if (!/^\d{10,15}$/.test(c.numeroWhatsApp.trim())) {
    erros.push("Informe o WhatsApp só com dígitos, incluindo país e DDD.");
  }
  if (c.opcoes.length === 0) erros.push("Adicione pelo menos uma opção no menu.");

  c.opcoes.forEach((opcao, index) => {
    const numero = index + 1;
    if (!opcao.labelPt.trim()) erros.push(`Opção ${numero}: informe o nome em português.`);
    if (!opcao.labelEn.trim()) erros.push(`Opção ${numero}: informe o nome em inglês.`);
    if (opcao.tipo === "resposta" && !opcao.respostaPt.trim() && !opcao.respostaEn.trim()) {
      erros.push(`Opção ${numero}: informe pelo menos uma resposta.`);
    }
    if (opcao.tipo === "whatsapp" && !opcao.mensagemWhatsPt.trim() && !opcao.mensagemWhatsEn.trim()) {
      erros.push(`Opção ${numero}: informe pelo menos uma mensagem de WhatsApp.`);
    }
    if (opcao.tipo === "agenda" && !/^https?:\/\//i.test(opcao.linkAgenda.trim())) {
      erros.push(`Opção ${numero}: informe um link de agenda começando com http ou https.`);
    }
  });

  return erros;
}

function CampoTexto({ label, value, onChange, placeholder, textarea, dica }) {
  const Comp = textarea ? "textarea" : "input";
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium" style={{ color: TOKENS.ink }}>{label}</span>
      <Comp
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={textarea ? 2 : undefined}
        className="rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
        style={{ borderColor: TOKENS.border, boxShadow: "none" }}
        onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px ${TOKENS.teal}55`)}
        onBlur={(e) => (e.target.style.boxShadow = "none")}
      />
      {dica && <span className="text-xs" style={{ color: TOKENS.muted }}>{dica}</span>}
    </label>
  );
}

function CardOpcao({ opcao, indice, onChange, onRemover }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3 bg-white" style={{ borderColor: TOKENS.border }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: TOKENS.muted }}>
          Opção {indice + 1}
        </span>
        <button onClick={onRemover} className="text-gray-400 hover:text-red-500" aria-label="Remover opção">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CampoTexto label="Nome da opção (PT)" value={opcao.labelPt} onChange={(v) => onChange("labelPt", v)} placeholder="Ex: Ver cardápio" />
        <CampoTexto label="Nome da opção (EN)" value={opcao.labelEn} onChange={(v) => onChange("labelEn", v)} placeholder="Ex: See menu" />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium" style={{ color: TOKENS.ink }}>O que acontece ao escolher</span>
        <select
          value={opcao.tipo}
          onChange={(e) => onChange("tipo", e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm bg-white"
          style={{ borderColor: TOKENS.border }}
        >
          {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
        </select>
      </label>

      {opcao.tipo === "resposta" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoTexto textarea label="Resposta (PT)" value={opcao.respostaPt} onChange={(v) => onChange("respostaPt", v)} placeholder="Texto que o bot vai responder" />
          <CampoTexto textarea label="Resposta (EN)" value={opcao.respostaEn} onChange={(v) => onChange("respostaEn", v)} placeholder="Same text in English" />
        </div>
      )}
      {opcao.tipo === "whatsapp" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CampoTexto textarea label="Mensagem que chega no WhatsApp (PT)" value={opcao.mensagemWhatsPt} onChange={(v) => onChange("mensagemWhatsPt", v)} placeholder="Olá! Vim pelo site..." />
          <CampoTexto textarea label="Mensagem que chega no WhatsApp (EN)" value={opcao.mensagemWhatsEn} onChange={(v) => onChange("mensagemWhatsEn", v)} placeholder="Hi! I came from the website..." />
        </div>
      )}
      {opcao.tipo === "agenda" && (
        <CampoTexto label="Link da agenda" value={opcao.linkAgenda} onChange={(v) => onChange("linkAgenda", v)} placeholder="https://cal.com/seu-estabelecimento" dica="Cal.com, Calendly ou qualquer link de agendamento com plano gratuito." />
      )}
    </div>
  );
}

export default function GeradorAtendenteVirtual() {
  const [agencia, setAgencia] = useState("Sua Agência");
  const [clientes, setClientes] = useState({});
  const [clienteId, setClienteId] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [widgetBaseUrl, setWidgetBaseUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  });
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [avisoSalvo, setAvisoSalvo] = useState(false);
  const [erro, setErro] = useState(null);
  const [validacao, setValidacao] = useState([]);
  const [mostrarAvancado, setMostrarAvancado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [previewMsgs, setPreviewMsgs] = useState([]);
  const [previewIdioma, setPreviewIdioma] = useState("pt");
  const importInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const rawClientes = await storageGet("clientes", "{}");
        setClientes(JSON.parse(rawClientes || "{}"));
      } catch {
        setClientes({});
      } finally {
        setCarregado(true);
      }
    })();
  }, []);

  function escolherCliente(id) {
    setClienteId(id);
    setCliente(JSON.parse(JSON.stringify(clientes[id])));
    setValidacao([]);
    setPreviewMsgs([]);
  }

  function iniciarNovoCliente() {
    const c = clienteEmBranco();
    setClienteId(c.id);
    setCliente(c);
    setValidacao([]);
    setPreviewMsgs([]);
  }

  function atualizarCampo(campo, valor) {
    setCliente((prev) => ({ ...prev, [campo]: valor }));
    setValidacao([]);
  }

  function atualizarOpcao(idx, campo, valor) {
    setCliente((prev) => {
      const opcoes = prev.opcoes.map((o, i) => (i === idx ? { ...o, [campo]: valor } : o));
      return { ...prev, opcoes };
    });
    setValidacao([]);
  }

  function adicionarOpcao() {
    setCliente((prev) => ({
      ...prev,
      opcoes: [...prev.opcoes, {
        id: "o" + Date.now(), labelPt: "Nova opção", labelEn: "New option", tipo: "resposta",
        respostaPt: "", respostaEn: "", mensagemWhatsPt: "", mensagemWhatsEn: "", linkAgenda: ""
      }]
    }));
  }

  function removerOpcao(idx) {
    setCliente((prev) => ({ ...prev, opcoes: prev.opcoes.filter((_, i) => i !== idx) }));
    setValidacao([]);
  }

  async function salvarCliente() {
    if (!cliente) return;
    const erros = validarCliente(cliente);
    setValidacao(erros);
    if (erros.length > 0) {
      setErro("Revise os campos antes de salvar.");
      return;
    }

    setSalvando(true);
    setErro(null);
    const atualizados = { ...clientes, [cliente.id]: cliente };
    try {
      await storageSet("clientes", JSON.stringify(atualizados));
      setClientes(atualizados);
      setAvisoSalvo(true);
      setTimeout(() => setAvisoSalvo(false), 2000);
    } catch {
      setErro("Não consegui salvar agora. Seu texto continua aqui — tente salvar de novo em instantes.");
    }
    setSalvando(false);
  }

  async function excluirCliente(id) {
    const alvo = clientes[id];
    const nome = alvo?.nomeNegocio || "este cliente";
    if (!window.confirm(`Excluir ${nome}? Essa ação remove o cliente deste navegador.`)) return;

    const atualizados = { ...clientes };
    delete atualizados[id];
    try {
      await storageSet("clientes", JSON.stringify(atualizados));
      setClientes(atualizados);
      if (clienteId === id) { setClienteId(null); setCliente(null); }
    } catch {
      setErro("Não consegui excluir agora.");
    }
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(gerarCodigo(cliente, widgetBaseUrl));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch { /* clipboard indisponível, sem problema */ }
  }

  function exportarClientes() {
    const payload = {
      versao: 1,
      exportadoEm: new Date().toISOString(),
      agencia,
      widgetBaseUrl,
      clientes
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assistente-virtual-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function importarClientes(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      const texto = await arquivo.text();
      const dados = JSON.parse(texto);
      const clientesImportados = dados.clientes || dados;
      if (!clientesImportados || typeof clientesImportados !== "object" || Array.isArray(clientesImportados)) {
        throw new Error("Formato inválido.");
      }

      const atualizados = { ...clientes, ...clientesImportados };
      await storageSet("clientes", JSON.stringify(atualizados));
      setClientes(atualizados);
      if (dados.agencia) setAgencia(dados.agencia);
      if (dados.widgetBaseUrl) setWidgetBaseUrl(dados.widgetBaseUrl);
      setErro(null);
      setAvisoSalvo(true);
      setTimeout(() => setAvisoSalvo(false), 2000);
    } catch {
      setErro("Não consegui importar esse arquivo. Confira se ele é um backup JSON válido.");
    } finally {
      e.target.value = "";
    }
  }

  function montarMenuPreview(idioma) {
    const linhas = cliente.opcoes.map((o, i) => `*${i + 1}* — ${idioma === "en" ? o.labelEn : o.labelPt}`).join("\n");
    const transferir = idioma === "en" ? cliente.transferirLabelEn : cliente.transferirLabelPt;
    return `*0* — ${transferir}\n${linhas}\n*9* — ${idioma === "en" ? "Close" : "Encerrar"}`;
  }

  function criarMensagensIniciais(idioma) {
    return [
      { autor: "bot", texto: idioma === "en" ? cliente.saudacaoEn : cliente.saudacaoPt },
      { autor: "bot", texto: montarMenuPreview(idioma) }
    ];
  }

  function iniciarPreview() {
    setPreviewMsgs(criarMensagensIniciais(previewIdioma));
  }

  function alternarPreviewIdioma() {
    const novoIdioma = previewIdioma === "pt" ? "en" : "pt";
    setPreviewIdioma(novoIdioma);
    if (previewMsgs.length > 0) {
      setPreviewMsgs(criarMensagensIniciais(novoIdioma));
    }
  }

  function clicarOpcaoPreview(o) {
    const idioma = previewIdioma;
    const novas = [...previewMsgs, { autor: "user", texto: idioma === "en" ? o.labelEn : o.labelPt }];
    if (o.tipo === "resposta") {
      novas.push({ autor: "bot", texto: idioma === "en" ? o.respostaEn : o.respostaPt });
    } else if (o.tipo === "whatsapp") {
      novas.push({ autor: "bot", link: { label: idioma === "en" ? "Continue on WhatsApp" : "Continuar no WhatsApp", url: gerarLinkWhats(cliente.numeroWhatsApp, idioma === "en" ? o.mensagemWhatsEn : o.mensagemWhatsPt) } });
    } else {
      novas.push({ autor: "bot", link: { label: idioma === "en" ? "Open calendar" : "Abrir agenda", url: o.linkAgenda } });
    }
    setPreviewMsgs(novas);
  }

  const listaClientes = Object.values(clientes).sort((a, b) => a.nomeNegocio.localeCompare(b.nomeNegocio));

  return (
    <div className="flex flex-col md:flex-row min-h-screen font-sans text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}>

      {/* ---------------- SIDEBAR ---------------- */}
      <aside className="w-full md:w-72 shrink-0 p-5 flex flex-col gap-5 text-white" style={{ backgroundColor: TOKENS.ink }}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: TOKENS.amber }} />
          <input
            value={agencia}
            onChange={(e) => setAgencia(e.target.value)}
            className="bg-transparent font-semibold text-base outline-none border-b border-transparent focus:border-white/40 w-full"
            aria-label="Nome da sua agência"
          />
        </div>
        <p className="text-xs opacity-60 -mt-3">Gerador de Assistente Virtual</p>

        <button
          onClick={iniciarNovoCliente}
          className="flex items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          style={{ backgroundColor: TOKENS.amber, color: TOKENS.ink }}
        >
          <Plus size={16} /> Novo cliente
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportarClientes}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 text-xs font-medium text-white/85 hover:bg-white/10"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 text-xs font-medium text-white/85 hover:bg-white/10"
          >
            <Upload size={14} /> Importar
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={importarClientes}
            className="hidden"
          />
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5">
          {!carregado && <p className="text-xs opacity-60">Carregando...</p>}
          {carregado && listaClientes.length === 0 && (
            <p className="text-xs opacity-60 leading-relaxed">Nenhum cliente ainda. Clique em "Novo cliente" pra começar.</p>
          )}
          {listaClientes.map((c) => (
            <div key={c.id} className="flex items-center gap-1 group">
              <button
                onClick={() => escolherCliente(c.id)}
                className="flex-1 text-left px-3 py-2 rounded-lg text-sm truncate"
                style={{ backgroundColor: clienteId === c.id ? TOKENS.inkSoft : "transparent" }}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ backgroundColor: c.corPrimaria }} />
                {c.nomeNegocio}
              </button>
              <button
                onClick={() => excluirCliente(c.id)}
                className="opacity-0 group-hover:opacity-70 hover:opacity-100! p-1.5"
                aria-label={"Excluir " + c.nomeNegocio}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs opacity-50 leading-relaxed border-t border-white/10 pt-3">
          Tudo isso roda como link direto pro WhatsApp — sem API oficial, sem QR Code, sem risco de banimento.
        </p>
      </aside>

      {/* ---------------- MAIN ---------------- */}
      <main className="flex-1 p-5 md:p-8 overflow-y-auto">
        {!cliente && (
          <div className="max-w-md mx-auto mt-20 text-center flex flex-col items-center gap-3">
            <Building2 size={36} style={{ color: TOKENS.teal }} />
            <h1 className="text-lg font-semibold">Escolha ou crie um cliente</h1>
            <p style={{ color: TOKENS.muted }}>Selecione um cliente na barra lateral ou clique em "Novo cliente" pra montar um assistente virtual do zero.</p>
          </div>
        )}

        {cliente && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 max-w-6xl mx-auto">

            {/* -------- FORM -------- */}
            <div className="flex flex-col gap-5">

              <div className="rounded-xl border bg-white p-5 flex flex-col gap-4" style={{ borderColor: TOKENS.border }}>
                <h2 className="font-semibold flex items-center gap-2"><Building2 size={16} /> Identidade</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CampoTexto label="Nome do estabelecimento" value={cliente.nomeNegocio} onChange={(v) => atualizarCampo("nomeNegocio", v)} placeholder="Ex: Clínica Vida Plena" />
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Cor principal</span>
                    <input type="color" value={cliente.corPrimaria} onChange={(e) => atualizarCampo("corPrimaria", e.target.value)} className="h-9 w-full rounded-lg border cursor-pointer" style={{ borderColor: TOKENS.border }} />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CampoTexto label="Número de WhatsApp" value={cliente.numeroWhatsApp} onChange={(v) => atualizarCampo("numeroWhatsApp", v)} placeholder="5541999999999" dica="55 + DDD + número, só dígitos." />
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">Idioma</span>
                    <select value={cliente.idiomaPadrao} onChange={(e) => atualizarCampo("idiomaPadrao", e.target.value)} className="rounded-lg border px-3 py-2 bg-white" style={{ borderColor: TOKENS.border }}>
                      <option value="auto">Detectar automaticamente</option>
                      <option value="pt">Sempre português</option>
                      <option value="en">Sempre inglês</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5 flex flex-col gap-4" style={{ borderColor: TOKENS.border }}>
                <h2 className="font-semibold flex items-center gap-2"><MessageCircle size={16} /> Saudação inicial</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CampoTexto textarea label="Português" value={cliente.saudacaoPt} onChange={(v) => atualizarCampo("saudacaoPt", v)} />
                  <CampoTexto textarea label="English" value={cliente.saudacaoEn} onChange={(v) => atualizarCampo("saudacaoEn", v)} />
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5 flex flex-col gap-4" style={{ borderColor: TOKENS.border }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2"><Calendar size={16} /> Opções do menu</h2>
                  <button onClick={adicionarOpcao} className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg" style={{ backgroundColor: TOKENS.tealSoft, color: TOKENS.teal }}>
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {cliente.opcoes.map((o, i) => (
                    <CardOpcao key={o.id} opcao={o} indice={i} onChange={(campo, v) => atualizarOpcao(i, campo, v)} onRemover={() => removerOpcao(i)} />
                  ))}
                  {cliente.opcoes.length === 0 && <p className="text-sm" style={{ color: TOKENS.muted }}>Nenhuma opção ainda — clique em "Adicionar".</p>}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-5" style={{ borderColor: TOKENS.border }}>
                <button onClick={() => setMostrarAvancado(!mostrarAvancado)} className="w-full flex items-center justify-between font-semibold">
                  Configurações avançadas
                  {mostrarAvancado ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {mostrarAvancado && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <CampoTexto label='Rótulo de "Falar com atendente" (PT)' value={cliente.transferirLabelPt} onChange={(v) => atualizarCampo("transferirLabelPt", v)} />
                    <CampoTexto label='Label for "Talk to someone" (EN)' value={cliente.transferirLabelEn} onChange={(v) => atualizarCampo("transferirLabelEn", v)} />
                    <CampoTexto textarea label="Mensagem de transferência no WhatsApp (PT)" value={cliente.transferirMensagemWhatsPt} onChange={(v) => atualizarCampo("transferirMensagemWhatsPt", v)} />
                    <CampoTexto textarea label="Handoff WhatsApp message (EN)" value={cliente.transferirMensagemWhatsEn} onChange={(v) => atualizarCampo("transferirMensagemWhatsEn", v)} />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={salvarCliente}
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white focus:outline-none focus:ring-2"
                  style={{ backgroundColor: TOKENS.teal }}
                >
                  <Save size={16} /> {salvando ? "Salvando..." : "Salvar cliente"}
                </button>
                {avisoSalvo && <span className="text-sm flex items-center gap-1" style={{ color: TOKENS.teal }}><Check size={14} /> Salvo</span>}
                {erro && <span className="text-sm text-red-600">{erro}</span>}
              </div>
              {validacao.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <p className="font-semibold">Antes de salvar:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {validacao.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* -------- PREVIEW + CÓDIGO -------- */}
            <div className="flex flex-col gap-5 xl:sticky xl:top-6 self-start">

              <div className="rounded-xl border bg-white p-4 flex flex-col gap-3" style={{ borderColor: TOKENS.border }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm">Pré-visualização</h2>
                  <button
                    onClick={alternarPreviewIdioma}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                    style={{ backgroundColor: TOKENS.tealSoft, color: TOKENS.teal }}
                  >
                    <Globe2 size={12} /> {previewIdioma === "pt" ? "EN" : "PT"}
                  </button>
                </div>

                <div className="rounded-lg overflow-hidden border" style={{ borderColor: TOKENS.border }}>
                  <div className="px-3 py-2 flex items-center gap-2 text-white" style={{ backgroundColor: cliente.corPrimaria }}>
                    <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold">
                      {(cliente.nomeNegocio || "?").charAt(0)}
                    </div>
                    <span className="text-xs font-semibold">{cliente.nomeNegocio}</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 bg-gray-50" style={{ minHeight: 160, maxHeight: 260, overflowY: "auto" }}>
                    {previewMsgs.length === 0 && (
                      <button onClick={iniciarPreview} className="text-xs font-medium underline self-start" style={{ color: TOKENS.teal }}>
                        ▶ simular abertura do chat
                      </button>
                    )}
                    {previewMsgs.map((m, i) => (
                      <div key={i} className={"max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap " + (m.autor === "user" ? "self-end text-white" : "self-start bg-white border")}
                        style={m.autor === "user" ? { backgroundColor: cliente.corPrimaria } : { borderColor: TOKENS.border }}>
                        {m.link ? <a href={m.link.url} target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: TOKENS.amberDeep }}>{m.link.label}</a> : m.texto}
                      </div>
                    ))}
                    {previewMsgs.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {cliente.opcoes.map((o, i) => (
                          <button key={o.id} onClick={() => clicarOpcaoPreview(o)} className="text-[11px] px-2 py-1 rounded-md border" style={{ borderColor: cliente.corPrimaria, color: TOKENS.ink }}>
                            {i + 1}. {previewIdioma === "en" ? o.labelEn : o.labelPt}
                          </button>
                        ))}
                        <button onClick={iniciarPreview} className="text-[11px] px-2 py-1 rounded-md border" style={{ borderColor: TOKENS.border, color: TOKENS.muted }}>↺ reiniciar</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4 flex flex-col gap-3" style={{ borderColor: TOKENS.border }}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-sm">Publicação</h2>
                  <a
                    href="/teste-widget.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: TOKENS.teal }}
                  >
                    <ExternalLink size={13} /> Testar widget
                  </a>
                </div>
                <CampoTexto
                  label="URL onde o widget ficará hospedado"
                  value={widgetBaseUrl}
                  onChange={setWidgetBaseUrl}
                  placeholder="https://seu-dominio.com"
                  dica="Em produção, use a URL pública onde o arquivo atendente-virtual-widget.js será publicado."
                />
              </div>

              <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: TOKENS.border, backgroundColor: TOKENS.ink }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-white">Código pra colar no site</h2>
                  <button onClick={copiarCodigo} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md" style={{ backgroundColor: copiado ? TOKENS.teal : TOKENS.amber, color: copiado ? "white" : TOKENS.ink }}>
                    {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-200 whitespace-pre-wrap wrap-break-word" style={{ fontFamily: "monospace" }}>
{gerarCodigo(cliente, widgetBaseUrl)}
                </pre>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Suba o <code>atendente-virtual-widget.js</code> em qualquer hospedagem estática gratuita e troque a URL acima. Cole os dois blocos antes do <code>&lt;/body&gt;</code> do site do cliente.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
