import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { ErroApi } from '../src/erros.js';
import { apagarArquivos, ingerirCliente } from '../src/ingestao/ingerir.js';
import { validarDadosCliente } from '../src/ingestao/validar.js';
import { PDF, PNG, arquivosFicticios, dadosFicticios, montarDeps } from './ajuda.js';

const agora = new Date('2026-10-11T22:00:00Z');

test('validar: dados fictícios completos são válidos', () => {
  assert.deepEqual(validarDadosCliente(dadosFicticios()), []);
});

test('validar: aponta cada campo inválido', () => {
  assert.deepEqual(validarDadosCliente(null), ['dados']);
  const d = dadosFicticios({ user_id: 'abc', coletado_em: 1, pendencias: 'x' });
  d.cnh = { disponivel: true };
  d.multas[0].data_infracao = '28/09/2026';
  d.multas[1].termo = undefined;
  assert.deepEqual(validarDadosCliente(d), [
    'user_id', 'coletado_em', 'cnh.arquivo', 'multas[0].data_infracao', 'multas[1].termo', 'pendencias',
  ]);
  assert.deepEqual(validarDadosCliente(dadosFicticios({ multas: 'x' })), ['multas']);
});

test('ingerir: monta o registro com OCR cifrado e arquivos no storage', async (t) => {
  const { cripto, storage } = await montarDeps(t, { repositorio: {} });
  const r = await ingerirCliente({ dados: dadosFicticios(), arquivos: arquivosFicticios() }, { cripto, storage, agora });

  assert.equal(r.user_id, 2002);
  assert.equal(r.recebido_em, '2026-10-11T19:00:00-03:00');
  assert.equal(r.coletado_em, '2026-10-11T18:50:00-03:00');
  assert.match(r.cnh.ocr.cpf, /^v1\./);
  assert.equal(r.cnh.ocr.categoria_cnh, 'AB');
  assert.deepEqual(await storage.ler(r.cnh.arquivo_id), PDF);
  assert.equal(r.arquivos[r.cnh.arquivo_id].tipo, 'application/pdf');

  const [m1, m2] = r.multas;
  assert.deepEqual(Object.keys(m1.termo).sort(), ['arquivo_id', 'assinatura_id', 'disponivel', 'fim', 'inicio', 'locacao_id']);
  assert.deepEqual(await storage.ler(m1.termo.assinatura_id), PNG);
  assert.equal(r.arquivos[m1.termo.assinatura_id].tipo, 'image/png');
  assert.deepEqual(m2.termo, { disponivel: false, motivo: 'SEM_TERMO_PARA_PLACA', assinatura_id: null });
  assert.equal(Object.keys(r.arquivos).length, 3);
  assert.equal(r.pendencias.length, 1);
});

test('ingerir: normaliza o AIT', async (t) => {
  const { cripto, storage } = await montarDeps(t, { repositorio: {} });
  const d = dadosFicticios();
  d.multas[1].ait = 'aa-0000 0002';
  const r = await ingerirCliente({ dados: d, arquivos: arquivosFicticios() }, { cripto, storage });
  assert.equal(r.multas[1].ait, 'AA00000002');
});

test('ingerir: cliente sem CNH não precisa de arquivo de CNH', async (t) => {
  const { cripto, storage } = await montarDeps(t, { repositorio: {} });
  const arquivos = arquivosFicticios();
  arquivos.delete('cnh.pdf');
  const r = await ingerirCliente(
    { dados: dadosFicticios({ cnh: { disponivel: false, motivo: 'SEM_CNH' } }), arquivos },
    { cripto, storage },
  );
  assert.deepEqual(r.cnh, { disponivel: false, motivo: 'SEM_CNH', ocr: null });
});

test('ingerir: dados inválidos → ErroApi 400 com os campos', async (t) => {
  const { cripto, storage } = await montarDeps(t, { repositorio: {} });
  await assert.rejects(
    ingerirCliente({ dados: dadosFicticios({ user_id: 0 }), arquivos: arquivosFicticios() }, { cripto, storage }),
    (e) => e instanceof ErroApi && e.status === 400 && e.detalhes.campos.includes('user_id'),
  );
});

test('ingerir: arquivo faltando ou de tipo inválido → 400 e nada fica gravado', async (t) => {
  const { cripto, storage, config } = await montarDeps(t, { repositorio: {} });
  const arquivos = arquivosFicticios();
  arquivos.delete('cnh.pdf');
  arquivos.set('termo_ABC1D23_50001.pdf', Buffer.from('<html>'));
  await assert.rejects(
    ingerirCliente({ dados: dadosFicticios(), arquivos }, { cripto, storage }),
    (e) => e.status === 400
      && e.detalhes.faltando.join() === 'cnh.pdf'
      && e.detalhes.invalidos.join() === 'termo_ABC1D23_50001.pdf',
  );
  assert.deepEqual(await readdir(config.pastaStorage).catch(() => []), []);
});

test('ingerir: falha no storage no meio apaga o que já tinha gravado', async (t) => {
  const { cripto, storage } = await montarDeps(t, { repositorio: {} });
  const gravados = [];
  let chamadas = 0;
  const storageQuebrado = {
    ...storage,
    async salvar(buf) {
      if (++chamadas === 2) throw new Error('disco cheio');
      const id = await storage.salvar(buf);
      gravados.push(id);
      return id;
    },
  };
  await assert.rejects(
    ingerirCliente({ dados: dadosFicticios(), arquivos: arquivosFicticios() }, { cripto, storage: storageQuebrado }),
    /disco cheio/,
  );
  assert.equal(gravados.length, 1);
  assert.equal(await storage.ler(gravados[0]), null);
});

test('apagarArquivos remove todos os arquivos do registro', async (t) => {
  const { cripto, storage } = await montarDeps(t, { repositorio: {} });
  const r = await ingerirCliente({ dados: dadosFicticios(), arquivos: arquivosFicticios() }, { cripto, storage });
  await apagarArquivos(r, storage);
  for (const id of Object.keys(r.arquivos)) assert.equal(await storage.ler(id), null);
});
