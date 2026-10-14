import React, { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import BusinessPage from './BusinessPage'
import { useWidget } from './useWidget'

export default function Pagina({ publicId }) {
 const [estado,setEstado]=useState('carregando'),[dados,setDados]=useState(null),[tentativa,setTentativa]=useState(0)
 useEffect(()=>{
  let cancelado=false
  setEstado('carregando')
  supabase.from('widget_config').select('dados').eq('public_id',publicId).maybeSingle().then(({data,error})=>{
   if(cancelado)return
   if(error){setEstado('erro');return}
   if(!data||data.dados.incluiPagina===false){setEstado('indisponivel');return}
   setDados({...data.dados,publicId});setEstado('ok')
  }).catch(()=>{if(!cancelado)setEstado('erro')})
  return()=>{cancelado=true}
 },[publicId,tentativa])
 useWidget({publicId,ativo:estado==='ok'&&dados?.incluiAssistente!==false})
 useEffect(()=>{
  if(estado!=='ok')return
  const anterior=document.title;document.title=dados.nomeNegocio
  const timer=setTimeout(()=>{registrar('pagina_visualizada')},0)
  return()=>{clearTimeout(timer);document.title=anterior}
 },[estado,dados?.nomeNegocio,publicId])
 function registrar(tipo){
  // Uses an anonymous client so the public collection policy also applies to signed-in visitors.
  const base=import.meta.env.VITE_SUPABASE_URL || 'https://rnlgvlmwwncfrfywszaf.supabase.co'
  fetch(`${base}/rest/v1/pagina_eventos`,{method:'POST',keepalive:true,headers:{apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_x40vbDCMSrdE7uiNGK0U8Q_ODc99VlB','Content-Type':'application/json'},body:JSON.stringify({public_id:publicId,tipo})}).then(r=>{if(!r.ok)console.warn('Não foi possível registrar a interação da página.')}).catch(()=>{})
 }
 if(estado!=='ok')return <main className="biz-page" style={{display:'grid',placeItems:'center',textAlign:'center'}}><div><p role="status">{estado==='carregando'?'Carregando…':estado==='erro'?'Não foi possível carregar a página. Confira sua conexão e tente novamente.':'Esta página está temporariamente indisponível.'}</p>{estado==='erro'&&<button className="btn btn-primary mt-4" onClick={()=>setTentativa(n=>n+1)}>Tentar novamente</button>}{estado!=='carregando'&&<a href="/">Conhecer o Prontô</a>}</div></main>
 return <BusinessPage dados={dados} onWhatsApp={()=>registrar('pagina_whatsapp')}/>
}
