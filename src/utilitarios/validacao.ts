import { z } from 'zod';

export const idMongo = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Identificador inválido.');

/** Campo opcional que trata string vazia como "não informado". */
export function opcional<T extends z.ZodTypeAny>(esquema: T) {
  return z.preprocess((valor) => (valor === '' || valor === null ? undefined : valor), esquema.optional());
}

export function lerId(valor: unknown): string {
  return idMongo.parse(valor);
}

export function lerPaginacao(consulta: Record<string, unknown>) {
  const pagina = Math.max(1, Number(consulta.pagina) || 1);
  const limite = Math.min(100, Math.max(1, Number(consulta.limite) || 20));
  return { pagina, limite, pular: (pagina - 1) * limite };
}

export function lerTexto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}
