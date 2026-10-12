import { ErroApi } from '../erros.js';
import { MIME, detectarTipo, isoSP, normalizarAit } from '../util.js';
import { cifrarOcr } from './ocr.js';
import { validarDadosCliente } from './validar.js';

// Nomes de arquivo que o dados.json cita (sem repetir).
function arquivosCitados(dados) {
  const nomes = [];
  if (dados.cnh.disponivel) nomes.push(dados.cnh.arquivo);
  for (const m of dados.multas) {
    if (m.termo.disponivel) nomes.push(m.termo.arquivo);
    if (m.termo.assinatura) nomes.push(m.termo.assinatura); // assinatura serve mesmo se o termo falhou
  }
  return [...new Set(nomes)];
}

// Transforma o que o coletor enviou (dados.json + arquivos) no registro que vai para o repositório:
// valida, confere os arquivos, grava os arquivos cifrados e cifra os campos sensíveis do OCR.
// arquivos: Map<nome do arquivo, Buffer>.
export async function ingerirCliente({ dados, arquivos }, { cripto, storage, agora = new Date() }) {
  const campos = validarDadosCliente(dados);
  if (campos.length) throw new ErroApi(400, 'VALIDACAO', 'Dados do cliente inválidos.', { campos });

  const nomes = arquivosCitados(dados);
  const tipos = {};
  const faltando = nomes.filter((n) => !arquivos.has(n));
  const invalidos = nomes.filter((n) => arquivos.has(n) && !(tipos[n] = detectarTipo(arquivos.get(n))));
  if (faltando.length || invalidos.length) {
    throw new ErroApi(400, 'VALIDACAO', 'Arquivos faltando ou de tipo inválido (aceitos: PDF, PNG, JPG).', { faltando, invalidos });
  }

  // Grava os arquivos; se um falhar, apaga os que já foram, para não deixar lixo no storage.
  const ids = {};
  try {
    for (const n of nomes) ids[n] = await storage.salvar(arquivos.get(n));
  } catch (e) {
    await Promise.all(Object.values(ids).map((id) => storage.apagar(id)));
    throw e;
  }

  const { cnh } = dados;
  return {
    user_id: dados.user_id,
    coletado_em: dados.coletado_em,
    recebido_em: isoSP(agora),
    cnh: cnh.disponivel
      ? { disponivel: true, arquivo_id: ids[cnh.arquivo], enviada_em: cnh.enviada_em ?? null, ocr: cifrarOcr(cnh.ocr, cripto) }
      : { disponivel: false, motivo: cnh.motivo ?? null, ocr: cifrarOcr(cnh.ocr, cripto) },
    multas: dados.multas.map((m) => {
      const assinatura_id = m.termo.assinatura ? ids[m.termo.assinatura] : null;
      return {
        ait: normalizarAit(m.ait),
        placa: m.placa,
        data_infracao: m.data_infracao,
        aba: m.aba ?? null,
        termo: m.termo.disponivel
          ? {
            disponivel: true,
            locacao_id: m.termo.locacao_id ?? null,
            inicio: m.termo.inicio ?? null,
            fim: m.termo.fim ?? null,
            arquivo_id: ids[m.termo.arquivo],
            assinatura_id,
          }
          : { disponivel: false, motivo: m.termo.motivo ?? null, assinatura_id },
      };
    }),
    pendencias: dados.pendencias,
    arquivos: Object.fromEntries(nomes.map((n) => [ids[n], { tipo: MIME[tipos[n]] }])),
  };
}

export async function apagarArquivos(registro, storage) {
  await Promise.all(Object.keys(registro.arquivos ?? {}).map((id) => storage.apagar(id)));
}
