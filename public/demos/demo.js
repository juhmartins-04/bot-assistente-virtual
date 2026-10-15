import { DEMOS, configWidget } from './catalogo.js'

export function iniciarDemo(win = window) {
  const doc = win.document
  const demo = DEMOS.find(d => d.id === doc.body.dataset.demo)
  const themeButton = doc.querySelector('[data-theme-toggle]')
  function aplicarTema(tema) {
    doc.documentElement.dataset.theme = tema
    if (themeButton) {
      themeButton.textContent = tema === 'dark' ? 'Modo claro ☀' : 'Modo escuro ◐'
      themeButton.setAttribute('aria-pressed', String(tema === 'dark'))
    }
  }
  let salvo
  try { salvo = win.localStorage.getItem('pronto-tema') } catch { /* preferência opcional */ }
  aplicarTema(['light', 'dark'].includes(salvo) ? salvo : (win.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  themeButton?.addEventListener('click', () => {
    const tema = doc.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    aplicarTema(tema)
    try { win.localStorage.setItem('pronto-tema', tema) } catch { /* tema permanece nesta página */ }
  })
  if (!demo) return
  const status = doc.querySelector('[data-widget-status]')
  const controls = [...doc.querySelectorAll('[data-open-assistant], [data-question]')]
  const buttons = [...doc.querySelectorAll('[data-format]')]
  function setFormato(formato) {
    doc.documentElement.dataset.format = formato
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.format === formato)))
    const note = doc.querySelector('[data-mode-note]')
    if (note) note.textContent = formato === 'sem'
      ? 'Simulação sem assistente: o visitante procura as informações no conteúdo do site.'
      : formato === 'pagina'
        ? 'Modo Só página. Ao experimentar uma pergunta, você volta para Página + Assistente.'
        : demo.tipo === 'assistente'
          ? 'Assistente ativo: teste o menu no canto da tela. A estrutura ilustrativa do site permanece a mesma.'
          : 'Modo Página + Assistente. Abra o menu no canto da tela ou escolha uma pergunta abaixo.'
  }
  buttons.forEach(b => b.addEventListener('click', () => setFormato(b.dataset.format)))
  controls.forEach(b => b.addEventListener('click', () => {
    setFormato(demo.tipo === 'assistente' ? 'com' : 'completo')
    const root = doc.querySelector('[data-atendente-widget]')
    if (!root) return
    const launcher = root.querySelector('.avw-fab')
    // Abrir novamente reinicia o menu e permite testar qualquer pergunta.
    launcher?.click()
    if (b.hasAttribute('data-question')) {
      const i = Number(b.dataset.question)
      root.querySelectorAll('.avw-option')[i]?.click()
    }
  }))
  win.ATENDENTE_CONFIG = configWidget(demo)
  const script = doc.createElement('script')
  script.src = '/atendente-virtual-widget.js'
  script.async = true
  function concluir() {
    const pronto = !!doc.querySelector('[data-atendente-widget]')
    controls.forEach(b => { b.disabled = !pronto })
    if (status) status.textContent = pronto
      ? 'Assistente pronto. Escolha uma pergunta para ver a resposta real.'
      : 'Não foi possível carregar o assistente. Recarregue a página ou fale com a Juh pelo botão da proposta.'
  }
  script.addEventListener('load', concluir)
  script.addEventListener('error', concluir)
  doc.body.appendChild(script)
  setFormato(demo.tipo === 'assistente' ? 'com' : 'completo')
}

if (typeof window !== 'undefined') iniciarDemo(window)
