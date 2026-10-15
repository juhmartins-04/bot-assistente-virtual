import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'
import { DEMOS, WHATSAPP } from '../public/demos/catalogo.js'
import { iniciarDemo } from '../public/demos/demo.js'

const widget = readFileSync(new URL('../public/atendente-virtual-widget.js', import.meta.url),'utf8')
function montar(t,d,carregar=true) {
  const html = readFileSync(new URL(`../public/demos/${d.id}.html`,import.meta.url),'utf8')
  const dom = new JSDOM(html,{url:`https://pronto.example/demos/${d.id}`,runScripts:'outside-only'})
  t.after(()=>dom.window.close())
  const chamadas=[]
  dom.window.fetch=(...args)=>{chamadas.push(args);throw Error('Demo não deve acessar banco')}
  iniciarDemo(dom.window)
  const script=dom.window.document.querySelector('script[src="/atendente-virtual-widget.js"]')
  if(carregar){dom.window.eval(widget);script.dispatchEvent(new dom.window.Event('load'))}
  return {dom,doc:dom.window.document,chamadas,script}
}
for(const d of DEMOS) {
  test(`${d.id}: página e assistente mostram a oferta correta e cinco respostas funcionais`,t=>{
    const {dom,doc,chamadas}=montar(t,d)
    assert.equal(doc.querySelectorAll('h1').length,1)
    assert.match(doc.querySelector('meta[name="robots"]').content,/noindex/)
    assert.match(doc.body.textContent,/marca e conteúdo fictícios/)
    assert.equal(doc.querySelectorAll('[data-atendente-widget]').length,1)
    assert.equal(doc.querySelector('script[data-site]'),null)
    assert.equal(dom.window.ATENDENTE_CONFIG.capturarContato,false)
    assert.equal(dom.window.ATENDENTE_CONFIG.opcoes.length,5)
    for(const [i,b] of [...doc.querySelectorAll('[data-question]')].entries()) {
      assert.equal(b.disabled,false);b.click()
      assert.equal(doc.querySelector('.avw-panel').classList.contains('is-open'),true)
      assert.equal([...doc.querySelectorAll('.avw-msg')].at(-1).textContent,d.perguntas[i][1])
    }
    const preco=doc.querySelector('.price').textContent
    assert.match(preco,d.tipo==='assistente'?/R\$147/:/R\$197/)
    if(d.tipo==='assistente') {
      assert.equal(doc.querySelector('#servicos'),null)
      assert.ok(doc.querySelector('#instalacao'))
      assert.doesNotMatch(doc.body.textContent,/R\$97|R\$197/)
    } else assert.ok(doc.querySelector('#servicos'))
    for(const a of doc.querySelectorAll('a[href^="https://wa.me/"]'))assert.equal(new URL(a.href).pathname,`/${WHATSAPP}`)
    const opciones=doc.querySelectorAll('.avw-option');opciones[opciones.length-1].click()
    assert.equal(new URL(doc.querySelector('.avw-link-btn').href).pathname,`/${WHATSAPP}`)
    assert.equal(doc.querySelectorAll('input,form').length,0)
    assert.deepEqual(chamadas,[])
    for(const a of doc.querySelectorAll('a[href^="#"]'))assert.ok(doc.querySelector(a.getAttribute('href')),a.outerHTML)
  })
}
test('comparação mantém a estrutura e as perguntas reativam o assistente',t=>{
  for(const d of [DEMOS[0],DEMOS[5]]){
    const {doc}=montar(t,d)
    const markup=doc.querySelector('main').innerHTML
    const off=doc.querySelector(`[data-format="${d.tipo==='assistente'?'sem':'pagina'}"]`)
    off.click();assert.equal(doc.documentElement.dataset.format,off.dataset.format)
    assert.equal(off.getAttribute('aria-pressed'),'true')
    // Apenas a nota de estado muda; o conteúdo e o widget não são reconstruídos.
    assert.equal(doc.querySelectorAll('[data-atendente-widget]').length,1)
    assert.ok(markup.includes(d.nome)||doc.title.includes(d.nome))
    doc.querySelector('[data-question]').click()
    assert.equal(doc.documentElement.dataset.format,d.tipo==='assistente'?'com':'completo')
    assert.equal(off.getAttribute('aria-pressed'),'false')
  }
})
test('tema usa a mesma preferência do Prontô e funciona nos dois sentidos',t=>{
  const {dom,doc}=montar(t,DEMOS[0])
  const button=doc.querySelector('[data-theme-toggle]')
  button.click();assert.equal(doc.documentElement.dataset.theme,'dark')
  assert.equal(dom.window.localStorage.getItem('pronto-tema'),'dark')
  assert.equal(button.getAttribute('aria-pressed'),'true')
  button.click();assert.equal(doc.documentElement.dataset.theme,'light')
})
test('falha do widget oferece recuperação sem deixar controles sem ação',t=>{
  const {dom,doc,script}=montar(t,DEMOS[5],false)
  script.dispatchEvent(new dom.window.Event('error'))
  assert.equal(doc.querySelector('[data-open-assistant]').disabled,true)
  assert.match(doc.querySelector('[data-widget-status]').textContent,/Recarregue/)
  assert.ok(doc.querySelector('#proposta a[href^="https://wa.me/"]'))
})
test('o catálogo liga às oito demos e cada cor de marca permite texto branco legível',()=>{
  const doc=new JSDOM(readFileSync(new URL('../public/demos/index.html',import.meta.url),'utf8')).window.document
  assert.equal(doc.querySelectorAll('.demo-card').length,8)
  for(const d of DEMOS){
    assert.ok(doc.querySelector(`a[href="/demos/${d.id}"]`))
    const [r,g,b]=[1,3,5].map(i=>parseInt(d.cor.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)
    const ratio=1.05/(.2126*r+.7152*g+.0722*b+.05)
    assert.ok(ratio>=4.5,`${d.id}: contraste ${ratio}`)
  }
})
