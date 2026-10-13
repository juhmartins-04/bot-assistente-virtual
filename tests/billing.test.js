import test from 'node:test'
import assert from 'node:assert/strict'
import {tokenValido,pagamentoVerificado} from '../supabase/functions/billing-webhook/core.js'
const evento={id:'evt_123',event:'PAYMENT_RECEIVED',payment:{id:'pay_123'}}
const pagamento={id:'pay_123',subscription:'sub_123',customer:'cus_123',value:197,status:'RECEIVED',confirmedDate:'2026-10-11',dueDate:'2026-10-11'}
const assinatura={id:'sub_123',customer:'cus_123',value:197,cycle:'MONTHLY'}
test('webhook exige token configurado e compara o token recebido',async()=>{assert.equal(await tokenValido('a'.repeat(32),'a'.repeat(32)),true);assert.equal(await tokenValido('b'.repeat(32),'a'.repeat(32)),false);assert.equal(await tokenValido('x',undefined),false)})
test('pagamento canônico define período determinístico',()=>{const r=pagamentoVerificado(evento,pagamento,assinatura,new Date('2026-10-11T18:00Z'));assert.equal(r.p_valor,19700);assert.equal(r.p_validade,'2026-11-11T15:00:00.000Z')})
test('webhook rejeita conta, preço, status e vencimento divergentes',()=>{for(const alteracao of[{customer:'cus_other'},{value:1},{status:'PENDING'},{dueDate:'invalid'}])assert.throws(()=>pagamentoVerificado(evento,{...pagamento,...alteracao},assinatura,new Date('2026-10-11T18:00Z')))})
