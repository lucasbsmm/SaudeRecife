import { Schema } from 'mongoose';

/** Padroniza a saída JSON dos modelos: `_id` vira `id` e campos internos são omitidos. */
export function configurarSaidaJson(esquema: Schema, camposOcultos: string[] = []): void {
  esquema.set('toJSON', {
    versionKey: false,
    transform(_documento, retorno: Record<string, unknown>) {
      retorno.id = String(retorno._id);
      delete retorno._id;
      delete retorno.textoBusca;
      for (const campo of camposOcultos) delete retorno[campo];
      return retorno;
    },
  });
}
