export const EXPERIENCIAS_DEMO = {
  completo: { nome: 'Página + assistente', descricao: 'Explore a página e abra o assistente no canto para tirar dúvidas.' },
  pagina: { nome: 'Só página', descricao: 'Conheça a apresentação, os serviços e o contato. Uma página pronta para ser o link do seu negócio.' },
  assistente: { nome: 'Só assistente', descricao: 'Teste o menu em uma simulação de site existente. Seu site continua como está.' },
}

export function experienciaDemo(valor) {
  return Object.hasOwn(EXPERIENCIAS_DEMO, valor) ? valor : 'completo'
}
