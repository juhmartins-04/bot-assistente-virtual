-- Additive operations rollout: existing records, keys and status constraints are preserved.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to authenticated;
create table public.operadores(user_id uuid primary key references auth.users(id) on delete cascade);
insert into public.operadores select distinct user_id from public.clientes;
alter table public.operadores enable row level security;
revoke all on public.operadores from anon, authenticated;
grant select on public.operadores to authenticated;
create policy operador_proprio on public.operadores for select to authenticated using(user_id=auth.uid());
create function private.operador() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.operadores where user_id=auth.uid());
$$;
revoke all on function private.operador() from public,anon;
grant execute on function private.operador() to authenticated;
alter policy "clientes: dono le e escreve" on public.clientes to authenticated using(user_id=auth.uid() and private.operador()) with check(user_id=auth.uid() and private.operador());

alter table public.clientes add column operational_state text check(operational_state in('draft','trial','active','suspended'));
alter table public.clientes add column if not exists created_at timestamptz default now();
alter table public.clientes add column plano text check(plano in ('pagina','assistente','completo'));
alter table public.clientes add column paid_until timestamptz;
alter table public.clientes add column cancel_at timestamptz;
alter table public.clientes add column legacy_access boolean not null default false;
-- Preserve existing active test records without treating them as received payments.
create or replace view public.widget_config as
select public_id, dados || jsonb_build_object('incluiAssistente',coalesce(plano,case when dados->>'incluiAssistente'='false' then 'pagina' else 'completo' end)<>'pagina','incluiPagina',coalesce(plano,'completo')<>'assistente') as dados
from public.clientes
where (coalesce(operational_state,status)='active' and ((operational_state is null and status='active') or legacy_access or paid_until + interval '10 days' > now()) and (cancel_at is null or cancel_at>now()))
   or (coalesce(operational_state,status)='trial' and trial_ends_at>now() and (cancel_at is null or cancel_at>now()));
revoke all on public.widget_config from anon,authenticated;
grant select on public.widget_config to anon,authenticated;

alter table public.leads add constraint leads_cliente_fk foreign key(public_id) references public.clientes(public_id) on delete cascade;
alter table public.eventos add constraint eventos_cliente_fk foreign key(public_id) references public.clientes(public_id) on delete cascade;
create index eventos_periodo_idx on public.eventos(public_id,criado_em);
create index leads_periodo_idx on public.leads(public_id,criado_em,id);

create table public.cliente_acessos (
 cliente_id text primary key references public.clientes(id) on delete cascade,
 email text not null check(length(email)<=254),
 user_id uuid references auth.users(id) on delete set null,
 criado_em timestamptz not null default now()
);
alter table public.cliente_acessos enable row level security;
revoke all on public.cliente_acessos from anon,authenticated;
grant select,insert,update,delete on public.cliente_acessos to authenticated;
create policy acesso_operador on public.cliente_acessos for all to authenticated
 using(exists(select 1 from public.clientes c where c.id=cliente_id and c.user_id=auth.uid()))
 with check(exists(select 1 from public.clientes c where c.id=cliente_id and c.user_id=auth.uid()));
create policy acesso_cliente on public.cliente_acessos for select to authenticated using(user_id=auth.uid());
create function private.cliente_autorizado(p_id text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.cliente_acessos where cliente_id=p_id and user_id=auth.uid());
$$;
revoke all on function private.cliente_autorizado(text) from public,anon;
grant execute on function private.cliente_autorizado(text) to authenticated;
create function public.aceitar_acessos() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Login necessário'; end if;
 if not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Confirme seu e-mail'; end if;
 update public.cliente_acessos set user_id=auth.uid() where user_id is null and lower(email)=(select lower(u.email) from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null);
 update public.colaboradores set colaborador_id=auth.uid(),aceito_em=now() where colaborador_id is null and lower(email)=(select lower(u.email) from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null);
end $$;
revoke all on function public.aceitar_acessos() from public,anon;
grant execute on function public.aceitar_acessos() to authenticated;
-- Accepting invitations is only possible via the verified-email function.
alter policy "colaboradores: convidado aceita" on public.colaboradores using(false) with check(false);

