// Lê e valida as variáveis de ambiente. O servidor não sobe com configuração insegura.
export function carregarConfig(env = process.env) {
  const chaveCripto = Buffer.from(env.CHAVE_CRIPTO ?? '', 'base64');
  if (chaveCripto.length !== 32) {
    throw new Error('CHAVE_CRIPTO precisa ser uma chave de 32 bytes em base64. Gere com: npm run gerar-chave');
  }
  for (const nome of ['CHAVE_API_COLETOR', 'CHAVE_API_CONSUMIDOR']) {
    if (!env[nome] || env[nome].length < 32) {
      throw new Error(`${nome} precisa ter ao menos 32 caracteres. Gere com: npm run gerar-chave`);
    }
  }
  if (env.CHAVE_API_COLETOR === env.CHAVE_API_CONSUMIDOR) {
    throw new Error('CHAVE_API_COLETOR e CHAVE_API_CONSUMIDOR não podem ser iguais.');
  }
  return {
    chaveCripto,
    chaveApiColetor: env.CHAVE_API_COLETOR,
    chaveApiConsumidor: env.CHAVE_API_CONSUMIDOR,
    pastaStorage: env.PASTA_STORAGE || 'storage',
    porta: Number(env.PORTA || 3001),
  };
}
