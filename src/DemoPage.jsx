import React, { useMemo, useState } from 'react'
import BotaoTema from './BotaoTema'
import { useTema } from './useTema'
import { ArrowLeft, Smartphone, Monitor } from 'lucide-react'
import { CONTATO, SEGMENTOS } from './comercial'
import { MODELOS } from './negocio'
import { useWidget } from './useWidget'
import BusinessPage from './BusinessPage'
import './landing.css'

export default function DemoPage(){
 const params=new URLSearchParams(window.location.search)
 const [segmento,setSegmento]=useState(Object.hasOwn(SEGMENTOS,params.get('segmento'))?params.get('segmento'):'beleza')
 const [tamanho,setTamanho]=useState('computador')
 const {tema,alternar}=useTema()
 const exemplo=SEGMENTOS[segmento],embutido=params.get('embed')==='1'
 const [layout,setLayout]=useState(Object.hasOwn(MODELOS,params.get('modelo'))?params.get('modelo'):'servicos')
 const dados=useMemo(()=>({
  nomeNegocio:exemplo.negocio,corPrimaria:exemplo.cor,numeroWhatsApp:CONTATO.whatsapp,idiomaPadrao:'pt',capturarContato:false,abertoInicialmente:!embutido,
  categoriaNegocio:exemplo.nome,sobreNegocio:exemplo.assinatura+' '+exemplo.descricao,horarioFuncionamento:exemplo.horario,layout,
  endereco:'Curitiba · endereço fictício',incluiAssistente:true,servicos:exemplo.servicos,
  tituloCardapio:'Serviços e valores.',
  itensCardapio:exemplo.servicos.map((nome,i)=>({nome,descricao:'Descrição ilustrativa. Na sua página, usamos o conteúdo que você aprovar.',preco:['R$ 80,00','R$ 60,00','R$ 120,00'][i],categoria:'EXEMPLO FICTÍCIO'})),
  saudacaoPt:'Oi! Como posso ajudar? Escolha uma opção abaixo.',transferirLabelPt:'Conhecer o Prontô',
  transferirMensagemWhatsPt:`Olá, Julia! Experimentei a demonstração do Prontô para ${exemplo.nome.toLowerCase()} e quero conhecer o projeto.`,
  opcoes:[{labelPt:'Horário de funcionamento',tipo:'resposta',respostaPt:exemplo.horario},{labelPt:exemplo.pergunta,tipo:'resposta',respostaPt:exemplo.resposta},{labelPt:'Como funciona o agendamento?',tipo:'resposta',respostaPt:'O Prontô abre a agenda que seu negócio já usa ou encaminha para o WhatsApp. Este exemplo não faz agendamentos.'}],
 }),[exemplo,layout,embutido])
 useWidget({config:dados,ativo:embutido})
 if(embutido)return <BusinessPage dados={dados} demonstracao/>
 return <main className="pr-site pr-demo-workbench">
  <header className="pr-demo-page-nav"><a href="/"><ArrowLeft size={16}/>Voltar ao Prontô</a><BotaoTema tema={tema} alternar={alternar}/></header>
  <div className="pr-demo-intro"><p className="pr-eyebrow">DEMONSTRAÇÃO · DADOS FICTÍCIOS</p><h1>Encontre o formato do seu negócio.</h1><p>Veja os modelos no computador e no celular. Abra o assistente para experimentar as respostas.</p></div>
  <div className="pr-demo-controls"><label>Negócio <select aria-label="Tipo de negócio da demonstração" value={segmento} onChange={e=>setSegmento(e.target.value)}>{Object.entries(SEGMENTOS).map(([k,v])=><option key={k} value={k}>{v.nome}</option>)}</select></label><label>Modelo <select aria-label="Modelo de página" value={layout} onChange={e=>setLayout(e.target.value)}>{Object.entries(MODELOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><div className="pr-demo-devices" role="group" aria-label="Tamanho da demonstração"><button className={`btn ${tamanho==='computador'?'btn-primary':'btn-outline'}`} aria-pressed={tamanho==='computador'} onClick={()=>setTamanho('computador')}><Monitor size={16}/>Computador</button><button className={`btn ${tamanho==='celular'?'btn-primary':'btn-outline'}`} aria-pressed={tamanho==='celular'} onClick={()=>setTamanho('celular')}><Smartphone size={16}/>Celular</button></div></div>
  <div className="pr-demo-stage"><iframe title="Página de demonstração do Prontô" key={`${segmento}-${layout}`} src={`/demo?embed=1&segmento=${segmento}&modelo=${layout}`} style={{width:tamanho==='celular'?'360px':'100%'}}/></div>
  <p className="pr-demo-footnote">O WhatsApp dos exemplos fala com a Julia sobre o Prontô. Nenhum exemplo faz pagamentos ou agendamentos.</p>
 </main>
}
