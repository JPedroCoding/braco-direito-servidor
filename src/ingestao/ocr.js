export const CAMPOS_SENSIVEIS = ['nome_condutor', 'cpf', 'rg', 'numero_cnh', 'numero_espelho'];

// Devolve uma CÓPIA do OCR com os campos sensíveis passados por `transformar`.
function transformarSensiveis(ocr, transformar) {
  if (ocr == null) return null;
  const copia = { ...ocr };
  for (const campo of CAMPOS_SENSIVEIS) {
    if (campo in copia) copia[campo] = transformar(copia[campo]);
  }
  return copia;
}

export function cifrarOcr(ocr, cripto) {
  return transformarSensiveis(ocr, cripto.cifrar);
}

export function decifrarOcr(ocr, cripto) {
  return transformarSensiveis(ocr, cripto.decifrar);
}
