// Contato comercial já publicado em public/julia.html.
export const CONTATO = {
  whatsapp: '5541995472287',
  instagram: 'https://www.instagram.com/jujunatech/',
}

export function linkComercial(plano = '') {
  const mensagem = plano
    ? `Olá, Julia! Quero conhecer o Prontô e testar o plano ${plano}. Meu negócio é: `
    : 'Olá, Julia! Quero conhecer o Prontô e saber como funciona o teste de 14 dias. Meu negócio é: '
  return `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

export const PLANOS = [
  {
    nome: 'Só Página', preco: 97, descricao: 'Um lugar próprio para apresentar seu negócio.',
    itens: ['Modelo configurado com a sua marca', 'Serviços, horário, endereço e contato', 'Link para usar na bio e no WhatsApp', 'Relatório de visitas e cliques', 'Até 2 pedidos de conteúdo por mês'],
  },
  {
    nome: 'Assistente', preco: 147, descricao: 'Atendimento rápido no site que você já tem.',
    itens: ['Instalação no seu site incluída', 'Até 5 perguntas com respostas aprovadas', 'Encaminhamento para WhatsApp e agenda', 'Relatório de uso e dúvidas mais clicadas', 'Até 2 pedidos de conteúdo por mês'],
  },
  {
    nome: 'Página + Assistente', preco: 197, descricao: 'Sua página e seu atendimento, juntos.', destaque: true,
    itens: ['Tudo do plano Só Página', 'Assistente integrado à página', 'Até 5 perguntas com respostas aprovadas', 'Relatório mensal de uso'],
  },
]

export const SEGMENTOS = {
  beleza: {
    nome: 'Beleza e estética', negocio: 'Studio Aurora', assinatura: 'Seu momento de cuidado.',
    descricao: 'Beleza, bem-estar e um atendimento com a sua cara.', cor: '#785a71',
    horario: 'De terça a sábado, das 9h às 19h.',
    servicos: ['Corte e escova', 'Design de sobrancelhas', 'Cuidados com a pele'],
    resposta: 'Neste exemplo, o corte custa R$ 80 e a escova, a partir de R$ 60. Os valores são fictícios. No seu negócio, as respostas usam as informações que você aprovar.',
    pergunta: 'Serviços e valores',
  },
  pet: {
    nome: 'Pet', negocio: 'Pet & Carinho', assinatura: 'Cuidado para quem é da família.',
    descricao: 'Banho, tosa e carinho em cada detalhe.', cor: '#386951',
    horario: 'De segunda a sábado, das 8h às 18h.',
    servicos: ['Banho e tosa', 'Higiene e cuidado', 'Atendimento com horário'],
    resposta: 'Oferecemos banho, tosa e higiene. Neste exemplo, o valor depende do porte e da pelagem do pet. Para um orçamento, o cliente continua a conversa no WhatsApp.',
    pergunta: 'Banho e tosa',
  },
  servicos: {
    nome: 'Serviços', negocio: 'Casa em Dia', assinatura: 'Mais praticidade para a sua rotina.',
    descricao: 'Pequenos reparos e serviços para a sua casa.', cor: '#8b593a',
    horario: 'De segunda a sexta, das 8h às 18h.',
    servicos: ['Pequenos reparos', 'Instalações', 'Orçamentos personalizados'],
    resposta: 'Neste exemplo, fazemos pequenos reparos e instalações. O orçamento depende do serviço e é combinado pelo WhatsApp. O Prontô apresenta as informações que o negócio configurar.',
    pergunta: 'Serviços disponíveis',
  },
}
