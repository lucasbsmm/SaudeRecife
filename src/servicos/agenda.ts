import { Types } from 'mongoose';
import { Agendamento } from '../modelos/Agendamento';
import { Disponibilidade, IDisponibilidade } from '../modelos/Disponibilidade';
import { agoraEmRecife, diaDaSemana, horaParaMinutos, minutosParaHora, somarDias } from '../utilitarios/datas';

export interface HorarioAgenda {
  hora: string;
  disponivel: boolean;
}

export interface DiaAgenda {
  data: string;
  diaSemana: number;
  horarios: HorarioAgenda[];
}

interface ParametrosAgenda {
  profissionalId: string | Types.ObjectId;
  clinicaId: string | Types.ObjectId;
  inicio: string;
  dias: number;
}

function gerarHorarios(disponibilidade: Pick<IDisponibilidade, 'horaInicio' | 'horaFim' | 'duracaoMinutos'>): string[] {
  const horarios: string[] = [];
  const fim = horaParaMinutos(disponibilidade.horaFim);
  for (let atual = horaParaMinutos(disponibilidade.horaInicio); atual + disponibilidade.duracaoMinutos <= fim; atual += disponibilidade.duracaoMinutos) {
    horarios.push(minutosParaHora(atual));
  }
  return horarios;
}

/**
 * Gera a agenda de um profissional em uma clínica: os horários vêm das disponibilidades
 * semanais, e ficam indisponíveis os já reservados (em qualquer clínica) ou que já passaram.
 */
export async function gerarAgenda({ profissionalId, clinicaId, inicio, dias }: ParametrosAgenda): Promise<DiaAgenda[]> {
  const agora = agoraEmRecife();
  const primeiroDia = inicio < agora.data ? agora.data : inicio;
  const ultimoDia = somarDias(primeiroDia, dias - 1);

  const [disponibilidades, reservados] = await Promise.all([
    Disponibilidade.find({ profissional: profissionalId, clinica: clinicaId }),
    Agendamento.find({
      profissional: profissionalId,
      status: 'agendado',
      data: { $gte: primeiroDia, $lte: ultimoDia },
    }).select('data hora'),
  ]);

  const ocupados = new Set(reservados.map((r) => `${r.data}|${r.hora}`));
  const agenda: DiaAgenda[] = [];

  for (let i = 0; i < dias; i++) {
    const data = somarDias(primeiroDia, i);
    const diaSemana = diaDaSemana(data);

    const horas = disponibilidades
      .filter((d) => d.diaSemana === diaSemana)
      .flatMap(gerarHorarios)
      .sort();

    agenda.push({
      data,
      diaSemana,
      horarios: horas.map((hora) => ({
        hora,
        disponivel: !ocupados.has(`${data}|${hora}`) && (data > agora.data || hora > agora.hora),
      })),
    });
  }

  return agenda;
}

/** Confirma se um horário específico existe na agenda e continua livre. */
export async function horarioDisponivel(profissionalId: string, clinicaId: string, data: string, hora: string): Promise<boolean> {
  const [dia] = await gerarAgenda({ profissionalId, clinicaId, inicio: data, dias: 1 });
  if (!dia || dia.data !== data) return false;
  return dia.horarios.some((h) => h.hora === hora && h.disponivel);
}

export { gerarHorarios };
