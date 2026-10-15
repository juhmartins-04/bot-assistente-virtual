-- New public collection only; existing business/history rows are preserved.
-- The DELETE below cleans only transient, private rate-limit counters.
-- Created locally because CLI execution was blocked for third-party telemetry.
create schema if not exists private;
create table private.solo_public_limits(chave text primary key,janela timestamptz not null,n integer not null);
alter table private.solo_public_limits enable row level security;
revoke all on private.solo_public_limits from public,anon,authenticated;
create function private.validar_coleta_solo() returns trigger language plpgsql security definer set search_path='' as $$
declare ip text; chave text; quantidade integer; limite integer; janela timestamptz;
begin
 if current_setting('role',true) not in ('anon','authenticated') then return new; end if;
 if exists(select 1 from public.operadores_solo o where o.user_id=auth.uid()) and exists(select 1 from public.clientes where public_id=new.public_id and user_id=auth.uid()) then return new; end if;
 if not exists(select 1 from public.widget_config where public_id=new.public_id) then raise exception 'Negócio indisponível'; end if;
 if length(coalesce(to_jsonb(new)->>'opcao_label',''))>200 then raise exception 'Opção inválida'; end if;
 if tg_table_name='leads' then
  new.nome:=nullif(btrim(new.nome),''); new.telefone:=nullif(btrim(new.telefone),'');
  if length(coalesce(new.nome,''))>120 or length(coalesce(new.telefone,''))>30 or (coalesce(new.nome,'')='' and coalesce(new.telefone,'')='') then raise exception 'Contato inválido'; end if;
  if new.telefone is not null and new.telefone !~ '^[+0-9 ()-]{0,30}$' then raise exception 'Telefone inválido'; end if;
  new.nota:=null; new.status_atendimento:='pendente';
 end if;
 new.criado_em:=now();
 janela:=date_trunc(case when tg_table_name='leads' then 'hour' else 'minute' end,now());
 -- The gateway supplies forwarding headers. Missing headers share a conservative bucket.
 ip:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','unknown');
 chave:=new.public_id::text||':'||tg_table_name||':'||md5(ip)||':'||janela::text;
 limite:=case when tg_table_name='leads' then 10 else 60 end;
 insert into private.solo_public_limits values(chave,janela,1) on conflict on constraint solo_public_limits_pkey do update set n=private.solo_public_limits.n+1 returning n into quantidade;
 if quantidade>limite then raise sqlstate 'P0001' using message='Limite de coleta atingido'; end if;
 chave:=new.public_id::text||':'||tg_table_name||':site:'||janela::text;
 insert into private.solo_public_limits values(chave,janela,1) on conflict on constraint solo_public_limits_pkey do update set n=private.solo_public_limits.n+1 returning n into quantidade;
 if quantidade>(case when tg_table_name='leads' then 120 else 600 end) then raise exception 'Limite de coleta atingido'; end if;
 delete from private.solo_public_limits b where b.janela<now()-interval '24 hours';
 return new;
end $$;
revoke all on function private.validar_coleta_solo() from public,anon,authenticated;
create trigger validar_lead_solo before insert on public.leads for each row execute function private.validar_coleta_solo();
create trigger validar_evento_solo before insert on public.eventos for each row execute function private.validar_coleta_solo();

create trigger validar_pagina_evento_solo before insert on public.pagina_eventos for each row execute function private.validar_coleta_solo();
create index solo_public_limits_janela_idx on private.solo_public_limits(janela);
