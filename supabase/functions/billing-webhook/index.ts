import { tokenValido, pagamentoVerificado } from './core.js'

const resposta = (status: number, texto: string) => new Response(JSON.stringify({ message: texto }), { status, headers: { 'Content-Type': 'application/json' } })
Deno.serve(async (req: Request) => {
 if (req.method !== 'POST') return resposta(405, 'Método inválido')
 const apiKey = Deno.env.get('ASAAS_API_KEY'), token = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
 if (!apiKey || !token) return resposta(503, 'Cobrança ainda não configurada')
 if (!await tokenValido(req.headers.get('asaas-access-token'), token)) return resposta(401, 'Autenticação inválida')
 if (Number(req.headers.get('content-length') || 0) > 32768) return resposta(413, 'Evento muito grande')
 try {
  const texto = await req.text(); if (texto.length > 32768) return resposta(413, 'Evento muito grande')
  const evento = JSON.parse(texto)
  if (!['PAYMENT_RECEIVED','PAYMENT_CONFIRMED','PAYMENT_REFUNDED','PAYMENT_DELETED'].includes(evento.event)) return resposta(200, 'Evento ignorado')
  if (!/^pay_[a-zA-Z0-9]+$/.test(evento.payment?.id || '')) return resposta(400, 'Pagamento inválido')
  const ambiente = Deno.env.get('ASAAS_ENV') || 'sandbox'
  if (!['sandbox','production'].includes(ambiente)) return resposta(503, 'Ambiente não configurado')
  const base = ambiente === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'
  async function consultar(caminho: string) {
   const r = await fetch(base + caminho, { headers: { access_token: apiKey!, 'User-Agent': 'Pronto-Billing/1.0' }, signal: AbortSignal.timeout(10000) })
   if (!r.ok) throw new Error('Falha de conciliação'); return r.json()
  }
  const pagamento = await consultar(`/payments/${encodeURIComponent(evento.payment.id)}`)
  if (!/^sub_[a-zA-Z0-9]+$/.test(pagamento.subscription || '')) return resposta(400, 'Assinatura inválida')
  const assinatura = await consultar(`/subscriptions/${encodeURIComponent(pagamento.subscription)}`)
  const payload = pagamentoVerificado(evento, pagamento, assinatura)
  const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, url = Deno.env.get('SUPABASE_URL')!
  const r = await fetch(`${url}/rest/v1/rpc/processar_pagamento`, { method: 'POST', headers: { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(10000) })
  if (!r.ok) { console.error('billing-webhook: pagamento não conciliado', { status: r.status }); return resposta(422, 'Pagamento requer conciliação') }
  return resposta(200, 'Evento processado')
 } catch { console.error('billing-webhook: falha de validação ou consulta'); return resposta(422, 'Evento requer conciliação') }
})
