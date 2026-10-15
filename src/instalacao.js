const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function urlSite(valor) {
  try {
    const u = new URL(String(valor || '').trim())
    if (u.protocol !== 'https:' || u.username || u.password) return null
    return u.href
  } catch { return null }
}

export function origemWidget(valor) {
  const site = urlSite(valor)
  if (!site) return null
  const u = new URL(site)
  if (u.pathname !== '/' || u.search || u.hash) return null
  return u.origin
}

export function gerarCodigo(cliente, base) {
  if (!UUID.test(cliente?.publicId || '')) return '<!-- Salve o cliente para gerar o código de instalação. -->'
  const origem = origemWidget(base)
  if (!origem) return '<!-- Informe a origem HTTPS do Prontô, sem caminho, parâmetros ou credenciais. -->'
  return `<script src="${origem}/atendente-virtual-widget.js" data-site="${cliente.publicId}" defer></script>`
}

export function validarPublicacao(cliente) {
  if (cliente.plano !== 'assistente') return []
  const i = cliente.instalacao || {}, erros = []
  if (!urlSite(i.siteUrl)) erros.push('Informe o endereço HTTPS do site que receberá o assistente.')
  if (!i.autorizada) erros.push('Confirme a autorização para instalar no site do cliente.')
  if (!i.conteudoAprovado) erros.push('Confirme que o cliente aprovou as respostas do assistente.')
  return erros
}

export function checklistInstalacao(cliente) {
  const i = cliente.instalacao || {}
  return [
    { label: 'Site de destino informado', ok: !!urlSite(i.siteUrl) },
    { label: 'Responsável autorizou a instalação', ok: i.autorizada === true },
    { label: 'Cliente aprovou as respostas', ok: i.conteudoAprovado === true },
    { label: 'Instalação conferida no celular e computador', ok: i.verificada === true },
  ]
}
