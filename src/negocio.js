export const MODELOS = { classico: 'Clássico', cartao: 'Cartão de contato', servicos: 'Serviços', cardapio: 'Cardápio' }
export const PRECOS = { pagina: 97, assistente: 147, completo: 197 }
export const NOMES_PLANOS = { pagina: 'Só Página', assistente: 'Assistente', completo: 'Página + Assistente' }

export function urlSegura(valor) {
  try { const u = new URL(valor); return ['https:', 'http:'].includes(u.protocol) ? u.href : null } catch { return null }
}

export function periodoMes(mes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).replace('/', '-')) {
  // Explicit numeric parts avoid locale-dependent month/year ordering.
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
    mes = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`
  }
  const [ano, numero] = mes.split('-').map(Number)
  if (numero < 1 || numero > 12) throw new Error('Mês inválido')
  return { inicio: `${mes}-01`, fim: `${mes}-${new Date(Date.UTC(ano, numero, 0)).getUTCDate()}` }
}

export function csv(linhas) {
  return '\uFEFF' + linhas.map(linha => linha.map(valor => {
    let texto = String(valor ?? '')
    if (/^[\u0000-\u0020]*[=+@\-]|^[\t\r\n]/.test(texto)) texto = "'" + texto
    return '"' + texto.replaceAll('"', '""') + '"'
  }).join(';')).join('\r\n')
}

export function baixar(conteudo, nome, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function caminhoLogo(url, ownerId, baseUrl) {
  try {
    const u = new URL(url), base = new URL(baseUrl)
    const prefixo = `/storage/v1/object/public/logos/${ownerId}/`
    if (u.origin !== base.origin || !u.pathname.startsWith(prefixo)) return null
    const caminho = decodeURIComponent(u.pathname.slice('/storage/v1/object/public/logos/'.length))
    return caminho.includes('..') ? null : caminho
  } catch { return null }
}
