// Maiúsculas, só letras e números ("aa-0000 0001" → "AA00000001"). Mesma regra do coletor.
export const normalizarAit = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// São Paulo não tem horário de verão desde 2019: offset fixo -03:00.
export const isoSP = (data) => `${new Date(data.getTime() - 3 * 3600e3).toISOString().slice(0, 19)}-03:00`;

export const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg' };

// Tipo real do arquivo pelos primeiros bytes (não confia em extensão nem em Content-Type).
export function detectarTipo(buf) {
  if (buf.length >= 4 && buf.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.subarray(1, 4).toString('latin1') === 'PNG') return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  return null;
}
