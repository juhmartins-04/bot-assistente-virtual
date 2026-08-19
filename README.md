# Gerador de Assistente Virtual

Projeto Vite + React que gera um widget de atendimento (menu de respostas
rápidas, agenda e encaminhamento pro WhatsApp) para o site de cada cliente
da sua agência. Dados ficam no Supabase, atrás de login.

## 1. Instalar dependências
```bash
npm install
```

## 2. Variáveis de ambiente
Confira se o `.env` está na raiz do projeto, ao lado do `package.json`,
com `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` preenchidos
(Supabase Dashboard > Project Settings > API).

## 3. Banco de dados
Já rodado no projeto Supabase em uso (`supabase-schema.sql` reflete
exatamente o que está aplicado). Ele:
- cria/ajusta a tabela `clientes` com `user_id`, `public_id`, `status`
  e `trial_ends_at`;
- ativa RLS: cada usuário só vê e edita os próprios clientes;
- cria a view `widget_config`, pública e só-leitura, que o widget no
  site do cliente consulta (sem login).

Se precisar recriar o banco do zero (novo projeto Supabase, ou
ambiente de testes), abra o **SQL Editor** do projeto e rode o
conteúdo de `supabase-schema.sql` inteiro — é seguro rodar mais de uma
vez. Se o banco de destino já tiver clientes salvos de antes do login
existir, o próprio arquivo avisa (com um erro claro) quando for preciso
preencher o `user_id` manualmente antes de continuar — o comentário
ao lado da linha que falha explica o comando exato.

## 4. Habilitar login por e-mail
No painel do Supabase, em **Authentication > Providers**, confirme que
"Email" está ativado. Em **Authentication > URL Configuration**,
adicione a URL onde o app roda (`http://localhost:5173` em
desenvolvimento, e a URL da Vercel em produção) em "Redirect URLs".

## 5. Rodar o projeto
```bash
npm run dev
```
Abra o endereço que aparecer no terminal (normalmente http://localhost:5173),
informe seu e-mail e clique no link que chegar na caixa de entrada.

## Como funciona o teste grátis e a desativação remota
Cada cliente novo nasce com status `trial` e 14 dias de prazo (ajustável
no painel, no card "Acesso do cliente"). O widget instalado no site do
cliente busca sua configuração no Supabase a cada carregamento — ele
não guarda nada localmente. Por isso:
- **Ativar** (`cliente assinou`) faz o widget continuar aparecendo sem
  data de validade.
- **Suspender** faz o widget parar de aparecer no próximo carregamento
  da página do cliente, sem precisar editar o site dele de novo.
- Um teste vencido (`trial_ends_at` no passado) tem o mesmo efeito de
  suspender, automaticamente.

Isso funciona mesmo para clientes cujo site você não tem mais acesso
direto: a única coisa colada no HTML dele é uma linha fixa apontando
pro `public_id` (`<script ... data-site="...">`). Toda mudança de
conteúdo, ativação ou suspensão acontece só aqui no painel.

## Publicar o widget
Suba `public/atendente-virtual-widget.js` em qualquer hospedagem
estática (a mesma Vercel deste projeto já serve). No card "Publicação"
do painel, informe a URL onde ele ficou disponível — o código gerado
usa essa URL.

## Página simples pra quem não tem site
Preenchendo "Sobre o negócio", "Horário" ou "Endereço" no formulário,
o cliente ganha uma página própria em `/p/{public_id}` (link e botão de
copiar aparecem no card "Publicação"), com esses dados e o assistente
já embutido. Não precisa de hospedagem nem tabela extra — a página
roda no mesmo deploy do painel e lê a mesma `view widget_config` que
o widget usa, então ativar/suspender o cliente afeta os dois juntos.

## Estrutura
```
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                ← redireciona qualquer rota pro index.html (SPA)
├── supabase-schema.sql        ← rode no SQL Editor do Supabase
├── .env                       ← URL e chave do seu projeto Supabase
├── .env.example
├── public/
│   ├── atendente-virtual-widget.js   ← widget publicado no site do cliente
│   └── teste-widget.html             ← preview local do widget
└── src/
    ├── main.jsx       ← roteamento simples: /p/:id vai pra Pagina.jsx
    ├── App.jsx        ← painel principal
    ├── Pagina.jsx     ← página pública do cliente (/p/{public_id})
    ├── Login.jsx      ← tela de acesso (link mágico por e-mail)
    ├── tokens.js       ← paleta de cores compartilhada
    ├── storage.js      ← funções que falam com o Supabase
    ├── index.css
    └── utils/supabase.js
```

## Segurança
- Login obrigatório (Supabase Auth, link mágico por e-mail) e RLS
  restringindo cada usuário aos próprios dados — sem isso, qualquer
  pessoa com a URL do painel conseguia ler e apagar todos os clientes.
- O widget no site do cliente nunca tem acesso de escrita: ele só lê a
  view `widget_config`, que expõe apenas o conteúdo do menu do cliente
  específico, nunca a lista de clientes nem dados de outros negócios.
- Links de agenda e WhatsApp são validados (só `http`/`https`) tanto no
  formulário quanto no próprio widget, evitando que um esquema como
  `javascript:` vire um link clicável no site do cliente.
- O widget também escreve em `leads` e `eventos` (chave anônima, sem
  login) para captar contato e medir aberturas/cliques. A escrita só é
  aceita se o `public_id` pertencer a um cliente ativo ou em teste
  válido (mesma condição de `widget_config`), e a leitura dessas
  tabelas é restrita ao dono do cliente correspondente.
