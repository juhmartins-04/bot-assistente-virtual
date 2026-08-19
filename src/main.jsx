import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Pagina from './Pagina.jsx'
import './index.css' // Esta linha é crucial para o visual (Tailwind) funcionar!

const paginaCliente = window.location.pathname.match(/^\/p\/([^/]+)\/?$/)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {paginaCliente ? <Pagina publicId={paginaCliente[1]} /> : <App />}
  </React.StrictMode>,
)
