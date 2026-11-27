import { Schema, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';
import { normalizar } from '../utilitarios/texto';

export interface IEspecialidade {
  nome: string;
  descricao?: string;
  textoBusca: string;
}

const esquemaEspecialidade = new Schema<IEspecialidade>(
  {
    nome: { type: String, required: true, unique: true, trim: true },
    descricao: { type: String, trim: true },
    textoBusca: { type: String, index: true },
  },
  { collection: 'especialidades', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquemaEspecialidade.pre('validate', function () {
  this.textoBusca = normalizar(this.nome);
});

configurarSaidaJson(esquemaEspecialidade);

export const Especialidade = model<IEspecialidade>('Especialidade', esquemaEspecialidade);
