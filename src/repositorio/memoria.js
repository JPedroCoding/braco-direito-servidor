// Repositório TEMPORÁRIO em memória (some quando o servidor reinicia). Quando o banco for
// estruturado, a versão com banco implementa exatamente estes métodos e as rotas não mudam.
// Todos são async porque o banco de verdade vai ser.
export function criarRepositorioMemoria() {
  const clientes = new Map(); // user_id → registro
  const copia = (v) => (v == null ? null : structuredClone(v));

  return {
    async salvarCliente(registro) {
      const substituido = clientes.get(registro.user_id) ?? null;
      clientes.set(registro.user_id, copia(registro));
      return { substituido };
    },

    async buscarCliente(userId) {
      return copia(clientes.get(userId));
    },

    async buscarMultaPorAit(ait) {
      for (const registro of clientes.values()) {
        const multa = registro.multas.find((m) => m.ait === ait);
        if (multa) return copia({ multa, registro });
      }
      return null;
    },

    async buscarArquivo(id) {
      for (const registro of clientes.values()) {
        if (registro.arquivos?.[id]) return copia(registro.arquivos[id]);
      }
      return null;
    },
  };
}
