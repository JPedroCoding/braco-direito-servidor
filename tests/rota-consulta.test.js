import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_COLETOR, CHAVE_CONSUMIDOR, PDF, arquivosFicticios, dadosFicticios, formIngestao, montarDeps, subirApp } from './ajuda.js';

async function comCliente(t) {
  const deps = await montarDeps(t);
  const url = await subirApp(t, deps);
  await fetch(`${url}/ingestoes`, { method: 'POST', headers: { 'X-Api-Key': CHAVE_COLETOR }, body: formIngestao(dadosFicticios(), arquivosFicticios()) });
  const get = (caminho, chave = CHAVE_CONSUMIDOR) => fetch(`${url}${caminho}`, { headers: { 'X-Api-Key': chave } });
  return { deps, get };
}

test('GET /clientes/:userId devolve o cliente decifrado', async (t) => {
  const { get } = await comCliente(t);
  const resp = await get('/clientes/2002');
  assert.equal(resp.status, 200);
  const c = await resp.json();
  assert.equal(c.cnh.ocr.cpf, '000.000.000-00');
  assert.equal(c.cnh.ocr.nome_condutor, 'NOME FICTICIO');
  assert.equal(typeof c.cnh.arquivo_id, 'string');
  assert.equal(typeof c.multas[0].termo.arquivo_id, 'string');
  assert.equal(c.arquivos, undefined);
});

test('GET /clientes: 404 para cliente inexistente ou id inválido; 403 com a chave do coletor', async (t) => {
  const { get } = await comCliente(t);
  assert.equal((await get('/clientes/9999')).status, 404);
  assert.equal((await get('/clientes/abc')).status, 404);
  assert.equal((await get('/clientes/2002', CHAVE_COLETOR)).status, 403);
});

test('GET /multas/:ait aceita AIT com hífen e minúsculas', async (t) => {
  const { get } = await comCliente(t);
  const resp = await get('/multas/aa-0000-0001');
  assert.equal(resp.status, 200);
  const r = await resp.json();
  assert.equal(r.multa.ait, 'AA00000001');
  assert.equal(r.cliente.user_id, 2002);
  assert.equal(r.cliente.cnh.ocr.cpf, '000.000.000-00');
  assert.equal((await get('/multas/AA99999999')).status, 404);
});

test('GET /arquivos/:id devolve o arquivo decifrado com o tipo certo', async (t) => {
  const { get } = await comCliente(t);
  const c = await (await get('/clientes/2002')).json();
  const resp = await get(`/arquivos/${c.cnh.arquivo_id}`);
  assert.equal(resp.status, 200);
  assert.equal(resp.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(Buffer.from(await resp.arrayBuffer()), PDF);
  assert.equal((await get('/arquivos/00000000-0000-0000-0000-000000000000')).status, 404);
});
