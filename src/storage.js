import { supabase } from "./utils/supabase";

const TABELA = "app_storage";

/**
 * Busca um valor salvo pela chave. Retorna defaultValue se não existir
 * ou se houver erro de conexão.
 */
export async function storageGet(key, defaultValue = null) {
  const { data, error } = await supabase
    .from(TABELA)
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("storageGet erro:", error.message);
    return defaultValue;
  }

  return data ? data.value : defaultValue;
}

/**
 * Salva (cria ou atualiza) um valor pela chave.
 */
export async function storageSet(key, value) {
  const { error } = await supabase
    .from(TABELA)
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) {
    console.error("storageSet erro:", error.message);
    throw error;
  }

  return true;
}

// ---------------------------------------------------------------------
// Clientes: cada cliente é uma linha própria na tabela `clientes`, em vez
// de todos ficarem juntos num JSON único. Isso evita que duas gravações
// concorrentes se sobrescrevam por completo.
// ---------------------------------------------------------------------
const TABELA_CLIENTES = "clientes";

export async function listarClientes() {
  const { data, error } = await supabase
    .from(TABELA_CLIENTES)
    .select("id, dados")
    .order("nome_negocio", { ascending: true });

  if (error) {
    console.error("listarClientes erro:", error.message);
    throw error;
  }

  const mapa = {};
  (data || []).forEach((linha) => {
    mapa[linha.id] = { id: linha.id, ...linha.dados };
  });
  return mapa;
}

export async function salvarClienteRemoto(cliente) {
  const { id, ...dados } = cliente;
  const { error } = await supabase
    .from(TABELA_CLIENTES)
    .upsert(
      {
        id,
        nome_negocio: cliente.nomeNegocio,
        dados,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("salvarClienteRemoto erro:", error.message);
    throw error;
  }
  return true;
}

export async function excluirClienteRemoto(id) {
  const { error } = await supabase.from(TABELA_CLIENTES).delete().eq("id", id);

  if (error) {
    console.error("excluirClienteRemoto erro:", error.message);
    throw error;
  }
  return true;
}
