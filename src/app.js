import express from 'express';
import { ErroApi, tratarErros } from './erros.js';
import { rotasConsulta } from './rotas/consulta.js';
import { rotaIngestoes } from './rotas/ingestoes.js';

// Monta o Express com as dependências recebidas (config, cripto, storage, repositorio).
// Receber tudo por parâmetro deixa os testes subirem o app com storage e repositório próprios.
export function criarApp(deps) {
  const app = express();
  app.disable('x-powered-by');

  app.get('/saude', (req, res) => res.json({ ok: true }));

  app.use(rotaIngestoes(deps));
  app.use(rotasConsulta(deps));
  app.use((req, res, next) => next(new ErroApi(404, 'NAO_ENCONTRADA', 'Rota não encontrada.')));
  app.use(tratarErros);
  return app;
}
