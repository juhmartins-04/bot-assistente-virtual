import React, { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { CONTATO, SEGMENTOS } from './comercial'
import { MODELOS } from './negocio'
import { useWidget } from './useWidget'
import BusinessPage from './BusinessPage'
import './landing.css'

export default function DemoPage(){
 const params=new URLSearchParams(window.location.search)
 const segmento=Object.hasOwn(SEGMENTOS,params.get('segmento'))?params.get('segmento'):'beleza'
 const exemplo=SEGMENTOS[segmento],embutido=params.get('embed')==='1'
 const [layout,setLayout]=useState(Object.hasOwn(MODELOS,params.get('modelo'))?params.get('modelo'):'servicos')
 const dados=useMemo(()=>({
  nomeNegocio:exemplo.negocio,corPrimaria:exemplo.cor,numeroWhatsApp:CONTATO.whatsapp,idiomaPadrao:'pt',capturarContato:false,abertoInicialmente:true,
  categoriaNegocio:exemplo.nome,sobreNegocio:exemplo.assinatura+' '+exemplo.descricao,horarioFuncionamento:exemplo.horario,layout,
  endereco:'Curitiba · endereço fictício',incluiAssistente:true,servicos:exemplo.servicos,
  itensCardapio:[{nome:'Café da casa',descricao:'Exemplo de item e descrição aprovados pelo negócio.',preco:'R$ 8,00',categoria:'BEBIDAS'},{nome:'Bolo artesanal',descricao:'Valores e produtos fictícios.',preco:'R$ 12,00',categoria:'DOCES'}],
  saudacaoPt:'Oi! Como posso ajudar? Escolha uma opção abaixo.',transferirLabelPt:'Conhecer o Prontô',
  transferirMensagemWhatsPt:`Olá, Julia! Experimentei a demonstração do Prontô para ${exemplo.nome.toLowerCase()} e quero conhecer o projeto.`,
  opcoes:[{labelPt:'Horário de funcionamento',tipo:'resposta',respostaPt:exemplo.horario},{labelPt:exemplo.pergunta,tipo:'resposta',respostaPt:exemplo.resposta},{labelPt:'Como funciona o agendamento?',tipo:'resposta',respostaPt:'O Prontô abre a agenda que seu negócio já usa ou encaminha para o WhatsApp. Este exemplo não faz agendamentos.'}],
 }),[exemplo,layout])
 useWidget({config:dados,ativo:true})
 return <div>
  {!embutido&&<nav className="pr-demo-page-nav"><a href="/"><ArrowLeft size={16}/>Voltar ao Prontô</a><label>Modelo <select aria-label="Modelo de página" value={layout} onChange={e=>setLayout(e.target.value)}>{Object.entries(MODELOS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></nav>}
  <BusinessPage dados={dados} demonstracao/>
 </div>
}
