-- Preserve all business, contact and history rows. Remove inherited operations
-- which RLS cannot protect (especially TRUNCATE) and expose only public content.
revoke all on public.clientes, public.app_storage, public.account_config,
 public.leads, public.eventos, public.pagina_eventos, public.colaboradores,
 public.colaborador_clientes from anon, authenticated;
-- Column grants survive table-level REVOKE; explicitly reset known old grants.
revoke update (nota,status_atendimento) on public.leads from authenticated;
revoke update (colaborador_id,aceito_em) on public.colaboradores from authenticated;
grant select,insert,update on public.clientes to authenticated;
grant select,insert,update,delete on public.app_storage,public.account_config to authenticated;
grant select on public.leads,public.eventos,public.pagina_eventos to authenticated;
grant update (nota,status_atendimento) on public.leads to authenticated;
grant insert (public_id,nome,telefone,opcao_label) on public.leads to anon;
grant insert (public_id,tipo,opcao_label) on public.eventos to anon;
grant insert (public_id,tipo) on public.pagina_eventos to anon;
grant select,insert,delete on public.colaboradores,public.colaborador_clientes to authenticated;
grant update (colaborador_id,aceito_em) on public.colaboradores to authenticated;
revoke all on sequence public.eventos_id_seq,public.pagina_eventos_id_seq from anon,authenticated;
grant usage on sequence public.eventos_id_seq,public.pagina_eventos_id_seq to anon;
-- Future tables created by this migration owner require explicit grants.
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke all on sequences from anon,authenticated;
alter default privileges in schema public revoke execute on functions from public,anon,authenticated;

create table public.publicacoes (
 public_id uuid primary key references public.clientes(public_id) on delete cascade,
 dados jsonb not null,
 status text not null,
 trial_ends_at timestamptz
);
alter table public.publicacoes enable row level security;
revoke all on public.publicacoes from public,anon,authenticated;
grant select (public_id,dados) on public.publicacoes to anon,authenticated;
create policy publicacoes_visiveis on public.publicacoes for select to anon,authenticated
 using(status='active' or (status='trial' and trial_ends_at>now()));

-- A pure allowlist keeps private installation notes, approval flags, billing
-- references and future internal fields out of every public response.
create function private.conteudo_publico(p_dados jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
 from jsonb_each(p_dados)
 where key=any(array[
  'nomeNegocio','corPrimaria','numeroWhatsApp','idiomaPadrao','sobreNegocio',
  'endereco','horarioFuncionamento','incluiAssistente','incluiPagina','plano',
  'layout','instagramUrl','logoUrl','categoriaNegocio','servicos','itensCardapio',
  'tituloCardapio','saudacaoPt','saudacaoEn','transferirLabelPt','transferirLabelEn',
  'transferirMensagemWhatsPt','transferirMensagemWhatsEn','opcoes','capturarContato'
 ]);
$$;
revoke all on function private.conteudo_publico(jsonb) from public,anon,authenticated;
create function private.sincronizar_publicacao() returns trigger
 language plpgsql security definer set search_path='' as $$
begin
 insert into public.publicacoes(public_id,dados,status,trial_ends_at)
 values(new.public_id,private.conteudo_publico(new.dados),new.status,new.trial_ends_at)
 on conflict(public_id) do update set dados=excluded.dados,status=excluded.status,trial_ends_at=excluded.trial_ends_at;
 return new;
end;
$$;
revoke all on function private.sincronizar_publicacao() from public,anon,authenticated;
create trigger sincronizar_publicacao after insert or update of dados,status,trial_ends_at on public.clientes
 for each row execute function private.sincronizar_publicacao();
insert into public.publicacoes(public_id,dados,status,trial_ends_at)
 select public_id,private.conteudo_publico(dados),status,trial_ends_at from public.clientes;
create or replace view public.widget_config with(security_invoker=true) as
 select public_id,dados from public.publicacoes;
revoke all on public.widget_config from public,anon,authenticated;
grant select on public.widget_config to anon,authenticated;

-- Staff keep the old minimal projection with an explicit identity check.
-- Privileged code is private and cannot be called as an anonymous RPC.
create function private.clientes_atribuidos() returns table(id text,nome_negocio text,public_id uuid)
 language sql stable security definer set search_path='' as $$
 select c.id,c.nome_negocio,c.public_id
 from public.clientes c
 join public.colaborador_clientes cc on cc.cliente_id=c.id
 join public.colaboradores co on co.id=cc.colaborador_row_id
 where auth.uid() is not null and co.colaborador_id=auth.uid();
$$;
revoke all on function private.clientes_atribuidos() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.clientes_atribuidos() to authenticated;
create or replace view public.colaborador_clientes_view with(security_invoker=true) as
 select id,nome_negocio,public_id from private.clientes_atribuidos();
revoke all on public.colaborador_clientes_view from public,anon,authenticated;
grant select on public.colaborador_clientes_view to authenticated;

-- Uploading into the public logo bucket is limited to the authorized operator.
alter policy logos_upload_proprio on storage.objects to authenticated
 with check(bucket_id='logos' and (select auth.uid())::text=(storage.foldername(name))[1]
 and exists(select 1 from public.operadores_solo o where o.user_id=(select auth.uid())));
alter policy logos_update_proprio on storage.objects to authenticated
 using(bucket_id='logos' and (select auth.uid())::text=(storage.foldername(name))[1]
 and exists(select 1 from public.operadores_solo o where o.user_id=(select auth.uid())))
 with check(bucket_id='logos' and (select auth.uid())::text=(storage.foldername(name))[1]
 and exists(select 1 from public.operadores_solo o where o.user_id=(select auth.uid())));
