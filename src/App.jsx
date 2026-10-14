import { OPERACAO_COMPLETA } from './operacao';
import AssinaturaSolo from './AssinaturaSolo';
import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Copy, Check, MessageCircle, Calendar,
  Globe2, ChevronDown, ChevronUp, Building2, Save, Sparkles,
  Download, Upload, ExternalLink, LogOut, Ban, PlayCircle, Users, Lock,
  LayoutGrid, Clock, Eye, BarChart3, Rocket, Code2, Settings2
} from "lucide-react";
import { supabase } from "./utils/supabase";
import { TOKENS } from "./tokens";
import { useTema } from "./useTema";
import BotaoTema from "./BotaoTema";
import Login from "./Login";
import Resultados from "./Resultados";
import Assinatura from "./Assinatura";
import ComercialPainel from "./ComercialPainel";
import PortalCliente from "./PortalCliente";
import { textoSobreCor } from "./cores";
import { urlSegura, NOMES_PLANOS } from "./negocio";
import PainelColaborador from "./PainelColaborador";
import {
  exportarBackupOperacional,
  restaurarBackupOperacional,
  storageGet,
  storageSet,
  listarClientes,
  salvarClienteRemoto,
  excluirClienteRemoto,
  atualizarStatusRemoto,
  estenderTesteRemoto,
  verificarESolicitarAcessoColaborador,
  listarColaboradores,
  convidarColaborador,
  atribuirClienteColaborador,
  removerAtribuicaoColaborador,
  removerColaborador,
} from "./storage";

const TIPOS = [
  { valor: "resposta", label: "Responde na hora (no site)" },
  { valor: "whatsapp", label: "Manda pro WhatsApp" },
  { valor: "agenda", label: "Abre link de agenda" }
];

function novoIdCliente() {
  return "c" + crypto.randomUUID();
}

