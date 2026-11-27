import { HydratedDocument } from 'mongoose';
import jwt from 'jsonwebtoken';
import { ambiente } from '../configuracao/ambiente';
import { Paciente } from '../modelos/Paciente';
import { Profissional } from '../modelos/Profissional';
import { IUsuario } from '../modelos/Usuario';

export function gerarToken(usuario: HydratedDocument<IUsuario>): string {
  return jwt.sign({ perfil: usuario.perfil }, ambiente.JWT_SEGREDO, {
    subject: String(usuario._id),
    expiresIn: ambiente.JWT_EXPIRACAO as jwt.SignOptions['expiresIn'],
  });
}

/** Monta o usuário que o front-end guarda na sessão, com o cadastro vinculado ao perfil. */
export async function descreverUsuario(usuario: HydratedDocument<IUsuario>) {
  let vinculo: unknown = null;

  if (usuario.perfil === 'paciente') {
    vinculo = await Paciente.findOne({ usuario: usuario._id });
  } else if (usuario.perfil === 'profissional') {
    vinculo = await Profissional.findOne({ usuario: usuario._id })
      .populate('especialidade', 'nome')
      .populate('clinicas', 'nome');
  }

  return { ...usuario.toJSON(), vinculo };
}
