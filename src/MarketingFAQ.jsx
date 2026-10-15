import React, { useState } from 'react'
import { ArrowRight, MessageCircle, Plus } from 'lucide-react'
import { linkComercial, PLANOS } from './comercial'

const GRUPOS = [
  { nome: 'Para começar', perguntas: [
    ['Meu negócio é pequeno. Faz sentido para mim?', 'Se você atende sozinho ou tem uma equipe pequena e responde sempre às mesmas perguntas, o Prontô pode ajudar a organizar esse primeiro contato. Seu cliente encontra serviços, horários e orientações enquanto você cuida do atendimento. A prévia acima ajuda a avaliar se combina com sua rotina.'],
    ['Só uso Instagram e WhatsApp. Por onde eu começo?', 'Você pode ter uma página com sua marca, serviços e contato, para colocar o link na bio e compartilhar. Com o assistente, as dúvidas frequentes são respondidas nessa página e o cliente segue para o seu WhatsApp quando quiser conversar.'],
    ['Já tenho site. Vou precisar trocar tudo?', 'Você pode contratar só o assistente. Eu confiro se a plataforma do seu site permite a instalação, configuro o menu e combino o acesso com você ou com quem cuida do site. A compatibilidade é conferida antes de fechar a instalação.'],
    ['Como funciona o teste de 14 dias?', 'Você conta sobre o negócio, envia as informações e aprova a configuração. Os 14 dias começam quando o teste está publicado e disponível para usar. Ao final, você decide se quer continuar no plano escolhido.'],
  ] },
  { nome: 'No dia a dia', perguntas: [
    ['O atendimento acontece dentro do WhatsApp?', 'As respostas automáticas aparecem na página ou no site. Quando o cliente quer falar com você, o botão abre o seu WhatsApp com uma mensagem preparada. O atendimento humano continua com você pelo número de sempre.'],
    ['Ele inventa respostas ou usa inteligência artificial?', 'O assistente funciona com um menu de respostas que você aprova: serviços, horários, valores e orientações. Não é um chat de inteligência artificial aberto. Assim, o visitante recebe as informações que você decidiu mostrar.'],
    ['E quando eu mudar um preço, serviço ou horário?', 'Você fala diretamente com a Julia. O plano inclui até duas solicitações agrupadas de conteúdo por mês e até cinco perguntas essenciais no assistente. Reunimos as mudanças, combinamos o prazo e você confere as informações.'],
  ] },
  { nome: 'Planos e valores', perguntas: [
    ['Quanto custa e o que está incluído?', `${PLANOS.map(p => `${p.nome}: R$ ${p.preco}/mês`).join('; ')}. A configuração do modelo está incluída, sem taxa de adesão. Os recursos de cada opção estão na seção de planos. Domínio próprio, novas funções e alterações de escopo são combinados à parte.`],
    ['Por que existe uma mensalidade?', 'Ela mantém o serviço disponível e inclui a configuração do modelo, acompanhamento, relatório de uso e os ajustes de conteúdo previstos no plano. Você tem uma pessoa para preparar e manter as informações com você, sem precisar administrar a ferramenta por conta própria.'],
    ['Se não fizer sentido, posso cancelar?', 'Sim. Os planos são mensais, sem fidelidade e sem multa. A continuidade é combinada com você, sem cobrança automática. Ao cancelar, você mantém o acesso até o fim do período já pago. A solicitação é feita diretamente pelo WhatsApp.'],
  ] },
]

export default function MarketingFAQ() {
  const [grupo, setGrupo] = useState(0)
  return <section className="pr-faq pr-container" aria-labelledby="titulo-duvidas">
    <div className="pr-section-heading"><p className="pr-eyebrow">SEM COMPLICAÇÃO, DESDE O COMEÇO</p><h2 id="titulo-duvidas">Vai caber<br/><em>na sua rotina?</em></h2><p>Comece pela dúvida que está passando pela sua cabeça. Se quiser conversar sobre o seu caso, o próximo passo é bem simples.</p><a className="pr-faq-help" href={linkComercial()} target="_blank" rel="noopener noreferrer"><MessageCircle size={21} aria-hidden="true"/><span><strong>Me conte sobre o seu negócio</strong><small>Converse com a Julia pelo WhatsApp</small></span><ArrowRight size={17} aria-hidden="true"/></a></div>
    <div><div className="pr-faq-categories" role="group" aria-label="Assunto das dúvidas">{GRUPOS.map((g,i) => <button key={g.nome} type="button" aria-pressed={grupo === i} onClick={() => setGrupo(i)}>{g.nome}</button>)}</div><div className="pr-faq-items">{GRUPOS[grupo].perguntas.map(([pergunta,resposta], i) => <details key={`${grupo}-${pergunta}`} name="duvidas-pronto" open={i === 0}><summary><strong className="pr-faq-question">{pergunta}</strong><Plus size={18} aria-hidden="true"/></summary><p>{resposta}</p></details>)}</div><p className="pr-faq-bottom">Sua marca. Suas informações. Uma configuração aprovada com você.</p></div>
  </section>
}
