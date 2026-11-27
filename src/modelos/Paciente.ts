import { Schema, Types, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';
import { normalizar } from '../utilitarios/texto';

export interface IPaciente {
  usuario: Types.ObjectId;
  nome: string;
  cpf: string;
  email: string;
  telefone?: string;
  dataNascimento: string; // AAAA-MM-DD
  bairro?: string;
  ativo: boolean;
  textoBusca: string;
}

const esquemaPaciente = new Schema<IPaciente>(
  {
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    nome: { type: String, required: true, trim: true },
    cpf: { type: String, required: true, unique: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    telefone: { type: String, trim: true },
    dataNascimento: { type: String, required: true },
    bairro: { type: String, trim: true },
    ativo: { type: Boolean, default: true },
    textoBusca: { type: String, index: true },
  },
  { collection: 'pacientes', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquemaPaciente.pre('validate', function () {
  this.textoBusca = normalizar(`${this.nome} ${this.cpf} ${this.email}`);
});

configurarSaidaJson(esquemaPaciente);

export const Paciente = model<IPaciente>('Paciente', esquemaPaciente);
