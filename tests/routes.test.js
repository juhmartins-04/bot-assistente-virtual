import test from 'node:test'
import assert from 'node:assert/strict'
import { resolverRota } from '../src/routes.js'

test('a raiz apresenta o produto e o painel mantém um acesso próprio', () => {
  assert.deepEqual(resolverRota({ pathname: '/' }), { tipo: 'comercial' })
  for (const pathname of ['/painel', '/painel/', '/login', '/endereco-antigo']) {
    assert.deepEqual(resolverRota({ pathname }), { tipo: 'painel' })
  }
  assert.deepEqual(resolverRota({ pathname: '/demo', search: '?segmento=pet' }), { tipo: 'demo' })
})

test('os links públicos de clientes existentes continuam abrindo a mesma página', () => {
  for (const pathname of ['/p/cliente-exemplo', '/p/cliente-exemplo/']) {
    assert.deepEqual(resolverRota({ pathname }), { tipo: 'cliente', publicId: 'cliente-exemplo' })
  }
})

test('links mágicos e de recuperação recebidos na raiz chegam ao app de autenticação', () => {
  for (const retorno of [
    { hash: '#access_token=token-ficticio&type=magiclink' },
    { hash: '#access_token=token-ficticio&type=recovery&refresh_token=ficticio' },
    { search: '?code=exemplo-pkce' },
    { hash: '#error_description=link_expirado' },
    { search: '?error_description=link_expirado' },
  ]) assert.deepEqual(resolverRota({ pathname: '/', ...retorno }), { tipo: 'painel' })
})

test('âncoras de navegação e parâmetros comerciais não são confundidos com login', () => {
  assert.deepEqual(resolverRota({ pathname: '/', hash: '#planos', search: '?utm_source=instagram' }), { tipo: 'comercial' })
})
