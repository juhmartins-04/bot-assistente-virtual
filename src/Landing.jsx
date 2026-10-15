import { OPERACAO_COMPLETA } from './operacao';
import React, { useEffect, useState } from 'react'
import { ArrowRight, Check, Clock3, MessageCircle, Play, Sparkles } from 'lucide-react'
import { CONTATO, linkComercial, PLANOS, SEGMENTOS } from './comercial'
import { MODELOS } from './negocio'
import { VITRINE_PAGINAS } from './demonstracao'
import { Demonstracao, DialogoDemonstracao, PersonalizarDemonstracao } from './MarketingDemo'
import MarketingFAQ from './MarketingFAQ'
import './landing.css'
import BotaoTema from './BotaoTema'
import { useTema } from './useTema'

function BotaoContato({ children = 'Quero testar por 14 dias', plano, secundario = false }) {
  return (
    <a className={`pr-button ${secundario ? 'pr-button-outline' : 'pr-button-primary'}`}
      href={linkComercial(plano)} target="_blank" rel="noopener noreferrer">
      {children}<ArrowRight size={17} aria-hidden="true" />
    </a>
  )
}

export default function Landing() {
  const { tema, alternar } = useTema()
  const [demoConfig, setDemoConfig] = useState(null)
  useEffect(() => {
    if (!OPERACAO_COMPLETA) return;
    function clique(event) {
      const a = event.target.closest?.('a[href]'); if (!a) return;
      const u = new URL(a.href); if (u.hostname !== 'wa.me' || u.pathname !== `/${CONTATO.whatsapp}`) return;
      const mensagem = u.searchParams.get('text') || '';
      const plano = mensagem.includes('Só Página') ? 'pagina' : mensagem.includes('Página + Assistente') ? 'completo' : mensagem.includes('Assistente') ? 'assistente' : 'geral';
      const utm = new URLSearchParams(window.location.search).get('utm_source')?.toLowerCase();
      const origem = ['instagram','google','indicacao'].includes(utm) ? utm : utm ? 'outro' : 'direto';
      fetch('https://rnlgvlmwwncfrfywszaf.supabase.co/rest/v1/rpc/registrar_interesse', { method:'POST',keepalive:true,headers:{apikey:'sb_publishable_x40vbDCMSrdE7uiNGK0U8Q_ODc99VlB','Content-Type':'application/json'},body:JSON.stringify({p_plano:plano,p_origem:origem}) }).catch(() => {});
    }
    document.addEventListener('click', clique); return () => document.removeEventListener('click', clique);
  }, []);
  return (
    <div className="pr-site">
      <a className="pr-skip" href="#conteudo">Pular para o conteúdo</a>
      <header className="pr-header pr-container">
        <a href="/" className="pr-brand" aria-label="Prontô, página inicial"><span className="pr-brand-icon"><Sparkles size={20} /></span>Prontô<span className="pr-brand-dot">.</span></a>
        <nav className="pr-nav" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#exemplos">Exemplos de páginas</a>
          <a href="#planos">Planos</a>
          <a href="/painel" className="pr-panel-link">Acessar painel<ArrowRight size={14} aria-hidden="true" /></a>
          <BotaoTema tema={tema} alternar={alternar} />
        </nav>
      </header>

      <main id="conteudo">
        <section className="pr-hero pr-container" aria-labelledby="titulo-principal">
          <div className="pr-hero-copy">
            <p className="pr-eyebrow"><span className="pr-small-line" />ATENDIMENTO DIGITAL SIMPLES</p>
            <h1 id="titulo-principal">Seu negócio<br />continua respondendo.<br /><em>Mesmo quando<br className="pr-desktop-break" /> você para.</em></h1>
            <p className="pr-lead">Uma página com a sua marca, serviços e contato. Um assistente que responde às dúvidas na hora e leva a conversa para o WhatsApp. Já tem site? Instalo só o assistente nele.</p>
            <div className="pr-hero-actions">
              <BotaoContato />
              <button className="pr-play-link" type="button" aria-haspopup="dialog" onClick={e => setDemoConfig({ gatilho:e.currentTarget })}><Play size={14} fill="currentColor" aria-hidden="true" />Veja funcionar</button>
            </div>
            <p className="pr-micro"><Check size={14} aria-hidden="true" />Sem taxa de adesão. Sem fidelidade.</p>
          </div>
          <Demonstracao />
        </section>

        <div className="pr-benefits pr-container">
          <div><Clock3 size={21} aria-hidden="true" /><p><strong>Respostas a qualquer hora</strong><span>Mesmo fora do expediente</span></p></div>
          <div><Sparkles size={21} aria-hidden="true" /><p><strong>Com a cara da sua marca</strong><span>Seu nome, suas cores, suas respostas</span></p></div>
          <div><MessageCircle size={21} aria-hidden="true" /><p><strong>Seu WhatsApp de sempre</strong><span>Uma conversa que continua com você</span></p></div>
        </div>

        <PersonalizarDemonstracao onAbrir={setDemoConfig}/>

        <section className="pr-section pr-container" aria-labelledby="titulo-diferencial"><div className="pr-section-heading"><p className="pr-eyebrow">CONFIGURAÇÃO E ACOMPANHAMENTO COMIGO</p><h2 id="titulo-diferencial">Uma ferramenta simples.<br/><em>Uma pessoa para deixar pronta.</em></h2><p>Eu organizo suas informações, preparo a página e acompanho os ajustes. Você aprova o conteúdo antes de publicar.</p></div><div className="pr-difference-grid"><article><Sparkles size={22}/><h3>Configuração feita para o seu negócio</h3><p>Nome, cores, serviços e perguntas escolhidos com você, dentro do modelo contratado.</p></article><article><Check size={22}/><h3>Informações que você aprova</h3><p>Seu cliente recebe os horários, preços e orientações que você decidiu mostrar.</p></article><article><MessageCircle size={22}/><h3>Suporte direto com a Julia</h3><p>Até duas solicitações agrupadas de conteúdo por mês. Prazos combinados na implantação.</p></article></div></section>

        <section className="pr-section pr-container" id="exemplos" aria-labelledby="titulo-modelos">
          <div className="pr-section-heading"><p className="pr-eyebrow">SUA MARCA TAMBÉM MERECE UM LUGAR PRÓPRIO</p><h2 id="titulo-modelos">Imagine o seu negócio<br/><em>em uma página assim.</em></h2><p>Pet, assistência técnica, costura, lavanderia, reparos e beleza: veja como negócios diferentes podem ter sua própria página. Eu personalizo o modelo com a sua marca e as suas informações.</p></div>
          <div className="pr-template-grid">{VITRINE_PAGINAS.map(({segmento, modelo}) => {
            const exemplo = SEGMENTOS[segmento], destino = `/demo?segmento=${segmento}&modelo=${modelo}&experiencia=pagina`
            return <article key={segmento}>
            <a className="pr-template-preview" href={destino} target="_blank" rel="noopener noreferrer" aria-label={`Explorar página de ${exemplo.nome}: ${exemplo.negocio}`}>
              <span className="pr-preview-bar" aria-hidden="true"><i/><i/><i/><span>{exemplo.nome}</span></span>
              <iframe src={`${destino}&embed=1`} loading="lazy" title={`Prévia de ${exemplo.negocio}`} tabIndex={-1} inert="" aria-hidden="true"/>
              <span className="pr-preview-open">Explorar este exemplo ↗</span>
            </a>
            <span className="pr-template-niche">{exemplo.nome} · {MODELOS[modelo]}</span><h3>{exemplo.negocio}</h3><p>{exemplo.descricao}</p><a className="pr-text-link" href={destino} target="_blank" rel="noopener noreferrer">Ver página completa<ArrowRight size={16} aria-hidden="true"/></a>
          </article>})}</div>
          <div className="pr-page-offer"><div><h3>Só a página ou a experiência completa?</h3><p>Se você ainda não tem site, escolha a página com a sua marca e, se quiser, inclua o assistente. Se já tem, eu verifico a compatibilidade e instalo apenas o assistente.</p></div><a className="pr-button pr-button-outline" href="/demos/">Ver exemplos por segmento<ArrowRight size={17} aria-hidden="true"/></a></div>
          <p className="pr-demo-disclaimer">Marcas e informações fictícias. Os contatos das demos falam com a Julia sobre o Prontô.</p>
        </section>

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
            <article><span className="pr-tag">PRECISO DE UMA PÁGINA</span><h3>Um link com as informações do seu negócio.</h3><p>Uma página com sua marca, serviços e contato. Você pode incluir o assistente para completar a experiência.</p><a href="#planos">Ver os planos com página<ArrowRight size={16} aria-hidden="true" /></a></article>
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
          <p className="pr-pricing-note">A mensalidade inclui configuração e os ajustes de conteúdo do plano. O link no Prontô está incluído; domínio personalizado e mudanças de funcionalidade são combinados à parte.</p>
        </section>

        <section className="pr-section pr-container" aria-labelledby="titulo-implantacao"><div className="pr-section-heading"><p className="pr-eyebrow">DA CONFIGURAÇÃO AO PRIMEIRO DIA</p><h2 id="titulo-implantacao">Você aprova.<br /><em>Eu deixo pronto.</em></h2><p>Você envia marca, serviços, horários e contatos. Eu preparo a página ou o menu, você confere e combinamos a publicação. Os 14 dias começam quando o teste é publicado.</p></div><div className="pr-report-sample"><div><span className="pr-tag">RELATÓRIO FICTÍCIO · EXEMPLO</span><h3>Entenda o que está sendo usado.</h3><p>Relatório por período, com exportação. Acompanhe cliques e dúvidas frequentes para ajustar suas informações.</p></div><dl><div><dt>Visitas da página</dt><dd>240</dd></div><div><dt>Aberturas do assistente</dt><dd>68</dd></div><div><dt>Cliques no WhatsApp</dt><dd>21</dd></div></dl><p className="pr-micro">Números ilustrativos. Cliques não comprovam mensagens, agendamentos ou vendas.</p></div></section>

        <MarketingFAQ/>

        <section className="pr-final-cta pr-container" aria-labelledby="titulo-teste"><div><p className="pr-eyebrow">PRONTÔ PARA O PRÓXIMO PASSO?</p><h2 id="titulo-teste">Seu atendimento<br />pode começar aqui.</h2><p>Me conte sobre o seu negócio. Eu te mostro como o Prontô pode ajudar.</p></div><div><BotaoContato /><p className="pr-cta-note">Configuração comigo. Teste no seu ritmo.</p></div></section>
      </main>
      <footer className="pr-footer pr-container"><a href="/" className="pr-brand">Prontô<span className="pr-brand-dot">.</span></a><p>Atendimento digital simples.</p><nav aria-label="Links do rodapé"><a href={CONTATO.instagram} target="_blank" rel="noopener noreferrer">Instagram</a><a href="/demo">Demonstração</a><a href="/privacidade">Privacidade</a>{OPERACAO_COMPLETA && <a href="/cliente">Área do cliente</a>}<a href="/painel">Acessar painel</a></nav></footer>
      {demoConfig && <DialogoDemonstracao configuracao={demoConfig} onFechar={() => setDemoConfig(null)}/>}
    </div>
  )
}
