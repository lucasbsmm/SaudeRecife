import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ambiente } from '../configuracao/ambiente';
import { Perfil, Usuario } from '../modelos/Usuario';
import { acessoNegado, ErroHttp } from '../utilitarios/erros';

export interface UsuarioAutenticado {
  id: string;
  perfil: Perfil;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export async function autenticar(requisicao: Request, _resposta: Response, proximo: NextFunction): Promise<void> {
  const cabecalho = requisicao.headers.authorization;
  if (!cabecalho?.startsWith('Bearer ')) throw new ErroHttp(401, 'Faça login para continuar.');

  let carga: jwt.JwtPayload;
  try {
    carga = jwt.verify(cabecalho.slice(7), ambiente.JWT_SEGREDO) as jwt.JwtPayload;
  } catch {
    throw new ErroHttp(401, 'Sessão expirada ou inválida. Entre novamente.');
  }

  const usuario = await Usuario.findOne({ _id: carga.sub, ativo: true }).select('perfil');
  if (!usuario) throw new ErroHttp(401, 'Conta inexistente ou desativada.');

  requisicao.usuario = { id: String(usuario._id), perfil: usuario.perfil };
  proximo();
}

export function exigirPerfil(...perfis: Perfil[]) {
  return (requisicao: Request, _resposta: Response, proximo: NextFunction): void => {
    if (!requisicao.usuario || !perfis.includes(requisicao.usuario.perfil)) throw acessoNegado();
    proximo();
  };
}

export function usuarioAtual(requisicao: Request): UsuarioAutenticado {
  if (!requisicao.usuario) throw new ErroHttp(401, 'Faça login para continuar.');
  return requisicao.usuario;
}
