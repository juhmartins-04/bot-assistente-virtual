import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Smartphone, Monitor } from 'lucide-react'
import BusinessPage from './BusinessPage'
import { normalizarCliente } from './paginas'
import { useTema } from './useTema'

const DOCUMENTO = '<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="previa-raiz"></div></body></html>'
export default function PreviaPagina({ cliente, onFechar }) {
  const dialog = useRef(null), frame = useRef(null)
  const [documento,setDocumento] = useState(null), [tamanho,setTamanho] = useState('celular')
  const { tema } = useTema()
  const dados = normalizarCliente(cliente)
  useEffect(() => { dialog.current.showModal() }, [])
  useEffect(() => { if (documento) documento.documentElement.dataset.theme = tema }, [documento,tema])
  function preparar() {
    const doc = frame.current.contentDocument
    if (!doc?.getElementById('previa-raiz')) return
    document.querySelectorAll('link[rel="stylesheet"],style').forEach(no => doc.head.appendChild(no.cloneNode(true)))
    doc.documentElement.dataset.theme = tema
    // A prévia usa somente a configuração local, sem public_id ou coleta.
    const bloquear = e => { if (e.target.closest('a')) e.preventDefault() }
    doc.body.addEventListener('click',bloquear)
    setDocumento(doc)
  }
  useEffect(() => {
    if (!documento || dados.incluiAssistente === false) return
    const janela = frame.current.contentWindow
    janela.ATENDENTE_CONFIG = { ...dados, capturarContato:false, abertoInicialmente:false }
    const script = documento.createElement('script')
    script.src = window.location.origin + '/atendente-virtual-widget.js'
    documento.body.appendChild(script)
    return () => { script.remove(); documento.querySelector('[data-atendente-widget]')?.remove(); delete janela.ATENDENTE_CONFIG }
  },[documento,cliente])
  return <dialog ref={dialog} className="page-preview-dialog" aria-labelledby="previa-titulo" onCancel={e=>{e.preventDefault();onFechar()}}>
    <header className="creation-header"><div><h1 id="previa-titulo">{dados.incluiPagina === false ? 'Confira o assistente antes de instalar.' : 'Confira a página antes de publicar.'}</h1><p className="creation-note">Prévia local: não registra visitas nem contatos. Links externos ficam desativados aqui.</p></div><button className="danger-action" onClick={onFechar} aria-label="Fechar prévia"><X size={20}/></button></header>
    <div className="page-preview-toolbar" role="group" aria-label="Tamanho da prévia"><button className={`btn ${tamanho==='celular'?'btn-primary':'btn-outline'}`} aria-pressed={tamanho==='celular'} onClick={()=>setTamanho('celular')}><Smartphone size={16}/>Celular</button><button className={`btn ${tamanho==='computador'?'btn-primary':'btn-outline'}`} aria-pressed={tamanho==='computador'} onClick={()=>setTamanho('computador')}><Monitor size={16}/>Computador</button></div>
    <div className="page-preview-stage"><iframe ref={frame} title={dados.incluiPagina === false ? 'Prévia do assistente em um site de exemplo' : 'Prévia da página do cliente'} srcDoc={DOCUMENTO} onLoad={preparar} style={{width:tamanho==='celular'?'360px':'100%'}}/>{documento?.getElementById('previa-raiz') && createPortal(dados.incluiPagina === false ? <main style={{padding:'32px 24px',background:'var(--canvas)',color:'var(--ink)',minHeight:'100vh'}}><p>SIMULAÇÃO DO SITE EXISTENTE</p><h1>{dados.nomeNegocio || 'Site do cliente'}</h1><p>O cliente mantém seu próprio site. Nesta prévia, abra o botão do assistente no canto da tela para conferir as perguntas e respostas.</p><p>Nenhuma página pública será criada para o plano Só Assistente.</p></main> : <BusinessPage dados={{...dados,nomeNegocio:dados.nomeNegocio||'Nome do negócio'}}/>,documento.getElementById('previa-raiz'))}</div>
  </dialog>
}
