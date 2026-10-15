import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../public/demo-pet.html', import.meta.url), 'utf8');
const widget = readFileSync(new URL('../public/atendente-virtual-widget.js', import.meta.url), 'utf8');

function montarDemo({ carregar = true } = {}) {
 const dom = new JSDOM(html, {
  url: 'https://pronto.example/demo-pet',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
 });
 const { window } = dom;
 const requisicoes = [];
 window.fetch = (...args) => { requisicoes.push(args); throw new Error('A demo não deve fazer chamadas ao banco'); };
 window.HTMLElement.prototype.scrollIntoView = function () {};
 window.eval(window.document.getElementById('demo-controller').textContent);
 const script = window.document.querySelector('script[src="/atendente-virtual-widget.js"]');
 if (carregar) {
  window.eval(widget);
  script.dispatchEvent(new window.Event('load'));
 }
 return { dom, window, document: window.document, requisicoes, script };
}

test('demo pet fictícia distingue proposta do site oficial e mantém os dois planos', () => {
 const { dom, document } = montarDemo();
 try {
  assert.match(document.querySelector('meta[name="robots"]').content, /noindex/);
  assert.equal(document.querySelectorAll('h1').length, 1);
  assert.match(document.body.textContent, /Não é o site oficial/);
  assert.match(document.body.textContent, /R\$97/);
  assert.match(document.body.textContent, /R\$197/);
  assert.match(document.body.textContent, /até 5 perguntas/i);
  assert.match(document.body.textContent, /Até 2 solicitações agrupadas/);
  assert.equal(document.querySelectorAll('form').length, 0);
 } finally { dom.window.close(); }
});

test('assistente real monta no modo local, com cinco perguntas e sem coleta', () => {
 const { dom, document, window, requisicoes } = montarDemo();
 try {
  assert.equal(window.ATENDENTE_CONFIG.opcoes.length, 5);
  assert.equal(window.ATENDENTE_CONFIG.capturarContato, false);
  assert.equal(document.querySelectorAll('[data-atendente-widget]').length, 1);
  assert.equal(document.querySelector('script[data-site]'), null);
  assert.equal(document.querySelector('[data-open-assistant]').disabled, false);
  document.querySelector('[data-open-assistant]').click();
  assert.equal(document.querySelector('.avw-panel').classList.contains('is-open'), true);
  for (let i = 0; i < 5; i++) document.querySelectorAll('.avw-option')[i].click();
  assert.match(document.querySelector('.avw-body').textContent, /horários são ilustrativos/);
  assert.match(document.querySelector('.avw-body').textContent, /não avalia sintomas nem classifica urgências/);
  assert.equal(document.querySelector('.avw-lead'), null);
  assert.deepEqual(requisicoes, []);
 } finally { dom.window.close(); }
});

test('contatos da página e do assistente vão só para a Juh', () => {
 const { dom, document, window, requisicoes } = montarDemo();
 try {
  const numero = window.ATENDENTE_CONFIG.numeroWhatsApp;
  assert.equal(numero, '5541995472287');
  for (const a of document.querySelectorAll('[data-whatsapp]')) {
   const url = new URL(a.href);
   assert.equal(url.origin, 'https://wa.me');
   assert.equal(url.pathname, '/' + numero);
   assert.match(url.searchParams.get('text'), /proposta do Prontô/);
   assert.equal(a.rel, 'noopener noreferrer');
  }
  document.querySelector('[data-open-assistant]').click();
  Array.from(document.querySelectorAll('.avw-option')).at(-1).click();
  const link = document.querySelector('.avw-link-btn');
  assert.equal(new URL(link.href).pathname, '/' + numero);
  assert.equal(document.querySelector('.avw-lead'), null);
  assert.deepEqual(requisicoes, []);
 } finally { dom.window.close(); }
});

test('comparação alterna formatos e botão retorna ao pacote completo', () => {
 const { dom, document } = montarDemo();
 try {
  const pagina = document.querySelector('[data-mode="pagina"]');
  pagina.click();
  assert.equal(document.documentElement.dataset.demoMode, 'pagina');
  assert.equal(pagina.getAttribute('aria-pressed'), 'true');
  assert.match(document.getElementById('mode-note').textContent, /fica oculto/);
  document.querySelector('[data-open-assistant]').click();
  assert.equal(document.documentElement.dataset.demoMode, 'completo');
  assert.equal(pagina.getAttribute('aria-pressed'), 'false');
  assert.equal(document.querySelector('.avw-panel').classList.contains('is-open'), true);
  document.querySelector('[data-mode-choice="pagina"]').click();
  assert.equal(document.documentElement.dataset.demoMode, 'pagina');
  assert.match(document.querySelector('style').textContent, /data-demo-mode=pagina/);
 } finally { dom.window.close(); }
});

test('modo claro e escuro atualiza atributo, rótulo e preferência', () => {
 const { dom, document, window } = montarDemo();
 try {
  const botao = document.getElementById('theme-toggle');
  botao.click();
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(botao.getAttribute('aria-pressed'), 'true');
  assert.equal(window.localStorage.getItem('pronto_demo_tema'), 'dark');
  assert.equal(document.querySelector('meta[name="theme-color"]').content, '#111e26');
  botao.click();
  assert.equal(document.documentElement.dataset.theme, 'light');
  assert.equal(botao.textContent, 'Ativar modo escuro');
 } finally { dom.window.close(); }
});

test('falha do widget mantém contato e explica o problema', () => {
 const { dom, document, window, script } = montarDemo({ carregar: false });
 try {
  script.dispatchEvent(new window.Event('error'));
  assert.match(document.getElementById('assistant-status').textContent, /Não foi possível carregar/);
  assert.equal(document.querySelector('[data-open-assistant]').disabled, true);
  assert.equal(new URL(document.querySelector('[data-whatsapp]').href).hostname, 'wa.me');
 } finally { dom.window.close(); }
});

test('todos os links internos têm destino e não há mapa ou plantão inventado', () => {
 const { dom, document } = montarDemo();
 try {
  for (const a of document.querySelectorAll('a[href^="#"]')) {
   assert.ok(document.getElementById(a.hash.slice(1)), a.href);
  }
  assert.equal(document.querySelector('a[href*="maps.google"]'), null);
  assert.match(document.body.textContent, /oferece qualquer atendimento veterinário real/);
  assert.match(document.querySelector('style').textContent, /prefers-reduced-motion/);
 } finally { dom.window.close(); }
});
