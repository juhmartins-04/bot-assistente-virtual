import test from 'node:test'
import assert from 'node:assert/strict'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { TemaProvider, useTema } from '../src/useTema.js'
import { luminancia, textoSobreCor } from '../src/cores.js'

function Controle() {
  const { tema, alternar } = useTema()
  return React.createElement('button', { onClick: alternar }, tema)
}

test('tema sincroniza controles, mantém escolha manual e aceita alteração em outra aba', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://pronto.example' })
  const anteriores = { window: globalThis.window, document: globalThis.document, IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  let ouvir
  dom.window.matchMedia = () => ({ matches: false, addEventListener: (_, fn) => { ouvir = fn }, removeEventListener() {} })
  const root = createRoot(dom.window.document.getElementById('root'))
  try {
    await act(async () => root.render(React.createElement(TemaProvider, null, React.createElement(Controle), React.createElement(Controle))))
    const botoes = dom.window.document.querySelectorAll('button')
    assert.deepEqual([...botoes].map(b => b.textContent), ['light', 'light'])
    await act(async () => ouvir({ matches: true }))
    assert.equal(dom.window.document.documentElement.dataset.theme, 'dark')
    await act(async () => botoes[0].click())
    await act(async () => ouvir({ matches: true }))
    assert.deepEqual([...botoes].map(b => b.textContent), ['light', 'light'])
    assert.equal(dom.window.document.documentElement.dataset.theme, 'light')
    dom.window.localStorage.setItem('pronto-tema', 'dark')
    await act(async () => dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: 'pronto-tema' })))
    assert.deepEqual([...botoes].map(b => b.textContent), ['dark', 'dark'])
    // Navegador bloqueando armazenamento não impede alternar o tema.
    Object.defineProperty(dom.window, 'localStorage', { get() { throw new Error('blocked') } })
    await act(async () => botoes[1].click())
    assert.equal(dom.window.document.documentElement.dataset.theme, 'light')
  } finally {
    await act(async () => root.unmount())
    dom.window.close()
    Object.assign(globalThis, anteriores)
  }
})

test('texto escolhido mantém contraste mínimo em cores claras, escuras e intermediárias', () => {
  for (const cor of ['#ffffff', '#000000', '#21c3cb', '#234c3e', '#777777', '#ffff00', '#ff00ff', '#186fff']) {
    const l = luminancia(cor), texto = textoSobreCor(cor)
    const contraste = texto === '#ffffff' ? 1.05 / (l + .05) : (l + .05) / .05
    assert.ok(contraste >= 4.5, `${cor}: ${contraste}`)
  }
})
