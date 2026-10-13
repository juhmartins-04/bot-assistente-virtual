import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
export const OWNER='00000000-0000-4000-8000-000000000001'
export const OTHER='00000000-0000-4000-8000-000000000002'
export const CLIENT='00000000-0000-4000-8000-000000000003'
export const STAFF='00000000-0000-4000-8000-000000000004'
export const PUB='11111111-1111-4111-8111-111111111111'
export async function database({full=true}={}) {
 const db=new PGlite()
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
 grant usage on schema auth to anon,authenticated,service_role;
 grant execute on all functions in schema auth to anon,authenticated,service_role;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
 insert into auth.users values('${OWNER}','owner@example.test',now());
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
 `)
 await db.exec((await readFile(new URL('../../supabase-schema.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;', ''))
 await db.exec(`insert into public.clientes(id,user_id,nome_negocio,dados,public_id,status) values('test','${OWNER}','Teste','{"nomeNegocio":"Teste"}','${PUB}','active');insert into public.app_storage(key,value) values('config','{"agencia":"Legado"}');`)
 await db.exec(await readFile(new URL('../../supabase/migrations/20261013202422_account_config_and_reports.sql',import.meta.url),'utf8'))
 if(full) await db.exec(await readFile(new URL('../../supabase/optional/operations_full_reference.sql',import.meta.url),'utf8'))
 await db.exec(`insert into auth.users values('${OTHER}','other@example.test',now()),('${CLIENT}','client@example.test',now()),('${STAFF}','staff@example.test',now());`)
 return db
}
export async function login(db,id,role='authenticated',email='') {
 await db.exec('reset role')
 await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify({sub:id,email})])
 await db.exec(`set role ${role}`)
}
