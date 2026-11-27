import { Router } from 'express';
import { z } from 'zod';
import { autenticar, exigirPerfil } from '../middlewares/autenticacao';
import { Agendamento } from '../modelos/Agendamento';
import { Clinica } from '../modelos/Clinica';
import { Profissional } from '../modelos/Profissional';
import { ErroHttp, naoEncontrado } from '../utilitarios/erros';
import { escaparRegex, normalizar } from '../utilitarios/texto';
import { lerId, lerPaginacao, lerTexto, opcional } from '../utilitarios/validacao';

const roteador = Router();
roteador.use(autenticar);

const esquemaClinica = z.object({
  nome: z.string().trim().min(3).max(120),
  telefone: opcional(z.string().trim().max(20)),
  endereco: z.object({
    logradouro: z.string().trim().min(3).max(150),
    numero: opcional(z.string().trim().max(10)),
    bairro: z.string().trim().min(2).max(80),
    cidade: z.string().trim().min(2).max(80).default('Recife'),
    uf: z.string().trim().length(2, 'Use a sigla do estado, com 2 letras.').default('PE'),
    cep: opcional(z.string().trim().regex(/^\d{5}-?\d{3}$/, 'CEP inválido.')),
  }),
  ativo: z.boolean().default(true),
});

roteador.get('/', async (requisicao, resposta) => {
  const { pagina, limite, pular } = lerPaginacao(requisicao.query);
  const filtro: Record<string, unknown> = {};

  const busca = normalizar(lerTexto(requisicao.query.busca));
  if (busca) filtro.textoBusca = { $regex: escaparRegex(busca) };

  if (requisicao.usuario?.perfil !== 'administrador') filtro.ativo = true;

  // Só clínicas onde atua algum profissional da especialidade informada.
  const especialidade = lerTexto(requisicao.query.especialidade);
  if (especialidade) {
    const clinicasDaEspecialidade = await Profissional.distinct('clinicas', { especialidade: lerId(especialidade), ativo: true });
    filtro._id = { $in: clinicasDaEspecialidade };
  }

  const [itens, total] = await Promise.all([
    Clinica.find(filtro).sort({ nome: 1 }).skip(pular).limit(limite),
    Clinica.countDocuments(filtro),
  ]);
  resposta.json({ itens, total, pagina, limite });
});

roteador.get('/:id', async (requisicao, resposta) => {
  const clinica = await Clinica.findById(lerId(requisicao.params.id));
  if (!clinica || (!clinica.ativo && requisicao.usuario?.perfil !== 'administrador')) throw naoEncontrado('Clínica', true);
  resposta.json(clinica);
});

roteador.post('/', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const clinica = await Clinica.create(esquemaClinica.parse(requisicao.body));
  resposta.status(201).json(clinica);
});

roteador.put('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const clinica = await Clinica.findById(lerId(requisicao.params.id));
  if (!clinica) throw naoEncontrado('Clínica', true);

  const dados = esquemaClinica.parse(requisicao.body);
  clinica.set({
    nome: dados.nome,
    telefone: dados.telefone ?? '',
    endereco: { ...dados.endereco, numero: dados.endereco.numero ?? '', cep: dados.endereco.cep ?? '' },
    ativo: dados.ativo,
  });
  await clinica.save();
  resposta.json(clinica);
});

roteador.delete('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const id = lerId(requisicao.params.id);
  const [temProfissionais, temAgendamentos] = await Promise.all([
    Profissional.exists({ clinicas: id }),
    Agendamento.exists({ clinica: id }),
  ]);
  if (temProfissionais || temAgendamentos) {
    throw new ErroHttp(409, 'Esta clínica possui profissionais ou consultas vinculados. Desative-a em vez de excluir.');
  }
  const removida = await Clinica.findByIdAndDelete(id);
  if (!removida) throw naoEncontrado('Clínica', true);
  resposta.status(204).end();
});

export default roteador;
