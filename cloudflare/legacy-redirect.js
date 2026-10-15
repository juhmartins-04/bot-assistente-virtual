// Mantém os links já compartilhados, sem aceitar um destino fornecido pelo visitante.
export default {
  fetch(request) {
    const destino = new URL(request.url)
    destino.protocol = 'https:'
    destino.hostname = 'pronto.juuhhzinha2000.workers.dev'
    destino.port = ''
    return new Response(null, {
      status: 308,
      headers: {
        Location: destino.href,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    })
  },
}
