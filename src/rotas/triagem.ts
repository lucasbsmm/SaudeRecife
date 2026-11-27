import { Router } from 'express';
import { autenticar, usuarioAtual } from '../middlewares/autenticacao';
import { Paciente } from '../modelos/Paciente';
import { classificar, esquemaTriagem, recomendarEspecialidades, ROTULOS_SINTOMAS } from '../servicos/triagem';
import { calcularIdade } from '../utilitarios/datas';

const roteador = Router();
roteador.use(autenticar);

roteador.post('/', async (requisicao, resposta) => {
  const dados = esquemaTriagem.parse(requisicao.body);
  const usuario = usuarioAtual(requisicao);

  const paciente = usuario.perfil === 'paciente' ? await Paciente.findOne({ usuario: usuario.id }) : null;
  const idade = paciente ? calcularIdade(paciente.dataNascimento) : undefined;

  const { classificacao, observacao } = classificar(dados);
  const especialidades = await recomendarEspecialidades(dados, idade);

  resposta.json({
    classificacao,
    observacao,
    resumo: {
      paciente: paciente ? { nome: paciente.nome, idade } : null,
      sintomas: dados.sintomas.map((id) => ({ id, rotulo: ROTULOS_SINTOMAS[id] })),
      intensidade: dados.intensidade,
      diasDeSintomas: dados.diasDeSintomas,
      temperatura: dados.temperatura ?? null,
    },
    especialidades,
  });
});

export default roteador;