create function private.cliente_public_autorizado(p_public_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.cliente_acessos a join public.clientes c on c.id=a.cliente_id where a.user_id=auth.uid() and c.public_id=p_public_id);
$$;
revoke all on function private.cliente_public_autorizado(uuid) from public,anon;
grant execute on function private.cliente_public_autorizado(uuid) to authenticated;
create policy eventos_cliente on public.eventos for select to authenticated
 using(private.cliente_public_autorizado(public_id));
create function public.portal_clientes() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'nome',c.nome_negocio,'publicId',c.public_id,'plano',c.plano,'status',coalesce(c.operational_state,c.status),'trialEndsAt',c.trial_ends_at,'paidUntil',c.paid_until,'cancelAt',c.cancel_at)), '[]'::jsonb)
 from public.clientes c join public.cliente_acessos a on a.cliente_id=c.id where a.user_id=auth.uid();
$$;
revoke all on function public.portal_clientes() from public,anon;
grant execute on function public.portal_clientes() to authenticated;
create table public.solicitacoes (
 id uuid primary key default gen_random_uuid(), cliente_id text not null references public.clientes(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id), tipo text not null check(tipo in('alteracao','cancelamento')),
 texto text not null check(length(texto) between 1 and 2000), status text not null default 'pendente' check(status in('pendente','concluida')),
 criado_em timestamptz not null default now()
);
alter table public.solicitacoes enable row level security;
revoke all on public.solicitacoes from anon,authenticated;
grant select,insert on public.solicitacoes to authenticated;
grant update(status) on public.solicitacoes to authenticated;
create policy solicitacao_cliente_le on public.solicitacoes for select to authenticated using(private.cliente_autorizado(cliente_id));
create policy solicitacao_cliente_insere on public.solicitacoes for insert to authenticated with check(user_id=auth.uid() and private.cliente_autorizado(cliente_id) and status='pendente');
create policy solicitacao_operador on public.solicitacoes for all to authenticated
 using(exists(select 1 from public.clientes c where c.id=cliente_id and c.user_id=auth.uid()))
 with check(exists(select 1 from public.clientes c where c.id=cliente_id and c.user_id=auth.uid()));

