import { Router } from 'express';
import { z } from 'zod';
import { autenticar, exigirPerfil } from '../middlewares/autenticacao';
import { Especialidade } from '../modelos/Especialidade';
import { Profissional } from '../modelos/Profissional';
import { ErroHttp, naoEncontrado } from '../utilitarios/erros';
import { escaparRegex, normalizar } from '../utilitarios/texto';
import { lerId, lerTexto, opcional } from '../utilitarios/validacao';

const roteador = Router();
roteador.use(autenticar);

const esquemaEspecialidade = z.object({
  nome: z.string().trim().min(3).max(80),
  descricao: opcional(z.string().trim().max(300)),
});

roteador.get('/', async (requisicao, resposta) => {
  const filtro: Record<string, unknown> = {};
  const busca = normalizar(lerTexto(requisicao.query.busca));
  if (busca) filtro.textoBusca = { $regex: escaparRegex(busca) };

  // "disponiveis=true" lista só as especialidades que têm algum profissional ativo.
  if (requisicao.query.disponiveis === 'true') {
    filtro._id = { $in: await Profissional.distinct('especialidade', { ativo: true }) };
  }

  const itens = await Especialidade.find(filtro).sort({ nome: 1 });
  resposta.json({ itens, total: itens.length });
});

roteador.get('/:id', async (requisicao, resposta) => {
  const especialidade = await Especialidade.findById(lerId(requisicao.params.id));
  if (!especialidade) throw naoEncontrado('Especialidade', true);
  resposta.json(especialidade);
});

roteador.post('/', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const especialidade = await Especialidade.create(esquemaEspecialidade.parse(requisicao.body));
  resposta.status(201).json(especialidade);
});

roteador.put('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const especialidade = await Especialidade.findById(lerId(requisicao.params.id));
  if (!especialidade) throw naoEncontrado('Especialidade', true);

  const dados = esquemaEspecialidade.parse(requisicao.body);
  especialidade.nome = dados.nome;
  especialidade.descricao = dados.descricao ?? '';
  await especialidade.save();
  resposta.json(especialidade);
});

roteador.delete('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const id = lerId(requisicao.params.id);
  if (await Profissional.exists({ especialidade: id })) {
    throw new ErroHttp(409, 'Não é possível excluir: há profissionais cadastrados nesta especialidade.');
  }
  const removida = await Especialidade.findByIdAndDelete(id);
  if (!removida) throw naoEncontrado('Especialidade', true);
  resposta.status(204).end();
});

export default roteador;
