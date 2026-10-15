# Demo comercial de pet shop fictício — página + assistente

Criada em 15/10/2026 para apresentar os dois serviços do Prontô. Usa o nome fictício **Pata & Companhia**. Não representa uma empresa real ou uma contratação.

## Link e implementação
- Link: https://bot-assistente-virtual.juuhhzinha2000.workers.dev/demo-pet
- Fonte: `public/demo-pet.html`, copiada pelo build do Vite.
- Widget real: `/atendente-virtual-widget.js`, sem duplicar sua implementação.
- Modo local de demonstração: sem `data-site`, sem conta, cadastro, mudança no Supabase, período pago ou início de teste.
- Paleta azul-petróleo, creme e caramelo; ilustração vetorial decorativa própria; temas claro e escuro.
- O nome, a região e o telefone de qualquer prospect não integram esta demonstração.

## Apresentação comercial
1. Abrir a página no celular e mostrar apresentação, serviços e informações.
2. Experimentar o assistente com uma das cinco perguntas.
3. Alternar **Só página** / **Página + assistente** no topo.
4. Apresentar o pacote completo de **R$197/mês**, não a soma dos avulsos.
5. Antes de uma versão oficial, confirmar interesse, identidade visual, serviços, horários, endereço e canais com o cliente.

## Oferta e limites
- Só página: R$97/mês.
- Página + assistente: R$197/mês.
- Assistente avulso: R$147/mês para site compatível já existente.
- Até 5 perguntas no assistente.
- Até 2 solicitações agrupadas de atualização por mês; no pacote, para o conjunto.
- Teste de 14 dias a partir da publicação aprovada.
- Hospedagem no endereço Prontô; domínio próprio não incluso.
- Respostas por menu dentro do site, não dentro do WhatsApp.
- Sem triagem de urgência, execução de agendamentos, compras, pagamentos ou garantia de vendas.

## Dados e segurança
- Nome, serviços e horários explicitamente fictícios/ilustrativos.
- Sem endereço, mapa ou telefone de estabelecimento real.
- Todos os links WhatsApp vão ao contato comercial da Juh, com mensagem sobre o Prontô.
- `capturarContato:false`; sem leads, eventos de banco ou chamadas ao Supabase.
- A preferência de tema pode ser salva no navegador; a demo não grava conversas.
- `noindex,nofollow` e header X-Robots-Tag desencorajam indexação, mas não restringem acesso ao link.
- Não há envio automático de mensagem.

## Antes da versão oficial
Confirmar aprovação para a identidade e conteúdo que serão publicados. Substituir dados fictícios por informações aprovadas. Retirar a proposta de preços da página final do cliente. Não oferecer avaliação clínica, triagem ou plantão sem um escopo real e apropriado.

## Verificação
- Integração documentada em `tests/demo-pet.test.js`.
- Checagens de sintaxe, configuração, âncoras, controlador isolado e contraste executadas antes do commit.
- Testes jsdom, suíte completa e inspeção visual no navegador não executados nesta sessão: ambiente local indisponível.
- A confirmação do build/deploy é feita pela integração existente. Ela não substitui testes no navegador.