create or replace function public.relatorio_periodo(p_public_id uuid,p_inicio date,p_fim date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare inicio timestamptz; fim timestamptz; resultado jsonb;
begin
 if auth.uid() is null then raise exception 'Login necessário'; end if;
 if p_inicio is null or p_fim is null or p_fim<p_inicio or p_fim-p_inicio>366 then raise exception 'Período inválido (máximo 366 dias)'; end if;
 inicio:=p_inicio::timestamp at time zone 'America/Sao_Paulo'; fim:=(p_fim+1)::timestamp at time zone 'America/Sao_Paulo';
 with e as (select tipo,opcao_label from public.eventos where public_id=p_public_id and criado_em>=inicio and criado_em<fim union all select tipo,null::text from public.pagina_eventos where public_id=p_public_id and criado_em>=inicio and criado_em<fim),
 top_opcao as(select opcao_label label,count(*) contagem from e where tipo='opcao_clicada' and opcao_label is not null group by opcao_label order by count(*) desc,opcao_label limit 1)
 select jsonb_build_object('aberturas',count(*) filter(where tipo='abertura'),'handoffs',count(*) filter(where tipo='handoff_whatsapp'),
 'visitasPagina',count(*) filter(where tipo='pagina_visualizada'),'whatsPagina',count(*) filter(where tipo='pagina_whatsapp'),
 'opcaoMaisClicada',(select to_jsonb(t) from top_opcao t),'inicio',p_inicio,'fim',p_fim) into resultado from e;
 return resultado;
end $$;
revoke all on function public.relatorio_periodo(uuid,date,date) from public,anon;
grant execute on function public.relatorio_periodo(uuid,date,date) to authenticated;

-- Public collection: validation plus atomic rate limits, including legacy direct writes.
create table private.public_limits(chave text primary key,janela timestamptz not null,n integer not null);
alter table private.public_limits enable row level security;
revoke all on private.public_limits from public,anon,authenticated;
create function private.validar_coleta() returns trigger language plpgsql security definer set search_path='' as $$
declare ip text; chave text; quantidade integer; limite integer; janela timestamptz;
begin
 if current_setting('role',true) not in ('anon','authenticated') then return new; end if;
 if private.operador() and exists(select 1 from public.clientes where public_id=new.public_id and user_id=auth.uid()) then return new; end if;
 if not exists(select 1 from public.widget_config where public_id=new.public_id) then raise exception 'Negócio indisponível'; end if;
 if length(coalesce(to_jsonb(new)->>'opcao_label',''))>200 then raise exception 'Opção inválida'; end if;
 if tg_table_name='leads' then
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
 insert into private.public_limits values(chave,janela,1) on conflict on constraint public_limits_pkey do update set n=private.public_limits.n+1 returning n into quantidade;
 if quantidade>limite then raise sqlstate 'P0001' using message='Limite de coleta atingido'; end if;
 chave:=new.public_id::text||':'||tg_table_name||':site:'||janela::text;
 insert into private.public_limits values(chave,janela,1) on conflict on constraint public_limits_pkey do update set n=private.public_limits.n+1 returning n into quantidade;
 if quantidade>(case when tg_table_name='leads' then 120 else 600 end) then raise exception 'Limite de coleta atingido'; end if;
 delete from private.public_limits b where b.janela<now()-interval '24 hours';
 return new;
end $$;
revoke all on function private.validar_coleta() from public,anon,authenticated;
create trigger validar_lead before insert on public.leads for each row execute function private.validar_coleta();
create trigger validar_evento before insert on public.eventos for each row execute function private.validar_coleta();
-- Owners may correct/delete visitor data; collaborators retain note/status only.
create function public.corrigir_contato(p_id uuid,p_nome text,p_telefone text) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(coalesce(p_nome,''))>120 or length(coalesce(p_telefone,''))>30 then raise exception 'Contato inválido'; end if;
 update public.leads l set nome=nullif(p_nome,''),telefone=nullif(p_telefone,'') where l.id=p_id and exists(select 1 from public.clientes c where c.public_id=l.public_id and c.user_id=auth.uid() and private.operador());
 if not found then raise exception 'Contato não encontrado ou sem permissão'; end if;
end $$;
create policy lead_dono_exclui on public.leads for delete to authenticated using(exists(select 1 from public.clientes c where c.public_id=leads.public_id and c.user_id=auth.uid()));
grant delete on public.leads to authenticated;
revoke all on function public.corrigir_contato(uuid,text,text) from public,anon;
grant execute on function public.corrigir_contato(uuid,text,text) to authenticated;

create table public.recebimentos (
 id uuid primary key default gen_random_uuid(), cliente_id text not null references public.clientes(id) on delete cascade,
 valor_centavos integer not null check(valor_centavos>0), status_financeiro text not null default 'recebido' check(status_financeiro in('confirmado','recebido','estornado')), recebido_em timestamptz not null,
 valido_ate timestamptz not null, referencia text not null check(length(referencia) between 1 and 160), origem text not null default 'manual',
 unique(cliente_id,referencia)
);
alter table public.recebimentos enable row level security;
revoke all on public.recebimentos from anon,authenticated;
grant select on public.recebimentos to authenticated;
create policy recebimento_dono on public.recebimentos for select to authenticated using(exists(select 1 from public.clientes c where c.id=cliente_id and c.user_id=auth.uid()));
create policy recebimento_cliente on public.recebimentos for select to authenticated using(private.cliente_autorizado(cliente_id));
create function public.registrar_recebimento(p_cliente text,p_plano text,p_valor integer,p_recebido timestamptz,p_validade timestamptz,p_referencia text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.operador() or not exists(select 1 from public.clientes where id=p_cliente and user_id=auth.uid()) then raise exception 'Sem permissão'; end if;
 if p_plano not in('pagina','assistente','completo') or p_valor<>(case p_plano when 'pagina' then 9700 when 'assistente' then 14700 else 19700 end) or p_recebido>now()+interval '1 day' or p_validade<=p_recebido or p_validade>p_recebido+interval '32 days' then raise exception 'Plano, valor ou validade inválidos'; end if;
 insert into public.recebimentos(cliente_id,valor_centavos,recebido_em,valido_ate,referencia) values(p_cliente,p_valor,p_recebido,p_validade,p_referencia);
 update public.clientes set plano=p_plano,status='active',operational_state='active',paid_until=p_validade,legacy_access=false,cancel_at=null,updated_at=now() where id=p_cliente;
end $$;
revoke all on function public.registrar_recebimento(text,text,integer,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.registrar_recebimento(text,text,integer,timestamptz,timestamptz,text) to authenticated;
-- Server-only provider identifiers and idempotent webhook records.
create table private.billing_links(cliente_id text primary key references public.clientes(id) on delete cascade,subscription_id text unique not null,customer_id text not null);
create table private.billing_events(event_id text primary key,payment_id text not null,event_type text not null,processed_at timestamptz not null default now());
alter table private.billing_links enable row level security;
alter table private.billing_events enable row level security;
revoke all on private.billing_links,private.billing_events from public,anon,authenticated;
create function public.processar_pagamento(p_event text,p_payment text,p_subscription text,p_customer text,p_tipo text,p_valor integer,p_pago timestamptz,p_validade timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare negocio public.clientes; begin
 select c.* into negocio from public.clientes c join private.billing_links b on b.cliente_id=c.id where b.subscription_id=p_subscription and b.customer_id=p_customer for update of c;
 if not found then raise exception 'Assinatura desconhecida'; end if;
 if p_tipo not in('PAYMENT_RECEIVED','PAYMENT_CONFIRMED','PAYMENT_REFUNDED','PAYMENT_DELETED') then raise exception 'Evento inválido'; end if;
 if p_valor<>(case negocio.plano when 'pagina' then 9700 when 'assistente' then 14700 else 19700 end) then raise exception 'Valor divergente'; end if;
 insert into private.billing_events values(p_event,p_payment,p_tipo,now()) on conflict do nothing;
 if not found then return; end if;
 if p_tipo in('PAYMENT_RECEIVED','PAYMENT_CONFIRMED') then
  if p_validade<=p_pago or p_validade>p_pago+interval '32 days' then raise exception 'Validade inválida'; end if;
  insert into public.recebimentos(cliente_id,valor_centavos,recebido_em,valido_ate,referencia,origem,status_financeiro) values(negocio.id,p_valor,p_pago,p_validade,p_payment,'asaas',case when p_tipo='PAYMENT_RECEIVED' then 'recebido' else 'confirmado' end) on conflict(cliente_id,referencia) do update set status_financeiro=case when public.recebimentos.status_financeiro='recebido' then 'recebido' else excluded.status_financeiro end;
  update public.clientes set status='active',operational_state='active',paid_until=greatest(coalesce(paid_until,p_validade),p_validade),legacy_access=false,updated_at=now() where id=negocio.id;
 else
  update public.recebimentos set status_financeiro='estornado' where cliente_id=negocio.id and referencia=p_payment;
  -- A refund only removes the period credited by the affected payment.
  if exists(select 1 from public.recebimentos r where r.cliente_id=negocio.id and r.referencia=p_payment and r.valido_ate=negocio.paid_until) then
   update public.clientes set status='suspended',operational_state='suspended',legacy_access=false,updated_at=now() where id=negocio.id;
  end if;
 end if;
end $$;
revoke all on function public.processar_pagamento(text,text,text,text,text,integer,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.processar_pagamento(text,text,text,text,text,integer,timestamptz,timestamptz) to service_role;

create function public.backup_operacional() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.operador() then raise exception 'Sem permissão'; end if;
 return jsonb_build_object('versao',2,'ownerId',auth.uid(),'exportadoEm',now(),
 'clientes',coalesce((select jsonb_agg(to_jsonb(c)) from public.clientes c where user_id=auth.uid()),'[]'::jsonb),
 'leads',coalesce((select jsonb_agg(to_jsonb(l)) from public.leads l join public.clientes c on c.public_id=l.public_id where c.user_id=auth.uid()),'[]'::jsonb),
 'paginaEventos',coalesce((select jsonb_agg(to_jsonb(e)) from public.pagina_eventos e join public.clientes c on c.public_id=e.public_id where c.user_id=auth.uid()),'[]'::jsonb),
 'eventos',coalesce((select jsonb_agg(to_jsonb(e)) from public.eventos e join public.clientes c on c.public_id=e.public_id where c.user_id=auth.uid()),'[]'::jsonb),
 'acessos',coalesce((select jsonb_agg(to_jsonb(a)) from public.cliente_acessos a join public.clientes c on c.id=a.cliente_id where c.user_id=auth.uid()),'[]'::jsonb),
 'recebimentos',coalesce((select jsonb_agg(to_jsonb(r)) from public.recebimentos r join public.clientes c on c.id=r.cliente_id where c.user_id=auth.uid()),'[]'::jsonb),
 'solicitacoes',coalesce((select jsonb_agg(to_jsonb(s)) from public.solicitacoes s join public.clientes c on c.id=s.cliente_id where c.user_id=auth.uid()),'[]'::jsonb),
 'colaboradores',coalesce((select jsonb_agg(to_jsonb(co)) from public.colaboradores co where co.dono_id=auth.uid()),'[]'::jsonb),
 'atribuicoes',coalesce((select jsonb_agg(to_jsonb(cc)) from public.colaborador_clientes cc join public.clientes c on c.id=cc.cliente_id where c.user_id=auth.uid()),'[]'::jsonb),
 'prospectos',coalesce((select jsonb_agg(to_jsonb(p)) from public.prospectos p where user_id=auth.uid()),'[]'::jsonb),
 'configuracoes',coalesce((select jsonb_agg(to_jsonb(s)) from public.account_config s where user_id=auth.uid()),'[]'::jsonb));
end $$;
revoke all on function public.backup_operacional() from public,anon;
grant execute on function public.backup_operacional() to authenticated;
create function public.restaurar_backup(p_backup jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; restored text[]:=array[]::text[]; pubs uuid[]:=array[]::uuid[]; n integer:=0; skipped integer:=0;
begin
 if not private.operador() or (p_backup->>'ownerId') is distinct from auth.uid()::text or (p_backup->>'versao') is distinct from '2' then raise exception 'Backup incompatível com esta conta'; end if;
 if jsonb_array_length(p_backup->'clientes')>500 then raise exception 'Backup excede limite de 500 negócios'; end if;
 for item in select value from jsonb_array_elements(p_backup->'clientes') loop
  if (item->>'user_id')::uuid is distinct from auth.uid() then raise exception 'Proprietário divergente'; end if;
  if exists(select 1 from public.clientes where id=item->>'id' or public_id=(item->>'public_id')::uuid) then skipped:=skipped+1; continue; end if;
  insert into public.clientes(id,user_id,nome_negocio,dados,public_id,status,operational_state,trial_ends_at,plano,paid_until,cancel_at,legacy_access,created_at)
  values(item->>'id',auth.uid(),item->>'nome_negocio',item->'dados',(item->>'public_id')::uuid,'suspended','suspended',coalesce((item->>'trial_ends_at')::timestamptz,now()),coalesce(item->>'plano','completo'),(item->>'paid_until')::timestamptz,(item->>'cancel_at')::timestamptz,false,(item->>'created_at')::timestamptz);
  restored:=array_append(restored,item->>'id'); pubs:=array_append(pubs,(item->>'public_id')::uuid); n:=n+1;
 end loop;
 insert into public.leads(id,public_id,nome,telefone,opcao_label,criado_em,nota,status_atendimento)
 select id,public_id,nome,telefone,opcao_label,criado_em,nota,status_atendimento from jsonb_populate_recordset(null::public.leads,coalesce(p_backup->'leads','[]')) where public_id=any(pubs);
 insert into public.eventos(public_id,tipo,opcao_label,criado_em)
 select public_id,tipo,opcao_label,criado_em from jsonb_populate_recordset(null::public.eventos,coalesce(p_backup->'eventos','[]')) where public_id=any(pubs);
 insert into public.pagina_eventos(public_id,tipo,criado_em) select public_id,tipo,criado_em from jsonb_populate_recordset(null::public.pagina_eventos,coalesce(p_backup->'paginaEventos','[]')) where public_id=any(pubs);
 insert into public.cliente_acessos select * from jsonb_populate_recordset(null::public.cliente_acessos,coalesce(p_backup->'acessos','[]')) where cliente_id=any(restored);
 insert into public.recebimentos select * from jsonb_populate_recordset(null::public.recebimentos,coalesce(p_backup->'recebimentos','[]')) where cliente_id=any(restored);
 insert into public.solicitacoes select * from jsonb_populate_recordset(null::public.solicitacoes,coalesce(p_backup->'solicitacoes','[]')) where cliente_id=any(restored);
 insert into public.colaboradores select * from jsonb_populate_recordset(null::public.colaboradores,coalesce(p_backup->'colaboradores','[]')) where dono_id=auth.uid() on conflict do nothing;
 insert into public.colaborador_clientes select * from jsonb_populate_recordset(null::public.colaborador_clientes,coalesce(p_backup->'atribuicoes','[]')) where cliente_id=any(restored) and colaborador_row_id in(select id from public.colaboradores where dono_id=auth.uid()) on conflict do nothing;
 insert into public.account_config(user_id,key,value,updated_at) select user_id,key,value,updated_at from jsonb_populate_recordset(null::public.account_config,coalesce(p_backup->'configuracoes','[]')) where user_id=auth.uid() on conflict(user_id,key) do nothing;
 insert into public.prospectos select * from jsonb_populate_recordset(null::public.prospectos,coalesce(p_backup->'prospectos','[]')) where user_id=auth.uid() on conflict do nothing;
 return jsonb_build_object('restaurados',n,'preservados',skipped);
end $$;
revoke all on function public.restaurar_backup(jsonb) from public,anon;
grant execute on function public.restaurar_backup(jsonb) to authenticated;
-- Prospective cancellation: access ends with the paid period; cleanup is explicit after 30 days.
create function public.cancelar_assinatura(p_cliente text) returns timestamptz language plpgsql security definer set search_path='' as $$
declare fim timestamptz; begin
 if not private.operador() then raise exception 'Sem permissão'; end if;
 update public.clientes set cancel_at=greatest(coalesce(paid_until,now()),now()),updated_at=now() where id=p_cliente and user_id=auth.uid() returning cancel_at into fim;
 if not found then raise exception 'Sem permissão'; end if; return fim;
end $$;
revoke all on function public.cancelar_assinatura(text) from public,anon;
grant execute on function public.cancelar_assinatura(text) to authenticated;

create table public.prospectos(
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 negocio text not null check(length(negocio) between 1 and 120), segmento text check(length(segmento)<=80), canal text check(length(canal)<=200),
 dor text check(length(dor)<=1000), etapa text not null default 'novo' check(etapa in('novo','conversa','demonstracao','teste','proposta','ganho','perdido')),
 proxima_acao text check(length(proxima_acao)<=200), proxima_data date, plano text default 'completo' check(plano in('pagina','assistente','completo')),
 criado_em timestamptz not null default now()
);
alter table public.prospectos enable row level security;
revoke all on public.prospectos from anon,authenticated;
grant select,insert,update,delete on public.prospectos to authenticated;
create policy prospecto_operador on public.prospectos for all to authenticated using(user_id=auth.uid() and private.operador()) with check(user_id=auth.uid() and private.operador());
create table private.site_owner(id boolean primary key default true check(id), user_id uuid not null references auth.users(id));
insert into private.site_owner select true,min(user_id::text)::uuid from public.operadores having count(*)=1;
alter table private.site_owner enable row level security;
revoke all on private.site_owner from public,anon,authenticated;
create table public.interesses_comerciais(id bigint generated always as identity primary key, user_id uuid not null references auth.users(id), plano text not null, origem text not null,criado_em timestamptz not null default now());
alter table public.interesses_comerciais enable row level security;
revoke all on public.interesses_comerciais from anon,authenticated;
grant select on public.interesses_comerciais to authenticated;
create policy interesses_dono on public.interesses_comerciais for select to authenticated using(user_id=auth.uid() and private.operador());
create function public.registrar_interesse(p_plano text,p_origem text) returns void language plpgsql security definer set search_path='' as $$
declare dono uuid; n integer; bucket text; begin
 if p_plano not in('pagina','assistente','completo','geral') or p_origem not in('direto','instagram','google','indicacao','outro') then raise exception 'Origem ou plano inválido'; end if;
 select user_id into dono from private.site_owner where id=true;
 if dono is null then return; end if;
 bucket:='comercial:'||md5(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','unknown'))||':'||date_trunc('minute',now())::text;
 insert into private.public_limits values(bucket,date_trunc('minute',now()),1) on conflict on constraint public_limits_pkey do update set n=private.public_limits.n+1 returning private.public_limits.n into n;
 if n>20 then raise exception 'Limite de coleta atingido'; end if;
 insert into public.interesses_comerciais(user_id,plano,origem) values(dono,p_plano,p_origem);
 delete from private.public_limits b where b.janela<now()-interval '24 hours';
end $$;
revoke all on function public.registrar_interesse(text,text) from public;
grant execute on function public.registrar_interesse(text,text) to anon,authenticated;
create function public.resumo_comercial(p_inicio date,p_fim date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare inicio timestamptz; fim timestamptz; begin
 if p_inicio is null or p_fim is null or p_fim<p_inicio or p_fim-p_inicio>366 then raise exception 'Período inválido'; end if;
 inicio:=p_inicio::timestamp at time zone 'America/Sao_Paulo';fim:=(p_fim+1)::timestamp at time zone 'America/Sao_Paulo';
 return jsonb_build_object('recebidoCentavos',(select coalesce(sum(valor_centavos),0) from public.recebimentos r join public.clientes c on c.id=r.cliente_id where c.user_id=auth.uid() and r.status_financeiro='recebido' and r.recebido_em>=inicio and r.recebido_em<fim),
 'assinantesPagos',(select count(*) from public.clientes where user_id=auth.uid() and paid_until>now() and status='active' and not legacy_access),
 'interesses',(select count(*) from public.interesses_comerciais where criado_em>=inicio and criado_em<fim),
 'origens',(select coalesce(jsonb_object_agg(origem,n),'{}'::jsonb) from(select origem,count(*) n from public.interesses_comerciais where criado_em>=inicio and criado_em<fim group by origem)t));
end $$;
revoke all on function public.resumo_comercial(date,date) from public,anon;
grant execute on function public.resumo_comercial(date,date) to authenticated;
create function public.vincular_cobranca(p_cliente text,p_subscription text,p_customer text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.operador() or not exists(select 1 from public.clientes where id=p_cliente and user_id=auth.uid()) then raise exception 'Sem permissão'; end if;
 if p_subscription !~ '^sub_[a-zA-Z0-9]+$' or p_customer !~ '^cus_[a-zA-Z0-9]+$' then raise exception 'Identificador inválido'; end if;
 insert into private.billing_links(cliente_id,subscription_id,customer_id) values(p_cliente,p_subscription,p_customer) on conflict(cliente_id) do update set subscription_id=excluded.subscription_id,customer_id=excluded.customer_id;
end $$;
revoke all on function public.vincular_cobranca(text,text,text) from public,anon;
grant execute on function public.vincular_cobranca(text,text,text) to authenticated;
-- Minimal table grants; RLS is not a replacement for privileges.
revoke all on public.clientes,public.account_config,public.colaboradores,public.colaborador_clientes from anon;
revoke all on public.clientes,public.account_config,public.colaboradores,public.colaborador_clientes from authenticated;
grant select,insert,update,delete on public.clientes,public.account_config to authenticated;
grant select,insert,delete on public.colaboradores to authenticated;
grant select,insert,delete on public.colaborador_clientes to authenticated;
revoke all on public.leads,public.eventos from anon;
grant insert on public.leads,public.eventos to anon;
revoke all on public.leads,public.eventos from authenticated;
grant select,delete on public.leads to authenticated;
grant update(nota,status_atendimento) on public.leads to authenticated;
grant select on public.eventos to authenticated;
alter table public.leads add constraint lead_nota_limite check(length(coalesce(nota,''))<=1000) not valid;

create policy pagina_eventos_cliente on public.pagina_eventos for select to authenticated using(private.cliente_public_autorizado(public_id));
create trigger validar_pagina_evento before insert on public.pagina_eventos for each row execute function private.validar_coleta();
create function public.saas_status() returns boolean language sql stable security invoker set search_path='' as $$ select true $$;
revoke all on function public.saas_status() from public,anon;
grant execute on function public.saas_status() to authenticated;
create index cliente_acessos_user_idx on public.cliente_acessos(user_id);
create index solicitacoes_cliente_data_idx on public.solicitacoes(cliente_id,criado_em);
create index recebimentos_cliente_data_idx on public.recebimentos(cliente_id,recebido_em);
create index prospectos_owner_date_idx on public.prospectos(user_id,proxima_data);
create index interesses_owner_date_idx on public.interesses_comerciais(user_id,criado_em);
create index public_limits_janela_idx on private.public_limits(janela);
