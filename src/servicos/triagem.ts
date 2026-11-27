import { z } from 'zod';
import { Especialidade } from '../modelos/Especialidade';
import { Profissional } from '../modelos/Profissional';

export const SINTOMAS = [
  'dor-de-cabeca',
  'tosse',
  'febre',
  'dor-no-corpo',
  'dificuldade-para-respirar',
  'nariz-entupido',
  'outro',
] as const;
export type Sintoma = (typeof SINTOMAS)[number];

export const ROTULOS_SINTOMAS: Record<Sintoma, string> = {
  'dor-de-cabeca': 'Dor de cabeça',
  tosse: 'Tosse',
  febre: 'Febre',
  'dor-no-corpo': 'Dores no corpo',
  'dificuldade-para-respirar': 'Dificuldade para respirar',
  'nariz-entupido': 'Nariz entupido',
  outro: 'Outro sintoma',
};

export const esquemaTriagem = z.object({
  sintomas: z.array(z.enum(SINTOMAS)).min(1, 'Selecione ao menos um sintoma.').max(SINTOMAS.length),
  intensidade: z.enum(['leve', 'moderada', 'intensa']).default('leve'),
  diasDeSintomas: z.number().int().min(0).max(90).default(1),
  temperatura: z.number().min(34).max(43).optional(),
});
export type DadosTriagem = z.infer<typeof esquemaTriagem>;

export type Classificacao = 'rotina' | 'prioritario' | 'urgente';

const PESOS: Record<Sintoma, number> = {
  'dor-de-cabeca': 1,
  tosse: 1,
  febre: 2,
  'dor-no-corpo': 1,
  'dificuldade-para-respirar': 3,
  'nariz-entupido': 0,
  outro: 1,
};

const OBSERVACOES: Record<Classificacao, string> = {
  urgente: 'Seus sintomas podem exigir atendimento imediato. Procure uma unidade de urgência ou ligue para o SAMU (192).',
  prioritario: 'Apresentando sintomas que requerem avaliação médica em breve. Agende o quanto antes.',
  rotina: 'Seus sintomas parecem leves. Agende uma consulta de rotina se eles persistirem.',
};

/**
 * Classificação simples por pontos. Serve apenas para orientar o paciente
 * e priorizar o agendamento — não substitui avaliação médica.
 */
export function classificar(dados: DadosTriagem): { classificacao: Classificacao; observacao: string } {
  let pontos = dados.sintomas.reduce((total, sintoma) => total + PESOS[sintoma], 0);

  if (dados.intensidade === 'intensa') pontos += 2;
  else if (dados.intensidade === 'moderada') pontos += 1;

  if (dados.diasDeSintomas >= 5) pontos += 1;
  if (dados.temperatura !== undefined) {
    if (dados.temperatura >= 39) pontos += 2;
    else if (dados.temperatura >= 37.8) pontos += 1;
  }

  const faltaDeAr = dados.sintomas.includes('dificuldade-para-respirar');
  let classificacao: Classificacao = 'rotina';
  if (pontos >= 8 || (faltaDeAr && dados.intensidade !== 'leve')) classificacao = 'urgente';
  else if (pontos >= 3) classificacao = 'prioritario';

  return { classificacao, observacao: OBSERVACOES[classificacao] };
}

const SUGESTOES: Partial<Record<Sintoma, { nome: string; motivo: string }[]>> = {
  tosse: [{ nome: 'Pneumologia', motivo: 'Tosse persistente pode ter causa respiratória.' }],
  'dificuldade-para-respirar': [{ nome: 'Pneumologia', motivo: 'Avaliação da respiração e dos pulmões.' }],
  'nariz-entupido': [{ nome: 'Otorrinolaringologia', motivo: 'Cuida de nariz, garganta e ouvidos.' }],
  'dor-de-cabeca': [{ nome: 'Neurologia', motivo: 'Dores de cabeça frequentes ou intensas.' }],
  'dor-no-corpo': [{ nome: 'Ortopedia', motivo: 'Dores musculares e nas articulações.' }],
};

export async function recomendarEspecialidades(dados: DadosTriagem, idade?: number) {
  const sugeridas: { nome: string; motivo: string }[] = [
    { nome: 'Clínica Geral', motivo: 'Indicada para a avaliação inicial de sintomas variados.' },
  ];

  if (idade !== undefined && idade < 18) {
    sugeridas.unshift({ nome: 'Pediatria', motivo: 'Acompanhamento da saúde de crianças e adolescentes.' });
  }
  for (const sintoma of dados.sintomas) {
    for (const sugestao of SUGESTOES[sintoma] ?? []) {
      if (!sugeridas.some((s) => s.nome === sugestao.nome)) sugeridas.push(sugestao);
    }
  }

  const comProfissionais = await Profissional.distinct('especialidade', { ativo: true });
  const encontradas = await Especialidade.find({
    nome: { $in: sugeridas.map((s) => s.nome) },
    _id: { $in: comProfissionais },
  });

  return sugeridas.flatMap((sugestao) => {
    const especialidade = encontradas.find((e) => e.nome === sugestao.nome);
    return especialidade ? [{ id: String(especialidade._id), nome: especialidade.nome, motivo: sugestao.motivo }] : [];
  });
}
