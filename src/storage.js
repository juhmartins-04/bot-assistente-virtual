import { supabase } from "./utils/supabase";

const TABELA = "app_storage";

/**
 * Busca um valor salvo pela chave, escopado ao usuário logado.
 * Retorna defaultValue se não existir ou se houver erro de conexão.
 */
export async function storageGet(userId, key, defaultValue = null) {
  const { data, error } = await supabase
    .from(TABELA)
    .select("value")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("storageGet erro:", error.message);
    return defaultValue;
  }

  return data ? data.value : defaultValue;
}

/**
 * Salva (cria ou atualiza) um valor pela chave, escopado ao usuário logado.
 */
export async function storageSet(userId, key, value) {
  const { error } = await supabase
    .from(TABELA)
    .upsert(
      { user_id: userId, key, value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );

  if (error) {
    console.error("storageSet erro:", error.message);
    throw error;
  }

  return true;
}

// ---------------------------------------------------------------------
// Clientes: cada cliente é uma linha própria na tabela `clientes`, com
// RLS restringindo cada usuário aos próprios registros (auth.uid() =
// user_id). O "public_id" é o único identificador exposto ao widget no
// site do cliente; "status" e "trial_ends_at" controlam remotamente se
// o widget aparece ou não (ver supabase-schema.sql, view widget_config).
// ---------------------------------------------------------------------
const TABELA_CLIENTES = "clientes";

export async function listarClientes() {
  const { data, error } = await supabase
    .from(TABELA_CLIENTES)
    .select("id, dados, public_id, status, trial_ends_at")
    .order("nome_negocio", { ascending: true });

  if (error) {
    console.error("listarClientes erro:", error.message);
    throw error;
  }

  const mapa = {};
  (data || []).forEach((linha) => {
    mapa[linha.id] = {
      id: linha.id,
      ...linha.dados,
      publicId: linha.public_id,
      status: linha.status,
      trialEndsAt: linha.trial_ends_at,
    };
  });
  return mapa;
}

/**
 * Salva (cria ou atualiza) um cliente. Retorna os campos que só o banco
 * conhece (public_id, status, trial_ends_at) para o chamador atualizar
 * o estado local, principalmente no primeiro salvamento de um cliente novo.
 */
export async function salvarClienteRemoto(cliente, userId) {
  const { id, publicId, status, trialEndsAt, ...dados } = cliente;
  const { data, error } = await supabase
    .from(TABELA_CLIENTES)
    .upsert(
      {
        id,
        user_id: userId,
        nome_negocio: cliente.nomeNegocio,
        dados,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("public_id, status, trial_ends_at")
    .single();

  if (error) {
    console.error("salvarClienteRemoto erro:", error.message);
    throw error;
  }

  return {
    publicId: data.public_id,
    status: data.status,
    trialEndsAt: data.trial_ends_at,
  };
}

export async function excluirClienteRemoto(id) {
  const { error } = await supabase.from(TABELA_CLIENTES).delete().eq("id", id);

  if (error) {
    console.error("excluirClienteRemoto erro:", error.message);
    throw error;
  }
  return true;
}

/**
 * Ativa, suspende ou volta um cliente pro teste. É o "botão de desligar"
 * remoto: assim que o status muda, o widget instalado no site do cliente
 * para de aparecer (ou volta a aparecer) no próximo carregamento, sem
 * precisar tocar em nada no site dele.
 */
export async function atualizarStatusRemoto(id, status) {
  const { error } = await supabase
    .from(TABELA_CLIENTES)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("atualizarStatusRemoto erro:", error.message);
    throw error;
  }
  return true;
}

/**
 * Estende (ou reinicia) o período de teste em `dias` dias a partir de
 * agora, e garante que o status volte a ser "trial". Retorna a nova
 * data em ISO pro chamador atualizar o estado local.
 */
export async function estenderTesteRemoto(id, dias) {
  const trialEndsAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from(TABELA_CLIENTES)
    .update({ status: "trial", trial_ends_at: trialEndsAt, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("estenderTesteRemoto erro:", error.message);
    throw error;
  }
  return trialEndsAt;
}

// ---------------------------------------------------------------------
// Leads e eventos: o widget grava direto (chave anônima, sem login),
// restrito por RLS a clientes ativos/em teste (ver supabase-schema.sql).
// O painel só lê, filtrando pelo public_id do cliente selecionado.
// ---------------------------------------------------------------------

export async function listarLeads(publicId) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, telefone, opcao_label, criado_em")
    .eq("public_id", publicId)
    .order("criado_em", { ascending: false })
    .limit(200);

  if (error) {
    console.error("listarLeads erro:", error.message);
    throw error;
  }
  return data || [];
}

export async function buscarMetricas(publicId) {
  const { data, error } = await supabase
    .from("eventos")
    .select("tipo, opcao_label")
    .eq("public_id", publicId)
    .limit(5000);

  if (error) {
    console.error("buscarMetricas erro:", error.message);
    throw error;
  }

  const linhas = data || [];
  const aberturas = linhas.filter((e) => e.tipo === "abertura").length;
  const handoffs = linhas.filter((e) => e.tipo === "handoff_whatsapp").length;

  const cliquesPorOpcao = {};
  linhas
    .filter((e) => e.tipo === "opcao_clicada" && e.opcao_label)
    .forEach((e) => {
      cliquesPorOpcao[e.opcao_label] = (cliquesPorOpcao[e.opcao_label] || 0) + 1;
    });

  let opcaoMaisClicada = null;
  Object.entries(cliquesPorOpcao).forEach(([label, contagem]) => {
    if (!opcaoMaisClicada || contagem > opcaoMaisClicada.contagem) {
      opcaoMaisClicada = { label, contagem };
    }
  });

  return { aberturas, handoffs, opcaoMaisClicada };
}
