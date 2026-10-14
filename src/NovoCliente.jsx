import React, { useEffect, useRef, useState } from 'react'
import { X, ArrowRight, Check } from 'lucide-react'
import { MODELOS, NOMES_PLANOS, PRECOS } from './negocio'
import { DESCRICOES_MODELOS } from './paginas'

export default function NovoCliente({ onCriar, onFechar }) {
  const ref = useRef(null)
  const [plano, setPlano] = useState('completo'), [layout, setLayout] = useState('servicos')
  useEffect(() => { ref.current.showModal() }, [])
  return <dialog ref={ref} className="creation-dialog" aria-labelledby="novo-titulo" onCancel={e => { e.preventDefault(); onFechar() }}>
    <header className="creation-header"><div><p className="creation-eyebrow">UM CLIENTE, UMA ENTREGA CLARA</p><h1 id="novo-titulo">Vamos começar pelo formato.</h1></div><button className="danger-action" onClick={onFechar} aria-label="Fechar criação"><X size={20}/></button></header>
    <div className="creation-content"><fieldset><legend>1. O que este cliente precisa?</legend><div className="creation-options">{Object.entries(NOMES_PLANOS).map(([k,v]) => <label key={k} className={`creation-choice ${plano===k?'is-selected':''}`}><input type="radio" name="plano-novo" value={k} checked={plano===k} onChange={()=>setPlano(k)}/><strong>{v}</strong><span>R$ {PRECOS[k]}/mês</span><small>{k==='pagina'?'Página e contato no WhatsApp.':k==='assistente'?'Menu no site que ele já possui.':'Página e menu de dúvidas juntos.'}</small></label>)}</div></fieldset>
    {plano !== 'assistente' && <fieldset><legend>2. Escolha a estrutura da página</legend><div className="creation-models">{Object.entries(MODELOS).map(([k,v]) => <label key={k} className={`creation-choice ${layout===k?'is-selected':''}`}><input type="radio" name="modelo-novo" value={k} checked={layout===k} onChange={()=>setLayout(k)}/><strong>{v}</strong><small>{DESCRICOES_MODELOS[k]}</small></label>)}</div></fieldset>}
    <p className="creation-note"><Check size={16}/>Você vai preencher informações reais. Salvar cria uma configuração sem liberar o acesso público; o teste começa quando você publicar.</p></div>
    <footer className="creation-footer"><button className="btn btn-outline" onClick={onFechar}>Cancelar</button><button className="btn btn-primary" onClick={()=>onCriar({plano,layout})}>Preencher negócio<ArrowRight size={16}/></button></footer>
  </dialog>
}
