import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const codigo = readFileSync(new URL('../public/atendente-virtual-widget.js', import.meta.url), 'utf8')
const config = {
  nomeNegocio: 'Negócio de exemplo', numeroWhatsApp: '5541999999999', idiomaPadrao: 'auto',
  saudacaoPt: 'Olá!', saudacaoEn: 'Hello!', transferirLabelPt: 'Falar sobre o projeto', transferirLabelEn: 'Talk about the project',
  transferirMensagemWhatsPt: 'Quero conhecer o projeto', transferirMensagemWhatsEn: 'Tell me about the project',
  opcoes: [{ labelPt: 'Horário', labelEn: 'Hours', tipo: 'resposta', respostaPt: 'Das 9h às 18h', respostaEn: '9am to 6pm' }],
}

async function widgetExterno(t,{preview=false,status=200,dados=config,local=null,publicId='00000000-0000-4000-8000-000000000001'}={}) {
 const dom=new JSDOM('<!doctype html><html><body><button id="botao-do-cliente">Site existente</button></body></html>',{url:'https://site-do-cliente.example/servicos',runScripts:'outside-only'})
 t.after(()=>dom.window.close())
 const {window}=dom,doc=window.document,chamadas=[],estados=[]
 const script=doc.createElement('script');script.src='https://pronto.example/atendente-virtual-widget.js';script.dataset.site=publicId
 if(preview)script.dataset.preview='true'
 doc.body.appendChild(script)
 Object.defineProperty(doc,'currentScript',{value:script})
 if(local)window.ATENDENTE_CONFIG=local
 window.addEventListener('pronto:widget-status',e=>estados.push(e.detail.estado))
 window.fetch=async(url,options)=>{chamadas.push({url,method:options?.method||'GET'});return {ok:status===200,json:async()=>dados?[{dados}]:[]}}
 window.eval(codigo)
 await new Promise(r=>setImmediate(r))
 return {window,doc,chamadas,estados}
}

test('site externo carrega configuração remota e CSS da origem Prontô sem sobrescrever o site',async t=>{
 const {doc,chamadas,estados}=await widgetExterno(t,{local:{...config,nomeNegocio:'Configuração local indevida'}})
 assert.equal(doc.querySelector('.avw-title').textContent,config.nomeNegocio)
 assert.equal(doc.querySelector('[data-atendente-widget] link[rel="stylesheet"]').href,'https://pronto.example/atendente-virtual-widget.css')
 assert.equal(doc.querySelector('[data-atendente-widget] style'),null)
 assert.equal(doc.querySelector('#botao-do-cliente').textContent,'Site existente')
 assert.equal(chamadas.filter(c=>c.method==='GET').length,1)
 assert.deepEqual(estados,['pronto'])
})

test('conferência do cliente real consulta conteúdo sem registrar visitas ou contatos',async t=>{
 const {doc,chamadas}=await widgetExterno(t,{preview:true})
 doc.querySelector('.avw-fab').click()
 doc.querySelector('.avw-option').click()
 ;[...doc.querySelectorAll('.avw-option')].at(-1).click()
 assert.equal(doc.querySelectorAll('input').length,0)
 assert.equal(chamadas.filter(c=>c.method==='POST').length,0)
 assert.ok(doc.querySelector('.avw-link-btn'))
})

test('falhas, expiração e plano sem assistente não interrompem a página do cliente',async t=>{
 for(const [options,estado] of [[{status:500},'erro'],[{dados:null},'indisponivel'],[{dados:{...config,incluiAssistente:false}},'indisponivel'],[{publicId:'id-invalido'},'erro']]){
  const {doc,estados}=await widgetExterno(t,options)
  assert.equal(doc.querySelector('[data-atendente-widget]'),null)
  assert.ok(doc.querySelector('#botao-do-cliente'))
  assert.deepEqual(estados,[estado])
 }
})

function abrirWidget(overrides = {}, language = 'pt-BR', clicar = true) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://exemplo.com/demo', runScripts: 'outside-only' })
  Object.defineProperty(dom.window.navigator, 'language', { value: language })
  const chamadas = []
  dom.window.fetch = (...args) => { chamadas.push(args); return Promise.resolve({ ok: true, json: async () => [] }) }
  dom.window.ATENDENTE_CONFIG = { ...config, ...overrides }
  dom.window.eval(codigo)
  if (clicar) dom.window.document.querySelector('.avw-fab').click()
  return { dom, document: dom.window.document, chamadas }
}

async function abrirWidgetRemoto(t, overrides = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://exemplo.com', runScripts: 'outside-only' })
  t.after(() => dom.window.close())
  const script = dom.window.document.createElement('script')
  script.src = 'https://usarpronto.vercel.app/atendente-virtual-widget.js'
  dom.window.document.body.appendChild(script)
  script.dataset.site = '00000000-0000-4000-8000-000000000001'
  Object.defineProperty(dom.window.document, 'currentScript', { value: script })
  const chamadas = []
  dom.window.fetch = async (url, options) => {
    if (options?.method === 'POST') chamadas.push({ url, body: JSON.parse(options.body) })
    return { ok: true, json: async () => [{ dados: { ...config, ...overrides } }] }
  }
  dom.window.eval(codigo)
  await new Promise(resolve => setImmediate(resolve))
  const document = dom.window.document
  document.querySelector('.avw-fab').click()
  ;[...document.querySelectorAll('.avw-option')].at(-1).click()
  document.addEventListener('click', event => {
    if (event.target.closest('a')) event.preventDefault()
  })
  return { document, chamadas }
}

