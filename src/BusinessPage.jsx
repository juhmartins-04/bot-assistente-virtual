import React from 'react'
import { Clock3, MapPin, Instagram, ArrowUpRight, MessageCircle, Sparkles } from 'lucide-react'
import { urlSegura } from './negocio'
import './business.css'
import { textoSobreCor } from './cores'
import BotaoTema from './BotaoTema'
import { useTema } from './useTema'

export default function BusinessPage({ dados, demonstracao = false, onWhatsApp }) {
  const { tema, alternar } = useTema()
  const layout = dados.layout || 'classico'
  const cor = /^#[0-9a-f]{6}$/i.test(dados.corPrimaria || '') ? dados.corPrimaria : '#386951'
  const whats = /^\d{10,15}$/.test(dados.numeroWhatsApp || '') ? `https://wa.me/${dados.numeroWhatsApp}?text=${encodeURIComponent(dados.transferirMensagemWhatsPt || '')}` : null
  const servicos = (dados.servicos || []).map(s => typeof s === 'string' ? { nome: s } : s).filter(s => s?.nome?.trim())
  const itens = (dados.itensCardapio || []).filter(i => i?.nome?.trim())
  const instagram = urlSegura(dados.instagramUrl)
  return (
    <div className={`biz-page biz-${layout}`} style={{ '--biz-color': cor, '--biz-on-brand': textoSobreCor(cor) }}>
      <a className="biz-skip" href="#negocio">Pular para o negócio</a>
      <header className="biz-top"><a href="/" aria-label="Prontô"><Sparkles size={16} />Prontô.</a><div className="biz-top-actions"><span>{demonstracao ? 'DEMONSTRAÇÃO · DADOS FICTÍCIOS' : 'INFORMAÇÕES DO NEGÓCIO'}</span><BotaoTema tema={tema} alternar={alternar} /></div></header>
      <main id="negocio" className="biz-content">
        <section className="biz-hero">
          <div className="biz-avatar">{urlSegura(dados.logoUrl) ? <img src={dados.logoUrl} alt={`Marca de ${dados.nomeNegocio}`} width="112" height="112" /> : <span>{(dados.nomeNegocio || '?').slice(0, 1)}</span>}</div>
          <p className="biz-eyebrow">{dados.categoriaNegocio || 'BEM-VINDO AO NOSSO ESPAÇO'}</p>
          <h1>{dados.nomeNegocio}</h1>
          {dados.sobreNegocio && <p className="biz-about">{dados.sobreNegocio}</p>}
          {whats && <a className="biz-cta" href={whats} target="_blank" rel="noopener noreferrer" onClick={onWhatsApp}><MessageCircle size={19} />{demonstracao ? 'Quero uma página assim' : 'Conversar no WhatsApp'}<ArrowUpRight size={18} /></a>}
          {demonstracao && <p className="biz-caption">O contato deste exemplo fala com a Julia sobre o Prontô.</p>}
        </section>
        {layout === 'servicos' && servicos.length > 0 && <section className="biz-section"><p className="biz-eyebrow">O QUE FAZEMOS</p><h2>Cuidado em cada detalhe.</h2><div className="biz-service-grid">{servicos.map((s, i) => <article key={i}><span className="biz-number">0{i + 1}</span><h3>{s.nome}</h3>{s.descricao && <p>{s.descricao}</p>}{s.preco && <strong>{s.preco}</strong>}</article>)}</div></section>}
        {layout === 'cardapio' && itens.length > 0 && <section className="biz-section"><p className="biz-eyebrow">FEITO PARA VOCÊ</p><h2>Nosso cardápio.</h2><div className="biz-menu">{itens.map((item, i) => <article key={i}><div>{item.categoria && <small>{item.categoria}</small>}<h3>{item.nome}</h3>{item.descricao && <p>{item.descricao}</p>}</div>{item.preco && <strong>{item.preco}</strong>}</article>)}</div></section>}
        {(dados.horarioFuncionamento || dados.endereco || instagram) && <section className="biz-info" aria-label="Informações e contato">
          {dados.horarioFuncionamento && <div><Clock3 size={20} /><div><h2>Quando estamos por aqui</h2><p>{dados.horarioFuncionamento}</p></div></div>}
          {dados.endereco && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dados.endereco)}`} target="_blank" rel="noopener noreferrer"><MapPin size={20} /><div><h2>Venha nos conhecer</h2><p>{dados.endereco}</p><span>Ver no mapa ↗</span></div></a>}
          {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer"><Instagram size={20} /><div><h2>Acompanhe nosso dia a dia</h2><span>Conhecer o Instagram ↗</span></div></a>}
        </section>}
        {dados.incluiAssistente !== false && <div className="biz-assistant-note"><Sparkles size={18} /><p>Dúvidas sobre o negócio?<br /><strong>Abra o assistente no canto da página.</strong></p></div>}
      </main>
      <footer className="biz-footer"><span>{dados.nomeNegocio}</span><a href={`/privacidade${dados.publicId ? `?negocio=${encodeURIComponent(dados.publicId)}` : ''}`}>Privacidade</a><a href="/">Feito com Prontô ↗</a></footer>
    </div>
  )
}
