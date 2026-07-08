# Gerador de Assistente Virtual — com Supabase

Projeto Vite + React já com o armazenamento local trocado por Supabase
(banco de dados real na nuvem, grátis no plano free).

## 1. Instalar dependências
```bash
npm install
```

## 2. Seu projeto Supabase
O `.env` já vem preenchido com a URL e a chave publishable do seu
projeto Supabase (`rnlgvlmwwncfrfywszaf`). Se quiser trocar de projeto
no futuro, edite `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
nesse arquivo.

## 3. Criar a tabela no banco
No painel do Supabase, abra **SQL Editor** e rode o conteúdo do arquivo
`supabase-schema.sql` (raiz do projeto). Isso cria a tabela `app_storage`,
que guarda todos os clientes num JSON único na chave `"clientes"` —
igual funcionava antes, só que agora persistido de verdade.

## 4. Variáveis de ambiente
Já está tudo configurado no `.env` (ele vem junto neste zip). Só confira
se o arquivo está na raiz do projeto, ao lado do `package.json`.

## 5. Rodar o projeto
```bash
npm run dev
```
Abra o endereço que aparecer no terminal (normalmente http://localhost:5173).

## Estrutura
```
├── index.html
├── package.json
├── vite.config.js
├── supabase-schema.sql
├── .env                 ← já preenchido com seu projeto Supabase
├── .env.example
└── src/
    ├── main.jsx
    ├── App.jsx          ← seu componente, sem alterações
    ├── App.css
    ├── index.css
    ├── supabase.js      ← seu arquivo, cria a conexão
    └── storage.js       ← agora fala com o Supabase
```

## O que mudou em relação ao seu código original
Só o `src/storage.js`. Ele mantém exatamente as mesmas funções que o
`App.jsx` já importava (`storageGet`, `storageSet`), então **nenhuma
linha do `App.jsx` precisou mudar** — por baixo dos panos ele passou a
ler e gravar na tabela `app_storage` do Supabase em vez de guardar
localmente.

## Observações
- A policy do SQL libera leitura/escrita para qualquer visitante com a
  chave anônima — adequado pra um painel interno de agência. Se quiser
  exigir login antes de mexer nos dados, dá pra adicionar Supabase Auth
  depois e trocar a policy para checar `auth.uid()`.
- Se no futuro quiser uma tabela por cliente (em vez de um JSON único),
  a migração é tranquila — mas isso já resolve rodar com um banco de
  dados de verdade sem mudar a lógica do app.
# bot
