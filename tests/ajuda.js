// Utilidades compartilhadas pelos testes (não é um arquivo de teste). Só dados fictícios.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarApp } from '../src/app.js';
import { criarCripto } from '../src/cripto/cripto.js';
import { criarStorage } from '../src/storage/disco.js';

export const CHAVE_COLETOR = 's'.repeat(40);
export const CHAVE_CONSUMIDOR = 'r'.repeat(40);
export const PDF = Buffer.from('%PDF-1.4 ficticio');
export const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

// config + cripto + storage numa pasta temporária (apagada no fim do teste) + repositório.
export async function montarDeps(t, { repositorio } = {}) {
  const pasta = await mkdtemp(join(tmpdir(), 'servidor1-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));
  const config = {
    chaveCripto: Buffer.alloc(32, 7),
    chaveApiColetor: CHAVE_COLETOR,
    chaveApiConsumidor: CHAVE_CONSUMIDOR,
    pastaStorage: pasta,
    porta: 0,
  };
  const cripto = criarCripto(config.chaveCripto);
  const storage = criarStorage({ pasta, cripto });
  if (!repositorio) {
    const { criarRepositorioMemoria } = await import('../src/repositorio/memoria.js');
    repositorio = criarRepositorioMemoria();
  }
  return { config, cripto, storage, repositorio };
}

// Sobe o app numa porta livre e devolve a URL base. Fecha sozinho no fim do teste.
export async function subirApp(t, deps) {
  const servidor = await new Promise((ok) => {
    const s = criarApp(deps).listen(0, '127.0.0.1', () => ok(s));
  });
  t.after(() => new Promise((ok) => servidor.close(ok)));
  return `http://127.0.0.1:${servidor.address().port}`;
}

export function dadosFicticios(sobrescrever = {}) {
  return {
    user_id: 2002,
    coletado_em: '2026-10-11T18:50:00-03:00',
    cnh: {
      disponivel: true,
      arquivo: 'cnh.pdf',
      enviada_em: '2026-02-01T10:00:00.000Z',
      ocr: {
        nome_condutor: 'NOME FICTICIO', cpf: '000.000.000-00', rg: '00000000 SSP SP',
        numero_cnh: '00000000000', validade_cnh: '2033-01-01', categoria_cnh: 'AB',
        numero_espelho: '0000000000', primeira_habilitacao: '2019-01-01',
        data_emissao: '2023-01-01', local_emissao: 'SAO PAULO, SP',
      },
    },
    multas: [
      {
        aba: 'Pedro', ait: 'AA00000001', placa: 'ABC1D23', data_infracao: '2026-09-28',
        termo: {
          disponivel: true, locacao_id: 50001, inicio: '2026-09-25T21:31:22-03:00', fim: null,
          arquivo: 'termo_ABC1D23_50001.pdf', assinatura: 'assinatura_ABC1D23_50001.png',
        },
      },
      {
        aba: 'Bruno', ait: 'AA00000002', placa: 'ZZZ9Z99', data_infracao: '2026-09-29',
        termo: { disponivel: false, motivo: 'SEM_TERMO_PARA_PLACA' },
      },
    ],
    pendencias: [
      { codigo: 'SEM_TERMO_PARA_PLACA', ait: 'AA00000002', mensagem: 'Nenhum termo de responsabilidade do cliente para a placa ZZZ9Z99.' },
    ],
    ...sobrescrever,
  };
}

export function arquivosFicticios() {
  return new Map([
    ['cnh.pdf', PDF],
    ['termo_ABC1D23_50001.pdf', PDF],
    ['assinatura_ABC1D23_50001.png', PNG],
  ]);
}

// Monta o multipart que o coletor vai mandar: campo `dados` + um campo por arquivo.
export function formIngestao(dados, arquivos) {
  const form = new FormData();
  form.append('dados', JSON.stringify(dados));
  for (const [nome, buf] of arquivos) form.append(nome, new Blob([buf]), nome);
  return form;
}
