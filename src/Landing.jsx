import React, { useState } from 'react'
import { ArrowRight, Check, Clock3, Globe2, MessageCircle, Play, Sparkles } from 'lucide-react'
import { CONTATO, linkComercial, PLANOS, SEGMENTOS } from './comercial'
import './landing.css'

const PERGUNTAS = [
  ['Preciso ter um site?', 'Você pode instalar o assistente no site que já tem ou escolher uma página própria do Prontô, com as informações do seu negócio.'],
  ['Como funciona o teste de 14 dias?', 'Você conversa comigo, definimos as informações do negócio e eu preparo a configuração. O teste começa com o Prontô disponível para você experimentar. Depois, você decide se quer continuar no plano escolhido.'],
  ['Ele responde dentro do WhatsApp?', 'As respostas automáticas aparecem no site ou na página do Prontô. Quando o cliente quer conversar, ele abre o seu WhatsApp com uma mensagem pronta e você segue o atendimento por lá.'],
  ['As respostas são feitas por inteligência artificial?', 'O menu usa respostas que você aprova: horários, serviços, valores e outras dúvidas frequentes. Você sabe exatamente quais informações serão mostradas.'],
  ['Preciso entender de tecnologia?', 'Eu cuido da configuração e da instalação. Você me conta sobre seu negócio e aprova as informações antes de começar.'],
  ['O que está incluído nas atualizações?', 'Atualizações das informações e das respostas do seu negócio. Mudanças no visual, novas funcionalidades e serviços adicionais são combinados à parte.'],
  ['Posso cancelar quando quiser?', 'Sim. Os planos são mensais, sem fidelidade e sem multa de cancelamento.'],
]

function BotaoContato({ children = 'Quero testar por 14 dias', plano, secundario = false }) {
  return (
    <a className={`pr-button ${secundario ? 'pr-button-outline' : 'pr-button-primary'}`}
      href={linkComercial(plano)} target="_blank" rel="noopener noreferrer">
      {children}<ArrowRight size={17} aria-hidden="true" />
    </a>
  )
}

