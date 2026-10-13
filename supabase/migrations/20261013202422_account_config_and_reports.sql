-- Additive rollout: the legacy tables and their data remain intact.
create table public.account_config (
 user_id uuid not null references auth.users(id) on delete cascade,
 key text not null, value text, updated_at timestamptz default now(),
 primary key(user_id,key)
);
alter table public.account_config enable row level security;
revoke all on public.account_config from anon,authenticated;
grant select,insert,update,delete on public.account_config to authenticated;
create policy account_config_owner on public.account_config for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
do $$ begin
 if (select count(*) from auth.users)=1 and (select count(distinct user_id) from public.clientes)=1 then
  insert into public.account_config(user_id,key,value,updated_at)
  select coalesce(s.user_id,(select user_id from public.clientes limit 1)),s.key,s.value,s.updated_at from public.app_storage s;
 elsif exists(select 1 from public.app_storage where user_id is null) then
  raise exception 'Legacy ownership requires an explicit review';
 else
  insert into public.account_config select user_id,key,value,updated_at from public.app_storage;
 end if;
end $$;
create table public.pagina_eventos (
 id bigint generated always as identity primary key,
 public_id uuid not null references public.clientes(public_id) on delete cascade,
 tipo text not null check(tipo in('pagina_visualizada','pagina_whatsapp')),
 criado_em timestamptz not null default now()
);
create index pagina_eventos_periodo_idx on public.pagina_eventos(public_id,criado_em);
alter table public.pagina_eventos enable row level security;
revoke all on public.pagina_eventos from anon,authenticated;
grant insert on public.pagina_eventos to anon;
grant select on public.pagina_eventos to authenticated;
grant usage on sequence public.pagina_eventos_id_seq to anon;
create policy pagina_eventos_public_insert on public.pagina_eventos for insert to anon with check(exists(select 1 from public.widget_config where public_id=pagina_eventos.public_id));
create policy pagina_eventos_owner_select on public.pagina_eventos for select to authenticated using(exists(select 1 from public.clientes c where c.public_id=pagina_eventos.public_id and c.user_id=auth.uid()));
create policy pagina_eventos_staff_select on public.pagina_eventos for select to authenticated using(exists(select 1 from public.colaborador_clientes_view v where v.public_id=pagina_eventos.public_id));
create or replace function public.relatorio_periodo(p_public_id uuid,p_inicio date,p_fim date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare inicio timestamptz; fim timestamptz; resultado jsonb;
begin
 if auth.uid() is null then raise exception 'Login necessário'; end if;
 if p_inicio is null or p_fim is null or p_fim<p_inicio or p_fim-p_inicio>366 then raise exception 'Período inválido'; end if;
 inicio:=p_inicio::timestamp at time zone 'America/Sao_Paulo'; fim:=(p_fim+1)::timestamp at time zone 'America/Sao_Paulo';
 with e as(select tipo,opcao_label from public.eventos where public_id=p_public_id and criado_em>=inicio and criado_em<fim
 union all select tipo,null::text from public.pagina_eventos where public_id=p_public_id and criado_em>=inicio and criado_em<fim),
 top_opcao as(select opcao_label label,count(*) contagem from e where tipo='opcao_clicada' and opcao_label is not null group by opcao_label order by count(*) desc,opcao_label limit 1)
 select jsonb_build_object('aberturas',count(*) filter(where tipo='abertura'),'handoffs',count(*) filter(where tipo='handoff_whatsapp'),'visitasPagina',count(*) filter(where tipo='pagina_visualizada'),'whatsPagina',count(*) filter(where tipo='pagina_whatsapp'),'opcaoMaisClicada',(select to_jsonb(t) from top_opcao t),'inicio',p_inicio,'fim',p_fim) into resultado from e;
 return resultado;
end $$;
revoke all on function public.relatorio_periodo(uuid,date,date) from public,anon;
grant execute on function public.relatorio_periodo(uuid,date,date) to authenticated;
