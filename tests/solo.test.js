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
    await db.query("insert into public.eventos(public_id,tipo,criado_em) select $1,'abertura','2026-10-13T03:00:00Z' from generate_series(1,5001)", [PUB]);
    await login(db, '', 'anon');
    await db.query("insert into public.pagina_eventos(public_id,tipo) values($1,'pagina_visualizada'),($1,'pagina_whatsapp')", [PUB]);
    await login(db, OWNER);
    const { rows } = await db.query("select public.relatorio_periodo($1,'2026-01-01','2026-12-31') r", [PUB]);
    assert.equal(rows[0].r.aberturas, 5001);
    assert.equal(rows[0].r.visitasPagina, 1);
    assert.equal(rows[0].r.whatsPagina, 1);
    await login(db, OTHER);
    assert.equal((await db.query("select public.relatorio_periodo($1,'2026-01-01','2026-12-31') r", [PUB])).rows[0].r.aberturas, 0);
  } finally { await db.close(); }
});
