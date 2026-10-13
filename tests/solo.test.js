import test from 'node:test';
import assert from 'node:assert/strict';
import { database, login, OWNER, OTHER, PUB } from './helpers/database.js';

await test('edição solo funciona com a migração efetivamente aplicada', async () => {
  const db = await database({ full: false });
  try {
    await login(db, OWNER);
    await db.query("insert into public.account_config(user_id,key,value) values($1,'pagamento:test:PIX-001',$2)", [OWNER, JSON.stringify({ clienteId:'test', valorCentavos:19700, validoAte:'2026-11-13T23:59:59-03:00' })]);
    await assert.rejects(db.query("insert into public.account_config(user_id,key,value) values($1,'pagamento:test:PIX-001','{}')", [OWNER]));
    await db.exec("update public.clientes set dados=dados||'{\"plano\":\"pagina\",\"incluiAssistente\":false}',status='suspended' where id='test'");
    assert.equal((await db.query('select count(*)::int n from public.widget_config')).rows[0].n, 0);
    await db.exec("update public.clientes set status='trial',trial_ends_at=now()+interval '14 days' where id='test'");
    assert.equal((await db.query('select dados from public.widget_config')).rows[0].dados.incluiAssistente, false);
    await login(db, OTHER);
    await assert.rejects(db.query("insert into public.clientes(id,user_id,nome_negocio,dados) values('unauthorized',$1,'Unknown','{}')", [OTHER]));
    assert.equal((await db.query("select count(*)::int n from public.account_config where key like 'pagamento:%'")).rows[0].n, 0);
    await login(db, '', 'anon');
    await assert.rejects(db.exec("select * from public.account_config"));
    // The schema fixture starts with permissive defaults. Production grants
    // are explicitly narrowed by the applied core migration.
  } finally { await db.close(); }
});

await test('relatório solo agrega eventos da página e mais de 5000 eventos do menu', async () => {
  const db = await database({ full: false });
  try {
    await db.query("insert into public.eventos(public_id,tipo,criado_em) select $1,'abertura',now() from generate_series(1,5001)", [PUB]);
    await login(db, '', 'anon');
    await db.query("insert into public.pagina_eventos(public_id,tipo) values($1,'pagina_visualizada'),($1,'pagina_whatsapp')", [PUB]);
    await login(db, OWNER);
    const reportSql="select public.relatorio_periodo($1,(now() at time zone 'America/Sao_Paulo')::date,(now() at time zone 'America/Sao_Paulo')::date) r";
    const { rows } = await db.query(reportSql, [PUB]);
    assert.equal(rows[0].r.aberturas, 5001);
    assert.equal(rows[0].r.visitasPagina, 1);
    assert.equal(rows[0].r.whatsPagina, 1);
    await login(db, OTHER);
    assert.equal((await db.query(reportSql, [PUB])).rows[0].r.aberturas, 0);
  } finally { await db.close(); }
});

await test('coleta solo valida contatos e protege eventos e contadores privados', async () => {
  const db = await database({ full: false });
  try {
    await login(db, '', 'anon');
    await assert.rejects(db.query('insert into public.leads(public_id,nome) values($1,$2)', [PUB, 'x'.repeat(121)]));
    await assert.rejects(db.query("insert into public.leads(public_id,nome,telefone) values($1,'   ','   ')", [PUB]));
    await assert.rejects(db.query("insert into public.leads(public_id,telefone) values($1,'invalid-phone')", [PUB]));
    await db.query("insert into public.leads(public_id,nome,nota,status_atendimento,criado_em) values($1,' Pessoa ','forged','respondido','2000-01-01')", [PUB]);
    for (let i=0;i<60;i++) await db.query("insert into public.pagina_eventos(public_id,tipo) values($1,'pagina_visualizada')", [PUB]);
    await assert.rejects(db.query("insert into public.pagina_eventos(public_id,tipo) values($1,'pagina_visualizada')", [PUB]));
    await assert.rejects(db.exec('select * from private.solo_public_limits'));
    await login(db, OWNER);
    const lead=(await db.query('select nome,nota,status_atendimento,criado_em from public.leads')).rows[0];
    assert.equal(lead.nome,'Pessoa'); assert.equal(lead.nota,null); assert.equal(lead.status_atendimento,'pendente');
    assert.ok(new Date(lead.criado_em)>new Date('2026-01-01'));
    await db.exec("update public.clientes set status='suspended' where id='test'");
    await login(db, '', 'anon');
    await assert.rejects(db.query("insert into public.pagina_eventos(public_id,tipo) values($1,'pagina_whatsapp')", [PUB]));
  } finally { await db.close(); }
});
