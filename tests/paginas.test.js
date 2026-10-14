import test from 'node:test'
import assert from 'node:assert/strict'
import { aplicarPlano, normalizarCliente, validarCliente, checklistPagina, acessoPublicado } from '../src/paginas.js'
import { PRECOS, NOMES_PLANOS } from '../src/negocio.js'
import { PLANOS } from '../src/comercial.js'
const base={nomeNegocio:'Negócio fictício',numeroWhatsApp:'5541999999999',corPrimaria:'#386951',layout:'classico',opcoes:[]}
test('Só Página salva sem campos ou traduções do assistente',()=>{
 const c=aplicarPlano({...base,opcoes:[{tipo:'agenda',linkAgenda:''}]},'pagina')
 assert.equal(c.incluiAssistente,false);assert.equal(c.incluiPagina,true);assert.deepEqual(validarCliente(c),[])
})
test('os três planos ativam exatamente os recursos contratados',()=>{
 const assistente=aplicarPlano(base,'assistente');assert.equal(assistente.incluiPagina,false);assert.equal(assistente.incluiAssistente,true)
 const completo=aplicarPlano(base,'completo');assert.equal(completo.incluiPagina,true);assert.equal(completo.incluiAssistente,true)
 assert.equal(normalizarCliente({...base,incluiAssistente:false}).plano,'pagina')
})
test('português completo basta; menu vazio ou link inseguro impede publicação',()=>{
 const c=aplicarPlano({...base,opcoes:[{tipo:'resposta',labelPt:'Horário',respostaPt:'Das 9h às 18h'}]},'completo')
 assert.deepEqual(validarCliente(c),[])
 assert.ok(validarCliente({...c,opcoes:[]}).length)
 assert.ok(validarCliente({...c,opcoes:[{tipo:'agenda',labelPt:'Agenda',linkAgenda:'javascript:alert(1)'}]}).some(e=>e.includes('agenda')))
})
test('cardápio informa item incompleto e limita o escopo a vinte itens',()=>{
 const c=aplicarPlano({...base,layout:'cardapio'},'pagina')
 assert.ok(validarCliente({...c,itensCardapio:[{nome:'',preco:'R$ 10'}]}).length)
 assert.deepEqual(validarCliente({...c,itensCardapio:[{nome:'Café',descricao:'Exemplo',categoria:'Bebidas',preco:'R$ 10'}]}),[])
 assert.ok(validarCliente({...c,itensCardapio:Array.from({length:21},()=>({nome:'Item'}))}).some(e=>e.includes('vinte')))
})
test('checklist distingue identificador salvo de alterações ainda pendentes',()=>{
 const c=aplicarPlano({...base,publicId:'exemplo',sobreNegocio:'Exemplo'},'pagina')
 assert.equal(checklistPagina(c).at(-1).ok,true);assert.equal(checklistPagina(c,true).at(-1).ok,false)
 assert.equal(acessoPublicado({...c,status:'suspended'}),false)
 assert.equal(acessoPublicado({...c,status:'trial',trialEndsAt:'2026-10-15'},Date.parse('2026-10-14')),true)
 assert.equal(acessoPublicado({...c,status:'trial',trialEndsAt:'2026-10-13'},Date.parse('2026-10-14')),false)
})
test('nomes e preços do site correspondem à cobrança do painel',()=>{
 for(const [k,nome]of Object.entries(NOMES_PLANOS)){
  const plano=PLANOS.find(p=>p.nome===nome);assert.ok(plano);assert.equal(plano.preco,PRECOS[k])
 }
})
