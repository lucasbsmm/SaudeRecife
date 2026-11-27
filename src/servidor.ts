import { criarApp } from './app';
import { ambiente } from './configuracao/ambiente';
import { conectarBanco, desconectarBanco } from './configuracao/banco';

async function iniciar() {
  await conectarBanco(ambiente.MONGODB_URI);

  const porta = Number(process.env.PORT) || ambiente.PORTA;

  const servidor = criarApp().listen(porta, '0.0.0.0', () => {
    console.log(`[servidor] Saúde Recife disponível na porta ${porta}`);
  });

  const encerrar = async (sinal: string) => {
    console.log(`\n[servidor] ${sinal} recebido, encerrando...`);
    servidor.close(async () => {
      await desconectarBanco();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => encerrar('SIGINT'));
  process.on('SIGTERM', () => encerrar('SIGTERM'));
}

iniciar().catch((erro) => {
  console.error('[servidor] não foi possível iniciar:', erro.message);
  process.exit(1);
});
