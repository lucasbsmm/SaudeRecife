import { Schema, Types, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';

export interface IDisponibilidade {
  profissional: Types.ObjectId;
  clinica: Types.ObjectId;
  diaSemana: number; // 0 = domingo ... 6 = sábado
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
  duracaoMinutos: number;
}

const esquemaDisponibilidade = new Schema<IDisponibilidade>(
  {
    profissional: { type: Schema.Types.ObjectId, ref: 'Profissional', required: true },
    clinica: { type: Schema.Types.ObjectId, ref: 'Clinica', required: true },
    diaSemana: { type: Number, required: true, min: 0, max: 6 },
    horaInicio: { type: String, required: true },
    horaFim: { type: String, required: true },
    duracaoMinutos: { type: Number, required: true, min: 10, max: 240, default: 30 },
  },
  { collection: 'disponibilidades', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

esquemaDisponibilidade.index({ profissional: 1, diaSemana: 1 });
esquemaDisponibilidade.index({ profissional: 1, clinica: 1 });

configurarSaidaJson(esquemaDisponibilidade);

export const Disponibilidade = model<IDisponibilidade>('Disponibilidade', esquemaDisponibilidade);
