import { hash } from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { autenticar, exigirPerfil } from '../middlewares/autenticacao';
import { Agendamento } from '../modelos/Agendamento';
import { Clinica } from '../modelos/Clinica';
import { Disponibilidade } from '../modelos/Disponibilidade';
import { Especialidade } from '../modelos/Especialidade';
import { Profissional } from '../modelos/Profissional';
import { Usuario } from '../modelos/Usuario';
import { campoCpf, campoEmail, campoNome, campoSenha, garantirContaLivre } from '../servicos/contas';
import { gerarAgenda } from '../servicos/agenda';
import { agoraEmRecife, dataValida } from '../utilitarios/datas';
import { ErroHttp, naoEncontrado } from '../utilitarios/erros';
import { escaparRegex, normalizar } from '../utilitarios/texto';
import { idMongo, lerId, lerPaginacao, lerTexto, opcional } from '../utilitarios/validacao';

const roteador = Router();
roteador.use(autenticar);

const esquemaProfissional = z.object({
  nome: campoNome,
  crm: z.string().trim().min(3, 'Informe o CRM.').max(20),
  especialidade: idMongo,
  clinicas: z.array(idMongo).default([]),
  ativo: z.boolean().default(true),
  // Dados de acesso: usados só no cadastro, para criar o login do profissional.
  email: opcional(campoEmail),
  senha: opcional(campoSenha),
  cpf: opcional(campoCpf),
});

async function validarReferencias(especialidadeId: string, clinicasIds: string[]): Promise<void> {
  if (!(await Especialidade.exists({ _id: especialidadeId }))) {
    throw new ErroHttp(400, 'Especialidade não encontrada.', [{ campo: 'especialidade', mensagem: 'Especialidade inexistente.' }]);
  }
  const unicas = [...new Set(clinicasIds)];
  if (unicas.length && (await Clinica.countDocuments({ _id: { $in: unicas } })) !== unicas.length) {
    throw new ErroHttp(400, 'Uma das clínicas informadas não existe.', [{ campo: 'clinicas', mensagem: 'Clínica inexistente.' }]);
  }
}

const POPULAR = [
  { path: 'especialidade', select: 'nome' },
  { path: 'clinicas', select: 'nome endereco.bairro' },
];

roteador.get('/', async (requisicao, resposta) => {
  const { pagina, limite, pular } = lerPaginacao(requisicao.query);
  const filtro: Record<string, unknown> = {};

  const nome = normalizar(lerTexto(requisicao.query.nome));
  if (nome) filtro.textoBusca = { $regex: escaparRegex(nome) };

  const clinica = lerTexto(requisicao.query.clinica);
  if (clinica) filtro.clinicas = lerId(clinica);

  const especialidade = lerTexto(requisicao.query.especialidade);
  if (especialidade) filtro.especialidade = lerId(especialidade);

  if (requisicao.usuario?.perfil !== 'administrador') filtro.ativo = true;

  const [itens, total] = await Promise.all([
    Profissional.find(filtro).populate(POPULAR).sort({ nome: 1 }).skip(pular).limit(limite),
    Profissional.countDocuments(filtro),
  ]);
  resposta.json({ itens, total, pagina, limite });
});

roteador.get('/:id', async (requisicao, resposta) => {
  const profissional = await Profissional.findById(lerId(requisicao.params.id)).populate(POPULAR);
  if (!profissional || (!profissional.ativo && requisicao.usuario?.perfil !== 'administrador')) throw naoEncontrado('Profissional');
  resposta.json(profissional);
});

// Horários dos próximos dias em uma clínica, já marcando o que está livre ou ocupado.
roteador.get('/:id/agenda', async (requisicao, resposta) => {
  const parametros = z
    .object({
      clinica: idMongo,
      inicio: z.string().refine(dataValida, 'Data inválida.').default(() => agoraEmRecife().data),
      dias: z.coerce.number().int().min(1).max(31).default(14),
    })
    .parse(requisicao.query);

  const profissional = await Profissional.findById(lerId(requisicao.params.id));
  if (!profissional || !profissional.ativo) throw naoEncontrado('Profissional');
  if (!profissional.clinicas.some((c) => c.equals(parametros.clinica))) {
    throw new ErroHttp(400, 'Este profissional não atende na clínica informada.');
  }

  const agenda = await gerarAgenda({
    profissionalId: profissional._id,
    clinicaId: parametros.clinica,
    inicio: parametros.inicio,
    dias: parametros.dias,
  });
  resposta.json({ itens: agenda });
});

