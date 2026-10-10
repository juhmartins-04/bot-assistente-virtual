import React, { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { CONTATO, linkComercial, SEGMENTOS } from './comercial'
import './landing.css'

export default function DemoPage() {
  const params = new URLSearchParams(window.location.search)
  const segmento = Object.hasOwn(SEGMENTOS, params.get('segmento')) ? params.get('segmento') : 'beleza'
  const dados = SEGMENTOS[segmento]
  const embutido = params.get('embed') === '1'
  const [erroWidget, setErroWidget] = useState(false)

  useEffect(() => {
    // Usa o widget de produção com configuração local. Não lê nem grava clientes,
    // leads ou eventos no Supabase e não pede contato na demonstração.
    window.ATENDENTE_CONFIG = {
      nomeNegocio: dados.negocio, corPrimaria: dados.cor, numeroWhatsApp: CONTATO.whatsapp,
      idiomaPadrao: 'pt', capturarContato: false, abertoInicialmente: true,
      saudacaoPt: 'Oi! Como posso ajudar? Escolha uma opção abaixo.',
      transferirLabelPt: 'Conhecer o Prontô',
      transferirMensagemWhatsPt: `Olá, Julia! Experimentei a demonstração do Prontô para ${dados.nome.toLowerCase()} e quero conhecer o projeto.`,
      opcoes: [
        { labelPt: 'Horário de funcionamento', tipo: 'resposta', respostaPt: dados.horario },
        { labelPt: dados.pergunta, tipo: 'resposta', respostaPt: dados.resposta },
        { labelPt: 'Como funciona o agendamento?', tipo: 'resposta', respostaPt: 'O Prontô pode abrir o link da agenda que seu negócio já usa ou encaminhar o pedido para o WhatsApp. Esta demonstração não faz agendamentos.' },
      ],
    }
    const script = document.createElement('script')
    script.src = '/atendente-virtual-widget.js'
    script.async = true
    let cancelado = false
    script.onload = () => {
      if (!cancelado && !document.querySelector('[data-atendente-widget]')) setErroWidget(true)
    }
    script.onerror = () => { if (!cancelado) setErroWidget(true) }
    document.body.appendChild(script)
    return () => {
      cancelado = true
      script.remove()
      document.querySelector('[data-atendente-widget]')?.remove()
      delete window.ATENDENTE_CONFIG
    }
  }, [dados])

  return (
    <div className={`pr-demo-page ${embutido ? 'is-embedded' : ''}`} style={{ '--demo-color': dados.cor }}>
      {!embutido && <header className="pr-demo-page-nav"><a href="/"><ArrowLeft size={16} aria-hidden="true" />Voltar ao Prontô</a><a href={linkComercial()} target="_blank" rel="noopener noreferrer">Quero para meu negócio<ArrowRight size={16} aria-hidden="true" /></a></header>}
      <main className="pr-sample-site">
        <p className="pr-sample-label">EXEMPLO DE PÁGINA · DADOS FICTÍCIOS</p>
        <div className="pr-sample-logo"><Sparkles size={24} aria-hidden="true" /></div>
        <h1>{dados.negocio}</h1><h2>{dados.assinatura}</h2><p>{dados.descricao}</p>
        <div className="pr-sample-services">{dados.servicos.map((servico) => <span key={servico}>{servico}</span>)}</div>
        <p className="pr-sample-hours"><Clock3 size={14} aria-hidden="true" />{dados.horario}</p>
        <p className="pr-sample-tip">Experimente as perguntas do assistente.<br />Ao continuar no WhatsApp, você fala com a Julia sobre o Prontô.</p>
        {erroWidget && <p role="alert">Não foi possível abrir a demonstração. <a href={linkComercial()} target="_blank" rel="noopener noreferrer">Fale com a Julia</a>.</p>}
      </main>
    </div>
  )
}
