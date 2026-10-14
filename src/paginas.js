import { MODELOS, NOMES_PLANOS, urlSegura } from './negocio.js'

export const LIMITE_CARDAPIO = 20
export const DESCRICOES_MODELOS = {
  classico: 'Apresentação do negócio, horário, localização e contato.',
  cartao: 'Um cartão enxuto para profissionais que atendem sozinhos.',
  servicos: 'Até quatro serviços com descrição e valor aprovado.',
  cardapio: 'Até vinte itens, com descrição, categoria e preço. Pedidos seguem pelo WhatsApp.',
}
export function aplicarPlano(cliente, plano) {
  const seguro = Object.hasOwn(NOMES_PLANOS, plano) ? plano : 'completo'
  return { ...cliente, plano: seguro, incluiPagina: seguro !== 'assistente', incluiAssistente: seguro !== 'pagina' }
}
export function normalizarCliente(cliente) {
  const plano = cliente.plano || (cliente.incluiAssistente === false ? 'pagina' : 'completo')
  return aplicarPlano(cliente, plano)
}
export function validarCliente(cliente) {
  const c = normalizarCliente(cliente), erros = []
  const texto = v => String(v || '').trim()
  if (!texto(c.nomeNegocio)) erros.push('Informe o nome do estabelecimento.')
  if (!/^\d{10,15}$/.test(texto(c.numeroWhatsApp))) erros.push('Informe o WhatsApp só com dígitos, incluindo país e DDD.')
  if (!/^#[0-9a-f]{6}$/i.test(c.corPrimaria || '')) erros.push('Escolha uma cor principal válida.')
  if (c.instagramUrl && !urlSegura(c.instagramUrl)) erros.push('Informe um link http ou https para o Instagram.')
  if (c.incluiPagina && !Object.hasOwn(MODELOS, c.layout || 'classico')) erros.push('Escolha um dos modelos de página disponíveis.')
  if (c.incluiPagina && c.layout === 'cardapio') {
    if ((c.itensCardapio || []).length > LIMITE_CARDAPIO) erros.push('O cardápio inclui até vinte itens.')
    ;(c.itensCardapio || []).forEach((item, i) => {
      if (!texto(item.nome) && (texto(item.preco) || texto(item.descricao) || texto(item.categoria))) erros.push(`Item ${i + 1}: informe o nome antes de adicionar detalhes.`)
    })
  }
  if (c.incluiAssistente) {
    const opcoes = c.opcoes || []
    if (!opcoes.length) erros.push('Adicione pelo menos uma opção no menu.')
    if (opcoes.length > 5) erros.push('O plano inclui até cinco perguntas essenciais.')
    opcoes.forEach((o, i) => {
      const n = i + 1
      if (!texto(o.labelPt)) erros.push(`Opção ${n}: informe o nome em português.`)
      // Inglês opcional: o widget já usa português quando a tradução está ausente.
      if (o.tipo === 'resposta' && !texto(o.respostaPt)) erros.push(`Opção ${n}: informe a resposta em português.`)
      if (o.tipo === 'whatsapp' && !texto(o.mensagemWhatsPt)) erros.push(`Opção ${n}: informe a mensagem de WhatsApp em português.`)
      if (o.tipo === 'agenda' && !urlSegura(o.linkAgenda)) erros.push(`Opção ${n}: informe um link de agenda começando com http ou https.`)
      if (!['resposta','whatsapp','agenda'].includes(o.tipo)) erros.push(`Opção ${n}: escolha uma ação válida.`)
    })
  }
  return erros
}
export function checklistPagina(cliente, alteracoesPendentes = false) {
  const c = normalizarCliente(cliente)
  return [
    { label: 'Nome e WhatsApp preenchidos', ok: !!c.nomeNegocio?.trim() && /^\d{10,15}$/.test(c.numeroWhatsApp || '') },
    ...(c.incluiPagina ? [{ label: 'Modelo de página escolhido', ok: Object.hasOwn(MODELOS,c.layout || 'classico') }, { label: 'Apresentação do negócio preenchida', ok: !!c.sobreNegocio?.trim() }] : []),
    ...(c.incluiAssistente ? [{ label: 'Perguntas do assistente preenchidas', ok: !validarCliente(c).some(e => /Opção|menu|perguntas/.test(e)) }] : []),
    { label: 'Últimas alterações salvas no painel', ok: !!c.publicId && !alteracoesPendentes },
  ]
}
export function acessoPublicado(cliente, agora = Date.now()) {
  return cliente.status === 'active' || (cliente.status === 'trial' && new Date(cliente.trialEndsAt).getTime() > agora)
}
