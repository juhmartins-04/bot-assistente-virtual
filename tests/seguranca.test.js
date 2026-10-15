import test from 'node:test'
import assert from 'node:assert/strict'
import { database, login, OWNER, OTHER, STAFF, PUB } from './helpers/database.js'
import { gerarCodigo, origemWidget, validarPublicacao } from '../src/instalacao.js'
import { readFileSync, readdirSync } from 'node:fs'
import { JSDOM } from 'jsdom'

test('papéis de API não podem apagar tabelas inteiras ou acessar conteúdo privado', async()=>{
 const db=await database({full:false})
 try {
  for(const [id,role] of [['','anon'],[OWNER,'authenticated'],[OTHER,'authenticated']]){
   await login(db,id,role)
   for(const table of ['clientes','leads','eventos','pagina_eventos','account_config','app_storage','colaboradores','colaborador_clientes','publicacoes']){
    assert.equal((await db.query('select has_table_privilege(current_user,$1,\'TRUNCATE\') allowed',[`public.${table}`])).rows[0].allowed,false,`${role}: ${table}`)
    await assert.rejects(db.exec(`truncate public.${table} cascade`))
   }
   if(role==='anon'){
    await assert.rejects(db.exec('select * from public.clientes'))
    await assert.rejects(db.exec('select * from public.leads'))
    await assert.rejects(db.exec('select private.clientes_atribuidos()'))
   }
  }
  await login(db,OWNER)
  assert.equal((await db.query('select count(*)::int n from public.clientes')).rows[0].n,1)
  await assert.rejects(db.exec('delete from public.clientes'))
 }finally{await db.close()}
})

test('publicação separa configuração interna, sincroniza conteúdo e respeita expiração',async()=>{
 const db=await database({full:false})
 try{
  await login(db,OWNER)
  await db.exec(`update public.clientes set dados=dados||'{"nomeNegocio":"Publicado","instalacao":{"siteUrl":"https://cliente.example","observacoes":"PRIVADO"},"paidUntil":"PRIVADO","futuroInterno":"PRIVADO"}' where id='test'`)
  await login(db,'','anon')
  let c=(await db.query('select * from public.widget_config')).rows[0]
  assert.equal(c.dados.nomeNegocio,'Publicado')
  assert.doesNotMatch(JSON.stringify(c),/PRIVADO|instalacao|paidUntil|futuroInterno/)
  await assert.rejects(db.exec('select * from public.publicacoes'))
  assert.equal((await db.query('select public_id,dados from public.publicacoes')).rows.length,1)
  await assert.rejects(db.exec(`update public.publicacoes set dados='{}'`))
  for(const status of ['suspended','trial']){
   await login(db,OWNER)
   await db.query("update public.clientes set status=$1,trial_ends_at=now()-interval '1 day' where id='test'",[status])
   await login(db,'','anon')
   assert.equal((await db.query('select * from public.widget_config')).rows.length,0)
   await assert.rejects(db.query("insert into public.eventos(public_id,tipo) values($1,'abertura')",[PUB]))
  }
  await login(db,OWNER)
  await db.exec("update public.clientes set status='trial',trial_ends_at=now()+interval '14 days' where id='test'")
  await login(db,'','anon')
  assert.equal((await db.query('select * from public.widget_config')).rows.length,1)
 }finally{await db.close()}
})

test('colaborador vê somente os clientes atribuídos e não altera identidade ou autorização',async()=>{
 const db=await database({full:false})
 try{
  const co=(await db.query("insert into public.colaboradores(dono_id,colaborador_id,email) values($1,$2,'staff@example.test') returning id",[OWNER,STAFF])).rows[0]
  await db.query("insert into public.colaborador_clientes values($1,'test')",[co.id])
  await db.query("insert into public.leads(public_id,nome) values($1,'Contato de exemplo')",[PUB])
  await login(db,STAFF,'authenticated','staff@example.test')
  assert.equal((await db.query('select * from public.colaborador_clientes_view')).rows.length,1)
  assert.equal((await db.query('select * from public.clientes')).rows.length,0)
  assert.equal((await db.query('select * from public.leads')).rows.length,1)
  await db.exec("update public.leads set nota='Retornado',status_atendimento='respondido'")
  await assert.rejects(db.exec("update public.leads set nome='Forjado'"))
  await assert.rejects(db.exec("update public.colaboradores set dono_id=colaborador_id"))
  await login(db,OTHER)
  assert.equal((await db.query('select * from public.colaborador_clientes_view')).rows.length,0)
  assert.equal((await db.query('select * from public.leads')).rows.length,0)
 }finally{await db.close()}
})

test('código de instalação aceita somente origem HTTPS e identificador válido',()=>{
 const c={publicId:PUB}
 assert.match(gerarCodigo(c,'https://pronto.example/'),/^<script src="https:\/\/pronto.example\/atendente-virtual-widget.js"/)
 for(const url of ['javascript:alert(1)','https://x.example/\" onload=\"alert(1)','https://user:pass@x.example','https://x.example/?a=1','http://x.example','https://x.example/#test']){
  assert.equal(origemWidget(url),null,url)
  assert.ok(gerarCodigo(c,url).startsWith('<!--'))
 }
 assert.ok(gerarCodigo({publicId:'\" onload=\"alert(1)'},'https://ok.example').startsWith('<!--'))
})

test('Só Assistente precisa de site, autorização e conteúdo aprovado para publicar',()=>{
 assert.equal(validarPublicacao({plano:'assistente'}).length,3)
 assert.equal(validarPublicacao({plano:'assistente',instalacao:{siteUrl:'https://cliente.example',autorizada:'false',conteudoAprovado:'false'}}).length,2)
 assert.deepEqual(validarPublicacao({plano:'pagina'}),[])
 assert.deepEqual(validarPublicacao({plano:'assistente',instalacao:{siteUrl:'https://cliente.example',autorizada:true,conteudoAprovado:true}}),[])
})

test('política bloqueia scripts injetados e todas as páginas estáticas usam scripts externos',()=>{
 const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8')
 assert.match(headers,/script-src 'self';/)
 assert.doesNotMatch(headers,/script-src[^;]*(unsafe-inline|unsafe-eval)/)
 assert.match(headers,/object-src 'none'/)
 assert.match(headers,/frame-ancestors 'self'/)
 for(const dir of ['../public/','../public/demos/'])for(const name of readdirSync(new URL(dir,import.meta.url)).filter(f=>f.endsWith('.html'))){
  const dom=new JSDOM(readFileSync(new URL(dir+name,import.meta.url),'utf8'))
  try{for(const script of dom.window.document.scripts)if(!['application/json','application/ld+json'].includes(script.type))assert.ok(script.src,`${name}: script executável inline`)}finally{dom.window.close()}
 }
})
