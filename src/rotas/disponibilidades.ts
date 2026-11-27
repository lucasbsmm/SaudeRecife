import { Request, Router } from 'express';
import { HydratedDocument } from 'mongoose';
import { z } from 'zod';
import { autenticar, exigirPerfil, usuarioAtual } from '../middlewares/autenticacao';
import { Disponibilidade } from '../modelos/Disponibilidade';
import { IProfissional, Profissional } from '../modelos/Profissional';
import { obterVinculos } from '../servicos/vinculos';
import { horaParaMinutos, minutosParaHora, REGEX_HORA } from '../utilitarios/datas';
import { acessoNegado, ErroHttp, naoEncontrado } from '../utilitarios/erros';
import { idMongo, lerId, lerTexto, opcional } from '../utilitarios/validacao';

const roteador = Router();
roteador.use(autenticar);

const esquemaDisponibilidade = z.object({
  profissional: opcional(idMongo),
  clinica: idMongo,
  diaSemana: z.number().int().min(0).max(6),
  horaInicio: z.string().regex(REGEX_HORA, 'Horário inválido.'),
  horaFim: z.string().regex(REGEX_HORA, 'Horário inválido.'),
  duracaoMinutos: z.number().int().min(10).max(240).default(30),
});

/** Administrador gerencia qualquer agenda; o profissional, apenas a própria. */
async function profissionalGerenciavel(requisicao: Request, profissionalId?: string): Promise<HydratedDocument<IProfissional>> {
  const usuario = usuarioAtual(requisicao);
  let alvo = profissionalId;

  if (usuario.perfil === 'profissional') {
    const { profissionalId: proprio } = await obterVinculos(usuario);
    if (!proprio || (alvo && alvo !== String(proprio))) throw acessoNegado();
    alvo = String(proprio);
  } else if (usuario.perfil !== 'administrador') {
    throw acessoNegado();
  }

  if (!alvo) throw new ErroHttp(400, 'Informe o profissional.', [{ campo: 'profissional', mensagem: 'Campo obrigatório.' }]);
  const profissional = await Profissional.findById(alvo);
  if (!profissional) throw naoEncontrado('Profissional');
  return profissional;
}

roteador.get('/', async (requisicao, resposta) => {
  const filtro: Record<string, unknown> = {};
  const profissional = lerTexto(requisicao.query.profissional);
  const clinica = lerTexto(requisicao.query.clinica);
  if (profissional) filtro.profissional = lerId(profissional);
  if (clinica) filtro.clinica = lerId(clinica);

  const itens = await Disponibilidade.find(filtro)
    .populate('clinica', 'nome')
    .populate('profissional', 'nome')
    .sort({ profissional: 1, diaSemana: 1, horaInicio: 1 })
    .limit(300);
  resposta.json({ itens, total: itens.length });
});

async function validarJanela(
  dados: z.infer<typeof esquemaDisponibilidade>,
  profissional: HydratedDocument<IProfissional>,
  ignorarId?: string,
): Promise<void> {
  if (!profissional.clinicas.some((c) => c.equals(dados.clinica))) {
    throw new ErroHttp(400, 'O profissional não está associado a esta clínica.', [{ campo: 'clinica', mensagem: 'Clínica não associada.' }]);
  }

  const inicio = horaParaMinutos(dados.horaInicio);
  const fim = horaParaMinutos(dados.horaFim);
  if (fim <= inicio) {
    throw new ErroHttp(400, 'O horário final deve ser depois do inicial.', [{ campo: 'horaFim', mensagem: 'Deve ser depois do horário inicial.' }]);
  }
  if (fim - inicio < dados.duracaoMinutos) {
    throw new ErroHttp(400, 'O intervalo é menor que a duração de uma consulta.', [{ campo: 'duracaoMinutos', mensagem: 'Maior que o intervalo informado.' }]);
  }

  // O profissional não pode estar em dois lugares ao mesmo tempo.
  const mesmoDia = await Disponibilidade.find({ profissional: profissional._id, diaSemana: dados.diaSemana });
  const conflito = mesmoDia.find(
    (d) => String(d._id) !== ignorarId && horaParaMinutos(d.horaInicio) < fim && horaParaMinutos(d.horaFim) > inicio,
  );
  if (conflito) {
    throw new ErroHttp(409, `Conflita com outro período já cadastrado (${conflito.horaInicio} às ${minutosParaHora(horaParaMinutos(conflito.horaFim))}).`);
  }
}

roteador.post('/', exigirPerfil('administrador', 'profissional'), async (requisicao, resposta) => {
  const dados = esquemaDisponibilidade.parse(requisicao.body);
  const profissional = await profissionalGerenciavel(requisicao, dados.profissional);
  await validarJanela(dados, profissional);

  const criada = await Disponibilidade.create({
    profissional: profissional._id,
    clinica: dados.clinica,
    diaSemana: dados.diaSemana,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    duracaoMinutos: dados.duracaoMinutos,
  });
  await criada.populate([
    { path: 'clinica', select: 'nome' },
    { path: 'profissional', select: 'nome' },
  ]);
  resposta.status(201).json(criada);
});

roteador.put('/:id', exigirPerfil('administrador', 'profissional'), async (requisicao, resposta) => {
  const disponibilidade = await Disponibilidade.findById(lerId(requisicao.params.id));
  if (!disponibilidade) throw naoEncontrado('Disponibilidade', true);

  const profissional = await profissionalGerenciavel(requisicao, String(disponibilidade.profissional));
  const dados = esquemaDisponibilidade.parse(requisicao.body);
  await validarJanela(dados, profissional, String(disponibilidade._id));

  disponibilidade.set({
    clinica: dados.clinica,
    diaSemana: dados.diaSemana,
    horaInicio: dados.horaInicio,
    horaFim: dados.horaFim,
    duracaoMinutos: dados.duracaoMinutos,
  });
  await disponibilidade.save();
  await disponibilidade.populate([
    { path: 'clinica', select: 'nome' },
    { path: 'profissional', select: 'nome' },
  ]);
  resposta.json(disponibilidade);
});

roteador.delete('/:id', exigirPerfil('administrador', 'profissional'), async (requisicao, resposta) => {
  const disponibilidade = await Disponibilidade.findById(lerId(requisicao.params.id));
  if (!disponibilidade) throw naoEncontrado('Disponibilidade', true);

  await profissionalGerenciavel(requisicao, String(disponibilidade.profissional));
  await disponibilidade.deleteOne();
  resposta.status(204).end();
});

export default roteador;
