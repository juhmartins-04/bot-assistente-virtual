-- Rode este script no SQL Editor do seu projeto Supabase
-- (Supabase Dashboard > SQL Editor > New query)

create table if not exists app_storage (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Habilita RLS (Row Level Security)
alter table app_storage enable row level security;

-- Política simples: libera leitura e escrita para qualquer chave anônima.
-- Ok para um painel de uso único (uma agência). Se quiser multiusuário
-- com login, troque por policies que checam auth.uid().
drop policy if exists "Permitir tudo (anon)" on app_storage;
create policy "Permitir tudo (anon)"
  on app_storage
  for all
  using (true)
  with check (true);
