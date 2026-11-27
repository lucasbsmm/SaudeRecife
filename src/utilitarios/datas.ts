const FUSO_RECIFE = 'America/Recife';

export const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
export const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Data (AAAA-MM-DD) e hora (HH:mm) atuais no fuso de Recife. */
export function agoraEmRecife(referencia: Date = new Date()): { data: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_RECIFE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(referencia);

  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00';
  return { data: `${valor('year')}-${valor('month')}-${valor('day')}`, hora: `${valor('hour')}:${valor('minute')}` };
}

export function dataValida(data: string): boolean {
  if (!REGEX_DATA.test(data)) return false;
  const convertida = new Date(`${data}T00:00:00Z`);
  return !Number.isNaN(convertida.getTime()) && convertida.toISOString().slice(0, 10) === data;
}

/** 0 = domingo ... 6 = sábado */
export function diaDaSemana(data: string): number {
  return new Date(`${data}T12:00:00Z`).getUTCDay();
}

export function somarDias(data: string, dias: number): string {
  const convertida = new Date(`${data}T12:00:00Z`);
  convertida.setUTCDate(convertida.getUTCDate() + dias);
  return convertida.toISOString().slice(0, 10);
}

export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

export function minutosParaHora(minutos: number): string {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function calcularIdade(dataNascimento: string, hoje: string = agoraEmRecife().data): number {
  const [anoN, mesN, diaN] = dataNascimento.split('-').map(Number);
  const [ano, mes, dia] = hoje.split('-').map(Number);
  let idade = ano - anoN;
  if (mes < mesN || (mes === mesN && dia < diaN)) idade -= 1;
  return idade;
}
