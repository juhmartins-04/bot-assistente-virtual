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
    tituloServicos: 'Seu próximo momento de cuidado.', tituloCardapio: 'Cuidados e valores ilustrativos.',
    servicos: [
      { nome: 'Corte e escova', descricao: 'Renove o visual com um atendimento pensado para você.', preco: 'Corte: R$ 80 · Escova: a partir de R$ 60' },
      { nome: 'Design de sobrancelhas', descricao: 'Formato e acabamento combinados com a profissional.', preco: 'Sob consulta' },
      { nome: 'Cuidados com a pele', descricao: 'Conheça os cuidados disponíveis e converse sobre o atendimento.', preco: 'Sob consulta' },
    ],
    proximoPasso: ['Como peço um horário?', 'Você consulta horários disponíveis pelo WhatsApp. A profissional confirma o atendimento; esta demo não faz agendamentos.'],
    resposta: 'Neste exemplo, o corte custa R$ 80 e a escova, a partir de R$ 60. Os valores são fictícios. No seu negócio, as respostas usam as informações que você aprovar.',
    pergunta: 'Serviços e valores',
  },
  pet: {
    nome: 'Pet e banho e tosa', negocio: 'Pet & Carinho', assinatura: 'Cuidado para quem é da família.',
    descricao: 'Banho, tosa e carinho em cada detalhe.', cor: '#386951',
    horario: 'De segunda a sábado, das 8h às 18h.',
    tituloServicos: 'Carinho em cada cuidado.', tituloCardapio: 'Cuidados para o seu pet.',
    servicos: [
      { nome: 'Banho e secagem', descricao: 'Atendimento combinado conforme o porte e a pelagem do pet.', preco: 'Orçamento por porte' },
      { nome: 'Tosa e higiene', descricao: 'Confira os cuidados oferecidos e as orientações para a primeira visita.', preco: 'Sob consulta' },
      { nome: 'Horário reservado', descricao: 'Converse com a equipe para consultar a disponibilidade.', preco: 'A combinar' },
    ],
    proximoPasso: ['Como reservo para o meu pet?', 'Informe o porte, a pelagem e o cuidado desejado pelo WhatsApp. A equipe confirma valor e disponibilidade. Esta demo não agenda.'],
    resposta: 'Oferecemos banho, tosa e higiene. Neste exemplo, o valor depende do porte e da pelagem do pet. Para um orçamento, o cliente continua a conversa no WhatsApp.',
    pergunta: 'Banho e tosa',
  },
  servicos: {
    nome: 'Reparos para casa', negocio: 'Casa em Dia', assinatura: 'Mais praticidade para a sua rotina.',
    descricao: 'Pequenos reparos e serviços para a sua casa.', cor: '#8b593a',
    horario: 'De segunda a sexta, das 8h às 18h.',
    tituloServicos: 'Sua casa funcionando melhor.', tituloCardapio: 'O que podemos resolver.',
    servicos: [
      { nome: 'Pequenos reparos', descricao: 'Ajustes de portas, puxadores e outros detalhes da rotina.', preco: 'Após avaliação' },
      { nome: 'Montagens e instalações', descricao: 'Montagem de móveis e instalação de prateleiras, conforme o serviço.', preco: 'Sob consulta' },
      { nome: 'Visita combinada', descricao: 'Envie fotos e uma descrição para combinar o próximo passo.', preco: 'Orçamento personalizado' },
    ],
    proximoPasso: ['Como peço um orçamento?', 'Envie pelo WhatsApp fotos, uma descrição do serviço e o bairro. O profissional confirma se atende à demanda e combina a visita. A demo não confirma preço ou horário.'],
    resposta: 'Neste exemplo, fazemos pequenos reparos e instalações. O orçamento depende do serviço e é combinado pelo WhatsApp. O Prontô apresenta as informações que o negócio configurar.',
    pergunta: 'Serviços disponíveis',
  },
  tecnica: {
    nome: 'Assistência técnica', negocio: 'Conecta Tech', assinatura: 'Seu equipamento merece uma segunda chance.',
    descricao: 'Diagnóstico, manutenção e orientação para computadores e notebooks.', cor: '#275d82',
    horario: 'De segunda a sexta, das 9h às 18h.',
    tituloServicos: 'Do diagnóstico à solução.', tituloCardapio: 'Como cuidamos do seu equipamento.',
    servicos: [
      { nome: 'Diagnóstico técnico', descricao: 'Relate o problema para receber orientações sobre a avaliação.', preco: 'Condições sob consulta' },
      { nome: 'Limpeza e manutenção', descricao: 'Cuidados preventivos e corretivos conforme a necessidade do equipamento.', preco: 'Após diagnóstico' },
      { nome: 'Instalação e configuração', descricao: 'Configuração de programas licenciados, periféricos e rede.', preco: 'Orçamento personalizado' },
    ],
    pergunta: 'Quais equipamentos atendem?', resposta: 'Neste exemplo, a Conecta Tech atende computadores e notebooks. Modelo, defeito e disponibilidade de peças são conferidos antes de aprovar um orçamento. Os dados são fictícios.',
    proximoPasso: ['Como solicito uma avaliação?', 'Conte no WhatsApp qual é o equipamento e o problema percebido. O técnico orienta a avaliação e confirma custos e prazos. Esta demo não acessa seu dispositivo nem faz diagnóstico remoto.'],
  },
  lavanderia: {
    nome: 'Lavanderia', negocio: 'Leve Lavanderia', assinatura: 'Mais leveza para a sua semana.',
    descricao: 'Cuidado com roupas e peças de casa, com orientações claras desde o primeiro contato.', cor: '#287b7a',
    horario: 'De segunda a sábado, das 8h às 18h.',
    tituloServicos: 'Cuidado que cabe na sua rotina.', tituloCardapio: 'Lavagem para cada necessidade.',
    servicos: [
      { nome: 'Roupas do dia a dia', descricao: 'Confira as modalidades de lavagem e passagem disponíveis.', preco: 'Por peça ou lote' },
      { nome: 'Edredons e cobertores', descricao: 'O atendimento considera tamanho, tecido e orientações da etiqueta.', preco: 'Sob avaliação' },
      { nome: 'Coleta e entrega', descricao: 'Consulte se o seu bairro está na área atendida e combine a retirada.', preco: 'Taxa sob consulta' },
    ],
    pergunta: 'Vocês fazem coleta e entrega?', resposta: 'Nesta lavanderia fictícia, a coleta e a entrega dependem do bairro e da disponibilidade. Informe seu endereço no atendimento humano para confirmar área, taxa e prazo.',
    proximoPasso: ['Como consulto valor e prazo?', 'Informe pelo WhatsApp o tipo e a quantidade de peças. A equipe confirma os cuidados, o orçamento e o prazo antes de receber o pedido. Esta demo não cria pedidos.'],
  },
  costura: {
    nome: 'Costura e ajustes', negocio: 'Ateliê Linha & Ponto', assinatura: 'Aquela peça favorita, do seu jeito.',
    descricao: 'Barras, ajustes e pequenos consertos para dar novos usos ao que você já tem.', cor: '#965c38',
    horario: 'De segunda a sexta, das 9h às 18h.',
    tituloServicos: 'Pequenos ajustes. Novas possibilidades.', tituloCardapio: 'Ajustes feitos com atenção.',
    servicos: [
      { nome: 'Barras e comprimentos', descricao: 'Ajustes de calças, saias e vestidos após conferir a peça.', preco: 'Conforme tecido e acabamento' },
      { nome: 'Zíperes e pequenos consertos', descricao: 'Consulte a possibilidade de reparar sua peça favorita.', preco: 'Após avaliação' },
      { nome: 'Ajuste de caimento', descricao: 'A profissional confere medidas e explica o que pode ser feito.', preco: 'Orçamento personalizado' },
    ],
    pergunta: 'Quais ajustes vocês fazem?', resposta: 'Este ateliê fictício apresenta barras, troca de zíper e ajustes de caimento. A possibilidade do serviço depende do tecido e da avaliação da peça.',
    proximoPasso: ['Como peço um ajuste?', 'Descreva pelo WhatsApp o que deseja ajustar e envie uma foto da peça, se quiser. A profissional combina a avaliação e confirma preço e prazo. A demo não confirma encomendas.'],
  },
}
