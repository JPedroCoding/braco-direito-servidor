import { createHash, timingSafeEqual } from 'node:crypto';
import { ErroApi } from './erros.js';

// Compara em tempo constante (o hash iguala o tamanho), para não vazar a chave por tempo de resposta.
const hash = (texto) => createHash('sha256').update(String(texto)).digest();
const iguais = (a, b) => timingSafeEqual(hash(a), hash(b));

// Middleware: exige a chave de API do papel indicado no cabeçalho X-Api-Key.
// 'coletor' só envia dados (POST /ingestoes); 'consumidor' só consulta (GETs).
export function exigirPapel(config, papel) {
  const chaves = { coletor: config.chaveApiColetor, consumidor: config.chaveApiConsumidor };
  return (req, res, next) => {
    const enviada = req.get('X-Api-Key');
    const papelDaChave = enviada && Object.keys(chaves).find((p) => iguais(enviada, chaves[p]));
    if (!papelDaChave) return next(new ErroApi(401, 'NAO_AUTENTICADO', 'Chave de API ausente ou inválida.'));
    if (papelDaChave !== papel) return next(new ErroApi(403, 'SEM_PERMISSAO', 'Esta chave não tem acesso a esta rota.'));
    req.papel = papelDaChave;
    return next();
  };
}
