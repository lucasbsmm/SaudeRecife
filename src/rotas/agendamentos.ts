import { Request, Router } from 'express';
import { HydratedDocument } from 'mongoose';
import { z } from 'zod';
import { autenticar, exigirPerfil, usuarioAtual } from '../middlewares/autenticacao';
import { Agendamento, IAgendamento, STATUS_AGENDAMENTO } from '../modelos/Agendamento';
import { Clinica } from '../modelos/Clinica';
import { Profissional } from '../modelos/Profissional';
import { horarioDisponivel } from '../servicos/agenda';
import { classificar, esquemaTriagem } from '../servicos/triagem';
import { obterVinculos } from '../servicos/vinculos';
import { agoraEmRecife, dataValida, REGEX_HORA } from '../utilitarios/datas';
import { acessoNegado, ErroHttp, naoEncontrado } from '../utilitarios/erros';
import { idMongo, lerId, lerPaginacao, lerTexto, opcional } from '../utilitarios/validacao';

const roteador = Router();
roteador.use(autenticar);

const POPULAR = [
  { path: 'paciente', select: 'nome telefone dataNascimento' },
  { path: 'profissional', select: 'nome crm' },
  { path: 'clinica', select: 'nome telefone endereco' },
  { path: 'especialidade', select: 'nome' },
];

const esquemaCriacao = z.object({
  profissional: idMongo,
  clinica: idMongo,
  data: z.string().refine(dataValida, 'Data inválida.'),
  hora: z.string().regex(REGEX_HORA, 'Horário inválido.'),
  observacoes: opcional(z.string().trim().max(500)),
  triagem: esquemaTriagem.optional(),
  paciente: opcional(idMongo), // só vale para administradores
});

function jaPassou(agendamento: Pick<IAgendamento, 'data' | 'hora'>): boolean {
  const agora = agoraEmRecife();
  return agendamento.data < agora.data || (agendamento.data === agora.data && agendamento.hora <= agora.hora);
}

/** Carrega o agendamento garantindo que o usuário logado pode enxergá-lo. */
async function carregarComAcesso(requisicao: Request): Promise<HydratedDocument<IAgendamento>> {
  const agendamento = await Agendamento.findById(lerId(requisicao.params.id));
  if (!agendamento) throw naoEncontrado('Consulta', true);

  const usuario = usuarioAtual(requisicao);
  if (usuario.perfil !== 'administrador') {
    const { pacienteId, profissionalId } = await obterVinculos(usuario);
    const dono =
      (pacienteId && agendamento.paciente.equals(pacienteId)) || (profissionalId && agendamento.profissional.equals(profissionalId));
    if (!dono) throw acessoNegado();
  }
  return agendamento;
}

roteador.post('/', exigirPerfil('paciente', 'administrador'), async (requisicao, resposta) => {
  const dados = esquemaCriacao.parse(requisicao.body);
  const usuario = usuarioAtual(requisicao);
  const { pacienteId } = await obterVinculos(usuario);

  const paciente = usuario.perfil === 'administrador' ? dados.paciente : pacienteId;
  if (!paciente) {
    throw new ErroHttp(400, 'Informe o paciente da consulta.', [{ campo: 'paciente', mensagem: 'Campo obrigatório.' }]);
  }

  const profissional = await Profissional.findById(dados.profissional);
  if (!profissional || !profissional.ativo) throw naoEncontrado('Profissional');

  const clinica = await Clinica.findById(dados.clinica);
  if (!clinica || !clinica.ativo || !profissional.clinicas.some((c) => c.equals(clinica._id))) {
    throw new ErroHttp(400, 'O profissional não atende nesta clínica.');
  }

  if (!(await horarioDisponivel(dados.profissional, dados.clinica, dados.data, dados.hora))) {
    throw new ErroHttp(409, 'Este horário não está mais disponível. Escolha outro.');
  }

  try {
    const agendamento = await Agendamento.create({
      paciente,
      profissional: profissional._id,
      clinica: clinica._id,
      especialidade: profissional.especialidade,
      data: dados.data,
      hora: dados.hora,
      observacoes: dados.observacoes,
      triagem: dados.triagem ? { ...dados.triagem, classificacao: classificar(dados.triagem).classificacao } : undefined,
    });
    await agendamento.populate(POPULAR);
    resposta.status(201).json(agendamento);
  } catch (erro) {
    const duplicado = (erro as { code?: number; keyPattern?: Record<string, unknown> }) ?? {};
    if (duplicado.code === 11000) {
      const conflitoDoPaciente = Boolean(duplicado.keyPattern?.paciente);
      throw new ErroHttp(
        409,
        conflitoDoPaciente ? 'Você já tem uma consulta marcada neste mesmo horário.' : 'Este horário acabou de ser reservado. Escolha outro.',
      );
    }
    throw erro;
  }
});

