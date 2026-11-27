import { Schema, Types, model } from 'mongoose';
import { configurarSaidaJson } from '../utilitarios/esquema';
import { Perfil, PERFIS } from './Usuario';

export const STATUS_AGENDAMENTO = ['agendado', 'cancelado', 'concluido'] as const;
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export interface IAgendamento {
  paciente: Types.ObjectId;
  profissional: Types.ObjectId;
  clinica: Types.ObjectId;
  especialidade: Types.ObjectId;
  data: string; // AAAA-MM-DD
  hora: string; // HH:mm
  status: StatusAgendamento;
  observacoes?: string;
  triagem?: {
    sintomas: string[];
    intensidade?: string;
    diasDeSintomas?: number;
    temperatura?: number;
    classificacao: string;
  };
  motivoCancelamento?: string;
  canceladoPor?: Perfil;
  canceladoEm?: Date;
}

const esquemaAgendamento = new Schema<IAgendamento>(
  {
    paciente: { type: Schema.Types.ObjectId, ref: 'Paciente', required: true },
    profissional: { type: Schema.Types.ObjectId, ref: 'Profissional', required: true },
    clinica: { type: Schema.Types.ObjectId, ref: 'Clinica', required: true },
    especialidade: { type: Schema.Types.ObjectId, ref: 'Especialidade', required: true },
    data: { type: String, required: true },
    hora: { type: String, required: true },
    status: { type: String, enum: STATUS_AGENDAMENTO, default: 'agendado' },
    observacoes: { type: String, trim: true, maxlength: 500 },
    triagem: {
      sintomas: [String],
      intensidade: String,
      diasDeSintomas: Number,
      temperatura: Number,
      classificacao: String,
    },
    motivoCancelamento: { type: String, trim: true, maxlength: 300 },
    canceladoPor: { type: String, enum: PERFIS },
    canceladoEm: Date,
  },
  { collection: 'agendamentos', timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } },
);

// Impedem reserva duplicada do mesmo horário, mesmo com requisições simultâneas.
const somenteAgendados = { partialFilterExpression: { status: 'agendado' } };
esquemaAgendamento.index({ profissional: 1, data: 1, hora: 1 }, { unique: true, ...somenteAgendados });
esquemaAgendamento.index({ paciente: 1, data: 1, hora: 1 }, { unique: true, ...somenteAgendados });
esquemaAgendamento.index({ paciente: 1, data: -1 });
esquemaAgendamento.index({ profissional: 1, data: 1 });

configurarSaidaJson(esquemaAgendamento);

export const Agendamento = model<IAgendamento>('Agendamento', esquemaAgendamento);
