import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErroCripto, criarCripto } from '../src/cripto/cripto.js';

const cripto = criarCripto(Buffer.alloc(32, 7));

test('cifra e decifra texto com acentos', () => {
  const c = cripto.cifrar('JOÃO DA CONCEIÇÃO');
  assert.match(c, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(cripto.decifrar(c), 'JOÃO DA CONCEIÇÃO');
});

test('o mesmo texto cifrado duas vezes dá resultados diferentes (IV aleatório)', () => {
  assert.notEqual(cripto.cifrar('000.000.000-00'), cripto.cifrar('000.000.000-00'));
});

test('null continua null', () => {
  assert.equal(cripto.cifrar(null), null);
  assert.equal(cripto.decifrar(null), null);
});

test('dado adulterado é detectado pela tag', () => {
  const [v, iv, tag, dados] = cripto.cifrar('000.000.000-00').split('.');
  const trocado = (dados[0] === 'A' ? 'B' : 'A') + dados.slice(1);
  assert.throws(() => cripto.decifrar([v, iv, tag, trocado].join('.')), ErroCripto);
});

test('chave diferente não decifra', () => {
  const outra = criarCripto(Buffer.alloc(32, 8));
  assert.throws(() => outra.decifrar(cripto.cifrar('segredo')), ErroCripto);
});

test('formato inválido é rejeitado', () => {
  assert.throws(() => cripto.decifrar('abc'), ErroCripto);
  assert.throws(() => cripto.decifrar('v2.a.b.c'), ErroCripto);
});

test('cifra e decifra buffer (arquivos)', () => {
  const pdf = Buffer.from('%PDF-1.4 ficticio');
  const cifrado = cripto.cifrarBuffer(pdf);
  assert.equal(cifrado.length, pdf.length + 12 + 16);
  assert.ok(!cifrado.includes(pdf));
  assert.deepEqual(cripto.decifrarBuffer(cifrado), pdf);
});

test('buffer curto demais é rejeitado', () => {
  assert.throws(() => cripto.decifrarBuffer(Buffer.alloc(10)), ErroCripto);
});

test('chave precisa ter 32 bytes', () => {
  assert.throws(() => criarCripto(Buffer.alloc(16)), ErroCripto);
});