test('pular a coleta não conta WhatsApp até o clique no link', async (t) => {
  const { document, chamadas } = await abrirWidgetRemoto(t)
  document.querySelector('.avw-lead-pular').click()
  assert.equal(chamadas.filter(c => c.body.tipo === 'handoff_whatsapp').length, 0)
  document.querySelector('.avw-link-btn').click()
  assert.equal(chamadas.filter(c => c.body.tipo === 'handoff_whatsapp').length, 1)
  assert.equal(chamadas.filter(c => c.url.endsWith('/leads')).length, 0)
})

test('continuar com contato conta um clique e preserva a captura opcional', async (t) => {
  const { document, chamadas } = await abrirWidgetRemoto(t)
  document.querySelector('.avw-lead-nome').value = 'Pessoa fictícia'
  document.querySelector('.avw-lead-continuar').click()
  assert.equal(chamadas.filter(c => c.body.tipo === 'handoff_whatsapp').length, 1)
  assert.equal(chamadas.filter(c => c.url.endsWith('/leads')).length, 1)
})

test('sem coleta, apresentar o botão não conta como clique no WhatsApp', async (t) => {
  const { document, chamadas } = await abrirWidgetRemoto(t, { capturarContato: false })
  assert.equal(chamadas.filter(c => c.body.tipo === 'handoff_whatsapp').length, 0)
  document.querySelector('.avw-link-btn').click()
  assert.equal(chamadas.filter(c => c.body.tipo === 'handoff_whatsapp').length, 1)
})

test('idioma automático usa o inglês do navegador e responde em inglês', (t) => {
  const { dom, document } = abrirWidget({}, 'en-US'); t.after(() => dom.window.close())
  assert.equal(document.querySelector('.avw-msg').textContent, 'Hello!')
  assert.equal(document.querySelector('.avw-option').textContent, 'Hours')
  document.querySelector('.avw-option').click()
  assert.equal([...document.querySelectorAll('.avw-msg')].at(-1).textContent, '9am to 6pm')
})

test('o idioma configurado pelo negócio tem prioridade sobre o navegador', (t) => {
  const { dom, document } = abrirWidget({ idiomaPadrao: 'pt' }, 'en-US'); t.after(() => dom.window.close())
  assert.equal(document.querySelector('.avw-msg').textContent, 'Olá!')
})

test('a demonstração abre WhatsApp sem formulário de contato nem chamadas ao banco', (t) => {
  const { dom, document, chamadas } = abrirWidget({ capturarContato: false }); t.after(() => dom.window.close())
  ;[...document.querySelectorAll('.avw-option')].at(-1).click()
  assert.equal(document.querySelectorAll('input').length, 0)
  assert.match(document.querySelector('.avw-link-btn').href, /^https:\/\/wa\.me\/5541999999999\?text=/)
  assert.deepEqual(chamadas, [])
})

test('clientes existentes continuam tendo contato opcional por padrão', (t) => {
  const { dom, document } = abrirWidget(); t.after(() => dom.window.close())
  ;[...document.querySelectorAll('.avw-option')].at(-1).click()
  assert.ok(document.querySelector('.avw-lead-nome'))
  assert.ok(document.querySelector('.avw-lead-pular'))
})

test('Escape fecha a conversa, devolve o foco e atualiza o estado acessível', (t) => {
  const { dom, document } = abrirWidget(); t.after(() => dom.window.close())
  const fab = document.querySelector('.avw-fab')
  assert.equal(fab.getAttribute('aria-expanded'), 'true')
  assert.equal(document.activeElement, document.querySelector('.avw-option'))
  document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  assert.equal(fab.getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, fab)
  assert.equal(document.querySelector('.avw-panel').classList.contains('is-open'), false)
})

test('textos de respostas são exibidos como texto, sem interpretar HTML', (t) => {
  const { dom, document } = abrirWidget({ opcoes: [{ labelPt: '<img src=x>', tipo: 'resposta', respostaPt: '<script>exemplo</script>' }] })
  t.after(() => dom.window.close())
  document.querySelector('.avw-option').click()
  assert.equal(document.querySelectorAll('.avw-msg script').length, 0)
  assert.equal([...document.querySelectorAll('.avw-msg')].at(-1).textContent, '<script>exemplo</script>')
})

test('a demonstração abre o menu sem roubar o foco da página', (t) => {
  const { dom, document } = abrirWidget({ abertoInicialmente: true }, 'pt-BR', false)
  t.after(() => dom.window.close())
  assert.equal(document.querySelector('.avw-panel').classList.contains('is-open'), true)
  assert.equal(document.activeElement, document.body)
})

test('cor clara usa texto escuro e uma cor inválida recebe alternativa segura', (t) => {
  const claro = abrirWidget({ corPrimaria: '#ffff00' })
  const invalido = abrirWidget({ corPrimaria: 'url(https://exemplo.com)' })
  t.after(() => { claro.dom.window.close(); invalido.dom.window.close() })
  assert.equal(claro.document.querySelector('[data-atendente-widget]').style.getPropertyValue('--avw-on-brand'), '#000000')
  assert.equal(invalido.document.querySelector('[data-atendente-widget]').style.getPropertyValue('--avw-cor'), '#2f6f62')
})
