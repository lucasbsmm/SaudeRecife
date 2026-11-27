import { Schema, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';
import { normalizar } from '../utilitarios/texto';

export interface IClinica {
  nome: string;
  telefone?: string;
  endereco: {
    logradouro: string;
    numero?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep?: string;
  };
  ativo: boolean;
  textoBusca: string;
}

const esquemaClinica = new Schema<IClinica>(
  {
    nome: { type: String, required: true, trim: true },
    telefone: { type: String, trim: true },
    endereco: {
      logradouro: { type: String, required: true, trim: true },
      numero: { type: String, trim: true },
      bairro: { type: String, required: true, trim: true },
      cidade: { type: String, default: 'Recife', trim: true },
      uf: { type: String, default: 'PE', uppercase: true, trim: true, minlength: 2, maxlength: 2 },
      cep: { type: String, trim: true },
    },
    ativo: { type: Boolean, default: true },
    textoBusca: { type: String, index: true },
  },
  { collection: 'clinicas', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquemaClinica.pre('validate', function () {
  this.textoBusca = normalizar(`${this.nome} ${this.endereco?.bairro ?? ''}`);
});

configurarSaidaJson(esquemaClinica);

export const Clinica = model<IClinica>('Clinica', esquemaClinica);