roteador.post('/', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const dados = esquemaProfissional.parse(requisicao.body);
  await validarReferencias(dados.especialidade, dados.clinicas);

  if ((dados.email && !dados.senha) || (!dados.email && dados.senha)) {
    throw new ErroHttp(400, 'Para criar o acesso do profissional, informe e-mail e senha.', [
      { campo: dados.email ? 'senha' : 'email', mensagem: 'Campo obrigatório para criar o acesso.' },
    ]);
  }

  let usuarioId;
  if (dados.email && dados.senha) {
    await garantirContaLivre(dados.email, dados.cpf);
    const usuario = await Usuario.create({
      nome: dados.nome,
      email: dados.email,
      cpf: dados.cpf,
      senhaHash: await hash(dados.senha, 10),
      perfil: 'profissional',
    });
    usuarioId = usuario._id;
  }

  try {
    const profissional = await Profissional.create({
      usuario: usuarioId,
      nome: dados.nome,
      crm: dados.crm,
      especialidade: dados.especialidade,
      clinicas: [...new Set(dados.clinicas)],
      ativo: dados.ativo,
    });
    await profissional.populate(POPULAR);
    resposta.status(201).json(profissional);
  } catch (erro) {
    if (usuarioId) await Usuario.deleteOne({ _id: usuarioId });
    throw erro;
  }
});

roteador.put('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const profissional = await Profissional.findById(lerId(requisicao.params.id));
  if (!profissional) throw naoEncontrado('Profissional');

  const dados = esquemaProfissional.omit({ email: true, senha: true, cpf: true }).parse(requisicao.body);
  await validarReferencias(dados.especialidade, dados.clinicas);

  const clinicasNovas = [...new Set(dados.clinicas)];
  const removidas = profissional.clinicas.filter((c) => !clinicasNovas.includes(String(c)));

  profissional.set({ nome: dados.nome, crm: dados.crm, especialidade: dados.especialidade, clinicas: clinicasNovas, ativo: dados.ativo });
  await profissional.save();

  if (removidas.length) await Disponibilidade.deleteMany({ profissional: profissional._id, clinica: { $in: removidas } });
  if (profissional.usuario) {
    await Usuario.updateOne({ _id: profissional.usuario }, { nome: dados.nome, ativo: dados.ativo });
  }

  await profissional.populate(POPULAR);
  resposta.json(profissional);
});

// Associação entre profissional e clínica
roteador.put('/:id/clinicas/:clinicaId', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const clinicaId = lerId(requisicao.params.clinicaId);
  if (!(await Clinica.exists({ _id: clinicaId }))) throw naoEncontrado('Clínica', true);

  const profissional = await Profissional.findByIdAndUpdate(lerId(requisicao.params.id), { $addToSet: { clinicas: clinicaId } }, { new: true }).populate(POPULAR);
  if (!profissional) throw naoEncontrado('Profissional');
  resposta.json(profissional);
});

roteador.delete('/:id/clinicas/:clinicaId', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const id = lerId(requisicao.params.id);
  const clinicaId = lerId(requisicao.params.clinicaId);
  const agora = agoraEmRecife();

  const futuras = await Agendamento.exists({
    profissional: id,
    clinica: clinicaId,
    status: 'agendado',
    $or: [{ data: { $gt: agora.data } }, { data: agora.data, hora: { $gte: agora.hora } }],
  });
  if (futuras) throw new ErroHttp(409, 'Há consultas futuras agendadas nesta clínica. Cancele-as antes de remover a associação.');

  const profissional = await Profissional.findByIdAndUpdate(id, { $pull: { clinicas: clinicaId } }, { new: true }).populate(POPULAR);
  if (!profissional) throw naoEncontrado('Profissional');
  await Disponibilidade.deleteMany({ profissional: id, clinica: clinicaId });
  resposta.json(profissional);
});

roteador.delete('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const profissional = await Profissional.findById(lerId(requisicao.params.id));
  if (!profissional) throw naoEncontrado('Profissional');

  // Desativa em vez de apagar, para preservar o histórico de consultas.
  profissional.ativo = false;
  await profissional.save();
  if (profissional.usuario) await Usuario.updateOne({ _id: profissional.usuario }, { ativo: false });
  resposta.status(204).end();
});

export default roteador;
