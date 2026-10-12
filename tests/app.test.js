import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { exigirPapel } from '../src/auth.js';
import { ErroApi, tratarErros } from '../src/erros.js';
import { CHAVE_CONSUMIDOR, CHAVE_COLETOR, montarDeps, subirApp } from './ajuda.js';

test('GET /saude responde ok e rota desconhecida dá 404 no formato padrão', async (t) => {
  const url = await subirApp(t, await montarDeps(t, { repositorio: {} }));
  assert.deepEqual(await (await fetch(`${url}/saude`)).json(), { ok: true });
  const resp = await fetch(`${url}/nao-existe`);
  assert.equal(resp.status, 404);
  assert.equal((await resp.json()).erro.codigo, 'NAO_ENCONTRADA');
});

// App mínimo só para testar auth e tratamento de erro isolados.
async function appDeTeste(t) {
  const { config } = await montarDeps(t, { repositorio: {} });
  const app = express();
  app.get('/so-coletor', exigirPapel(config, 'coletor'), (req, res) => res.json({ papel: req.papel }));
  app.get('/erro-api', () => { throw new ErroApi(422, 'BLOQUEADA', 'Não pode.', { motivo: 'X' }); });
  app.get('/erro-bug', () => { throw new Error('detalhe interno com CPF 000.000.000-00'); });
  app.use(tratarErros);
  const servidor = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  t.after(() => new Promise((ok) => servidor.close(ok)));
  return `http://127.0.0.1:${servidor.address().port}`;
}

test('auth: sem chave 401, chave errada 401, papel errado 403, papel certo passa', async (t) => {
  const url = await appDeTeste(t);
  const get = (chave) => fetch(`${url}/so-coletor`, { headers: chave ? { 'X-Api-Key': chave } : {} });
  assert.equal((await get()).status, 401);
  assert.equal((await get('x'.repeat(40))).status, 401);
  const proibido = await get(CHAVE_CONSUMIDOR);
  assert.equal(proibido.status, 403);
  assert.equal((await proibido.json()).erro.codigo, 'SEM_PERMISSAO');
  const ok = await get(CHAVE_COLETOR);
  assert.deepEqual(await ok.json(), { papel: 'coletor' });
});

test('ErroApi vira JSON com status, código e detalhes', async (t) => {
  const url = await appDeTeste(t);
  const resp = await fetch(`${url}/erro-api`);
  assert.equal(resp.status, 422);
  assert.deepEqual(await resp.json(), { erro: { codigo: 'BLOQUEADA', mensagem: 'Não pode.', detalhes: { motivo: 'X' } } });
});

test('erro inesperado vira 500 genérico, sem vazar o detalhe', async (t) => {
  const url = await appDeTeste(t);
  const original = console.error;
  console.error = () => {};
  t.after(() => { console.error = original; });
  const resp = await fetch(`${url}/erro-bug`);
  assert.equal(resp.status, 500);
  const corpo = await resp.text();
  assert.ok(!corpo.includes('000.000.000-00'));
  assert.equal(JSON.parse(corpo).erro.codigo, 'ERRO_INTERNO');
});
