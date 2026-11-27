import { Router } from 'express';
import { autenticar, exigirPerfil } from '../middlewares/autenticacao';
import { Agendamento } from '../modelos/Agendamento';
import { Clinica } from '../modelos/Clinica';
import { Especialidade } from '../modelos/Especialidade';
import { Paciente } from '../modelos/Paciente';
import { Profissional } from '../modelos/Profissional';
import { agoraEmRecife } from '../utilitarios/datas';

const roteador = Router();
roteador.use(autenticar, exigirPerfil('administrador'));

roteador.get('/resumo', async (_requisicao, resposta) => {
  const agora = agoraEmRecife();

  const [clinicas, profissionais, especialidades, pacientes, consultasHoje, consultasFuturas] = await Promise.all([
    Clinica.countDocuments({ ativo: true }),
    Profissional.countDocuments({ ativo: true }),
    Especialidade.countDocuments(),
    Paciente.countDocuments({ ativo: true }),
    Agendamento.countDocuments({ status: 'agendado', data: agora.data }),
    Agendamento.countDocuments({ status: 'agendado', data: { $gt: agora.data } }),
  ]);

  resposta.json({ clinicas, profissionais, especialidades, pacientes, consultasHoje, consultasFuturas });
});

export default roteador;
