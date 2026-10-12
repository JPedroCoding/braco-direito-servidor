import express from 'express';
import { exigirPapel } from '../auth.js';
import { ErroApi } from '../erros.js';
import { normalizarAit } from '../util.js';
import { apresentarCliente } from './apresentar.js';

const naoEncontrada = (mensagem) => new ErroApi(404, 'NAO_ENCONTRADA', mensagem);

// Rotas de leitura para o consumidor. Todas exigem a chave do papel 'consumidor'.
export function rotasConsulta({ config, cripto, storage, repositorio }) {
  const router = express.Router();
  router.use(['/clientes', '/multas', '/arquivos'], exigirPapel(config, 'consumidor'));

  router.get('/clientes/:userId', async (req, res) => {
    const userId = /^\d+$/.test(req.params.userId) ? Number(req.params.userId) : null;
    const registro = userId && await repositorio.buscarCliente(userId);
    if (!registro) throw naoEncontrada('Cliente não encontrado.');
    res.json(apresentarCliente(registro, cripto));
  });

  router.get('/multas/:ait', async (req, res) => {
    const achado = await repositorio.buscarMultaPorAit(normalizarAit(req.params.ait));
    if (!achado) throw naoEncontrada('Multa não encontrada.');
    const cliente = apresentarCliente(achado.registro, cripto);
    res.json({ multa: achado.multa, cliente: { user_id: cliente.user_id, cnh: cliente.cnh } });
  });

  router.get('/arquivos/:id', async (req, res) => {
    const info = await repositorio.buscarArquivo(req.params.id);
    const conteudo = info && await storage.ler(req.params.id);
    if (!conteudo) throw naoEncontrada('Arquivo não encontrado.');
    res.set('Cache-Control', 'no-store').type(info.tipo).send(conteudo);
  });

  return router;
}
