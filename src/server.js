import { criarApp } from './app.js';
import { carregarConfig } from './config.js';
import { criarCripto } from './cripto/cripto.js';
import { criarRepositorioMemoria } from './repositorio/memoria.js';
import { criarStorage } from './storage/disco.js';

const config = carregarConfig();
const cripto = criarCripto(config.chaveCripto);
const storage = criarStorage({ pasta: config.pastaStorage, cripto });
const repositorio = criarRepositorioMemoria(); // trocar pelo banco quando ele for estruturado

criarApp({ config, cripto, storage, repositorio }).listen(config.porta, () => {
  console.log(`Servidor 1 na porta ${config.porta}`);
});
