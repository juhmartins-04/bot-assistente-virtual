import React, { useMemo, useState } from 'react'
import BotaoTema from './BotaoTema'
import { useTema } from './useTema'
import { ArrowLeft, Smartphone, Monitor, MessageCircle } from 'lucide-react'
import { CONTATO, SEGMENTOS } from './comercial'
import { MODELOS } from './negocio'
import { EXPERIENCIAS_DEMO, experienciaDemo } from './demonstracao'
import { useWidget } from './useWidget'
import BusinessPage from './BusinessPage'
import './landing.css'

export default function DemoPage(){
 const params=new URLSearchParams(window.location.search)
 const [segmento,setSegmento]=useState(Object.hasOwn(SEGMENTOS,params.get('segmento'))?params.get('segmento'):'beleza')
 const [tamanho,setTamanho]=useState('computador')
 const [experiencia,setExperiencia]=useState(()=>experienciaDemo(params.get('experiencia')))
 const {tema,alternar}=useTema()
 const exemplo=SEGMENTOS[segmento],embutido=params.get('embed')==='1'
 const [layout,setLayout]=useState(Object.hasOwn(MODELOS,params.get('modelo'))?params.get('modelo'):'servicos')
 const dados=useMemo(()=>({
  nomeNegocio:exemplo.negocio,corPrimaria:exemplo.cor,numeroWhatsApp:CONTATO.whatsapp,idiomaPadrao:'pt',capturarContato:false,abertoInicialmente:experiencia==='assistente',
  categoriaNegocio:exemplo.nome,sobreNegocio:exemplo.assinatura+' '+exemplo.descricao,horarioFuncionamento:exemplo.horario,layout,
  endereco:'Curitiba · endereço fictício',incluiAssistente:experiencia!=='pagina',servicos:exemplo.servicos,
  tituloServicos:exemplo.tituloServicos,tituloCardapio:exemplo.tituloCardapio,
  itensCardapio:exemplo.servicos.map(servico=>({...servico,categoria:'EXEMPLO FICTÍCIO'})),
  saudacaoPt:'Oi! Como posso ajudar? Escolha uma opção abaixo.',transferirLabelPt:'Conhecer o Prontô',
  transferirMensagemWhatsPt:`Olá, Julia! Experimentei a demonstração do Prontô para ${exemplo.nome.toLowerCase()} e quero conhecer o projeto.`,
  opcoes:[{labelPt:'Horário de funcionamento',tipo:'resposta',respostaPt:exemplo.horario},{labelPt:exemplo.pergunta,tipo:'resposta',respostaPt:exemplo.resposta},{labelPt:exemplo.proximoPasso[0],tipo:'resposta',respostaPt:exemplo.proximoPasso[1]}],
 }),[exemplo,layout,experiencia])
 useWidget({config:dados,ativo:embutido&&experiencia!=='pagina'})
 if(embutido)return experiencia==='assistente' ? <main className="pr-demo-page pr-existing-site" style={{'--demo-color':exemplo.cor}}><div className="pr-existing-content"><p className="pr-sample-label">SIMULAÇÃO · SITE JÁ EXISTENTE</p><span className="pr-existing-initial" aria-hidden="true">{exemplo.negocio.slice(0,1)}</span><h1>{exemplo.negocio}</h1><h2>Seu site continua aqui.</h2><p>Você mantém sua página e adiciona o assistente do Prontô no canto da tela.</p><div className="pr-existing-hint"><MessageCircle size={22} aria-hidden="true"/><p>Escolha uma pergunta no menu para testar uma resposta. Na sua instalação, usamos as informações que você aprovar.</p></div><p className="pr-existing-footnote">Exemplo fictício. O WhatsApp fala com a Julia sobre o Prontô.</p></div></main> : <BusinessPage dados={dados} demonstracao/>
 return <main className="pr-site pr-demo-workbench">
  <header className="pr-demo-page-nav"><a href="/"><ArrowLeft size={16}/>Voltar ao Prontô</a><BotaoTema tema={tema} alternar={alternar}/></header>
  <div className="pr-demo-intro"><p className="pr-eyebrow">DEMONSTRAÇÃO · DADOS FICTÍCIOS</p><h1>Encontre o formato do seu negócio.</h1><p>Experimente uma página pronta ou o assistente para o site que você já tem. Alterne entre computador e celular.</p></div>
  <div className="pr-demo-experiences pr-workbench-experiences" role="group" aria-label="Tipo de demonstração">{Object.entries(EXPERIENCIAS_DEMO).map(([k,v])=><button key={k} type="button" aria-pressed={experiencia===k} onClick={()=>setExperiencia(k)}>{v.nome}</button>)}</div>
  <div className="pr-demo-controls"><label>Negócio <select aria-label="Tipo de negócio da demonstração" value={segmento} onChange={e=>setSegmento(e.target.value)}>{Object.entries(SEGMENTOS).map(([k,v])=><option key={k} value={k}>{v.nome}</option>)}</select></label>{experiencia!=='assistente' && <label>Modelo <select aria-label="Modelo de página" value={layout} onChange={e=>setLayout(e.target.value)}>{Object.entries(MODELOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>}<div className="pr-demo-devices" role="group" aria-label="Tamanho da demonstração"><button className={`btn ${tamanho==='computador'?'btn-primary':'btn-outline'}`} aria-pressed={tamanho==='computador'} onClick={()=>setTamanho('computador')}><Monitor size={16}/>Computador</button><button className={`btn ${tamanho==='celular'?'btn-primary':'btn-outline'}`} aria-pressed={tamanho==='celular'} onClick={()=>setTamanho('celular')}><Smartphone size={16}/>Celular</button></div></div>
  <div className="pr-demo-stage"><iframe title={`Demonstração: ${EXPERIENCIAS_DEMO[experiencia].nome}`} key={`${segmento}-${layout}-${experiencia}`} src={`/demo?embed=1&segmento=${segmento}&modelo=${layout}&experiencia=${experiencia}`} style={{width:tamanho==='celular'?'360px':'100%'}}/></div>
  <p className="pr-demo-footnote">O WhatsApp dos exemplos fala com a Julia sobre o Prontô. Nenhum exemplo faz pagamentos ou agendamentos.</p>
 </main>
}
