import React from 'react'

// Uma falha de rede ou de atualização de chunks precisa de uma saída visível.
export default class ErroCarregamento extends React.Component {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() {
    if (this.state.falhou) return <main className="min-h-screen p-6 flex items-center justify-center"><div className="card p-6 max-w-md text-center"><h1 className="text-xl font-semibold">Vamos carregar de novo?</h1><p role="alert" className="mt-3" style={{color:'var(--muted)'}}>Não foi possível abrir esta página. Confira sua conexão e recarregue para buscar a versão atual.</p><button className="btn btn-primary mt-5" onClick={() => window.location.reload()}>Recarregar página</button><a href="/" className="btn btn-outline mt-3 ml-2">Voltar ao Prontô</a></div></main>
    return this.props.children
  }
}
