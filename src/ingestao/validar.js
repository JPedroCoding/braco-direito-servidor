const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Confere o formato do dados.json que o coletor envia. Devolve os campos inválidos (vazio = válido).
export function validarDadosCliente(dados) {
  if (!ehObjeto(dados)) return ['dados'];
  const campos = [];

  if (!Number.isInteger(dados.user_id) || dados.user_id <= 0) campos.push('user_id');
  if (typeof dados.coletado_em !== 'string') campos.push('coletado_em');

  if (!ehObjeto(dados.cnh) || typeof dados.cnh.disponivel !== 'boolean') campos.push('cnh');
  else if (dados.cnh.disponivel && typeof dados.cnh.arquivo !== 'string') campos.push('cnh.arquivo');

  if (!Array.isArray(dados.multas)) {
    campos.push('multas');
  } else {
    dados.multas.forEach((m, i) => {
      const p = `multas[${i}]`;
      if (!ehObjeto(m)) return campos.push(p);
      if (typeof m.ait !== 'string' || !m.ait) campos.push(`${p}.ait`);
      if (typeof m.placa !== 'string' || !m.placa) campos.push(`${p}.placa`);
      if (!DATA_ISO.test(m.data_infracao ?? '')) campos.push(`${p}.data_infracao`);
      if (!ehObjeto(m.termo) || typeof m.termo.disponivel !== 'boolean') campos.push(`${p}.termo`);
      else if (m.termo.disponivel && typeof m.termo.arquivo !== 'string') campos.push(`${p}.termo.arquivo`);
    });
  }

  if (!Array.isArray(dados.pendencias)) campos.push('pendencias');
  return campos;
}
