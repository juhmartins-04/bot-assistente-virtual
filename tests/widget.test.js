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
