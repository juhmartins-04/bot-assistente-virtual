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
