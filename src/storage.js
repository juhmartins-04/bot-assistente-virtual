import { normalizarCliente } from "./paginas";
import { OPERACAO_COMPLETA } from './operacao';
import { periodoMes, caminhoLogo, baixar } from "./negocio";
import { supabase } from "./utils/supabase";

const TABELA = "account_config";

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
    throw error;
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
    .select(OPERACAO_COMPLETA ? "id, dados, public_id, status, operational_state, trial_ends_at, plano, paid_until, cancel_at, legacy_access" : "id,dados,public_id,status,trial_ends_at")
    .order("nome_negocio", { ascending: true });

  if (error) {
    console.error("listarClientes erro:", error.message);
    throw error;
  }

  const financeiro = OPERACAO_COMPLETA ? [] : await listarRegistrosSolo("pagamento:");
  const mapa = {};
  (data || []).forEach((linha) => {
    mapa[linha.id] = normalizarCliente({
      id: linha.id,
      ...linha.dados,
      publicId: linha.public_id,
      status: linha.operational_state || linha.status,
      trialEndsAt: linha.trial_ends_at,
      plano: linha.plano || linha.dados.plano || (linha.dados.incluiAssistente === false ? "pagina" : "completo"), paidUntil: linha.paid_until || financeiro.filter(r => r.clienteId === linha.id).map(r => r.validoAte).sort().at(-1), cancelAt: linha.cancel_at, legacyAccess: linha.legacy_access || (!linha.operational_state && linha.status === "active"),
    });
  });
  return mapa;
}

/**
 * Salva (cria ou atualiza) um cliente. Retorna os campos que só o banco
 * conhece (public_id, status, trial_ends_at) para o chamador atualizar
 * o estado local, principalmente no primeiro salvamento de um cliente novo.
 */
