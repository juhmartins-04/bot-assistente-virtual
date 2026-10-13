import React, { useEffect, useState } from 'react'
import { supabase } from './utils/supabase'
import BusinessPage from './BusinessPage'
import { useWidget } from './useWidget'

export default function Pagina({ publicId }) {
 const [estado,setEstado]=useState('carregando'),[dados,setDados]=useState(null)
 useEffect(()=>{
  let cancelado=false
  supabase.from('widget_config').select('dados').eq('public_id',publicId).maybeSingle().then(({data,error})=>{
   if(cancelado)return
   if(error||!data||data.dados.incluiPagina===false){setEstado('indisponivel');return}
   setDados({...data.dados,publicId});setEstado('ok')
  })
  return()=>{cancelado=true}
 },[publicId])
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
 if(estado!=='ok')return <main className="biz-page" style={{display:'grid',placeItems:'center',textAlign:'center'}}><div><p role="status">{estado==='carregando'?'Carregando…':'Esta página está temporariamente indisponível.'}</p>{estado!=='carregando'&&<a href="/">Conhecer o Prontô</a>}</div></main>
 return <BusinessPage dados={dados} onWhatsApp={()=>registrar('pagina_whatsapp')}/>
}
