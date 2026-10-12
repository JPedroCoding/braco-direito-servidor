// Erro "esperado" da API: vira resposta JSON com status e código (ver spec, formato de erro).
export class ErroApi extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const MENSAGENS_UPLOAD = {
  LIMIT_FILE_SIZE: 'Arquivo grande demais (máx. 10 MB).',
  LIMIT_FILE_COUNT: 'Arquivos demais na requisição (máx. 20).',
};

const corpoErro = (codigo, mensagem, detalhes) => ({
  erro: { codigo, mensagem, ...(detalhes ? { detalhes } : {}) },
});

// Último middleware do app. Express 5 já encaminha para cá erros de funções async.
// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (err instanceof ErroApi) {
    return res.status(err.status).json(corpoErro(err.codigo, err.message, err.detalhes));
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json(corpoErro('VALIDACAO', MENSAGENS_UPLOAD[err.code] ?? 'Upload inválido.'));
  }
  // Erro inesperado: detalhe só no log do servidor (sem corpo da requisição), resposta genérica.
  console.error(`[erro] ${req.method} ${req.path}`, err);
  return res.status(500).json(corpoErro('ERRO_INTERNO', 'Erro interno. Tente de novo.'));
}
