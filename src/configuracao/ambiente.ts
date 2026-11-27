import 'dotenv/config';
import { z } from 'zod';

const emProducao = process.env.NODE_ENV === 'production';

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORTA: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/saude_recife'),
  JWT_SEGREDO: emProducao
    ? z.string().min(32, 'JWT_SEGREDO precisa ter ao menos 32 caracteres em produção')
    : z.string().min(16).default('segredo-somente-para-desenvolvimento'),
  JWT_EXPIRACAO: z.string().default('8h'),
});

const leitura = esquema.safeParse(process.env);

if (!leitura.success) {
  console.error('Variáveis de ambiente inválidas:');
  for (const problema of leitura.error.issues) {
    console.error(` - ${problema.path.join('.')}: ${problema.message}`);
  }
  process.exit(1);
}

export const ambiente = leitura.data;
