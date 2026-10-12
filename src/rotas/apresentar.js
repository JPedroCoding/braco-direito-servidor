import { decifrarOcr } from '../ingestao/ocr.js';

// Registro guardado (cifrado) → resposta para o consumidor: OCR decifrado e sem o mapa interno
// de arquivos. É o ÚNICO ponto de descriptografia de texto; arquivos são decifrados pelo storage.
export function apresentarCliente(registro, cripto) {
  const { arquivos, ...resto } = registro;
  return {
    ...resto,
    cnh: { ...registro.cnh, ocr: decifrarOcr(registro.cnh.ocr, cripto) },
  };
}