export async function salvarClienteRemoto(cliente, userId) {
  const { id, publicId, status, trialEndsAt, plano, paidUntil, cancelAt, legacyAccess, ...dados } = normalizarCliente(cliente);
  if (!OPERACAO_COMPLETA) { dados.plano = plano || (dados.incluiAssistente === false ? 'pagina' : 'completo'); dados.incluiPagina = dados.plano !== 'assistente'; dados.incluiAssistente = dados.plano !== 'pagina'; }
  const { data: anterior, error: erroAnterior } = await supabase.from(TABELA_CLIENTES).select(OPERACAO_COMPLETA ? 'dados,operational_state' : 'dados').eq('id',id).maybeSingle();
  if (erroAnterior) throw erroAnterior;
  const { data, error } = await supabase
    .from(TABELA_CLIENTES)
    .upsert(
      {
        id,
        user_id: userId,
        ...(!anterior ? { status: "suspended", ...(OPERACAO_COMPLETA ? { operational_state: "draft" } : {}) } : {}),
        nome_negocio: cliente.nomeNegocio,
        dados,
        ...(OPERACAO_COMPLETA ? { plano: plano || (dados.incluiAssistente === false ? "pagina" : "completo") } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select(OPERACAO_COMPLETA ? "public_id,status,operational_state,trial_ends_at" : "public_id,status,trial_ends_at")
    .single();

  if (error) {
    console.error("salvarClienteRemoto erro:", error.message);
    throw error;
  }

  if (anterior?.dados?.logoUrl && anterior.dados.logoUrl !== dados.logoUrl) {
    const base = import.meta.env.VITE_SUPABASE_URL || 'https://rnlgvlmwwncfrfywszaf.supabase.co';
    const antigo = caminhoLogo(anterior.dados.logoUrl, userId, base);
    const { data: referencias, error: erroReferencias } = await supabase.from(TABELA_CLIENTES).select('id').eq('dados->>logoUrl',anterior.dados.logoUrl).limit(1);
    if (antigo && !erroReferencias && !referencias.length) {
      const { error: erroLogo } = await supabase.storage.from('logos').remove([antigo]);
      if (erroLogo) console.warn('Prontô: logo antigo não removido.');
    }
  }
  return {
    publicId: data.public_id,
    status: data.operational_state || data.status,
    trialEndsAt: data.trial_ends_at,
  };
}

export async function excluirClienteRemoto(id) {
  if (!OPERACAO_COMPLETA) throw new Error("Exclusão de negócios indisponível. Suspenda o acesso para preservar o histórico.");
  const { data: alvo, error: erroAlvo } = await supabase.from(TABELA_CLIENTES).select('dados,user_id').eq('id',id).single();
  if (erroAlvo) throw erroAlvo;
  const base = import.meta.env.VITE_SUPABASE_URL || 'https://rnlgvlmwwncfrfywszaf.supabase.co';
  const logo = caminhoLogo(alvo.dados.logoUrl, alvo.user_id, base);
  const { error } = await supabase.from(TABELA_CLIENTES).delete().eq("id", id)
    .select("id")
    .single();

  if (error) {
    console.error("excluirClienteRemoto erro:", error.message);
    throw error;
  }
  let avisoLogo = null;
  const { data: referencias, error: erroReferencias } = await supabase.from(TABELA_CLIENTES).select('id').eq('dados->>logoUrl',alvo.dados.logoUrl).limit(1);
  if (logo && !erroReferencias && !referencias.length) {
    const { error: erroLogo } = await supabase.storage.from('logos').remove([logo]);
    if (erroLogo) avisoLogo = 'Cliente excluído; a imagem precisa ser removida no armazenamento.';
  }
  return { avisoLogo };
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
    .update({ status, ...(OPERACAO_COMPLETA ? { operational_state: status } : {}), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

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
    .update({ status: "trial", ...(OPERACAO_COMPLETA ? { operational_state: "trial" } : {}), trial_ends_at: trialEndsAt, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();

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

export async function listarLeads(publicId, { offset = 0, tamanho = 50 } = {}) {
  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, telefone, opcao_label, criado_em, nota, status_atendimento")
    .eq("public_id", publicId)
    .order("criado_em", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + tamanho - 1);

  if (error) {
    console.error("listarLeads erro:", error.message);
    throw error;
  }
  return data || [];
}

/**
 * Salva a nota e o status de atendimento de um lead (o que foi combinado
 * ou resolvido na conversa) — nunca o conteúdo da conversa em si. Funciona
 * tanto pro dono quanto pra um colaborador atribuído ao cliente do lead.
 */
export async function atualizarNotaLead(leadId, nota, statusAtendimento) {
  const { error } = await supabase
    .from("leads")
    .update({ nota, status_atendimento: statusAtendimento })
    .eq("id", leadId);

  if (error) {
    console.error("atualizarNotaLead erro:", error.message);
    throw error;
  }
  return true;
}

export async function buscarMetricas(publicId, periodo = periodoMes()) {
  const { data, error } = await supabase.rpc("relatorio_periodo", { p_public_id: publicId, p_inicio: periodo.inicio, p_fim: periodo.fim });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Colaboradores: acesso restrito pra quando a dona terceirizar ajuda de
// atendimento. Um colaborador só vê os clientes atribuídos a ele (nunca
// a lista inteira, nunca a configuração de menu/WhatsApp — só nome e
// public_id, via a view colaborador_clientes_view) e só escreve a
// nota/status de um lead. Nunca edita cliente, muda status/plano, exclui
// ou convida outra pessoa — isso é reforçado pela RLS, não só pela UI.
// ---------------------------------------------------------------------

export async function convidarColaborador(donoId, email) {
  const { data, error } = await supabase
    .from("colaboradores")
    .insert({ dono_id: donoId, email: email.trim().toLowerCase() })
    .select("id, email, colaborador_id, aceito_em")
    .single();

  if (error) {
    console.error("convidarColaborador erro:", error.message);
    throw error;
  }
  return data;
}

export async function listarColaboradores(donoId) {
  const { data, error } = await supabase
    .from("colaboradores")
    .select("id, email, colaborador_id, aceito_em, colaborador_clientes(cliente_id)")
    .eq("dono_id", donoId)
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("listarColaboradores erro:", error.message);
    throw error;
  }

  return (data || []).map((c) => ({
    id: c.id,
    email: c.email,
    aceito: !!c.colaborador_id,
    clienteIds: (c.colaborador_clientes || []).map((cc) => cc.cliente_id),
  }));
}

export async function atribuirClienteColaborador(colaboradorRowId, clienteId) {
  const { error } = await supabase
    .from("colaborador_clientes")
    .insert({ colaborador_row_id: colaboradorRowId, cliente_id: clienteId });

  if (error) {
    console.error("atribuirClienteColaborador erro:", error.message);
    throw error;
  }
  return true;
}

export async function removerAtribuicaoColaborador(colaboradorRowId, clienteId) {
  const { error } = await supabase
    .from("colaborador_clientes")
    .delete()
    .eq("colaborador_row_id", colaboradorRowId)
    .eq("cliente_id", clienteId);

  if (error) {
    console.error("removerAtribuicaoColaborador erro:", error.message);
    throw error;
  }
  return true;
}

export async function removerColaborador(colaboradorRowId) {
  const { error } = await supabase.from("colaboradores").delete().eq("id", colaboradorRowId);

  if (error) {
    console.error("removerColaborador erro:", error.message);
    throw error;
  }
  return true;
}

/**
 * Roda logo após o login: se existir um convite pendente com o mesmo
 * e-mail da sessão atual, associa esse convite ao usuário logado (aceita
 * o convite). Retorna true se a sessão tem (ou passou a ter) acesso como
 * colaborador de alguém — nesse caso o app mostra o painel reduzido.
 */
export async function verificarESolicitarAcessoColaborador(userId) {
  if (!OPERACAO_COMPLETA) {
    const { data: dono, error } = await supabase.from("clientes").select("id").eq("user_id",userId).limit(1);
    if (error) throw error;
    if (dono.length) return false;
    const { data: staff, error: staffError } = await supabase.from("colaboradores").select("id").eq("colaborador_id",userId).limit(1);
    if (staffError) throw staffError;
    return staff.length ? true : "cliente";
  }
  const { error: aceitarErro } = await supabase.rpc("aceitar_acessos");
  if (aceitarErro) throw aceitarErro;
  const { data: operador, error } = await supabase.from("operadores").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (operador) return false;
  const { data: aceito, error: colabErro } = await supabase.from("colaboradores").select("id").eq("colaborador_id", userId).limit(1).maybeSingle();
  if (colabErro) throw colabErro;
  return aceito ? true : "cliente";
}

export async function listarClientesAtribuidos() {
  const { data, error } = await supabase
    .from("colaborador_clientes_view")
    .select("id, nome_negocio, public_id")
    .order("nome_negocio", { ascending: true });

  if (error) {
    console.error("listarClientesAtribuidos erro:", error.message);
    throw error;
  }
  return data || [];
}

export async function corrigirContato(id, nome, telefone) {
 const { error } = await supabase.rpc('corrigir_contato', { p_id: id, p_nome: nome, p_telefone: telefone }); if (error) throw error;
}
export async function excluirContato(id) {
 const { error } = await supabase.from('leads').delete().eq('id', id); if (error) throw error;
}
export async function exportarBackupOperacional() {
 let data;
 if (OPERACAO_COMPLETA) { const r = await supabase.rpc('backup_operacional'); if (r.error) throw r.error; data = r.data; }
 else {
  const { data: auth, error } = await supabase.auth.getUser(); if (error || !auth.user) throw error || new Error('Login necessário');
  const [clientes,leads,eventos,paginaEventos,configuracoes,colaboradores,atribuicoes] = await Promise.all(['clientes','leads','eventos','pagina_eventos','account_config','colaboradores','colaborador_clientes'].map(t => lerTodasLinhas(t)));
  const proprios=clientes.filter(c=>c.user_id===auth.user.id),ids=new Set(proprios.map(c=>c.id)),pubs=new Set(proprios.map(c=>c.public_id));
  data={versao:2,ownerId:auth.user.id,exportadoEm:new Date().toISOString(),modo:'solo',clientes:proprios,leads:leads.filter(l=>pubs.has(l.public_id)),eventos:eventos.filter(l=>pubs.has(l.public_id)),paginaEventos:paginaEventos.filter(l=>pubs.has(l.public_id)),configuracoes,colaboradores:colaboradores.filter(c=>c.dono_id===auth.user.id),atribuicoes:atribuicoes.filter(a=>ids.has(a.cliente_id)),restauracaoAutomatica:false};
 }
 const { data: sessao } = await supabase.auth.getSession();
 const ownerId = sessao.session.user.id;
 const base = import.meta.env.VITE_SUPABASE_URL || 'https://rnlgvlmwwncfrfywszaf.supabase.co';
 data.logos = [];
 for (const c of data.clientes) {
  const caminho = caminhoLogo(c.dados.logoUrl, ownerId, base);
  if (!caminho) continue;
  const { data: imagem, error: erroLogo } = await supabase.storage.from('logos').download(caminho);
  if (erroLogo) throw new Error('Logo indisponível. O backup não foi concluído.');
  const base64 = await new Promise((resolve, reject) => { const leitor = new FileReader(); leitor.onload = () => resolve(leitor.result); leitor.onerror = reject; leitor.readAsDataURL(imagem); });
  data.logos.push({ clienteId: c.id, caminho, base64 });
 }
 baixar(JSON.stringify(data, null, 2), `pronto-backup-operacional-${new Date().toISOString().slice(0,10)}.json`);
}
export async function restaurarBackupOperacional(backup) {
 if (!OPERACAO_COMPLETA) throw new Error("Restauração automática ainda não habilitada. Preserve o arquivo e solicite revisão técnica.");
 const { data: sessao } = await supabase.auth.getSession();
 if (backup.versao !== 2 || backup.ownerId !== sessao.session.user.id) throw new Error('Backup de outra conta ou versão incompatível.');
 const existentes = await listarClientes(); const enviados = [];
 try {
  for (const logo of backup.logos || []) {
   if (existentes[logo.clienteId]) continue;
   if (!/^data:image\/(png|jpeg|webp);base64,/.test(logo.base64) || logo.base64.length > 3000000) throw new Error('Logo inválido.');
   const imagem = await (await fetch(logo.base64)).blob();
   const extensao = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[imagem.type];
   const caminho = `${backup.ownerId}/restore-${crypto.randomUUID()}.${extensao}`;
   const { error } = await supabase.storage.from('logos').upload(caminho, imagem); if (error) throw error;
   enviados.push(caminho);
   const cliente = backup.clientes.find(c => c.id === logo.clienteId);
   if (cliente) cliente.dados.logoUrl = supabase.storage.from('logos').getPublicUrl(caminho).data.publicUrl;
  }
  const { data, error } = await supabase.rpc('restaurar_backup', { p_backup: backup }); if (error) throw error;
  return data;
 } catch (error) { if (enviados.length) await supabase.storage.from('logos').remove(enviados); throw error; }
}

// Rows use the already deployed, owner-scoped account_config table. No financial
// records are copied into the public widget JSON. The solo edition has manual
// renewal/suspension; it does not claim server-side subscription automation.
export async function lerTodasLinhas(tabela) {
 const linhas=[];
 for(let offset=0;;offset+=500){const {data,error}=await supabase.from(tabela).select('*').order(tabela==='account_config'?'key':tabela==='colaborador_clientes'?'cliente_id':'id').range(offset,offset+499);if(error)throw error;linhas.push(...data);if(data.length<500)return linhas;}
}
export async function listarRegistrosSolo(prefixo) {
 const linhas=await lerTodasLinhas('account_config');
 return linhas.filter(l=>l.key.startsWith(prefixo)).map(l=>({...JSON.parse(l.value),_key:l.key}));
}
export async function salvarRegistroSolo(key,valor,{novo=false}={}) {
 const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw error||new Error('Login necessário');
 if(novo){const r=await supabase.from('account_config').insert({user_id:data.user.id,key,value:JSON.stringify(valor)});if(r.error)throw r.error;}
 else await storageSet(data.user.id,key,JSON.stringify(valor));
}
export async function removerRegistroSolo(key) {
 const {error}=await supabase.from('account_config').delete().eq('key',key);if(error)throw error;
}
