import React from 'react'
import { Check, Clock, Code2, ExternalLink, Eye } from 'lucide-react'
import { checklistInstalacao, urlSite } from './instalacao'

export default function InstalacaoAssistente({ cliente, onChange, onPrevia }) {
  const i = cliente.instalacao || {}
  const atualizar = (campo,valor) => onChange({ ...i,[campo]:valor })
  return <section className="card p-5 flex flex-col gap-4" aria-labelledby="instalacao-titulo">
    <h2 id="instalacao-titulo" className="font-semibold flex items-center gap-2"><Code2 size={18}/>Assistente no site do cliente</h2>
    <p className="text-sm">O cliente mantém o site atual. Você configura o menu aqui e instala o código no site com autorização. Estes dados de acompanhamento são privados.</p>
    <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Site que receberá o assistente</span><input type="url" value={i.siteUrl || ''} onChange={e=>atualizar('siteUrl',e.target.value)} placeholder="https://www.site-do-cliente.com.br" className="border rounded-lg px-3 py-2"/><small>É o endereço do cliente. A hospedagem do código continua sendo a do Prontô.</small></label>
    <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Plataforma e responsável técnico (opcional)</span><input value={i.plataforma || ''} onChange={e=>atualizar('plataforma',e.target.value)} placeholder="Ex.: WordPress · agência responsável" className="border rounded-lg px-3 py-2"/></label>
    <div className="flex flex-col gap-3 text-sm">{[
      ['autorizada','Conferi a compatibilidade e tenho autorização do responsável para instalar.'],
      ['conteudoAprovado','O cliente aprovou as perguntas, respostas e destino do WhatsApp.'],
      ['verificada','Após a publicação, conferi abertura, respostas e links no celular e computador.'],
    ].map(([key,label])=><label key={key} className="flex gap-2 items-start"><input type="checkbox" checked={i[key]===true} onChange={e=>atualizar(key,e.target.checked)} className="mt-1"/><span>{label}</span></label>)}</div>
    <div className="flex flex-wrap gap-2"><button className="btn btn-outline" onClick={onPrevia}><Eye size={16}/>Ver assistente em um site de exemplo</button>{urlSite(i.siteUrl)&&<a className="btn btn-outline" href={urlSite(i.siteUrl)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Abrir site do cliente</a>}</div>
    <ol className="text-sm list-decimal pl-5 flex flex-col gap-2"><li>Configure, salve e confira o menu na prévia. A prévia não registra visitas ou contatos.</li><li>Copie o código do card de publicação. Você ou o responsável autorizado o insere uma vez no site.</li><li>Depois da aprovação, publique o teste de 14 dias. Com o acesso liberado, confira a instalação no site real.</li><li>As próximas alterações de conteúdo são feitas aqui. Suspensão ou teste vencido desativa o widget no próximo carregamento.</li></ol>
    <p className="text-xs">A plataforma precisa permitir JavaScript externo. Se houver bloqueio de scripts ou outro chat no mesmo canto, o responsável pelo site deve avaliar o ajuste. Instalação abrange um site; não é um bot dentro do WhatsApp.</p>
    <div className="flex flex-col gap-1" aria-label="Checklist de instalação">{checklistInstalacao(cliente).map(item=><p className="text-xs flex gap-2 items-center" key={item.label}>{item.ok?<Check size={14}/>:<Clock size={14}/>} {item.label}</p>)}</div>
  </section>
}
