import { Schema, Types, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';
import { normalizar } from '../utilitarios/texto';

export interface IProfissional {
  usuario?: Types.ObjectId;
  nome: string;
  crm: string;
  especialidade: Types.ObjectId;
  clinicas: Types.ObjectId[];
  ativo: boolean;
  textoBusca: string;
}

const esquemaProfissional = new Schema<IProfissional>(
  {
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario' },
    nome: { type: String, required: true, trim: true },
    crm: { type: String, required: true, unique: true, trim: true },
    especialidade: { type: Schema.Types.ObjectId, ref: 'Especialidade', required: true, index: true },
    clinicas: [{ type: Schema.Types.ObjectId, ref: 'Clinica' }],
    ativo: { type: Boolean, default: true },
    textoBusca: { type: String, index: true },
  },
  { collection: 'profissionais', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquemaProfissional.index({ clinicas: 1, especialidade: 1 });
esquemaProfissional.index({ usuario: 1 }, { sparse: true });

esquemaProfissional.pre('validate', function () {
  this.textoBusca = normalizar(this.nome);
});

configurarSaidaJson(esquemaProfissional);

export const Profissional = model<IProfissional>('Profissional', esquemaProfissional);