function clienteEmBranco() {
  return {
    id: novoIdCliente(),
    nomeNegocio: "",
    plano: "completo",
    corPrimaria: "#21c3cb",
    numeroWhatsApp: "",
    idiomaPadrao: "auto",
    sobreNegocio: "",
    endereco: "",
    horarioFuncionamento: "",
    incluiAssistente: true,
    layout: "classico", // "classico" | "cartao" | "servicos" | "cardapio"
    instagramUrl: "",
    servicos: ["", "", "", ""],
    itensCardapio: [{ nome: "", preco: "" }, { nome: "", preco: "" }, { nome: "", preco: "" }],
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

function normalizarUrlBase(url) {
  return (url || "").trim().replace(/\/+$/, "");
}

function gerarCodigo(c, widgetBaseUrl) {
  const widgetSrc = normalizarUrlBase(widgetBaseUrl) || "COLOQUE_AQUI_A_URL";
  if (!c.publicId) {
    return "<!-- Salve o cliente pelo menos uma vez pra gerar o código de instalação. -->";
  }
  return `<script src="${widgetSrc}/atendente-virtual-widget.js" data-site="${c.publicId}" defer></script>`;
}

function diasRestantes(iso) {
  if (!iso) return 0;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function formatarData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Aviso de vencimento pro cliente: em vez de mandar automático (exigiria
// e-mail com domínio próprio, ou API oficial do WhatsApp — nenhum dos dois
// gratuito nem alinhado com a proposta do Prontô), gera um link de
// WhatsApp já com a mensagem escrita, pra você só clicar e enviar.
function mensagemLembreteWhats(cliente) {
  if (cliente.status === "suspended") {
    return `Oi! Vi que o Prontô do ${cliente.nomeNegocio} está suspenso. Quer reativar? É só confirmar comigo que eu já libero de novo.`;
  }
  const dias = Math.max(diasRestantes(cliente.trialEndsAt), 0);
  return `Oi! O teste do Prontô do ${cliente.nomeNegocio} acaba em ${dias === 0 ? "breve" : dias + " dia" + (dias === 1 ? "" : "s")}. Quer continuar? É só confirmar comigo que eu já ativo.`;
}

function validarCliente(c) {
  const erros = [];
  if (!c.nomeNegocio.trim()) erros.push("Informe o nome do estabelecimento.");
  if (!/^\d{10,15}$/.test(c.numeroWhatsApp.trim())) {
    erros.push("Informe o WhatsApp só com dígitos, incluindo país e DDD.");
  }
  if (c.incluiAssistente !== false && c.opcoes.length === 0) erros.push("Adicione pelo menos uma opção no menu.");

  if (c.instagramUrl && !urlSegura(c.instagramUrl)) erros.push("Informe um link http ou https para o Instagram.");
  if (c.opcoes.length > 5) erros.push("O plano inclui até cinco perguntas essenciais.");
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
        className="rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: TOKENS.border }}
      />
      {dica && <span className="text-xs" style={{ color: TOKENS.muted }}>{dica}</span>}
    </label>
  );
}

function CardOpcao({ opcao, indice, onChange, onRemover }) {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: TOKENS.muted }}>
          Opção {indice + 1}
        </span>
        <button onClick={onRemover} className="danger-action" aria-label="Remover opção">
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
          className="rounded-lg border px-3 py-2 text-sm"
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

const PlanoOperacao = OPERACAO_COMPLETA ? Assinatura : AssinaturaSolo;

export default function GeradorAtendenteVirtual() {
  const { tema, alternar: alternarTema } = useTema();
  const [sessao, setSessao] = useState(undefined); // undefined = carregando · null = deslogado
  const [ehColaborador, setEhColaborador] = useState(undefined); // undefined = verificando
  const [agencia, setAgencia] = useState("Sua Agência");
  const [clientes, setClientes] = useState({});
  const [buscaClientes, setBuscaClientes] = useState("");
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
  const [paginaCopiada, setPaginaCopiada] = useState(false);
  const [mostrarColaboradores, setMostrarColaboradores] = useState(false);
  const [colaboradores, setColaboradores] = useState([]);
  const [carregandoColaboradores, setCarregandoColaboradores] = useState(false);
  const [novoEmailColaborador, setNovoEmailColaborador] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [senhaSalva, setSenhaSalva] = useState(false);
  const [erroSenha, setErroSenha] = useState(null);
  const [previewMsgs, setPreviewMsgs] = useState([]);
  const [previewIdioma, setPreviewIdioma] = useState("pt");
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState(null);
  const logoInputRef = useRef(null);
  const importInputRef = useRef(null);
  const ultimaContaRef = useRef(null);

  useEffect(() => {
    function atualizarSessao(novaSessao) {
      const usuario = novaSessao?.user?.id || null;
      if (usuario !== ultimaContaRef.current) {
        ultimaContaRef.current = usuario; setCarregado(false); setClientes({}); setCliente(null); setClienteId(null);
        setAgencia('Sua Agência'); setWidgetBaseUrl(window.location.origin); setEhColaborador(undefined); setErro(null);
      }
      setSessao(novaSessao);
      // Links mágicos antigos voltam à raiz, que agora apresenta o produto.
      // Depois que o Supabase conclui o login, mantém o painel em sua rota.
      if (novaSessao && window.location.pathname === "/") {
        window.history.replaceState(null, "", "/painel");
      }
    }
    supabase.auth.getSession().then(({ data }) => atualizarSessao(data.session));
    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      atualizarSessao(novaSessao);
    });
    return () => assinatura.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessao) {
      setEhColaborador(undefined);
      return;
    }
    let cancelado = false;
    verificarESolicitarAcessoColaborador(sessao.user.id)
      .then(papel => { if (!cancelado) setEhColaborador(papel); })
      .catch(() => { if (!cancelado) setEhColaborador("erro"); });
    return () => { cancelado = true; };
  }, [sessao]);

  useEffect(() => {
    if (!sessao || ehColaborador !== false) return;
    let cancelado = false;
    (async () => {
      try {
        const [mapaClientes, rawConfig] = await Promise.all([
          listarClientes(),
          storageGet(sessao.user.id, "config", null),
        ]);
        if (cancelado) return;
        setClientes(mapaClientes);
        if (rawConfig) {
          const config = JSON.parse(rawConfig);
          if (config.agencia) setAgencia(config.agencia);
          if (config.widgetBaseUrl) setWidgetBaseUrl(config.widgetBaseUrl);
        }
      } catch {
        if (cancelado) return;
        setClientes({});
        setErro("Não consegui carregar seus dados agora. Recarregue a página em instantes.");
      } finally {
        if (!cancelado) setCarregado(true);
      }
    })();
    return () => { cancelado = true; };
  }, [sessao, ehColaborador]);

  // Salva nome da agência e URL do widget automaticamente (com debounce)
  useEffect(() => {
    if (!carregado || !sessao || ehColaborador !== false) return;
    const timer = setTimeout(() => {
      storageSet(sessao.user.id, "config", JSON.stringify({ agencia, widgetBaseUrl })).catch(() => setErro("Não consegui salvar as configurações da conta. Tente novamente."));
    }, 600);
    return () => clearTimeout(timer);
  }, [agencia, widgetBaseUrl, carregado, sessao, ehColaborador]);

  const temAlteracoes = !!cliente && JSON.stringify(cliente) !== JSON.stringify(clientes[cliente.id]);
  useEffect(() => {
    if (!temAlteracoes) return;
    const avisar = e => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [temAlteracoes]);
  function podeTrocarTela() {
    return !temAlteracoes || window.confirm('Há alterações não salvas neste cliente. Sair e descartar essas alterações?');
  }

  function escolherCliente(id) {
    if (!podeTrocarTela()) return;
    if (!clientes[id]) {
      setErro("Esse cliente não existe mais (pode ter sido excluído em outra aba).");
      return;
    }
    setMostrarColaboradores(false);
    setMostrarSenha(false);
    setClienteId(id);
    setCliente(JSON.parse(JSON.stringify(clientes[id])));
    setValidacao([]);
    setPreviewMsgs([]);
  }

  function iniciarNovoCliente() {
    if (!podeTrocarTela()) return;
    const c = clienteEmBranco();
    setMostrarColaboradores(false);
    setMostrarSenha(false);
    setClienteId(c.id);
    setCliente(c);
    setValidacao([]);
    setPreviewMsgs([]);
  }

  function irParaVisaoGeral() {
    if (!podeTrocarTela()) return;
    setMostrarColaboradores(false);
    setMostrarSenha(false);
    setClienteId(null);
    setCliente(null);
  }

  function atualizarCampo(campo, valor) {
    setCliente((prev) => ({ ...prev, [campo]: valor, ...(campo === "incluiAssistente" ? { plano: valor ? "completo" : "pagina" } : {}) }));
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
    if (cliente.opcoes.length >= 5) { setErro("O plano inclui até cinco perguntas essenciais."); return; }
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

  function atualizarServico(idx, valor, campo = "nome") {
    setCliente((prev) => {
      const servicos = [...(prev.servicos || ["", "", "", ""])];
      const anterior = typeof servicos[idx] === "string" ? { nome: servicos[idx] } : servicos[idx];
      servicos[idx] = { ...anterior, [campo]: valor };
      return { ...prev, servicos };
    });
  }

  function atualizarItemCardapio(idx, campo, valor) {
    setCliente((prev) => {
      const itensCardapio = (prev.itensCardapio || []).map((item, i) => (i === idx ? { ...item, [campo]: valor } : item));
      return { ...prev, itensCardapio };
    });
  }

  function adicionarItemCardapio() {
    setCliente((prev) => ({ ...prev, itensCardapio: [...(prev.itensCardapio || []), { nome: "", preco: "" }] }));
  }

  function removerItemCardapio(idx) {
    setCliente((prev) => ({ ...prev, itensCardapio: (prev.itensCardapio || []).filter((_, i) => i !== idx) }));
  }

  async function enviarLogo(arquivo) {
    if (!arquivo || !cliente) return;
    const tiposAceitos = ["image/png", "image/jpeg", "image/webp"];
    if (!tiposAceitos.includes(arquivo.type)) {
      setErroLogo("Envie uma imagem PNG, JPG ou WEBP.");
      return;
    }
    if (arquivo.size > 2 * 1024 * 1024) {
      setErroLogo("A imagem precisa ter até 2MB.");
      return;
    }

    setEnviandoLogo(true);
    setErroLogo(null);
    try {
      const extensao = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[arquivo.type];
      const caminho = `${sessao.user.id}/${cliente.id}-${Date.now()}.${extensao}`;
      const { error: erroUpload } = await supabase.storage.from("logos").upload(caminho, arquivo, { upsert: true });
      if (erroUpload) throw erroUpload;
      const { data } = supabase.storage.from("logos").getPublicUrl(caminho);
      atualizarCampo("logoUrl", data.publicUrl);
    } catch {
      setErroLogo("Não consegui enviar a imagem agora. Tente de novo em instantes.");
    }
    setEnviandoLogo(false);
  }

  function removerLogo() {
    atualizarCampo("logoUrl", "");
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
    try {
      const resultado = await salvarClienteRemoto(cliente, sessao.user.id);
      const clienteSalvo = { ...cliente, ...resultado };
      setCliente(clienteSalvo);
      setClientes((prev) => ({ ...prev, [cliente.id]: clienteSalvo }));
      setAvisoSalvo(true);
      setTimeout(() => setAvisoSalvo(false), 2000);
    } catch {
      setErro("Não consegui salvar agora. Seu texto continua aqui — tente salvar de novo em instantes.");
    }
    setSalvando(false);
  }

  async function mudarStatusCliente(novoStatus) {
    if (!cliente?.publicId) return;
    try {
      await atualizarStatusRemoto(cliente.id, novoStatus);
      setCliente((prev) => ({ ...prev, status: novoStatus }));
      setClientes((prev) => ({ ...prev, [cliente.id]: { ...prev[cliente.id], status: novoStatus } }));
    } catch {
      setErro("Não consegui mudar o status agora.");
    }
  }

  async function estenderTeste(dias) {
    if (!cliente?.publicId) return;
    if (!window.confirm("Confirma que o cliente conferiu as informações e que o teste pode começar agora?")) return;
    try {
      const trialEndsAt = await estenderTesteRemoto(cliente.id, dias);
      setCliente((prev) => ({ ...prev, status: "trial", trialEndsAt }));
      setClientes((prev) => ({ ...prev, [cliente.id]: { ...prev[cliente.id], status: "trial", trialEndsAt } }));
    } catch {
      setErro("Não consegui estender o teste agora.");
    }
  }

  async function excluirCliente(id) {
    if (!OPERACAO_COMPLETA) { setErro("Suspenda o negócio para encerrar o acesso. A exclusão definitiva precisa de revisão do histórico."); return; }
    const alvo = clientes[id];
    const nome = alvo?.nomeNegocio || "este cliente";
    if (!window.confirm(`Excluir ${nome}, os contatos, eventos, solicitações e recebimentos vinculados? Exporte um backup antes. Essa ação não pode ser desfeita.`)) return;

    try {
      const resultadoExclusao = await excluirClienteRemoto(id);
      if (resultadoExclusao.avisoLogo) setErro(resultadoExclusao.avisoLogo);
      setClientes((prev) => {
        const atualizados = { ...prev };
        delete atualizados[id];
        return atualizados;
      });
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

  async function copiarLinkPagina() {
    if (!cliente?.publicId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/p/${cliente.publicId}`);
      setPaginaCopiada(true);
      setTimeout(() => setPaginaCopiada(false), 1800);
    } catch { /* clipboard indisponível, sem problema */ }
  }

  function abrirColaboradores() {
    if (!podeTrocarTela()) return;
    setClienteId(null);
    setCliente(null);
    setMostrarSenha(false);
    setMostrarColaboradores(true);
    setCarregandoColaboradores(true);
    listarColaboradores(sessao.user.id)
      .then(setColaboradores)
      .catch(() => setErro("Não consegui carregar os colaboradores agora."))
      .finally(() => setCarregandoColaboradores(false));
  }

  async function convidar(e) {
    e.preventDefault();
    if (!novoEmailColaborador.trim()) return;
    try {
      await convidarColaborador(sessao.user.id, novoEmailColaborador);
      setNovoEmailColaborador("");
      abrirColaboradores();
    } catch {
      setErro("Não consegui convidar esse e-mail agora (talvez já esteja convidado).");
    }
  }

  async function alternarAtribuicao(colaboradorRowId, clienteAlvoId, jaAtribuido) {
    try {
      if (jaAtribuido) {
        await removerAtribuicaoColaborador(colaboradorRowId, clienteAlvoId);
      } else {
        await atribuirClienteColaborador(colaboradorRowId, clienteAlvoId);
      }
      abrirColaboradores();
    } catch {
      setErro("Não consegui atualizar essa atribuição agora.");
    }
  }

  async function excluirColaborador(colaboradorRowId, email) {
    if (!window.confirm(`Remover o acesso de ${email}? Ele deixa de ver qualquer cliente imediatamente.`)) return;
    try {
      await removerColaborador(colaboradorRowId);
      abrirColaboradores();
    } catch {
      setErro("Não consegui remover agora.");
    }
  }

  function abrirDefinirSenha() {
    if (!podeTrocarTela()) return;
    setClienteId(null);
    setCliente(null);
    setMostrarColaboradores(false);
    setMostrarSenha(true);
    setNovaSenha("");
    setConfirmarSenha("");
    setErroSenha(null);
  }

  async function salvarSenha(e) {
    e.preventDefault();
    if (novaSenha.length < 6) {
      setErroSenha("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErroSenha("As duas senhas precisam ser iguais.");
      return;
    }
    setSalvandoSenha(true);
    setErroSenha(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;
      setSenhaSalva(true);
      setNovaSenha("");
      setConfirmarSenha("");
      setTimeout(() => setSenhaSalva(false), 2500);
    } catch {
      setErroSenha("Não consegui salvar a senha agora. Tente de novo em instantes.");
    }
    setSalvandoSenha(false);
  }

  async function exportarClientes() {
    try { await exportarBackupOperacional(); setErro(null); }
    catch { setErro("O backup operacional não foi concluído. Tente novamente."); }
  }

  async function importarClientes(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      const texto = await arquivo.text();
      const dados = JSON.parse(texto);
      if (dados.versao === 2) {
        if (!window.confirm("Restaurar negócios ausentes deste backup? Negócios existentes serão preservados e os recuperados ficarão suspensos para conferência.")) return;
        const resultado = await restaurarBackupOperacional(dados);
        setClientes(await listarClientes());
        setErro(`${resultado.restaurados} negócio(s) restaurado(s); ${resultado.preservados} existente(s) preservado(s).`);
        return;
      }
      if (!window.confirm("Este arquivo antigo contém apenas configurações. Importar como novos rascunhos? Os links e históricos originais não serão recuperados.")) return;
      const clientesImportados = dados.clientes || dados;
      if (!clientesImportados || typeof clientesImportados !== "object" || Array.isArray(clientesImportados)) {
        throw new Error("Formato inválido.");
      }

      const listaImportada = Object.values(clientesImportados).map((c) => {
        const { publicId, status, trialEndsAt, paidUntil, cancelAt, legacyAccess, ...conteudo } = c;
        return { ...clienteEmBranco(), ...conteudo, id: novoIdCliente() };
      });
      if (listaImportada.length > 500 || listaImportada.some(c => validarCliente(c).length)) throw new Error("Configurações inválidas.");
      const resultados = await Promise.all(
        listaImportada.map((c) => salvarClienteRemoto(c, sessao.user.id))
      );
      const atualizados = { ...clientes };
      listaImportada.forEach((c, i) => {
        atualizados[c.id] = { ...c, ...resultados[i] };
      });
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

  const clientesFiltrados = listaClientes.filter(c => (c.nomeNegocio || '').toLocaleLowerCase('pt-BR').includes(buscaClientes.trim().toLocaleLowerCase('pt-BR')));
  const contagemStatus = {
    active: listaClientes.filter((c) => c.status === "active").length,
    trial: listaClientes.filter((c) => c.status === "trial").length,
    suspended: listaClientes.filter((c) => c.status === "suspended").length,
  };
  const precisamAtencao = listaClientes
    .filter((c) => (c.cancelAt && Date.now() - new Date(c.cancelAt).getTime() > 30 * 86400000) || c.status === "suspended" || (c.status === "trial" && diasRestantes(c.trialEndsAt) <= 3))
    .sort((a, b) => (a.status === "suspended" ? -1 : 1) - (b.status === "suspended" ? -1 : 1));

  if (sessao === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.muted }}>
        Carregando...
      </div>
    );
  }

  if (!sessao) {
    return <Login />;
  }

  if (ehColaborador === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.muted }}>
        Carregando...
      </div>
    );
  }

  if (ehColaborador === "erro") return <main className="p-8"><p role="alert">Não foi possível verificar seu acesso.</p><button className="btn btn-outline mt-3" onClick={() => window.location.reload()}>Tentar novamente</button><button className="btn btn-outline mt-3 ml-3" onClick={() => supabase.auth.signOut()}>Sair</button></main>;
  if (ehColaborador === "cliente" || window.location.pathname === "/cliente") return OPERACAO_COMPLETA ? <PortalCliente sessao={sessao} /> : <main className="p-8"><h1 className="text-xl font-semibold">Área do cliente em preparação</h1><p className="mt-3">Nesta primeira fase, resultados e pedidos são acompanhados diretamente com a Julia.</p><a className="btn btn-primary mt-4" href="https://wa.me/5541995472287" target="_blank" rel="noopener noreferrer">Falar com a Julia</a><button className="btn btn-outline mt-4 ml-3" onClick={() => supabase.auth.signOut()}>Sair</button></main>;
  if (ehColaborador === true) {
    return <PainelColaborador sessao={sessao} />;
  }

  return (
    <div className="panel-layout flex flex-col md:flex-row min-h-screen font-sans text-sm" style={{ backgroundColor: TOKENS.canvas, color: TOKENS.ink }}>

      <a href="#painel-conteudo" className="panel-skip">Pular para o painel</a>
      {/* ---------------- SIDEBAR ---------------- */}
      {/* Fundo fixo (não usa TOKENS.ink): a barra lateral é sempre escura,
          claro ou escuro o tema do sistema, por isso o texto branco fixo
          combinado só funciona com uma cor de fundo igualmente fixa. */}
      <aside className="panel-sidebar w-full md:w-72 shrink-0 p-5 flex flex-col gap-5 text-white" style={{ backgroundColor: "#1C2430" }}>
        {/* Cores fixas (não usam TOKENS) daqui até o fim da barra lateral:
            ela é sempre escura, então os acentos precisam de valores fixos
            em vez dos tokens que trocam de tom no modo escuro do site. */}
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: "#B57A22" }} />
          <input
            value={agencia}
            onChange={(e) => setAgencia(e.target.value)}
            style={{ backgroundColor: "transparent", color: "#ffffff" }}
            className="bg-transparent font-semibold text-base outline-none border-b border-transparent focus:border-white/40 w-full"
            aria-label="Nome da sua agência"
          />
          <BotaoTema tema={tema} alternar={alternarTema} variante="dark" />
        </div>
        <p className="text-xs opacity-70 -mt-3">Seu espaço de operação · Prontô</p>
        <button onClick={irParaVisaoGeral} aria-current={!cliente && !mostrarSenha && !mostrarColaboradores ? 'page' : undefined} className="btn btn-ghost-dark justify-start px-3 py-2 text-sm"><LayoutGrid size={16} /> Visão geral</button>

        <button
          onClick={iniciarNovoCliente}
          className="btn py-2.5 text-sm focus:ring-2 focus:ring-white/50"
          style={{ backgroundColor: "#B57A22", color: "#1C2430" }}
        >
          <Plus size={16} /> Novo cliente
        </button>

        {precisamAtencao.length > 0 && (
          <button
            onClick={irParaVisaoGeral}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-left"
            style={{ backgroundColor: "#331A17", color: "#E58275" }}
          >
            <Ban size={13} /> {precisamAtencao.length} {precisamAtencao.length === 1 ? "cliente precisa" : "clientes precisam"} de atenção
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportarClientes}
            className="btn btn-ghost-dark border border-white/10 px-2 py-2 text-xs"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            disabled={!OPERACAO_COMPLETA}
            title={!OPERACAO_COMPLETA ? "Restauração automática pendente de revisão" : "Importar backup"}
            onClick={() => importInputRef.current?.click()}
            className="btn btn-ghost-dark border border-white/10 px-2 py-2 text-xs"
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

        <label className="flex flex-col gap-2 text-xs"><span>Clientes · {listaClientes.length}</span><input className="panel-search" type="search" value={buscaClientes} onChange={e => setBuscaClientes(e.target.value)} placeholder="Buscar cliente pelo nome" /></label>
        <div className="panel-client-list flex-1 overflow-y-auto flex flex-col gap-1.5" aria-label="Lista de clientes">
          {carregado && listaClientes.length > 0 && clientesFiltrados.length === 0 && <p role="status" className="text-xs text-white/80">Nenhum cliente com esse nome.</p>}
          {!carregado && <p className="text-xs opacity-60">Carregando...</p>}
          {carregado && listaClientes.length === 0 && (
            <p className="text-xs opacity-60 leading-relaxed">Nenhum cliente ainda. Clique em "Novo cliente" pra começar.</p>
          )}
          {clientesFiltrados.map((c) => (
            <div key={c.id} className="flex items-center gap-1 group">
              <button
                onClick={() => escolherCliente(c.id)}
                aria-current={clienteId === c.id ? "page" : undefined}
                className="panel-client flex-1 min-w-0 flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm truncate border-l-2"
                style={{
                  backgroundColor: clienteId === c.id ? "#2A3441" : "transparent",
                  borderColor: clienteId === c.id ? c.corPrimaria : "transparent",
                }}
              >
                <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.corPrimaria }} />
                <span className="truncate">{c.nomeNegocio}</span>
                {c.status === "suspended" && <span className="text-[10px] shrink-0 opacity-60">suspenso</span>}
                {c.status === "trial" && <span className="text-[10px] shrink-0 opacity-60">{Math.max(diasRestantes(c.trialEndsAt), 0)}d</span>}
              </button>
              <button
                disabled={!OPERACAO_COMPLETA}
                title="Exclusão definitiva pendente de revisão"
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
          As respostas aparecem no site. A conversa continua no WhatsApp do negócio.
        </p>
        <div className="flex flex-col gap-1 border-t border-white/10 pt-3">
          <button
            onClick={abrirColaboradores}
            className="btn btn-ghost-dark justify-start px-1.5 py-1.5 text-xs"
          >
            <Users size={13} /> Colaboradores
          </button>
          <button
            onClick={abrirDefinirSenha}
            className="btn btn-ghost-dark justify-start px-1.5 py-1.5 text-xs"
          >
            <Lock size={13} /> Definir senha
          </button>
          <button
            onClick={() => { if (podeTrocarTela()) supabase.auth.signOut(); }}
            className="btn btn-ghost-dark justify-start px-1.5 py-1.5 text-xs"
          >
            <LogOut size={13} /> Sair ({sessao.user.email})
          </button>
        </div>
      </aside>

      {/* ---------------- MAIN ---------------- */}
      <main id="painel-conteudo" className="panel-main flex-1 p-5 md:p-8 overflow-y-auto">
        {erro && <div role="status" className="card p-3 mb-4 text-sm flex justify-between gap-3"><p>{erro}</p><button aria-label="Fechar aviso" onClick={() => setErro(null)}>×</button></div>}
        {mostrarColaboradores && (
          <div className="max-w-2xl mx-auto flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <span className="icon-chip"><Users size={14} /></span> Colaboradores
              </h1>
              <p className="text-sm mt-1" style={{ color: TOKENS.muted }}>
                Convide alguém pra ajudar no atendimento. A pessoa loga com o próprio e-mail e só enxerga os clientes que você atribuir a ela — nunca edita menu, nunca muda status/plano, nunca exclui nada.
              </p>
            </div>

            <form onSubmit={convidar} className="card p-4 flex items-center gap-2">
              <input
                type="email"
                aria-label="E-mail do colaborador"
                required
                value={novoEmailColaborador}
                onChange={(e) => setNovoEmailColaborador(e.target.value)}
                placeholder="e-mail da pessoa"
                className="flex-1 rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: TOKENS.border }}
              />
              <button type="submit" className="btn btn-primary px-3 py-2 text-sm">
                <Plus size={14} /> Convidar
              </button>
            </form>

            {carregandoColaboradores && <p className="text-sm" style={{ color: TOKENS.muted }}>Carregando...</p>}
            {!carregandoColaboradores && colaboradores.length === 0 && (
              <p className="text-sm" style={{ color: TOKENS.muted }}>Nenhum colaborador convidado ainda.</p>
            )}

            {colaboradores.map((colab) => (
              <div key={colab.id} className="card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{colab.email}</span>
                    <span className={"badge text-[10px] px-2 py-0.5 " + (colab.aceito ? "badge-teal" : "badge-amber")}>
                      {colab.aceito ? "ativo" : "convite pendente"}
                    </span>
                  </div>
                  <button onClick={() => excluirColaborador(colab.id, colab.email)} className="danger-action" aria-label={"Remover " + colab.email}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium" style={{ color: TOKENS.ink }}>Clientes atribuídos</span>
                  <div className="flex flex-wrap gap-1.5">
                    {listaClientes.map((c) => {
                      const atribuido = colab.clienteIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => alternarAtribuicao(colab.id, c.id, atribuido)}
                          className="text-xs px-2.5 py-1 rounded-md border"
                          style={atribuido ? { backgroundColor: TOKENS.tealSoft, borderColor: TOKENS.teal, color: TOKENS.teal } : { borderColor: TOKENS.border, color: TOKENS.muted }}
                        >
                          {c.nomeNegocio}
                        </button>
                      );
                    })}
                    {listaClientes.length === 0 && <span className="text-xs" style={{ color: TOKENS.muted }}>Crie um cliente primeiro pra poder atribuir.</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mostrarSenha && (
          <div className="max-w-sm mx-auto flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <span className="icon-chip"><Lock size={14} /></span> Definir senha
              </h1>
              <p className="text-sm mt-1" style={{ color: TOKENS.muted }}>
                Depois disso, você pode entrar com e-mail e senha, sem precisar do link mágico toda vez.
              </p>
            </div>
            <form onSubmit={salvarSenha} className="card p-4 flex flex-col gap-3" autoComplete="on">
              <input type="email" name="email" autoComplete="username" value={sessao.user.email} readOnly hidden />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Nova senha</span>
                <input
                  type="password"
                  name="new-password"
                  autoComplete="new-password"
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Pelo menos 6 caracteres"
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: TOKENS.border }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Confirmar senha</span>
                <input
                  type="password"
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: TOKENS.border }}
                />
              </label>
              <button
                type="submit"
                disabled={salvandoSenha}
                className="btn btn-primary py-2.5"
              >
                {salvandoSenha ? "Salvando..." : "Salvar senha"}
              </button>
              {senhaSalva && <span className="text-sm text-center" style={{ color: TOKENS.teal }}>Senha salva — use ela no próximo login.</span>}
              {erroSenha && <span className="text-sm form-error">{erroSenha}</span>}
            </form>
          </div>
        )}

        {!mostrarColaboradores && !mostrarSenha && !cliente && listaClientes.length === 0 && (
          <div className="max-w-md mx-auto mt-20 text-center flex flex-col items-center gap-3">
            <Building2 size={36} style={{ color: TOKENS.teal }} />
            <h1 className="text-lg font-semibold">Escolha ou crie um cliente</h1>
            <p style={{ color: TOKENS.muted }}>Selecione um cliente na barra lateral ou clique em "Novo cliente" pra montar um assistente virtual do zero.</p>
          </div>
        )}

        {!mostrarColaboradores && !mostrarSenha && !cliente && listaClientes.length > 0 && (
          <div className="max-w-2xl mx-auto mt-10 flex flex-col gap-5">
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <span className="icon-chip"><LayoutGrid size={14} /></span> Visão geral
              </h1>
              <p className="text-sm mt-1" style={{ color: TOKENS.muted }}>Selecione um cliente na barra lateral pra editar, ou veja o resumo abaixo.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="card p-4 text-center flex flex-col items-center gap-1">
                <PlayCircle size={16} style={{ color: TOKENS.teal }} />
                <div className="text-2xl font-semibold" style={{ color: TOKENS.teal }}>{contagemStatus.active}</div>
                <div className="text-xs" style={{ color: TOKENS.muted }}>ativos</div>
              </div>
              <div className="card p-4 text-center flex flex-col items-center gap-1">
                <Clock size={16} style={{ color: TOKENS.amberDeep }} />
                <div className="text-2xl font-semibold" style={{ color: TOKENS.amberDeep }}>{contagemStatus.trial}</div>
                <div className="text-xs" style={{ color: TOKENS.muted }}>em teste</div>
              </div>
              <div className="card p-4 text-center flex flex-col items-center gap-1">
                <Ban size={16} style={{ color: TOKENS.crimson }} />
                <div className="text-2xl font-semibold" style={{ color: TOKENS.crimson }}>{contagemStatus.suspended}</div>
                <div className="text-xs" style={{ color: TOKENS.muted }}>suspensos</div>
              </div>
            </div>
            <section aria-label="Comercial"><ComercialPainel /></section>
            {precisamAtencao.length > 0 && (
              <div className="card p-4 flex flex-col gap-1">
                <h2 className="text-sm font-semibold mb-1">Precisam de atenção</h2>
                {precisamAtencao.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 border-b last:border-b-0 py-2 text-sm" style={{ borderColor: TOKENS.border }}>
                    <button onClick={() => escolherCliente(c.id)} className="text-left flex-1 flex items-center justify-between gap-2">
                      <span>{c.nomeNegocio}</span>
                      <span className="text-xs" style={{ color: c.status === "suspended" ? TOKENS.crimson : TOKENS.amberDeep }}>
                        {c.cancelAt && Date.now() - new Date(c.cancelAt).getTime() > 30 * 86400000 ? "revisar exclusão de dados" : c.status === "suspended" ? "suspenso" : `teste acaba em ${Math.max(diasRestantes(c.trialEndsAt), 0)}d`}
                      </span>
                    </button>
                    <a
                      href={gerarLinkWhats(c.numeroWhatsApp, mensagemLembreteWhats(c))}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-soft-amber text-xs px-2 py-1 shrink-0"
                      aria-label={"Lembrar " + c.nomeNegocio + " por WhatsApp"}
                    >
                      <MessageCircle size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {cliente && <div className="panel-savebar max-w-6xl mx-auto mb-5"><div><h1>{cliente.nomeNegocio || 'Novo cliente'}</h1><p role="status">{salvando ? 'Salvando suas informações…' : temAlteracoes ? 'Alterações ainda não salvas' : 'Todas as alterações salvas'}</p></div><button onClick={salvarCliente} disabled={salvando || !temAlteracoes} className="btn btn-primary px-4"><Save size={16}/>{salvando ? 'Salvando…' : 'Salvar alterações'}</button></div>}
        {cliente && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 max-w-6xl mx-auto">

            {/* -------- FORM -------- */}
            <div className="flex flex-col gap-5">

              <div className="card p-5 flex flex-col gap-4">
                <div className="flex justify-between gap-2"><h2 className="font-semibold flex items-center gap-2"><span className="icon-chip"><Building2 size={14} /></span> Identidade</h2><button className="btn btn-outline text-xs" onClick={() => {
                  const { publicId, status, trialEndsAt, paidUntil, cancelAt, legacyAccess, ...conteudo } = cliente;
                  const copia = { ...conteudo, id: novoIdCliente(), nomeNegocio: `${cliente.nomeNegocio} (cópia)` };
                  setClienteId(copia.id); setCliente(copia); setValidacao([]);
                }}>Duplicar configuração</button></div>
                <p className="text-xs" style={{ color: TOKENS.muted }}>1. Configurar e salvar → 2. Conferir as informações com o cliente → 3. Publicar e iniciar o teste.</p>
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
                    <select value={cliente.idiomaPadrao} onChange={(e) => atualizarCampo("idiomaPadrao", e.target.value)} className="rounded-lg border px-3 py-2" style={{ borderColor: TOKENS.border }}>
                      <option value="auto">Detectar automaticamente</option>
                      <option value="pt">Sempre português</option>
                      <option value="en">Sempre inglês</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="card p-5 flex flex-col gap-4">
                <h2 className="font-semibold flex items-center gap-2"><span className="icon-chip"><Globe2 size={14} /></span> Página simples (opcional)</h2>
                <p className="text-xs -mt-2" style={{ color: TOKENS.muted }}>
                  Preencha se o cliente ainda não tem site. Gera uma página própria com esses dados.
                </p>
                <CampoTexto textarea label="Sobre o negócio" value={cliente.sobreNegocio} onChange={(v) => atualizarCampo("sobreNegocio", v)} placeholder="Uma frase curta contando o que o negócio faz." />

                <div className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium">Logo ou foto (opcional)</span>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0 overflow-hidden"
                      style={{ backgroundColor: cliente.corPrimaria, color: textoSobreCor(cliente.corPrimaria) }}
                    >
                      {cliente.logoUrl
                        ? <img src={cliente.logoUrl} alt="" className="w-full h-full object-cover" />
                        : (cliente.nomeNegocio || "?").charAt(0)}
                    </div>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={enviandoLogo}
                      className="btn btn-outline text-xs px-3 py-2"
                    >
                      <Upload size={13} /> {enviandoLogo ? "Enviando..." : cliente.logoUrl ? "Trocar" : "Enviar imagem"}
                    </button>
                    {cliente.logoUrl && (
                      <button onClick={removerLogo} className="danger-action text-xs">
                        Remover
                      </button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => enviarLogo(e.target.files?.[0])}
                      className="hidden"
                    />
                  </div>
                  {erroLogo && <span className="text-xs form-error">{erroLogo}</span>}
                  <span className="text-xs" style={{ color: TOKENS.muted }}>PNG, JPG ou WEBP, até 2MB. Sem logo, a página usa a inicial do nome na cor escolhida.</span>
                </div>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Modelo de layout da página</span>
                  <select
                    value={cliente.layout || "classico"}
                    onChange={(e) => atualizarCampo("layout", e.target.value)}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: TOKENS.border }}
                  >
                    <option value="classico">Clássico — nome, sobre, horário e endereço</option>
                    <option value="cartao">Cartão de contato — bem enxuto, pra quem trabalha sozinho</option>
                    <option value="servicos">Serviços em grade — até 4 serviços em destaque</option>
                    <option value="cardapio">Cardápio — lista de item e preço</option>
                  </select>
                </label>

                {(
                  <CampoTexto label="Instagram (opcional)" value={cliente.instagramUrl || ""} onChange={(v) => atualizarCampo("instagramUrl", v)} placeholder="https://instagram.com/seunegocio" />
                )}

                {cliente.layout === "servicos" && (
                  <div className="flex flex-col gap-2">
                    <span className="font-medium text-sm">Serviços em destaque (até 4)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(cliente.servicos || ["", "", "", ""]).map((servico, i) => {
                        const item = typeof servico === 'string' ? { nome: servico } : servico;
                        return <div key={i} className="border rounded p-3 flex flex-col gap-2" style={{ borderColor: TOKENS.border }}>
                          <CampoTexto label={`Serviço ${i+1}`} value={item.nome || ''} onChange={v => atualizarServico(i,v)} />
                          <CampoTexto label="Descrição" value={item.descricao || ''} onChange={v => atualizarServico(i,v,'descricao')} />
                          <CampoTexto label="Valor aprovado (opcional)" value={item.preco || ''} onChange={v => atualizarServico(i,v,'preco')} placeholder="Ex.: A partir de R$ 80" />
                        </div>;
                      })}
                    </div>
                  </div>
                )}

                {cliente.layout === "cardapio" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Itens do cardápio</span>
                      <button onClick={adicionarItemCardapio} className="btn btn-soft-teal text-xs px-2 py-1">
                        <Plus size={12} /> Adicionar
                      </button>
                    </div>
                    {(cliente.itensCardapio || []).map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          aria-label={`Nome do item ${i+1}`} value={item.nome}
                          onChange={(e) => atualizarItemCardapio(i, "nome", e.target.value)}
                          placeholder="Nome do item"
                          className="flex-1 rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: TOKENS.border }}
                        />
                        <input
                          aria-label={`Preço do item ${i+1}`} value={item.preco}
                          onChange={(e) => atualizarItemCardapio(i, "preco", e.target.value)}
                          placeholder="R$ 0,00"
                          className="w-28 rounded-lg border px-3 py-2 text-sm"
                          style={{ borderColor: TOKENS.border }}
                        />
                        <button onClick={() => removerItemCardapio(i)} className="danger-action p-2" aria-label="Remover item">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CampoTexto label="Horário de funcionamento" value={cliente.horarioFuncionamento} onChange={(v) => atualizarCampo("horarioFuncionamento", v)} placeholder="Seg a sáb, 9h às 18h" />
                  <CampoTexto label="Endereço" value={cliente.endereco} onChange={(v) => atualizarCampo("endereco", v)} placeholder="Rua Exemplo, 123 - Curitiba/PR" />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={cliente.incluiAssistente}
                    onChange={(e) => atualizarCampo("incluiAssistente", e.target.checked)}
                  />
                  <span>
                    <span className="font-medium" style={{ color: TOKENS.ink }}>Incluir o assistente (chat) nesta página</span>
                    <br />
                    <span className="text-xs" style={{ color: TOKENS.muted }}>
                      Desmarque pro plano de entrada "Só Página" — fica só as informações e um botão de WhatsApp comum, sem o menu de chat. As visitas e os cliques da página continuam no relatório.
                    </span>
                  </span>
                </label>
              </div>

              <div className="card p-5 flex flex-col gap-4">
                <h2 className="font-semibold flex items-center gap-2"><span className="icon-chip"><MessageCircle size={14} /></span> Saudação inicial</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CampoTexto textarea label="Português" value={cliente.saudacaoPt} onChange={(v) => atualizarCampo("saudacaoPt", v)} />
                  <CampoTexto textarea label="English" value={cliente.saudacaoEn} onChange={(v) => atualizarCampo("saudacaoEn", v)} />
                </div>
              </div>

              <div className="card p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2"><span className="icon-chip"><Calendar size={14} /></span> Opções do menu</h2>
                  <button onClick={adicionarOpcao} className="btn btn-soft-teal text-sm px-3 py-1.5">
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

              <div className="card p-5">
                <button onClick={() => setMostrarAvancado(!mostrarAvancado)} className="w-full flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-2"><span className="icon-chip"><Settings2 size={14} /></span> Configurações avançadas</span>
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
                  className="btn btn-primary px-4 py-2.5"
                >
                  <Save size={16} /> {salvando ? "Salvando..." : "Salvar cliente"}
                </button>
                {avisoSalvo && <span className="text-sm flex items-center gap-1" style={{ color: TOKENS.teal }}><Check size={14} /> Salvo</span>}
                {erro && <span className="text-sm form-error">{erro}</span>}
              </div>
              {validacao.length > 0 && (
                <div role="alert" className="validation-notice rounded-lg p-3 text-sm">
                  <p className="font-semibold">Antes de salvar:</p>
                  <ul className="mt-1 list-disc pl-5">
                    {validacao.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* -------- PREVIEW + CÓDIGO -------- */}
            <div className="flex flex-col gap-5 xl:sticky xl:top-6 self-start">

              <div className="card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm flex items-center gap-2"><span className="icon-chip"><Eye size={14} /></span> Pré-visualização</h2>
                  <button
                    onClick={alternarPreviewIdioma}
                    className="btn btn-soft-teal text-xs px-2 py-1"
                  >
                    <Globe2 size={12} /> {previewIdioma === "pt" ? "EN" : "PT"}
                  </button>
                </div>

                <div className="preview-frame">
                  <div className="px-3 py-2 flex items-center gap-2 text-white" style={{ backgroundColor: cliente.corPrimaria, color: textoSobreCor(cliente.corPrimaria) }}>
                    <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center text-xs font-bold">
                      {(cliente.nomeNegocio || "?").charAt(0)}
                    </div>
                    <span className="text-xs font-semibold">{cliente.nomeNegocio}</span>
                  </div>
                  <div className="p-3 flex flex-col gap-2 preview-body" style={{ minHeight: 160, maxHeight: 260, overflowY: "auto" }}>
                    {previewMsgs.length === 0 && (
                      <button onClick={iniciarPreview} className="text-xs font-medium underline self-start" style={{ color: TOKENS.teal }}>
                        ▶ simular abertura do chat
                      </button>
                    )}
                    {previewMsgs.map((m, i) => (
                      <div key={i} className={"max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs whitespace-pre-wrap " + (m.autor === "user" ? "self-end text-white" : "self-start border")}
                        style={m.autor === "user" ? { backgroundColor: cliente.corPrimaria, color: textoSobreCor(cliente.corPrimaria) } : { borderColor: TOKENS.border, backgroundColor: TOKENS.surface }}>
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

              <div className="card p-4 flex flex-col gap-3">
                <h2 className="font-semibold text-sm flex items-center gap-2"><span className="icon-chip"><Lock size={14} /></span> Acesso do cliente</h2>
                {!cliente.publicId ? (
                  <p className="text-xs" style={{ color: TOKENS.muted }}>Salve o cliente pelo menos uma vez pra liberar o controle de teste e ativação.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          "badge text-xs px-2 py-1 " +
                          (cliente.status === "active" ? "badge-teal" : cliente.status === "suspended" ? "badge-crimson" : "badge-amber")
                        }
                      >
                        {cliente.status === "active" ? "Ativo" : cliente.status === "suspended" ? "Suspenso" : cliente.status === "draft" ? "Em preparação" : "Em teste"}
                      </span>
                      {cliente.status === "trial" && (
                        <span className="text-xs" style={{ color: TOKENS.muted }}>
                          {diasRestantes(cliente.trialEndsAt) > 0
                            ? `até ${formatarData(cliente.trialEndsAt)} (${diasRestantes(cliente.trialEndsAt)}d restantes)`
                            : `venceu em ${formatarData(cliente.trialEndsAt)}`}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {cliente.status !== "suspended" && (
                        <button onClick={() => mudarStatusCliente("suspended")} className="btn btn-soft-crimson text-xs px-2.5 py-1.5">
                          <Ban size={13} /> Suspender
                        </button>
                      )}
                      <button onClick={() => estenderTeste(14)} className="btn btn-outline text-xs px-2.5 py-1.5">
                        {cliente.status !== "trial" ? "Publicar teste de 14 dias" : "Reiniciar teste por 14 dias"}
                      </button>
                      {(cliente.status === "suspended" || (cliente.status === "trial" && diasRestantes(cliente.trialEndsAt) <= 3)) && (
                        <a
                          href={gerarLinkWhats(cliente.numeroWhatsApp, mensagemLembreteWhats(cliente))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-soft-amber text-xs px-2.5 py-1.5"
                        >
                          <MessageCircle size={13} /> Lembrar cliente por WhatsApp
                        </a>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: TOKENS.muted }}>
                      Suspenso ou com teste vencido, o widget some sozinho do site do cliente, sem precisar mexer no código dele de novo.
                    </p>
                  </>
                )}
              </div>

              <PlanoOperacao key={cliente.id} cliente={cliente} onPlano={plano => setCliente(prev => ({ ...prev, plano, incluiAssistente: plano !== 'pagina' }))} onChange={campos => {
                setCliente(prev => ({ ...prev, ...campos })); setClientes(prev => ({ ...prev, [cliente.id]: { ...prev[cliente.id], ...campos } }));
              }} />
              {cliente.publicId && <Resultados key={cliente.publicId} publicId={cliente.publicId} nome={cliente.nomeNegocio} podeGerenciar={OPERACAO_COMPLETA} />}

              <div className="card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-sm flex items-center gap-2"><span className="icon-chip"><Rocket size={14} /></span> Publicação</h2>
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
                {cliente.publicId && (cliente.sobreNegocio || cliente.endereco || cliente.horarioFuncionamento) && (
                  <div className="rounded-lg border p-3 flex flex-col gap-2" style={{ borderColor: TOKENS.border }}>
                    <span className="text-xs font-medium" style={{ color: TOKENS.ink }}>Página simples deste cliente</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/p/${cliente.publicId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 truncate text-xs underline"
                        style={{ color: TOKENS.teal }}
                      >
                        {window.location.origin}/p/{cliente.publicId}
                      </a>
                      <button onClick={copiarLinkPagina} className="btn btn-soft-teal text-xs px-2 py-1 shrink-0">
                        {paginaCopiada ? <Check size={12} /> : <Copy size={12} />} {paginaCopiada ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Cores fixas (não usam TOKENS): painel de código é sempre
                  escuro, com destaque de sintaxe pensado pra esse contraste,
                  então nem fundo, borda ou botão devem trocar com o tema. */}
              <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#1C2430" }}>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-white flex items-center gap-2"><Code2 size={14} className="opacity-70" /> Código pra colar no site</h2>
                  <button onClick={copiarCodigo} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-md" style={{ backgroundColor: copiado ? "#2F6F62" : "#B57A22", color: copiado ? "#fff" : "#1C2430" }}>
                    {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <pre className="text-[11px] leading-relaxed overflow-x-auto text-emerald-200 whitespace-pre-wrap wrap-break-word" style={{ fontFamily: "monospace" }}>
{gerarCodigo(cliente, widgetBaseUrl)}
                </pre>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  Hospede o <code>atendente-virtual-widget.js</code> em uma hospedagem que permita uso comercial e troque a URL acima. Cole essa linha única antes do <code>&lt;/body&gt;</code> do site do cliente — depois disso, ativar, suspender ou editar o conteúdo acontece só aqui no painel, sem precisar mexer no site dele de novo.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
