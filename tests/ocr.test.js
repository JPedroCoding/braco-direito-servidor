import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarCripto } from '../src/cripto/cripto.js';
import { CAMPOS_SENSIVEIS, cifrarOcr, decifrarOcr } from '../src/ingestao/ocr.js';

const cripto = criarCripto(Buffer.alloc(32, 7));
const ocr = {
  nome_condutor: 'NOME FICTICIO', cpf: '000.000.000-00', rg: '00000000 SSP SP',
  numero_cnh: '00000000000', numero_espelho: '0000000000',
  validade_cnh: '2033-01-01', categoria_cnh: 'AB', primeira_habilitacao: '2019-01-01',
  data_emissao: '2023-01-01', local_emissao: 'SAO PAULO, SP',
};

test('o CPF sai cifrado', () => {
  const c = cifrarOcr(ocr, cripto);
  assert.match(c.cpf, /^v1\./);
  assert.notEqual(c.cpf, ocr.cpf);
  assert.equal(cripto.decifrar(c.cpf), '000.000.000-00');
});

test('lista de campos sensíveis', () => {
  assert.deepEqual(CAMPOS_SENSIVEIS, ['nome_condutor', 'cpf', 'rg', 'numero_cnh', 'numero_espelho']);
});

test('todos os campos sensíveis saem cifrados e os outros ficam abertos', () => {
  const c = cifrarOcr(ocr, cripto);
  for (const campo of CAMPOS_SENSIVEIS) assert.match(c[campo], /^v1\./, campo);
  assert.equal(c.validade_cnh, '2033-01-01');
  assert.equal(c.categoria_cnh, 'AB');
  assert.equal(c.local_emissao, 'SAO PAULO, SP');
});

test('não altera o objeto original', () => {
  const copia = structuredClone(ocr);
  cifrarOcr(ocr, cripto);
  assert.deepEqual(ocr, copia);
});

test('campo sensível null continua null (CNH antiga sem nome no OCR)', () => {
  assert.equal(cifrarOcr({ ...ocr, nome_condutor: null }, cripto).nome_condutor, null);
});

test('decifrarOcr devolve o original', () => {
  assert.deepEqual(decifrarOcr(cifrarOcr(ocr, cripto), cripto), ocr);
});

test('OCR ausente vira null', () => {
  assert.equal(cifrarOcr(null, cripto), null);
  assert.equal(decifrarOcr(undefined, cripto), null);
});
