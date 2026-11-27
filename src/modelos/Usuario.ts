import { Schema, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';

export const PERFIS = ['paciente', 'profissional', 'administrador'] as const;
export type Perfil = (typeof PERFIS)[number];

export interface IUsuario {
  nome: string;
  email: string;
  cpf?: string;
  senhaHash: string;
  perfil: Perfil;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

const esquemaUsuario = new Schema<IUsuario>(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    cpf: { type: String, unique: true, sparse: true },
    senhaHash: { type: String, required: true, select: false },
    perfil: { type: String, enum: PERFIS, required: true },
    ativo: { type: Boolean, default: true },
  },
  { collection: 'usuarios', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

configurarSaidaJson(esquemaUsuario, ['senhaHash']);

export const Usuario = model<IUsuario>('Usuario', esquemaUsuario);
