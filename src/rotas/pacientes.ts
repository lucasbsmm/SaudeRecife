import { Request, Router } from 'express';
import { HydratedDocument } from 'mongoose';
import { z } from 'zod';
import { autenticar, exigirPerfil, usuarioAtual } from '../middlewares/autenticacao';
import { IPaciente, Paciente } from '../modelos/Paciente';
import { Usuario } from '../modelos/Usuario';
import { campoDataNascimento, campoEmail, campoNome, campoTelefone, criarPaciente, esquemaNovoPaciente, garantirContaLivre } from '../servicos/contas';
import { acessoNegado, naoEncontrado } from '../utilitarios/erros';
import { escaparRegex, normalizar } from '../utilitarios/texto';
import { lerId, lerPaginacao, lerTexto, opcional } from '../utilitarios/validacao';

const roteador = Router();
roteador.use(autenticar);

const esquemaAtualizacao = z.object({
  nome: campoNome,
  email: campoEmail,
  telefone: opcional(campoTelefone),
  dataNascimento: campoDataNascimento,
  bairro: opcional(z.string().trim().max(80)),
  ativo: z.boolean().optional(),
});

function podeAcessar(requisicao: Request, paciente: HydratedDocument<IPaciente>): boolean {
  const usuario = usuarioAtual(requisicao);
  return usuario.perfil === 'administrador' || (usuario.perfil === 'paciente' && String(paciente.usuario) === usuario.id);
}

roteador.get('/', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const { pagina, limite, pular } = lerPaginacao(requisicao.query);
  const filtro: Record<string, unknown> = {};

  const busca = normalizar(lerTexto(requisicao.query.busca));
  if (busca) filtro.textoBusca = { $regex: escaparRegex(busca) };

  const [itens, total] = await Promise.all([
    Paciente.find(filtro).sort({ nome: 1 }).skip(pular).limit(limite),
    Paciente.countDocuments(filtro),
  ]);
  resposta.json({ itens, total, pagina, limite });
});

roteador.post('/', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const { paciente } = await criarPaciente(esquemaNovoPaciente.parse(requisicao.body));
  resposta.status(201).json(paciente);
});

roteador.get('/:id', async (requisicao, resposta) => {
  const paciente = await Paciente.findById(lerId(requisicao.params.id));
  if (!paciente) throw naoEncontrado('Paciente');
  if (!podeAcessar(requisicao, paciente)) throw acessoNegado();
  resposta.json(paciente);
});

roteador.put('/:id', async (requisicao, resposta) => {
  const paciente = await Paciente.findById(lerId(requisicao.params.id));
  if (!paciente) throw naoEncontrado('Paciente');
  if (!podeAcessar(requisicao, paciente)) throw acessoNegado();

  const dados = esquemaAtualizacao.parse(requisicao.body);
  const ehAdministrador = usuarioAtual(requisicao).perfil === 'administrador';
  const ativo = ehAdministrador && dados.ativo !== undefined ? dados.ativo : paciente.ativo;

  await garantirContaLivre(dados.email, undefined, String(paciente.usuario));

  // Credenciais primeiro: se o e-mail já existir, nada é alterado no cadastro.
  await Usuario.updateOne({ _id: paciente.usuario }, { nome: dados.nome, email: dados.email, ativo });

  paciente.set({
    nome: dados.nome,
    email: dados.email,
    telefone: dados.telefone ?? '',
    dataNascimento: dados.dataNascimento,
    bairro: dados.bairro ?? '',
    ativo,
  });
  await paciente.save();
  resposta.json(paciente);
});

roteador.delete('/:id', exigirPerfil('administrador'), async (requisicao, resposta) => {
  const paciente = await Paciente.findById(lerId(requisicao.params.id));
  if (!paciente) throw naoEncontrado('Paciente');

  // Desativa a conta e mantém o histórico de atendimentos.
  paciente.ativo = false;
  await paciente.save();
  await Usuario.updateOne({ _id: paciente.usuario }, { ativo: false });
  resposta.status(204).end();
});

export default roteador;
