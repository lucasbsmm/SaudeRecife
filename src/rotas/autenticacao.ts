import { compare, hash } from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { autenticar, usuarioAtual } from '../middlewares/autenticacao';
import { Usuario } from '../modelos/Usuario';
import { campoSenha, criarPaciente, esquemaNovoPaciente } from '../servicos/contas';
import { descreverUsuario, gerarToken } from '../servicos/sessao';
import { ErroHttp } from '../utilitarios/erros';
import { somenteDigitos } from '../utilitarios/texto';

const roteador = Router();

const limitarTentativas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { mensagem: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.' },
});

const esquemaEntrada = z.object({
  identificador: z.string().trim().min(1, 'Informe seu CPF ou e-mail.'),
  senha: z.string().min(1, 'Informe sua senha.'),
});

roteador.post('/entrar', limitarTentativas, async (requisicao, resposta) => {
  const { identificador, senha } = esquemaEntrada.parse(requisicao.body);

  const filtro = identificador.includes('@') ? { email: identificador.toLowerCase() } : { cpf: somenteDigitos(identificador) };
  const usuario = await Usuario.findOne(filtro).select('+senhaHash');

  const senhaConfere = usuario ? await compare(senha, usuario.senhaHash) : false;
  if (!usuario || !senhaConfere || !usuario.ativo) {
    throw new ErroHttp(401, 'CPF/e-mail ou senha incorretos.');
  }

  resposta.json({ token: gerarToken(usuario), usuario: await descreverUsuario(usuario) });
});

roteador.post('/cadastrar', limitarTentativas, async (requisicao, resposta) => {
  const dados = esquemaNovoPaciente.parse(requisicao.body);
  const { usuario } = await criarPaciente(dados);
  resposta.status(201).json({ token: gerarToken(usuario), usuario: await descreverUsuario(usuario) });
});

roteador.get('/eu', autenticar, async (requisicao, resposta) => {
  const usuario = await Usuario.findById(usuarioAtual(requisicao).id);
  if (!usuario) throw new ErroHttp(401, 'Conta inexistente.');
  resposta.json({ usuario: await descreverUsuario(usuario) });
});

const esquemaSenha = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual.'),
  novaSenha: campoSenha,
});

roteador.put('/senha', autenticar, async (requisicao, resposta) => {
  const { senhaAtual, novaSenha } = esquemaSenha.parse(requisicao.body);
  const usuario = await Usuario.findById(usuarioAtual(requisicao).id).select('+senhaHash');
  if (!usuario) throw new ErroHttp(401, 'Conta inexistente.');

  if (!(await compare(senhaAtual, usuario.senhaHash))) {
    throw new ErroHttp(400, 'A senha atual está incorreta.', [{ campo: 'senhaAtual', mensagem: 'Senha incorreta.' }]);
  }

  usuario.senhaHash = await hash(novaSenha, 10);
  await usuario.save();
  resposta.status(204).end();
});

export default roteador;
