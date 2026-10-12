import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// AES-256-GCM: cifra (ninguém lê sem a chave) e autentica (a "tag" denuncia qualquer alteração).
const ALGORITMO = 'aes-256-gcm';
const TAM_IV = 12; // tamanho recomendado para GCM
const TAM_TAG = 16;
const VERSAO = 'v1'; // permite trocar algoritmo/chave no futuro sem confundir dados antigos

export class ErroCripto extends Error {}

export function criarCripto(chave) {
  if (!Buffer.isBuffer(chave) || chave.length !== 32) throw new ErroCripto('A chave precisa ter 32 bytes.');

  function cifrarPartes(buf) {
    const iv = randomBytes(TAM_IV); // NUNCA reusar um IV com a mesma chave
    const cifra = createCipheriv(ALGORITMO, chave, iv);
    const dados = Buffer.concat([cifra.update(buf), cifra.final()]);
    return { iv, tag: cifra.getAuthTag(), dados };
  }

  function decifrarPartes(iv, tag, dados) {
    if (iv.length !== TAM_IV || tag.length !== TAM_TAG) throw new ErroCripto('Dado cifrado inválido.');
    const decifra = createDecipheriv(ALGORITMO, chave, iv);
    decifra.setAuthTag(tag);
    try {
      return Buffer.concat([decifra.update(dados), decifra.final()]);
    } catch {
      throw new ErroCripto('Dado cifrado adulterado ou chave errada.');
    }
  }

  // Arquivos: [iv 12][tag 16][dados].
  function cifrarBuffer(buf) {
    const { iv, tag, dados } = cifrarPartes(buf);
    return Buffer.concat([iv, tag, dados]);
  }

  function decifrarBuffer(buf) {
    if (buf.length < TAM_IV + TAM_TAG) throw new ErroCripto('Dado cifrado inválido.');
    return decifrarPartes(buf.subarray(0, TAM_IV), buf.subarray(TAM_IV, TAM_IV + TAM_TAG), buf.subarray(TAM_IV + TAM_TAG));
  }

  // Texto: "v1.<iv>.<tag>.<dados>" em base64url, para caber numa coluna de texto do banco.
  function cifrar(texto) {
    if (texto == null) return null;
    const { iv, tag, dados } = cifrarPartes(Buffer.from(String(texto), 'utf8'));
    return [VERSAO, iv, tag, dados].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
  }

  function decifrar(valor) {
    if (valor == null) return null;
    const partes = String(valor).split('.');
    if (partes.length !== 4 || partes[0] !== VERSAO) throw new ErroCripto('Formato de dado cifrado desconhecido.');
    const [iv, tag, dados] = partes.slice(1).map((p) => Buffer.from(p, 'base64url'));
    return decifrarPartes(iv, tag, dados).toString('utf8');
  }

  return { cifrar, decifrar, cifrarBuffer, decifrarBuffer };
}
