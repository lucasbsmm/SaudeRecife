import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErroHttp } from '../utilitarios/erros';

const ROTULOS_CAMPO: Record<string, string> = {
  email: 'e-mail',
  cpf: 'CPF',
  crm: 'CRM',
  nome: 'nome',
  usuario: 'usuário',
};

export const rotaNaoEncontrada: RequestHandler = (_requisicao, resposta) => {
  resposta.status(404).json({ mensagem: 'Rota não encontrada.' });
};

export const tratarErros: ErrorRequestHandler = (erro, _requisicao, resposta, _proximo) => {
  if (erro instanceof ErroHttp) {
    resposta.status(erro.status).json({ mensagem: erro.message, detalhes: erro.detalhes });
    return;
  }

  if (erro instanceof ZodError) {
    const detalhes = erro.issues.map((p) => ({ campo: p.path.join('.'), mensagem: p.message }));
    resposta.status(400).json({ mensagem: detalhes[0]?.mensagem ?? 'Dados inválidos.', detalhes });
    return;
  }

  if (erro?.name === 'ValidationError' && erro.errors) {
    const detalhes = Object.values<{ path: string; message: string }>(erro.errors).map((e) => ({
      campo: e.path,
      mensagem: e.message,
    }));
    resposta.status(400).json({ mensagem: 'Dados inválidos.', detalhes });
    return;
  }

  if (erro?.name === 'CastError') {
    resposta.status(400).json({ mensagem: 'Identificador ou valor inválido.' });
    return;
  }

  if (erro?.code === 11000) {
    const campo = Object.keys(erro.keyPattern ?? {})[0];
    const rotulo = ROTULOS_CAMPO[campo];
    resposta.status(409).json({
      mensagem: rotulo ? `Já existe um registro com este ${rotulo}.` : 'Já existe um registro com estes dados.',
      detalhes: campo ? [{ campo, mensagem: 'Valor já cadastrado.' }] : undefined,
    });
    return;
  }

  if (erro?.type === 'entity.parse.failed') {
    resposta.status(400).json({ mensagem: 'O corpo da requisição não é um JSON válido.' });
    return;
  }

  console.error('[erro]', erro);
  resposta.status(500).json({ mensagem: 'Erro interno do servidor. Tente novamente em instantes.' });
};