roteador.get('/', async (requisicao, resposta) => {
  const usuario = usuarioAtual(requisicao);
  const { pagina, limite, pular } = lerPaginacao(requisicao.query);
  const vinculos = await obterVinculos(usuario);
  const filtro: Record<string, unknown> = {};

  if (usuario.perfil === 'paciente') filtro.paciente = vinculos.pacienteId ?? null;
  else if (usuario.perfil === 'profissional') filtro.profissional = vinculos.profissionalId ?? null;
  else {
    for (const campo of ['paciente', 'profissional', 'clinica'] as const) {
      const valor = lerTexto(requisicao.query[campo]);
      if (valor) filtro[campo] = lerId(valor);
    }
  }

  const status = lerTexto(requisicao.query.status);
  if (status) {
    if (!(STATUS_AGENDAMENTO as readonly string[]).includes(status)) throw new ErroHttp(400, 'Status inválido.');
    filtro.status = status;
  }

  const data = lerTexto(requisicao.query.data);
  if (data) {
    if (!dataValida(data)) throw new ErroHttp(400, 'Data inválida.');
    filtro.data = data;
  }

  // "proximas" = agendadas e ainda por vir; "historico" = todo o resto.
  const periodo = lerTexto(requisicao.query.periodo);
  const agora = agoraEmRecife();
  const proximas = { status: 'agendado', $or: [{ data: { $gt: agora.data } }, { data: agora.data, hora: { $gt: agora.hora } }] };
  if (periodo === 'proximas') Object.assign(filtro, proximas);
  if (periodo === 'historico') filtro.$nor = [proximas];

  const ordem = periodo === 'historico' ? -1 : 1;
  const [itens, total] = await Promise.all([
    Agendamento.find(filtro).populate(POPULAR).sort({ data: ordem, hora: ordem }).skip(pular).limit(limite),
    Agendamento.countDocuments(filtro),
  ]);
  resposta.json({ itens, total, pagina, limite });
});

roteador.get('/:id', async (requisicao, resposta) => {
  const agendamento = await carregarComAcesso(requisicao);
  await agendamento.populate(POPULAR);
  resposta.json(agendamento);
});

roteador.patch('/:id/cancelar', async (requisicao, resposta) => {
  const agendamento = await carregarComAcesso(requisicao);
  const { motivo } = z.object({ motivo: opcional(z.string().trim().max(300)) }).parse(requisicao.body ?? {});
  const usuario = usuarioAtual(requisicao);

  if (agendamento.status !== 'agendado') throw new ErroHttp(409, 'Somente consultas agendadas podem ser canceladas.');
  if (usuario.perfil === 'paciente' && jaPassou(agendamento)) {
    throw new ErroHttp(409, 'Não é possível cancelar uma consulta que já passou.');
  }

  agendamento.status = 'cancelado';
  agendamento.motivoCancelamento = motivo;
  agendamento.canceladoPor = usuario.perfil;
  agendamento.canceladoEm = new Date();
  await agendamento.save();

  await agendamento.populate(POPULAR);
  resposta.json(agendamento);
});

roteador.patch('/:id/concluir', exigirPerfil('profissional', 'administrador'), async (requisicao, resposta) => {
  const agendamento = await carregarComAcesso(requisicao);
  if (agendamento.status !== 'agendado') throw new ErroHttp(409, 'Somente consultas agendadas podem ser concluídas.');

  agendamento.status = 'concluido';
  await agendamento.save();

  await agendamento.populate(POPULAR);
  resposta.json(agendamento);
});

export default roteador;
