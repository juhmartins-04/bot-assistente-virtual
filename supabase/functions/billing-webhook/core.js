export async function tokenValido(recebido, esperado) {
 if (!esperado || esperado.length < 32 || !recebido) return false
 const enc = new TextEncoder()
 const hashes = await Promise.all([recebido, esperado].map(v => crypto.subtle.digest('SHA-256', enc.encode(v))))
 const a = new Uint8Array(hashes[0]), b = new Uint8Array(hashes[1]); let diferenca = 0
 for (let i = 0; i < a.length; i++) diferenca |= a[i] ^ b[i]
 return diferenca === 0
}

export function pagamentoVerificado(evento, pagamento, assinatura, hoje = new Date()) {
 const tipos = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED', 'PAYMENT_REFUNDED', 'PAYMENT_DELETED']
 if (!evento?.id || !tipos.includes(evento.event) || !/^pay_[a-zA-Z0-9]+$/.test(evento.payment?.id || '')) throw new Error('Evento inválido')
 if (pagamento.id !== evento.payment.id || !pagamento.subscription || pagamento.customer !== assinatura.customer || pagamento.subscription !== assinatura.id || assinatura.cycle !== 'MONTHLY') throw new Error('Vínculo inválido')
 const valor = Math.round(Number(pagamento.value) * 100)
 if (![9700, 14700, 19700].includes(valor) || Math.round(Number(assinatura.value) * 100) !== valor) throw new Error('Valor inválido')
 const pago = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(evento.event)
 if (pago && !['RECEIVED', 'CONFIRMED'].includes(pagamento.status)) throw new Error('Pagamento não confirmado')
 if (evento.event === 'PAYMENT_REFUNDED' && pagamento.status !== 'REFUNDED') throw new Error('Estorno não confirmado')
 if (evento.event === 'PAYMENT_DELETED' && pagamento.deleted !== true) throw new Error('Exclusão não confirmada')
 const data = pagamento.confirmedDate || pagamento.paymentDate || pagamento.clientPaymentDate
 if (pago && !/^\d{4}-\d{2}-\d{2}$/.test(data || '')) throw new Error('Data do pagamento ausente')
 const recebido = pago ? new Date(`${data}T12:00:00-03:00`) : hoje
 if (Number.isNaN(recebido.getTime()) || recebido > new Date(hoje.getTime() + 86400000)) throw new Error('Data inválida')
 // Credit the monthly cycle from its due date; retrying never extends the period.
 if (!/^\d{4}-\d{2}-\d{2}$/.test(pagamento.dueDate || '')) throw new Error('Vencimento inválido')
 const vencimento = new Date(`${pagamento.dueDate}T12:00:00-03:00`)
 const validade = new Date(vencimento); const dia = validade.getUTCDate(); validade.setUTCDate(1); validade.setUTCMonth(validade.getUTCMonth() + 1); validade.setUTCDate(Math.min(dia, new Date(Date.UTC(validade.getUTCFullYear(), validade.getUTCMonth() + 1, 0)).getUTCDate()))
 if (Number.isNaN(validade.getTime()) || (pago && (validade <= recebido || validade - recebido > 32 * 86400000))) throw new Error('Período incompatível: conciliação manual necessária')
 return { p_event: evento.id, p_payment: pagamento.id, p_subscription: assinatura.id, p_customer: pagamento.customer, p_tipo: evento.event, p_valor: valor, p_pago: recebido.toISOString(), p_validade: validade.toISOString() }
}
