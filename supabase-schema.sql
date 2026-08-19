-- =====================================================================
-- Este arquivo reflete o schema já aplicado no projeto Supabase em uso
-- (rodado diretamente via MCP em 2026-08-18). É seguro rodar de novo —
-- todo comando usa "if not exists" / "if exists" — e serve como fonte
-- de verdade caso você precise recriar o banco do zero algum dia.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- clientes: cada cliente da agência.
--   user_id        dono do registro (RLS restringe cada usuário aos
--                   próprios clientes)
--   status         'trial' | 'active' | 'suspended'
--   trial_ends_at  até quando o teste vale (só importa se status='trial')
--   public_id      identificador aleatório e não sequencial, é o único
--                   dado exposto ao widget no site do cliente — nunca
--                   exponha o "id" interno nem o user_id publicamente.
-- ---------------------------------------------------------------------

-- Suporta um projeto que ainda tenha a coluna com o nome antigo
-- ("owner_id"), usado antes desta migração.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'owner_id'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clientes' and column_name = 'user_id'
  ) then
    alter table public.clientes rename column owner_id to user_id;
  end if;
end $$;

create table if not exists public.clientes (
  id text primary key,
  user_id uuid,
  nome_negocio text,
  dados jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.clientes add column if not exists user_id uuid;
alter table public.clientes add column if not exists public_id uuid not null default gen_random_uuid();
alter table public.clientes add column if not exists status text not null default 'trial';
alter table public.clientes add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

-- Se a tabela já tiver linhas sem user_id (dados de antes do login
-- existir), a linha abaixo falha com um erro claro. Nesse caso, rode
-- primeiro: update public.clientes set user_id = 'SEU-ID-AQUI' where user_id is null;
-- (pegue seu id com: select id, email from auth.users;)
alter table public.clientes drop constraint if exists clientes_user_id_fkey;
alter table public.clientes add constraint clientes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.clientes alter column user_id set not null;

create unique index if not exists clientes_public_id_key on public.clientes (public_id);
create index if not exists clientes_user_id_idx on public.clientes (user_id);

alter table public.clientes drop constraint if exists clientes_status_check;
alter table public.clientes add constraint clientes_status_check check (status in ('trial', 'active', 'suspended'));

-- ---------------------------------------------------------------------
-- app_storage: configurações da agência (nome, URL do widget).
--
-- A chave primária continua sendo só "key" (não virou (user_id, key))
-- porque, no momento desta migração, o banco já tinha linhas antigas
-- sem user_id, e uma chave primária composta exige "not null" em todas
-- as colunas — o que apagaria ou travaria nessas linhas. Enquanto só
-- existir um login usando este painel isso não causa problema (a RLS
-- abaixo já impede um usuário ver a config de outro). Se um dia
-- existir um segundo login, aí sim troque a chave primária:
--   alter table public.app_storage drop constraint app_storage_pkey;
--   alter table public.app_storage add primary key (user_id, key);
-- (só funciona depois que toda linha tiver um user_id preenchido)
-- ---------------------------------------------------------------------
create table if not exists public.app_storage (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table public.app_storage add column if not exists user_id uuid;
alter table public.app_storage drop constraint if exists app_storage_user_id_fkey;
alter table public.app_storage add constraint app_storage_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists app_storage_user_id_idx on public.app_storage (user_id);

-- ---------------------------------------------------------------------
-- RLS — cada usuário só lê e escreve os próprios dados.
-- ---------------------------------------------------------------------
alter table public.app_storage enable row level security;
alter table public.clientes enable row level security;

drop policy if exists "Permitir tudo (anon)" on public.app_storage;
drop policy if exists "app_storage: dono le e escreve" on public.app_storage;
create policy "app_storage: dono le e escreve" on public.app_storage
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Permitir tudo (anon)" on public.clientes;
drop policy if exists "clientes: dono le e escreve" on public.clientes;
create policy "clientes: dono le e escreve" on public.clientes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- widget_config: view pública e só-leitura, usada pelo widget no site
-- do cliente (chave anônima, sem login). Expõe só "dados" (o conteúdo
-- do menu), nunca id interno, user_id, nome de tabela ou qualquer outro
-- cliente. Some sozinha (0 linhas) quando o cliente está "suspended" ou
-- quando o teste venceu — esse "sumiço" é o botão de desligar remoto:
-- o widget consulta isso a cada carregamento, então basta mudar o
-- status no seu painel, sem precisar tocar no site do cliente de novo.
--
-- Nota de segurança: esta view roda com o privilégio de quem a criou
-- (comportamento padrão de view no Postgres, sem "security_invoker"),
-- por isso ela consegue ignorar a RLS de "clientes" e devolver dados
-- pro público anônimo. O advisor de segurança do Supabase sinaliza
-- isso como alerta genérico ("Security Definer View") — é esperado
-- aqui: a view só expõe duas colunas fixas, filtradas por uma condição
-- fixa (status/trial_ends_at), sem nenhum insumo controlável por quem
-- consulta, e só tem permissão de leitura (nunca escrita) liberada
-- pro papel "anon". Não troque para "security_invoker = true" — isso
-- faria a view voltar a respeitar a RLS de "clientes" e o widget
-- pararia de funcionar (a chave anônima nunca bate com nenhum user_id).
-- ---------------------------------------------------------------------
create or replace view public.widget_config as
select public_id, dados
from public.clientes
where status = 'active'
   or (status = 'trial' and trial_ends_at > now());

grant usage on schema public to anon;
grant select on public.widget_config to anon;

-- ---------------------------------------------------------------------
-- leads: nome/telefone captados pelo widget antes do encaminhamento pro
-- WhatsApp (campos opcionais — quem só quer clicar não é obrigado a
-- preencher). Gravados pelo widget (chave anônima), lidos só pelo dono
-- do cliente correspondente.
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null,
  nome text,
  telefone text,
  opcao_label text,
  criado_em timestamptz not null default now()
);

create index if not exists leads_public_id_idx on public.leads (public_id);

alter table public.leads enable row level security;

drop policy if exists "leads: dono le" on public.leads;
create policy "leads: dono le" on public.leads
  for select
  using (exists (
    select 1 from public.clientes c
    where c.public_id = leads.public_id and c.user_id = auth.uid()
  ));

drop policy if exists "leads: anon insere se cliente ativo" on public.leads;
create policy "leads: anon insere se cliente ativo" on public.leads
  for insert
  to anon
  with check (exists (
    select 1 from public.clientes c
    where c.public_id = leads.public_id
      and (c.status = 'active' or (c.status = 'trial' and c.trial_ends_at > now()))
  ));

grant select on public.leads to authenticated;
grant insert on public.leads to anon;

-- ---------------------------------------------------------------------
-- eventos: aberturas, cliques em opção e encaminhamentos pro WhatsApp,
-- gravados pelo widget a cada interação. É o que sustenta o card
-- "Resultados" no painel — sem isso não há como provar valor pro
-- cliente no fim do mês.
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  public_id uuid not null,
  tipo text not null check (tipo in ('abertura', 'opcao_clicada', 'handoff_whatsapp')),
  opcao_label text,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_public_id_idx on public.eventos (public_id);
create index if not exists eventos_public_id_tipo_idx on public.eventos (public_id, tipo);

alter table public.eventos enable row level security;

drop policy if exists "eventos: dono le" on public.eventos;
create policy "eventos: dono le" on public.eventos
  for select
  using (exists (
    select 1 from public.clientes c
    where c.public_id = eventos.public_id and c.user_id = auth.uid()
  ));

drop policy if exists "eventos: anon insere se cliente ativo" on public.eventos;
create policy "eventos: anon insere se cliente ativo" on public.eventos
  for insert
  to anon
  with check (exists (
    select 1 from public.clientes c
    where c.public_id = eventos.public_id
      and (c.status = 'active' or (c.status = 'trial' and c.trial_ends_at > now()))
  ));

grant select on public.eventos to authenticated;
grant insert on public.eventos to anon;

-- ---------------------------------------------------------------------
-- nota de atendimento: onde o dono (ou um colaborador atribuído) registra
-- o que aconteceu depois de uma conversa de WhatsApp — sem precisar
-- guardar o conteúdo da conversa em si. "pendente"/"respondido" é o
-- status mínimo pra saber o que ainda falta responder.
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists nota text;
alter table public.leads add column if not exists status_atendimento text not null default 'pendente';

alter table public.leads drop constraint if exists leads_status_atendimento_check;
alter table public.leads add constraint leads_status_atendimento_check
  check (status_atendimento in ('pendente', 'respondido'));

drop policy if exists "leads: dono atualiza nota" on public.leads;
create policy "leads: dono atualiza nota" on public.leads
  for update
  using (exists (select 1 from public.clientes c where c.public_id = leads.public_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.clientes c where c.public_id = leads.public_id and c.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- colaboradores: pra quando a dona da agência terceirizar ajuda de
-- atendimento. Um colaborador só enxerga os clientes explicitamente
-- atribuídos a ele (colaborador_clientes), nunca a lista inteira, nunca
-- a configuração do menu/WhatsApp do cliente (só nome e public_id, via
-- a view abaixo), e só pode escrever a nota/status de um lead — nunca
-- editar cliente, mudar status/plano, excluir ou convidar outro
-- colaborador. Isso é o que garante que terceirizar ajuda não dá a essa
-- pessoa controle nenhum sobre o negócio.
-- ---------------------------------------------------------------------
create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  dono_id uuid not null references auth.users(id) on delete cascade,
  colaborador_id uuid references auth.users(id) on delete cascade,
  email text not null,
  criado_em timestamptz not null default now(),
  aceito_em timestamptz
);

create index if not exists colaboradores_dono_id_idx on public.colaboradores (dono_id);
create index if not exists colaboradores_colaborador_id_idx on public.colaboradores (colaborador_id);
create unique index if not exists colaboradores_dono_email_key on public.colaboradores (dono_id, lower(email));

create table if not exists public.colaborador_clientes (
  colaborador_row_id uuid not null references public.colaboradores(id) on delete cascade,
  cliente_id text not null references public.clientes(id) on delete cascade,
  primary key (colaborador_row_id, cliente_id)
);

alter table public.colaboradores enable row level security;
alter table public.colaborador_clientes enable row level security;

drop policy if exists "colaboradores: dono gerencia" on public.colaboradores;
create policy "colaboradores: dono gerencia" on public.colaboradores
  for all
  using (auth.uid() = dono_id)
  with check (auth.uid() = dono_id);

drop policy if exists "colaboradores: convidado le o proprio convite" on public.colaboradores;
create policy "colaboradores: convidado le o proprio convite" on public.colaboradores
  for select
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Permite que a pessoa convidada "aceite" o convite associando o próprio
-- login a ele — só funciona enquanto colaborador_id ainda está vazio, e
-- só pode preencher com o próprio auth.uid() (nunca o de outra pessoa).
drop policy if exists "colaboradores: convidado aceita" on public.colaboradores;
create policy "colaboradores: convidado aceita" on public.colaboradores
  for update
  using (colaborador_id is null and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  with check (colaborador_id = auth.uid());

drop policy if exists "colaborador_clientes: dono gerencia" on public.colaborador_clientes;
create policy "colaborador_clientes: dono gerencia" on public.colaborador_clientes
  for all
  using (exists (
    select 1 from public.colaboradores co
    where co.id = colaborador_clientes.colaborador_row_id and co.dono_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.colaboradores co
    where co.id = colaborador_clientes.colaborador_row_id and co.dono_id = auth.uid()
  ));

drop policy if exists "colaborador_clientes: colaborador le o proprio" on public.colaborador_clientes;
create policy "colaborador_clientes: colaborador le o proprio" on public.colaborador_clientes
  for select
  using (exists (
    select 1 from public.colaboradores co
    where co.id = colaborador_clientes.colaborador_row_id and co.colaborador_id = auth.uid()
  ));

-- View pública (pro papel "authenticated") com só o mínimo que um
-- colaborador precisa pra identificar o cliente atribuído — nunca o
-- menu, textos ou WhatsApp configurados (isso fica só com a dona).
create or replace view public.colaborador_clientes_view as
select c.id, c.nome_negocio, c.public_id
from public.clientes c
join public.colaborador_clientes cc on cc.cliente_id = c.id
join public.colaboradores co on co.id = cc.colaborador_row_id
where co.colaborador_id = auth.uid();

grant select on public.colaborador_clientes_view to authenticated;

drop policy if exists "leads: colaborador le atribuidos" on public.leads;
create policy "leads: colaborador le atribuidos" on public.leads
  for select
  using (exists (
    select 1 from public.clientes c
    join public.colaborador_clientes cc on cc.cliente_id = c.id
    join public.colaboradores co on co.id = cc.colaborador_row_id
    where c.public_id = leads.public_id and co.colaborador_id = auth.uid()
  ));

drop policy if exists "leads: colaborador atualiza nota" on public.leads;
create policy "leads: colaborador atualiza nota" on public.leads
  for update
  using (exists (
    select 1 from public.clientes c
    join public.colaborador_clientes cc on cc.cliente_id = c.id
    join public.colaboradores co on co.id = cc.colaborador_row_id
    where c.public_id = leads.public_id and co.colaborador_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.clientes c
    join public.colaborador_clientes cc on cc.cliente_id = c.id
    join public.colaboradores co on co.id = cc.colaborador_row_id
    where c.public_id = leads.public_id and co.colaborador_id = auth.uid()
  ));

-- Restringe a escrita (dono e colaborador) só às colunas de nota — nunca
-- dá pra alterar nome, telefone ou qualquer outra coluna do lead por
-- essa via, mesmo que a linha esteja liberada por RLS.
grant update (nota, status_atendimento) on public.leads to authenticated;

drop policy if exists "eventos: colaborador le atribuidos" on public.eventos;
create policy "eventos: colaborador le atribuidos" on public.eventos
  for select
  using (exists (
    select 1 from public.clientes c
    join public.colaborador_clientes cc on cc.cliente_id = c.id
    join public.colaboradores co on co.id = cc.colaborador_row_id
    where c.public_id = eventos.public_id and co.colaborador_id = auth.uid()
  ));
