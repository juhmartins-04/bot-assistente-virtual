-- Reserve the solo panel to owners present before public launch.
-- No business or history rows are edited or removed.
create table public.operadores_solo (
 user_id uuid primary key references auth.users(id)
);
insert into public.operadores_solo(user_id) select distinct user_id from public.clientes;
alter table public.operadores_solo enable row level security;
revoke all on public.operadores_solo from public,anon,authenticated;
grant select on public.operadores_solo to authenticated;
create policy operador_solo_proprio on public.operadores_solo for select to authenticated using(user_id=auth.uid());
alter policy "clientes: dono le e escreve" on public.clientes to authenticated
 using(user_id=auth.uid() and exists(select 1 from public.operadores_solo o where o.user_id=auth.uid()))
 with check(user_id=auth.uid() and exists(select 1 from public.operadores_solo o where o.user_id=auth.uid()));
