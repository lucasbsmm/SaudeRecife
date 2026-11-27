import express from 'express';
import helmet from 'helmet';
import mongoose from 'mongoose';
import path from 'node:path';
import './configuracao/mensagensZod';
import { rotaNaoEncontrada, tratarErros } from './middlewares/erros';
import rotasAdministracao from './rotas/administracao';
import rotasAgendamentos from './rotas/agendamentos';
import rotasAutenticacao from './rotas/autenticacao';
import rotasClinicas from './rotas/clinicas';
import rotasDisponibilidades from './rotas/disponibilidades';
import rotasEspecialidades from './rotas/especialidades';
import rotasPacientes from './rotas/pacientes';
import rotasProfissionais from './rotas/profissionais';
import rotasTriagem from './rotas/triagem';

const DIRETORIO_PUBLICO = path.resolve(__dirname, '..', 'publico');

export function criarApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Permite acessar o app por IP da rede local (http) durante testes no celular.
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/saude', (_requisicao, resposta) => {
    resposta.json({ status: 'ok', banco: mongoose.connection.readyState === 1 });
  });

  app.use('/api/autenticacao', rotasAutenticacao);
  app.use('/api/especialidades', rotasEspecialidades);
  app.use('/api/clinicas', rotasClinicas);
  app.use('/api/profissionais', rotasProfissionais);
  app.use('/api/disponibilidades', rotasDisponibilidades);
  app.use('/api/pacientes', rotasPacientes);
  app.use('/api/agendamentos', rotasAgendamentos);
  app.use('/api/triagem', rotasTriagem);
  app.use('/api/administracao', rotasAdministracao);
  app.use('/api', rotaNaoEncontrada);

  app.use(
    express.static(DIRETORIO_PUBLICO, {
      setHeaders(resposta, caminho) {
        // Arquivos que definem a versão do app não podem ficar presos no cache do navegador.
        if (/(service-worker\.js|\.html|\.webmanifest)$/.test(caminho)) {
          resposta.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  app.use(tratarErros);
  return app;
}