function Demonstracao() {
  const [segmento, setSegmento] = useState('beleza')
  return (
    <div className="pr-demo" id="demonstracao">
      <div className="pr-demo-tabs" role="group" aria-label="Escolha um exemplo de negócio">
        {Object.entries(SEGMENTOS).map(([chave, dados]) => (
          <button key={chave} type="button" aria-pressed={segmento === chave}
            className={segmento === chave ? 'is-selected' : ''} onClick={() => setSegmento(chave)}>
            {dados.nome}
          </button>
        ))}
      </div>
      <div className="pr-browser">
        <div className="pr-browser-bar">
          <span className="pr-browser-dots" aria-hidden="true"><i /><i /><i /></span>
          <span>seunegocio.com.br</span>
          <Globe2 size={14} aria-hidden="true" />
        </div>
        <iframe key={segmento} src={`/demo?segmento=${segmento}&embed=1`}
          title={`Experimente o assistente: ${SEGMENTOS[segmento].nome}`} className="pr-demo-frame" />
      </div>
      <div className="pr-demo-caption"><span className="pr-status-dot" />Demonstração interativa · negócios fictícios</div>
      <p className="pr-demo-disclaimer">O WhatsApp da demonstração fala com a Julia sobre o Prontô.</p>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="pr-site">
      <a className="pr-skip" href="#conteudo">Pular para o conteúdo</a>
      <header className="pr-header pr-container">
        <a href="/" className="pr-brand" aria-label="Prontô, página inicial"><span className="pr-brand-icon"><Sparkles size={20} /></span>Prontô<span className="pr-brand-dot">.</span></a>
        <nav className="pr-nav" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#planos">Planos</a>
          <a href="/painel" className="pr-panel-link">Acessar painel<ArrowRight size={14} aria-hidden="true" /></a>
        </nav>
      </header>

      <main id="conteudo">
        <section className="pr-hero pr-container" aria-labelledby="titulo-principal">
          <div className="pr-hero-copy">
            <p className="pr-eyebrow"><span className="pr-small-line" />ATENDIMENTO DIGITAL SIMPLES</p>
            <h1 id="titulo-principal">Seu negócio<br />continua respondendo.<br /><em>Mesmo quando<br className="pr-desktop-break" /> você para.</em></h1>
            <p className="pr-lead">As dúvidas mais comuns respondidas na hora, no seu site. E quem quer conversar vai direto para o seu WhatsApp.</p>
            <div className="pr-hero-actions">
              <BotaoContato />
              <a className="pr-play-link" href="#demonstracao"><Play size={14} fill="currentColor" aria-hidden="true" />Veja funcionar</a>
            </div>
            <p className="pr-micro"><Check size={14} aria-hidden="true" />Sem taxa de adesão. Sem fidelidade.</p>
            <div className="pr-founder-note"><span className="pr-avatar">JM</span><p>Feito por Julia, em Curitiba.<br /><strong>Eu configuro. Você cuida do seu negócio.</strong></p></div>
          </div>
          <Demonstracao />
        </section>

        <div className="pr-benefits pr-container">
          <div><Clock3 size={21} aria-hidden="true" /><p><strong>Respostas a qualquer hora</strong><span>Mesmo fora do expediente</span></p></div>
          <div><Sparkles size={21} aria-hidden="true" /><p><strong>Com a cara da sua marca</strong><span>Seu nome, suas cores, suas respostas</span></p></div>
          <div><MessageCircle size={21} aria-hidden="true" /><p><strong>Seu WhatsApp de sempre</strong><span>Uma conversa que continua com você</span></p></div>
        </div>

        <section className="pr-section pr-container" id="como-funciona" aria-labelledby="titulo-como">
          <div className="pr-section-heading"><p className="pr-eyebrow">PEQUENO NO SITE. ÚTIL NA ROTINA.</p><h2 id="titulo-como">Da dúvida à conversa,<br /><em>em poucos cliques.</em></h2><p>O cliente encontra o que precisa. Você recebe a conversa com mais contexto.</p></div>
          <ol className="pr-steps">
            <li><span className="pr-step-number">01</span><h3>Ele abre o assistente</h3><p>Um botão discreto no site convida seu cliente a tirar uma dúvida.</p></li>
            <li><span className="pr-step-number">02</span><h3>Escolhe o que precisa</h3><p>Horários, serviços, valores ou agendamento. O menu é feito para o seu negócio.</p></li>
            <li><span className="pr-step-number">03</span><h3>Encontra o próximo passo</h3><p>Recebe uma resposta, abre sua agenda ou vai ao WhatsApp com uma mensagem pronta.</p></li>
          </ol>
        </section>

        <section className="pr-fit pr-container" aria-labelledby="titulo-fit">
          <div><p className="pr-eyebrow">DO JEITO QUE VOCÊ PRECISA</p><h2 id="titulo-fit">Já tem site?<br /><em>Ainda não tem?</em></h2></div>
          <div className="pr-fit-options">
            <article><span className="pr-tag">JÁ TENHO SITE</span><h3>Mais atendimento no que já existe.</h3><p>Eu instalo o Prontô no seu site e configuro as perguntas que seus clientes costumam fazer.</p><a href={linkComercial('Assistente (R$ 147/mês)')} target="_blank" rel="noopener noreferrer">Quero o assistente<ArrowRight size={16} aria-hidden="true" /></a></article>
            <article><span className="pr-tag">PRECISO DE UMA PÁGINA</span><h3>Um endereço próprio para o seu negócio.</h3><p>Uma página com sua marca, serviços e contato. Você pode incluir o assistente para completar a experiência.</p><a href="#planos">Ver os planos com página<ArrowRight size={16} aria-hidden="true" /></a></article>
          </div>
        </section>

        <section className="pr-section pr-pricing pr-container" id="planos" aria-labelledby="titulo-planos">
          <div className="pr-section-heading"><p className="pr-eyebrow">INVESTIMENTO SEM COMPLICAÇÃO</p><h2 id="titulo-planos">Escolha o que faz sentido<br /><em>para o seu momento.</em></h2><p>Mensalidade clara, configuração incluída e uma pessoa de verdade para ajudar.</p></div>
          <div className="pr-price-grid">
            {PLANOS.map((plano) => (
              <article key={plano.nome} className={`pr-price-card ${plano.destaque ? 'is-featured' : ''}`}>
                {plano.destaque && <span className="pr-recommended">PARA COMEÇAR COMPLETO</span>}
                <h3>{plano.nome}</h3><p className="pr-price-description">{plano.descricao}</p>
                <p className="pr-price"><span>R$</span> {plano.preco}<small>/mês</small></p>
                <ul>{plano.itens.map((item) => <li key={item}><Check size={16} aria-hidden="true" />{item}</li>)}</ul>
                <BotaoContato plano={`${plano.nome} (R$ ${plano.preco}/mês)`} secundario={!plano.destaque}>Quero este plano</BotaoContato>
                <p className="pr-price-footnote">Sem taxa de adesão</p>
              </article>
            ))}
          </div>
          <p className="pr-pricing-note">Precisa de acompanhamento humano no atendimento? A gente combina o escopo e o valor à parte.</p>
        </section>

        <section className="pr-faq pr-container" aria-labelledby="titulo-duvidas">
          <div className="pr-section-heading"><p className="pr-eyebrow">PODE PERGUNTAR</p><h2 id="titulo-duvidas">Antes de começar,<br /><em>vamos tirar as dúvidas.</em></h2><a className="pr-text-link" href={linkComercial()} target="_blank" rel="noopener noreferrer">Prefiro conversar com a Julia<ArrowRight size={16} aria-hidden="true" /></a></div>
          <div className="pr-faq-items">{PERGUNTAS.map(([pergunta, resposta]) => <details key={pergunta}><summary>{pergunta}<span aria-hidden="true">+</span></summary><p>{resposta}</p></details>)}</div>
        </section>

        <section className="pr-final-cta pr-container" aria-labelledby="titulo-teste"><div><p className="pr-eyebrow">PRONTÔ PARA O PRÓXIMO PASSO?</p><h2 id="titulo-teste">Seu atendimento<br />pode começar aqui.</h2><p>Me conte sobre o seu negócio. Eu te mostro como o Prontô pode ajudar.</p></div><div><BotaoContato /><p className="pr-cta-note">Configuração comigo. Teste no seu ritmo.</p></div></section>
      </main>
      <footer className="pr-footer pr-container"><a href="/" className="pr-brand">Prontô<span className="pr-brand-dot">.</span></a><p>Atendimento digital simples.<br />Feito por Julia Martins · Curitiba</p><nav aria-label="Links do rodapé"><a href={CONTATO.instagram} target="_blank" rel="noopener noreferrer">Instagram</a><a href="/demo">Demonstração</a><a href="/painel">Acessar painel</a></nav></footer>
    </div>
  )
}
