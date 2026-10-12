import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAVE_COLETOR, CHAVE_CONSUMIDOR, arquivosFicticios, dadosFicticios, formIngestao, montarDeps, subirApp } from './ajuda.js';

const enviar = (url, form, chave = CHAVE_COLETOR) =>
  fetch(`${url}/ingestoes`, { method: 'POST', headers: chave ? { 'X-Api-Key': chave } : {}, body: form });

test('201 com o resumo e o CPF guardado cifrado', async (t) => {
  const deps = await montarDeps(t);
  const url = await subirApp(t, deps);
  const resp = await enviar(url, formIngestao(dadosFicticios(), arquivosFicticios()));
  assert.equal(resp.status, 201);
  assert.deepEqual(await resp.json(), { user_id: 2002, multas: 2, arquivos: 3, pendencias: 1 });
  const salvo = await deps.repositorio.buscarCliente(2002);
  assert.match(salvo.cnh.ocr.cpf, /^v1\./);
});

test('401 sem chave e 403 com a chave do consumidor', async (t) => {
  const url = await subirApp(t, await montarDeps(t));
  assert.equal((await enviar(url, formIngestao(dadosFicticios(), arquivosFicticios()), null)).status, 401);
  assert.equal((await enviar(url, formIngestao(dadosFicticios(), arquivosFicticios()), CHAVE_CONSUMIDOR)).status, 403);
});

test('400 quando dados não é JSON', async (t) => {
  const url = await subirApp(t, await montarDeps(t));
  const form = new FormData();
  form.append('dados', '{quebrado');
  const resp = await enviar(url, form);
  assert.equal(resp.status, 400);
  assert.equal((await resp.json()).erro.codigo, 'VALIDACAO');
});

test('400 com os campos inválidos', async (t) => {
  const url = await subirApp(t, await montarDeps(t));
  const resp = await enviar(url, formIngestao(dadosFicticios({ user_id: 'abc' }), arquivosFicticios()));
  assert.equal(resp.status, 400);
  assert.ok((await resp.json()).erro.detalhes.campos.includes('user_id'));
});

test('400 quando falta um arquivo citado', async (t) => {
  const url = await subirApp(t, await montarDeps(t));
  const arquivos = arquivosFicticios();
  arquivos.delete('cnh.pdf');
  const resp = await enviar(url, formIngestao(dadosFicticios(), arquivos));
  assert.equal(resp.status, 400);
  assert.deepEqual((await resp.json()).erro.detalhes.faltando, ['cnh.pdf']);
});

test('reenvio do mesmo cliente substitui e apaga os arquivos antigos', async (t) => {
  const deps = await montarDeps(t);
  const url = await subirApp(t, deps);
  await enviar(url, formIngestao(dadosFicticios(), arquivosFicticios()));
  const antigos = Object.keys((await deps.repositorio.buscarCliente(2002)).arquivos);
  assert.equal((await enviar(url, formIngestao(dadosFicticios(), arquivosFicticios()))).status, 201);
  for (const id of antigos) assert.equal(await deps.storage.ler(id), null);
  assert.equal(Object.keys((await deps.repositorio.buscarCliente(2002)).arquivos).length, 3);
});
