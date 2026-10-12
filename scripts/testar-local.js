// Testa o Servidor 1 que está rodando (npm start) com um cliente FICTÍCIO, de ponta a ponta.
// Uso (em outro terminal, com o servidor no ar): npm run testar-local
const URL_BASE = `http://localhost:${process.env.PORTA || 3001}`;
const COLETOR = { 'X-Api-Key': process.env.CHAVE_API_COLETOR };
const CONSUMIDOR = { 'X-Api-Key': process.env.CHAVE_API_CONSUMIDOR };

const PDF = Buffer.from('%PDF-1.4 CNH ficticia');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const dados = {
  user_id: 999999001,
  coletado_em: new Date().toISOString(),
  cnh: {
    disponivel: true, arquivo: 'cnh.pdf', enviada_em: '2026-02-01T10:00:00.000Z',
    ocr: { nome_condutor: 'NOME FICTICIO', cpf: '000.000.000-00', rg: '00000000 SSP SP', numero_cnh: '00000000000', numero_espelho: '0000000000', validade_cnh: '2033-01-01', categoria_cnh: 'AB' },
  },
  multas: [{
    aba: 'Teste', ait: 'TESTE0001', placa: 'ABC1D23', data_infracao: '2026-09-28',
    termo: { disponivel: true, locacao_id: 1, inicio: '2026-09-25T10:00:00-03:00', fim: null, arquivo: 'termo.pdf', assinatura: 'assinatura.png' },
  }],
  pendencias: [],
};

let falhas = 0;
const conferir = (ok, texto) => { console.log(`${ok ? '✔' : '✖'} ${texto}`); if (!ok) falhas++; };

try {
  const saude = await fetch(`${URL_BASE}/saude`).then((r) => r.json());
  conferir(saude.ok === true, `servidor no ar em ${URL_BASE}`);

  conferir((await fetch(`${URL_BASE}/ingestoes`, { method: 'POST' })).status === 401, 'envio sem chave é recusado (401)');

  const form = new FormData();
  form.append('dados', JSON.stringify(dados));
  form.append('cnh.pdf', new Blob([PDF]), 'cnh.pdf');
  form.append('termo.pdf', new Blob([PDF]), 'termo.pdf');
  form.append('assinatura.png', new Blob([PNG]), 'assinatura.png');
  const envio = await fetch(`${URL_BASE}/ingestoes`, { method: 'POST', headers: COLETOR, body: form });
  conferir(envio.status === 201, `coletor envia o cliente (${envio.status}) → ${JSON.stringify(await envio.json())}`);

  const cliente = await fetch(`${URL_BASE}/clientes/${dados.user_id}`, { headers: CONSUMIDOR }).then((r) => r.json());
  conferir(cliente.cnh?.ocr?.cpf === '000.000.000-00', 'consumidor lê o cliente com o CPF descriptografado');

  const multa = await fetch(`${URL_BASE}/multas/teste-0001`, { headers: CONSUMIDOR }).then((r) => r.json());
  conferir(multa.multa?.ait === 'TESTE0001', 'busca a multa pelo AIT (com hífen e minúsculas)');

  const arquivo = await fetch(`${URL_BASE}/arquivos/${cliente.cnh?.arquivo_id}`, { headers: CONSUMIDOR });
  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  conferir(arquivo.status === 200 && conteudo.equals(PDF), `baixa a CNH descriptografada (${arquivo.headers.get('content-type')})`);

  conferir((await fetch(`${URL_BASE}/clientes/${dados.user_id}`, { headers: COLETOR })).status === 403, 'chave do coletor não consegue consultar (403)');
} catch (e) {
  conferir(false, `não consegui falar com o servidor: ${e.cause?.code ?? e.message}. Ele está rodando (npm start)?`);
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTudo funcionando.');
process.exitCode = falhas ? 1 : 0;
