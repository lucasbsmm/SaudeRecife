import { z } from 'zod';

// Traduz as mensagens padrão de validação do zod para português.
z.setErrorMap((erro, contexto) => {
  switch (erro.code) {
    case z.ZodIssueCode.invalid_type:
      return { message: erro.received === 'undefined' ? 'Campo obrigatório.' : 'Valor em formato inválido.' };
    case z.ZodIssueCode.too_small:
      if (erro.type === 'string') {
        return { message: erro.minimum === 1 ? 'Campo obrigatório.' : `Informe ao menos ${erro.minimum} caracteres.` };
      }
      if (erro.type === 'array') return { message: `Selecione ao menos ${erro.minimum} item.` };
      return { message: `O valor mínimo é ${erro.minimum}.` };
    case z.ZodIssueCode.too_big:
      if (erro.type === 'string') return { message: `Use no máximo ${erro.maximum} caracteres.` };
      return { message: `O valor máximo é ${erro.maximum}.` };
    case z.ZodIssueCode.invalid_string:
      if (erro.validation === 'email') return { message: 'E-mail inválido.' };
      return { message: 'Formato inválido.' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Valor não permitido.' };
    default:
      return { message: contexto.defaultError };
  }
});
