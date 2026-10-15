import React, { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Globe2, MessageCircle, Sparkles, X } from 'lucide-react'
import { CONTATO, SEGMENTOS } from './comercial'
import { MODELOS } from './negocio'
import { EXPERIENCIAS_DEMO } from './demonstracao'

export function Demonstracao({ compacto = false, segmentoInicial = 'pet', experienciaInicial = 'completo', nome = '' }) {
  const [segmento, setSegmento] = useState(segmentoInicial)
  const [modelo, setModelo] = useState('servicos')
  const [experiencia, setExperiencia] = useState(experienciaInicial)
  const [carregado, setCarregado] = useState(null)
  const frame = useRef(null)
  const chave = `${segmento}-${modelo}-${experiencia}`
  const destino = `/demo?segmento=${segmento}&modelo=${modelo}&experiencia=${experiencia}`
  function personalizar() {
    frame.current?.contentWindow?.postMessage({ type: 'pronto:demo-personalizar', nome }, window.location.origin)
  }
  useEffect(() => {
    function pronta(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || event.data?.type !== 'pronto:demo-pronta') return
      frame.current.contentWindow.postMessage({ type: 'pronto:demo-personalizar', nome }, window.location.origin)
    }
    window.addEventListener('message', pronta)
    return () => window.removeEventListener('message', pronta)
  }, [nome])
  return <div className={`pr-demo ${compacto ? 'pr-demo-compact' : ''}`} id={compacto ? undefined : 'demonstracao'}>
    {!compacto && <p className="pr-demo-heading">Veja como pode ficar o seu negócio.</p>}
    <div className="pr-demo-experiences" role="group" aria-label="O que você quer experimentar?">
      {Object.entries(EXPERIENCIAS_DEMO).map(([k,v]) => <button key={k} type="button" aria-pressed={experiencia === k} onClick={() => setExperiencia(k)}>{v.nome}</button>)}
    </div>
    {compacto ? <div className="pr-demo-choices"><label>Seu segmento<select aria-label="Segmento da demonstração" value={segmento} onChange={e => setSegmento(e.target.value)}>{Object.entries(SEGMENTOS).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}</select></label>{experiencia !== 'assistente' && <label>Modelo da página<select aria-label="Modelo da demonstração" value={modelo} onChange={e => setModelo(e.target.value)}>{Object.entries(MODELOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label>}</div> : <>
      <div className="pr-demo-tabs" role="group" aria-label="Escolha um exemplo de negócio">{Object.entries(SEGMENTOS).map(([k,v]) => <button key={k} type="button" aria-pressed={segmento === k} className={segmento === k ? 'is-selected' : ''} onClick={() => setSegmento(k)}>{v.nome}</button>)}</div>
      {experiencia !== 'assistente' && <div className="pr-demo-models"><label>Modelo da página<select value={modelo} onChange={e => setModelo(e.target.value)} aria-label="Modelo da demonstração">{Object.entries(MODELOS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>}
    </>}
    <div className="pr-browser" aria-busy={carregado !== chave}>
      <div className="pr-browser-bar"><span className="pr-browser-dots" aria-hidden="true"><i/><i/><i/></span><span>{nome || (experiencia === 'assistente' ? 'simulação no site que você já tem' : 'sua marca, sua página')}</span><Globe2 size={14} aria-hidden="true"/></div>
      {carregado !== chave && <p className="pr-demo-loading" role="status">Preparando seu exemplo…</p>}
      <iframe ref={frame} key={chave} src={`${destino}&embed=1${compacto ? '&abrir=1' : ''}`} title={`${EXPERIENCIAS_DEMO[experiencia].nome}: ${nome || SEGMENTOS[segmento].nome}`} className="pr-demo-frame" onLoad={() => { setCarregado(chave); personalizar() }}/>
    </div>
    <p className="pr-demo-caption" aria-live="polite">{EXPERIENCIAS_DEMO[experiencia].descricao}</p>
    {!compacto && <><p className="pr-demo-disclaimer">Dados fictícios. O WhatsApp fala com a Julia sobre o Prontô.</p><a className="pr-demo-expand" href={destino} target="_blank" rel="noopener noreferrer">{experiencia === 'assistente' ? 'Testar assistente em tela inteira' : 'Explorar página em tela inteira'} ↗</a><a className="pr-demo-expand" href="/demos/">Ver páginas e assistentes por segmento ↗</a></>}
  </div>
}

export function DialogoDemonstracao({ configuracao, onFechar }) {
  const dialogo = useRef(null)
  const { segmento = 'pet', experiencia = 'completo', nome = '', gatilho } = configuracao
  const mensagem = `Oi, Julia! Experimentei a prévia do Prontô${nome ? ` com o nome ${nome}` : ''}, no segmento ${SEGMENTOS[segmento].nome.toLowerCase()}. ${experiencia === 'assistente' ? 'Já tenho site e quero conhecer o assistente.' : 'Quero saber como ficaria a página do meu negócio.'}`
  useEffect(() => {
    dialogo.current.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow; if (gatilho?.isConnected) gatilho.focus() }
  }, [gatilho])
  return <dialog ref={dialogo} className="pr-site pr-demo-dialog" aria-labelledby="demo-dialog-titulo" aria-describedby="demo-dialog-descricao" onCancel={e => { e.preventDefault(); onFechar() }} onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
    <div className="pr-demo-dialog-inner">
      <header className="pr-demo-dialog-header"><div><span className="pr-tag">EXPERIMENTE AGORA</span><h2 id="demo-dialog-titulo">{nome ? `Um primeiro olhar para ${nome}.` : 'É só escolher uma pergunta.'}</h2><p id="demo-dialog-descricao">{nome ? 'Seu nome nesta ideia. Serviços e respostas ainda são ilustrativos.' : 'O assistente abre no exemplo abaixo. Teste as respostas e troque de segmento.'}</p></div><button className="pr-close-demo" type="button" aria-label="Fechar demonstração" autoFocus onClick={onFechar}><X size={21}/></button></header>
      <div className="pr-demo-dialog-content"><Demonstracao compacto segmentoInicial={segmento} experienciaInicial={experiencia} nome={nome}/><div className="pr-demo-next"><p><Check size={16} aria-hidden="true"/>Gostou da ideia? A configuração final usa as informações que você aprovar.</p><a className="pr-button pr-button-primary" href={`https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer">Quero isso no meu negócio<ArrowRight size={17} aria-hidden="true"/></a><small>Prévia ilustrativa, sem cadastro ou cobrança. O contato abre o WhatsApp da Julia.</small></div></div>
    </div>
  </dialog>
}

export function PersonalizarDemonstracao({ onAbrir }) {
  const [nome, setNome] = useState('')
  const [segmento, setSegmento] = useState('pet')
  const [temSite, setTemSite] = useState(false)
  const exemplo = SEGMENTOS[segmento]
  return <section className="pr-personalize pr-container" id="seu-negocio" aria-labelledby="titulo-seu-negocio">
    <div className="pr-personalize-copy"><p className="pr-eyebrow"><Sparkles size={16} aria-hidden="true"/>AGORA, IMAGINE NO SEU NEGÓCIO</p><h2 id="titulo-seu-negocio">Sua marca aqui.<br/><em>Seu próximo cliente ali.</em></h2><p>Você pode estar atendendo, fazendo uma entrega ou fechando o caixa. Enquanto isso, seu cliente encontra os serviços, tira uma dúvida e sabe como falar com você.</p><ul><li><Check size={16} aria-hidden="true"/>Para quem atende sozinho ou tem uma equipe pequena</li><li><Check size={16} aria-hidden="true"/>Uma página própria ou o assistente no site que você já tem</li><li><Check size={16} aria-hidden="true"/>Configuração e ajustes acompanhados de perto</li></ul></div>
    <form className="pr-personalize-form" onSubmit={e => { e.preventDefault(); if (!nome.trim()) { const input = e.currentTarget.elements.nomeNegocio; input.setCustomValidity('Digite o nome do seu negócio para ver a prévia.'); input.reportValidity(); return } onAbrir({ nome: nome.trim(), segmento, experiencia: temSite ? 'assistente' : 'completo', gatilho: e.currentTarget.querySelector('button[type="submit"]') }) }}>
      <div className="pr-brand-preview" style={{'--sample-color':exemplo.cor}} aria-live="polite"><span className="pr-brand-preview-icon" aria-hidden="true"><MessageCircle size={22}/></span><div><small>PRÉVIA COM A SUA MARCA</small><strong>{nome.trim() || 'O nome do seu negócio'}</strong><span>{exemplo.nome} · um atendimento com a sua cara</span></div></div>
      <label>Como se chama o seu negócio?<input type="text" name="nomeNegocio" placeholder="Ex.: Banho & Carinho" value={nome} onChange={e => { e.target.setCustomValidity(''); setNome(e.target.value) }} maxLength={70} required autoComplete="organization"/></label>
      <label>Qual exemplo combina mais com você?<select value={segmento} onChange={e => setSegmento(e.target.value)}>{Object.entries(SEGMENTOS).map(([k,v]) => <option key={k} value={k}>{v.nome}</option>)}</select></label>
      <fieldset><legend>Você já tem um site?</legend><label><input type="radio" name="temSite" checked={!temSite} onChange={() => setTemSite(false)}/>Ainda não tenho</label><label><input type="radio" name="temSite" checked={temSite} onChange={() => setTemSite(true)}/>Já tenho site</label></fieldset>
      <button className="pr-button pr-button-primary" type="submit">Ver uma prévia do meu negócio<ArrowRight size={17} aria-hidden="true"/></button>
      <p className="pr-personalize-note">Experimente sem cadastro. Seu nome entra na prévia; a configuração completa é feita com você.</p>
    </form>
  </section>
}
