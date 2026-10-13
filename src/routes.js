// Mantém as rotas de clientes e os links de autenticação antigos funcionando.
export function resolverRota({ pathname = '/', search = '', hash = '' }) {
  const caminho = pathname.replace(/\/+$/, '') || '/'
  const paginaCliente = caminho.match(/^\/p\/([^/]+)$/)
  if (paginaCliente) return { tipo: 'cliente', publicId: paginaCliente[1] }
  if (caminho === '/privacidade') return { tipo: 'privacidade' }
  if (caminho === '/demo') return { tipo: 'demo' }

  const parametros = new URLSearchParams(search)
  const fragmento = new URLSearchParams(hash.replace(/^#/, ''))
  const retornoDeLogin = parametros.has('code') || parametros.has('error_description') ||
    fragmento.has('access_token') || fragmento.has('refresh_token') || fragmento.has('error_description')

  if (caminho === '/' && !retornoDeLogin) return { tipo: 'comercial' }
  // /painel, /login e os endereços que já abriam o painel continuam no app.
  return { tipo: 'painel' }
}
