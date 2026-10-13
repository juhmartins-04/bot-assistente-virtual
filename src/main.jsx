import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import Landing from './Landing.jsx'
import { resolverRota } from './routes'
import './index.css'

const App = lazy(() => import('./App.jsx'))
const Pagina = lazy(() => import('./Pagina.jsx'))
const Privacidade = lazy(() => import('./Privacidade.jsx'))
const DemoPage = lazy(() => import('./DemoPage.jsx'))
const rota = resolverRota(window.location)

function Conteudo() {
  if (rota.tipo === 'cliente') return <Pagina publicId={rota.publicId} />
  if (rota.tipo === 'privacidade') return <Privacidade />
  if (rota.tipo === 'demo') return <DemoPage />
  if (rota.tipo === 'painel') return <App />
  return <Landing />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<p role="status" style={{ padding: '2rem', textAlign: 'center' }}>Carregando Prontô...</p>}>
      <Conteudo />
    </Suspense>
  </React.StrictMode>,
)
