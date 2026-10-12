import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRepositorioMemoria } from '../src/repositorio/memoria.js';

const registro = (o = {}) => ({
  user_id: 2002, coletado_em: '2026-10-11T18:50:00-03:00', recebido_em: '2026-10-11T19:00:00-03:00',
  cnh: { disponivel: false, motivo: 'SEM_CNH', ocr: null },
  multas: [{ ait: 'AA00000001', placa: 'ABC1D23', data_infracao: '2026-09-28', aba: 'Pedro', termo: { disponivel: false, motivo: 'SEM_TERMO_PARA_PLACA', assinatura_id: null } }],
  pendencias: [],
  arquivos: { 'id-1': { tipo: 'application/pdf' } },
  ...o,
});

test('salva e busca por user_id', async () => {
  const repo = criarRepositorioMemoria();
  assert.deepEqual(await repo.salvarCliente(registro()), { substituido: null });
  assert.equal((await repo.buscarCliente(2002)).user_id, 2002);
  assert.equal(await repo.buscarCliente(9999), null);
});

test('salvar de novo substitui e devolve o anterior', async () => {
  const repo = criarRepositorioMemoria();
  await repo.salvarCliente(registro());
  const { substituido } = await repo.salvarCliente(registro({ coletado_em: '2026-10-12T08:00:00-03:00' }));
  assert.equal(substituido.coletado_em, '2026-10-11T18:50:00-03:00');
  assert.equal((await repo.buscarCliente(2002)).coletado_em, '2026-10-12T08:00:00-03:00');
});

test('busca multa pelo AIT', async () => {
  const repo = criarRepositorioMemoria();
  await repo.salvarCliente(registro());
  const r = await repo.buscarMultaPorAit('AA00000001');
  assert.equal(r.multa.placa, 'ABC1D23');
  assert.equal(r.registro.user_id, 2002);
  assert.equal(await repo.buscarMultaPorAit('AA99999999'), null);
});

test('AIT que saiu na substituição deixa de ser encontrado', async () => {
  const repo = criarRepositorioMemoria();
  await repo.salvarCliente(registro());
  await repo.salvarCliente(registro({ multas: [] }));
  assert.equal(await repo.buscarMultaPorAit('AA00000001'), null);
});

test('busca arquivo pelo id', async () => {
  const repo = criarRepositorioMemoria();
  await repo.salvarCliente(registro());
  assert.deepEqual(await repo.buscarArquivo('id-1'), { tipo: 'application/pdf' });
  assert.equal(await repo.buscarArquivo('id-2'), null);
});

test('devolve cópias: alterar o retorno não muda o que está guardado', async () => {
  const repo = criarRepositorioMemoria();
  await repo.salvarCliente(registro());
  (await repo.buscarCliente(2002)).multas.length = 0;
  assert.equal((await repo.buscarCliente(2002)).multas.length, 1);
});
