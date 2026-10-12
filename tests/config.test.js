import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarConfig } from '../src/config.js';

const env = (o = {}) => ({
  CHAVE_CRIPTO: Buffer.alloc(32, 1).toString('base64'),
  CHAVE_API_COLETOR: 's'.repeat(40),
  CHAVE_API_CONSUMIDOR: 'r'.repeat(40),
  ...o,
});

test('config válida, com padrões de porta e pasta', () => {
  const c = carregarConfig(env());
  assert.equal(c.chaveCripto.length, 32);
  assert.equal(c.chaveApiColetor, 's'.repeat(40));
  assert.equal(c.porta, 3001);
  assert.equal(c.pastaStorage, 'storage');
  assert.equal(carregarConfig(env({ PORTA: '4000', PASTA_STORAGE: '/x' })).porta, 4000);
});

test('chave de criptografia sem 32 bytes não sobe', () => {
  assert.throws(() => carregarConfig(env({ CHAVE_CRIPTO: Buffer.alloc(16).toString('base64') })), /CHAVE_CRIPTO/);
  assert.throws(() => carregarConfig(env({ CHAVE_CRIPTO: undefined })), /CHAVE_CRIPTO/);
});

test('chave de API curta ou ausente não sobe', () => {
  assert.throws(() => carregarConfig(env({ CHAVE_API_COLETOR: 'curta' })), /CHAVE_API_COLETOR/);
  assert.throws(() => carregarConfig(env({ CHAVE_API_CONSUMIDOR: undefined })), /CHAVE_API_CONSUMIDOR/);
});

test('as duas chaves de API não podem ser iguais', () => {
  assert.throws(() => carregarConfig(env({ CHAVE_API_CONSUMIDOR: 's'.repeat(40) })), /iguais/);
});
