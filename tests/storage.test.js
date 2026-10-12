import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { PDF, montarDeps } from './ajuda.js';

test('salva cifrado em disco e lê de volta decifrado', async (t) => {
  const { storage, config } = await montarDeps(t, { repositorio: {} });
  const id = await storage.salvar(PDF);
  assert.match(id, /^[0-9a-f-]{36}$/);
  const noDisco = await readFile(join(config.pastaStorage, `${id}.bin`));
  assert.ok(!noDisco.includes(PDF), 'o arquivo em disco não pode ter o conteúdo aberto');
  assert.deepEqual(await storage.ler(id), PDF);
});

test('id inexistente ou fora do formato devolve null', async (t) => {
  const { storage } = await montarDeps(t, { repositorio: {} });
  assert.equal(await storage.ler('00000000-0000-0000-0000-000000000000'), null);
  assert.equal(await storage.ler('../../etc/passwd'), null);
});

test('apagar remove o arquivo', async (t) => {
  const { storage, config } = await montarDeps(t, { repositorio: {} });
  const id = await storage.salvar(PDF);
  await storage.apagar(id);
  assert.equal(await storage.ler(id), null);
  assert.deepEqual(await readdir(config.pastaStorage), []);
});
