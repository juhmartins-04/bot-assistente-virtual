import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import redirect from '../cloudflare/legacy-redirect.js'

const repo = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '')

test('vitrine e demonstrações distinguem página, conjunto e instalação no site existente', async () => {
  const fixture = await build({
    stdin: { contents: `export {default as Landing} from '${repo}/src/Landing.jsx';export {default as DemoPage} from '${repo}/src/DemoPage.jsx';export {TemaProvider} from '${repo}/src/useTema.js';`, resolveDir: repo },
    bundle: true, write: false, platform: 'node', format: 'esm',
    banner: { js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);" },
    external: ['react', 'react-dom', 'react-dom/client'],
    define: { 'import.meta.env': '{}' },
    plugins: [{ name: 'sem-css', setup(b) { b.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' })) } }],
  })
  mkdirSync(repo + '/node_modules/.cache', { recursive: true })
  const path = repo + '/node_modules/.cache/demo-experiencias.mjs'
  writeFileSync(path, fixture.outputFiles[0].text)
  const previous = Object.fromEntries(['window', 'document', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'].map(k => [k, globalThis[k]]))
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://pronto.example/' })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
  globalThis.fetch = () => { throw new Error('A demo não deve acessar a rede neste teste') }
  const { default: React, act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { Landing, DemoPage, TemaProvider } = await import('file://' + path)
  let root
  const mount = async Component => {
    if (root) await act(async () => root.unmount())
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(TemaProvider, null, React.createElement(Component))))
  }
  const button = text => [...document.querySelectorAll('button')].find(b => b.textContent === text)
  const click = async text => act(async () => button(text).click())
  try {
    await mount(Landing)
    assert.equal(document.querySelectorAll('#exemplos .pr-template-preview').length, 6)
    const cards = [...document.querySelectorAll('#exemplos .pr-template-grid article')]
    assert.deepEqual(cards.map(card => card.querySelector('h3').textContent), ['Pet & Carinho', 'Conecta Tech', 'Ateliê Linha & Ponto', 'Leve Lavanderia', 'Casa em Dia', 'Studio Aurora'])
    const paginas = cards.map(card => ({ url: card.querySelector('iframe').src, nome: card.querySelector('h3').textContent }))
    assert.equal(new Set(paginas.map(p => new URL(p.url).searchParams.get('segmento'))).size, 6)
    for (const frame of document.querySelectorAll('#exemplos iframe')) {
      assert.equal(new URL(frame.src).searchParams.get('experiencia'), 'pagina')
      assert.equal(frame.getAttribute('loading'), 'lazy')
    }
    await click('Só página')
    assert.match(document.querySelector('#demonstracao iframe').src, /experiencia=pagina/)
    assert.equal(button('Só página').getAttribute('aria-pressed'), 'true')
    await click('Só assistente')
    assert.equal(document.querySelector('#demonstracao select'), null)
    assert.match(document.querySelector('#demonstracao iframe').src, /experiencia=assistente/)
    assert.match(document.querySelector('#demonstracao [aria-live]').textContent, /Seu site continua/)
    await click('Página + assistente')
    assert.ok(document.querySelector('#demonstracao select'))

    for (const pagina of paginas) {
      dom.reconfigure({ url: pagina.url })
      await mount(DemoPage)
      assert.equal(document.querySelector('.biz-hero h1').textContent, pagina.nome)
      assert.equal(document.querySelector('script[src="/atendente-virtual-widget.js"]'), null)
    }

    for (const modo of ['pagina', 'assistente', 'completo']) {
      dom.reconfigure({ url: `https://pronto.example/demo?embed=1&experiencia=${modo}` })
      await mount(DemoPage)
      assert.equal(!!document.querySelector('script[src="/atendente-virtual-widget.js"]'), modo !== 'pagina')
      assert.equal(!!document.querySelector('.biz-page'), modo !== 'assistente')
      if (modo === 'pagina') {
        assert.equal(document.querySelector('.biz-assistant-note'), null)
        assert.equal(dom.window.ATENDENTE_CONFIG, undefined)
      } else {
        assert.equal(dom.window.ATENDENTE_CONFIG.capturarContato, false)
        assert.equal(dom.window.ATENDENTE_CONFIG.publicId, undefined)
      }
      if (modo === 'assistente') assert.match(document.body.textContent, /SIMULAÇÃO · SITE JÁ EXISTENTE/)
    }
    dom.reconfigure({ url: 'https://pronto.example/demo?experiencia=pagina&modelo=cartao' })
    await mount(DemoPage)
    await click('Só assistente')
    assert.match(document.querySelector('iframe').src, /experiencia=assistente/)
    await click('Celular')
    assert.equal(document.querySelector('iframe').style.width, '360px')
    await click('Só página')
    assert.match(document.querySelector('iframe').src, /modelo=cartao&experiencia=pagina/)
  } finally {
    if (root) await act(async () => root.unmount())
    dom.window.close()
    Object.assign(globalThis, previous)
  }
})

test('endereço antigo preserva página e parâmetros sem permitir redirecionamento externo', () => {
  for (const path of ['/', '/p/identificador?utm_source=instagram', '/atendente-virtual-widget.js', '//evil.example/?redirect=https://evil.example']) {
    const response = redirect.fetch(new Request('https://bot-assistente-virtual.juuhhzinha2000.workers.dev' + path))
    const location = new URL(response.headers.get('Location'))
    assert.equal(response.status, 308)
    assert.equal(location.origin, 'https://pronto.juuhhzinha2000.workers.dev')
    assert.equal(location.pathname + location.search, path)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*')
  }
})
