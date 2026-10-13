import React, { useEffect, useState } from 'react'
import { atualizarStatusRemoto } from './storage'
import { supabase } from './utils/supabase'
import { PRECOS, NOMES_PLANOS } from './negocio'
import { TOKENS } from './tokens'

export default function Assinatura({ cliente, onChange, onPlano }) {
 const [email,setEmail]=useState(''),[aviso,setAviso]=useState(''),[busy,setBusy]=useState(false),[solicitacoes,setSolicitacoes]=useState([]),[historico,setHistorico]=useState([])
 const [subscription,setSubscription]=useState(''),[customer,setCustomer]=useState('')
 const [referencia,setReferencia]=useState(''),[dia,setDia]=useState(new Date().toISOString().slice(0,10))
 const [validade,setValidade]=useState(new Date(Date.now()+30*86400000).toISOString().slice(0,10))
 const [refresh,setRefresh]=useState(0)
 useEffect(()=>{
  if(!cliente.publicId)return
  let cancelado=false;setEmail('');setSolicitacoes([]);setHistorico([]);setAviso('')
  Promise.all([supabase.from('cliente_acessos').select('email').eq('cliente_id',cliente.id).maybeSingle(),supabase.from('solicitacoes').select('*').eq('cliente_id',cliente.id).order('criado_em',{ascending:false}).limit(100),supabase.from('recebimentos').select('*').eq('cliente_id',cliente.id).order('recebido_em',{ascending:false}).limit(12)]).then(res=>{
   if(cancelado)return
   if(res.some(r=>r.error)){setAviso('Não foi possível carregar os dados da assinatura.');return}
   setEmail(res[0].data?.email||'');setSolicitacoes(res[1].data||[]);setHistorico(res[2].data||[])
  })
  return()=>{cancelado=true}
 },[cliente.id,cliente.publicId,refresh])
 async function executar(fn,mensagem){setBusy(true);setAviso('');try{await fn();setAviso(mensagem);setRefresh(n=>n+1)}catch(e){setAviso(e?.message||'Não foi possível concluir. Tente novamente.')}finally{setBusy(false)}}
 async function registrar(e){e.preventDefault();if(!window.confirm('Confirma que recebeu este valor? Esta ação registra um recebimento; não cobra o cliente.'))return
  await executar(async()=>{const plano=cliente.plano||'completo';const ate=`${validade}T23:59:59-03:00`;const {error}=await supabase.rpc('registrar_recebimento',{p_cliente:cliente.id,p_plano:plano,p_valor:PRECOS[plano]*100,p_recebido:`${dia}T12:00:00-03:00`,p_validade:ate,p_referencia:referencia.trim()});if(error)throw error;onChange({status:'active',paidUntil:ate,legacyAccess:false,cancelAt:null});setReferencia('')},'Recebimento registrado e período liberado.')
 }
 async function acesso(e){e.preventDefault();await executar(async()=>{const {error}=await supabase.from('cliente_acessos').upsert({cliente_id:cliente.id,email:email.trim().toLowerCase(),user_id:null},{onConflict:'cliente_id'});if(error)throw error},'Acesso autorizado. Compartilhe /cliente com o titular; o login usa esse e-mail. Nenhum e-mail foi enviado por esta ação.')}
 async function cancelar(){if(!window.confirm('Encerrar a assinatura ao fim do período pago? Cobranças externas precisam ser canceladas no provedor.'))return;await executar(async()=>{const {data,error}=await supabase.rpc('cancelar_assinatura',{p_cliente:cliente.id});if(error)throw error;onChange({cancelAt:data})},'Cancelamento agendado para o fim do período pago.')}
 return <section className="card p-4 flex flex-col gap-3">
  <h2 className="font-semibold">Plano e recebimentos</h2>
  <label className="text-xs">Plano contratado<select className="border rounded p-2 w-full" value={cliente.plano||(cliente.incluiAssistente===false?'pagina':'completo')} onChange={e=>onPlano(e.target.value)}>{Object.entries(NOMES_PLANOS).map(([k,v])=><option key={k} value={k}>{v} · R$ {PRECOS[k]}/mês</option>)}</select></label>
  <p className="text-[11px]" style={{color:TOKENS.muted}}>Salve o cliente para aplicar o plano. Ativo não significa pagamento recebido.</p>
  {cliente.legacyAccess&&<p className="text-xs">Acesso legado preservado. Ainda não há recebimento confirmado para esse período.</p>}
  {cliente.paidUntil&&<p className="text-xs">Período pago até {new Date(cliente.paidUntil).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}. Sem renovação, há tolerância de 10 dias.</p>}
  {cliente.cancelAt&&<p className="text-xs">Cancelamento: {new Date(cliente.cancelAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}. Após 30 dias, revise a retenção e exclua os dados operacionais.</p>}
  {cliente.publicId&&<>
   {cliente.status === 'suspended' && cliente.paidUntil && new Date(cliente.paidUntil) > new Date() && !cliente.cancelAt && <button disabled={busy} className="btn btn-outline text-xs" onClick={()=>executar(async()=>{await atualizarStatusRemoto(cliente.id,'active');onChange({status:'active'})},'Período pago reativado.')}>Reativar período já pago</button>}
   <form onSubmit={registrar} className="border rounded p-3 flex flex-col gap-2"><h3 className="text-xs font-semibold">Registrar pagamento já recebido</h3><div className="grid grid-cols-2 gap-2"><label className="text-xs">Recebido em<input type="date" required value={dia} onChange={e=>setDia(e.target.value)} className="w-full border rounded p-1"/></label><label className="text-xs">Válido até<input type="date" required value={validade} onChange={e=>setValidade(e.target.value)} className="w-full border rounded p-1"/></label></div><label className="text-xs">Referência do comprovante<input required maxLength={160} value={referencia} onChange={e=>setReferencia(e.target.value)} placeholder="Ex.: PIX-2026-10-11" className="border rounded p-2 w-full"/></label><button disabled={busy} className="btn btn-primary text-xs">Confirmar R$ {PRECOS[cliente.plano||'completo']}</button></form>
   {historico.length>0&&<details><summary className="text-xs font-medium cursor-pointer">Últimos recebimentos</summary>{historico.map(r=><p key={r.id} className="text-xs py-1">{new Date(r.recebido_em).toLocaleDateString('pt-BR')} · R$ {(r.valor_centavos/100).toFixed(2)} · {r.referencia} · {r.status_financeiro}</p>)}</details>}
   <form onSubmit={acesso} className="border rounded p-3 flex flex-col gap-2"><h3 className="text-xs font-semibold">Área do titular do negócio</h3><label className="text-xs">E-mail do titular<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="w-full border rounded p-2"/></label><button disabled={busy} className="btn btn-outline text-xs">Autorizar acesso ao cliente</button><a className="text-xs underline" href="/cliente" target="_blank" rel="noopener noreferrer">Abrir área do cliente ↗</a></form>
   <details><summary className="text-xs cursor-pointer">Conectar assinatura criada no Asaas</summary><form className="flex flex-col gap-2 mt-2" onSubmit={e=>{e.preventDefault();executar(async()=>{const{error}=await supabase.rpc('vincular_cobranca',{p_cliente:cliente.id,p_subscription:subscription.trim(),p_customer:customer.trim()});if(error)throw error},'Vínculo salvo. O webhook só libera acesso após verificar o pagamento no provedor.')}}><label className="text-xs">ID da assinatura<input required pattern="sub_[a-zA-Z0-9]+" value={subscription} onChange={e=>setSubscription(e.target.value)} className="w-full border rounded p-2" placeholder="sub_…"/></label><label className="text-xs">ID do cliente no Asaas<input required pattern="cus_[a-zA-Z0-9]+" value={customer} onChange={e=>setCustomer(e.target.value)} className="w-full border rounded p-2" placeholder="cus_…"/></label><button disabled={busy} className="btn btn-outline text-xs">Vincular assinatura</button><p className="text-[11px]">Requer configurar a conta e os segredos no servidor. Nunca cole chaves de API neste formulário.</p></form></details>
   {!cliente.cancelAt&&<button onClick={cancelar} disabled={busy} className="btn btn-outline text-xs">Agendar cancelamento</button>}
   {solicitacoes.length>0&&<div><h3 className="text-xs font-semibold">Solicitações do cliente</h3>{solicitacoes.map(s=><article key={s.id} className="border-b py-2 text-xs"><strong>{s.tipo==='cancelamento'?'Cancelamento':'Alteração'} · {s.status}</strong><p className="whitespace-pre-wrap py-1">{s.texto}</p>{s.status==='pendente'&&<button disabled={busy} className="underline" onClick={()=>executar(async()=>{const{error}=await supabase.from('solicitacoes').update({status:'concluida'}).eq('id',s.id);if(error)throw error},'Solicitação marcada como concluída.')}>Marcar como concluída</button>}</article>)}</div>}
  </>}
  <p className="text-[11px]" style={{color:TOKENS.muted}}>Cobrança recorrente depende de configurar o provedor. Este painel registra recebimentos manuais; não efetua débitos.</p>
  {aviso&&<p role="status" className="text-xs">{aviso}</p>}
 </section>
}
