import express from 'express';
import multer from 'multer';
import { exigirPapel } from '../auth.js';
import { ErroApi } from '../erros.js';
import { apagarArquivos, ingerirCliente } from '../ingestao/ingerir.js';

// Multer lê o multipart (dados + arquivos) e guarda os arquivos na memória como Buffer.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 20 } });

export function rotaIngestoes({ config, cripto, storage, repositorio }) {
  const router = express.Router();

  // O coletor envia um cliente por requisição: campo `dados` (dados.json) + um campo por arquivo,
  // com o nome do arquivo como nome do campo.
  router.post('/ingestoes', exigirPapel(config, 'coletor'), upload.any(), async (req, res) => {
    let dados;
    try {
      dados = JSON.parse(req.body?.dados ?? '');
    } catch {
      throw new ErroApi(400, 'VALIDACAO', 'O campo dados precisa ser um JSON válido.');
    }
    const arquivos = new Map((req.files ?? []).map((f) => [f.fieldname, f.buffer]));

    // A ingestão valida, grava os arquivos cifrados e cifra o OCR.
    const registro = await ingerirCliente({ dados, arquivos }, { cripto, storage });

    let substituido;
    try {
      ({ substituido } = await repositorio.salvarCliente(registro));
    } catch (e) {
      await apagarArquivos(registro, storage); // não deixar arquivo órfão no storage
      throw e;
    }
    // Reenvio do mesmo cliente: a fonte é um espelho, os arquivos antigos saem.
    if (substituido) await apagarArquivos(substituido, storage);

    res.status(201).json({
      user_id: registro.user_id,
      multas: registro.multas.length,
      arquivos: Object.keys(registro.arquivos).length,
      pendencias: registro.pendencias.length,
    });
  });

  return router;
}