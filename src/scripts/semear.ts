import { hash } from 'bcryptjs';
import mongoose from 'mongoose';
import { ambiente } from '../configuracao/ambiente';
import { conectarBanco, desconectarBanco } from '../configuracao/banco';
import { Agendamento } from '../modelos/Agendamento';
import { Clinica } from '../modelos/Clinica';
import { Disponibilidade } from '../modelos/Disponibilidade';
import { Especialidade } from '../modelos/Especialidade';
import { Paciente } from '../modelos/Paciente';
import { Profissional } from '../modelos/Profissional';
import { Usuario } from '../modelos/Usuario';
import { agoraEmRecife, diaDaSemana, somarDias } from '../utilitarios/datas';

const SENHA_PADRAO = 'Recife@123';

const especialidadesBase = [
  ['Clínica Geral', 'Avaliação inicial e acompanhamento de sintomas variados.'],
  ['Pediatria', 'Saúde de crianças e adolescentes.'],
  ['Pneumologia', 'Doenças dos pulmões e das vias respiratórias.'],
  ['Otorrinolaringologia', 'Nariz, garganta e ouvidos.'],
  ['Neurologia', 'Dores de cabeça, tonturas e outras queixas neurológicas.'],
  ['Ortopedia', 'Ossos, músculos e articulações.'],
  ['Cardiologia', 'Coração e circulação.'],
  ['Dermatologia', 'Pele, cabelos e unhas.'],
] as const;

const clinicasBase = [
  { nome: 'Clínica Santa Helena', telefone: '(81) 3322-1001', logradouro: 'Av. Conselheiro Aguiar', numero: '2500', bairro: 'Boa Viagem', cep: '51020-020' },
  { nome: 'Policlínica da Torre', telefone: '(81) 3322-1002', logradouro: 'Rua Real da Torre', numero: '890', bairro: 'Torre', cep: '50710-000' },
  { nome: 'Centro Médico Casa Forte', telefone: '(81) 3322-1003', logradouro: 'Estrada do Arraial', numero: '1450', bairro: 'Casa Forte', cep: '52060-010' },
  { nome: 'Clínica Várzea Saúde', telefone: '(81) 3322-1004', logradouro: 'Av. Caxangá', numero: '3100', bairro: 'Várzea', cep: '50740-000' },
];

// especialidade, clínicas (índices em clinicasBase), dias da semana, janelas de atendimento
const profissionaisBase = [
  { nome: 'Dra. Luana Martins', crm: '12345', email: 'luana.martins@saude-recife.test', especialidade: 'Clínica Geral', clinicas: [0, 1], dias: [1, 2, 3, 4, 5], janelas: [['09:00', '12:00'], ['14:00', '17:00']] },
  { nome: 'Dr. Rafael Albuquerque', crm: '23456', email: 'rafael.albuquerque@saude-recife.test', especialidade: 'Clínica Geral', clinicas: [2], dias: [1, 3, 5], janelas: [['08:00', '12:00']] },
  { nome: 'Dra. Camila Nogueira', crm: '34567', email: 'camila.nogueira@saude-recife.test', especialidade: 'Pediatria', clinicas: [0, 2], dias: [2, 4], janelas: [['08:30', '12:00'], ['14:00', '16:30']] },
  { nome: 'Dr. Henrique Tavares', crm: '45678', email: 'henrique.tavares@saude-recife.test', especialidade: 'Pneumologia', clinicas: [1], dias: [2, 3, 4], janelas: [['13:30', '18:00']] },
  { nome: 'Dra. Beatriz Cavalcanti', crm: '56789', email: 'beatriz.cavalcanti@saude-recife.test', especialidade: 'Otorrinolaringologia', clinicas: [3], dias: [1, 2, 5], janelas: [['09:00', '12:00']] },
  { nome: 'Dr. Mateus Lins', crm: '67890', email: 'mateus.lins@saude-recife.test', especialidade: 'Neurologia', clinicas: [0], dias: [3, 4], janelas: [['10:00', '13:00']] },
  { nome: 'Dra. Verônica Paes', crm: '78901', email: 'veronica.paes@saude-recife.test', especialidade: 'Ortopedia', clinicas: [3, 1], dias: [1, 4], janelas: [['14:00', '18:00']] },
  { nome: 'Dr. Gustavo Arruda', crm: '89012', email: 'gustavo.arruda@saude-recife.test', especialidade: 'Cardiologia', clinicas: [2], dias: [2, 5], janelas: [['08:00', '11:30']] },
];

function proximoDiaComAtendimento(partida: string, dias: number[], sentido: 1 | -1): string {
  let data = somarDias(partida, sentido);
  while (!dias.includes(diaDaSemana(data))) data = somarDias(data, sentido);
  return data;
}

async function semear() {
  const reiniciar = process.argv.includes('--reiniciar');
  await conectarBanco(ambiente.MONGODB_URI);

  if (await Usuario.exists({})) {
    if (!reiniciar) {
      console.log('O banco já possui dados. Use "npm run semear -- --reiniciar" para apagar tudo e recriar.');
      await desconectarBanco();
      return;
    }
    await mongoose.connection.dropDatabase();
    await Promise.all(mongoose.modelNames().map((nome) => mongoose.model(nome).syncIndexes()));
    console.log('Banco limpo.');
  }

  const senhaHash = await hash(SENHA_PADRAO, 10);

  await Usuario.create({ nome: 'Administração Saúde Recife', email: 'admin@saude-recife.test', senhaHash, perfil: 'administrador' });

  const especialidades = await Especialidade.create(especialidadesBase.map(([nome, descricao]) => ({ nome, descricao })));
  const clinicas = await Clinica.create(
    clinicasBase.map(({ nome, telefone, logradouro, numero, bairro, cep }) => ({
      nome,
      telefone,
      endereco: { logradouro, numero, bairro, cep, cidade: 'Recife', uf: 'PE' },
    })),
  );

  const profissionais = [];
  for (const base of profissionaisBase) {
    const usuario = await Usuario.create({ nome: base.nome, email: base.email, senhaHash, perfil: 'profissional' });
    const especialidade = especialidades.find((e) => e.nome === base.especialidade)!;
    const profissional = await Profissional.create({
      usuario: usuario._id,
      nome: base.nome,
      crm: base.crm,
      especialidade: especialidade._id,
      clinicas: base.clinicas.map((i) => clinicas[i]._id),
    });
    profissionais.push(profissional);

    for (const indiceClinica of base.clinicas) {
      // Quando o profissional atende em mais de uma clínica, cada uma fica com dias diferentes.
      const diasDaClinica = base.clinicas.length > 1 ? base.dias.filter((_, posicao) => posicao % base.clinicas.length === base.clinicas.indexOf(indiceClinica)) : base.dias;
      for (const diaSemana of diasDaClinica) {
        for (const [horaInicio, horaFim] of base.janelas) {
          await Disponibilidade.create({ profissional: profissional._id, clinica: clinicas[indiceClinica]._id, diaSemana, horaInicio, horaFim, duracaoMinutos: 30 });
        }
      }
    }
  }

  const joaoUsuario = await Usuario.create({ nome: 'João da Silva', email: 'joao@saude-recife.test', cpf: '52998224725', senhaHash, perfil: 'paciente' });
  const joao = await Paciente.create({
    usuario: joaoUsuario._id, nome: 'João da Silva', cpf: '52998224725', email: 'joao@saude-recife.test',
    telefone: '81988887777', dataNascimento: '1990-04-12', bairro: 'Boa Viagem',
  });

  const mariaUsuario = await Usuario.create({ nome: 'Maria Silva', email: 'maria@saude-recife.test', cpf: '11144477735', senhaHash, perfil: 'paciente' });
  await Paciente.create({
    usuario: mariaUsuario._id, nome: 'Maria Silva', cpf: '11144477735', email: 'maria@saude-recife.test',
    telefone: '81977776666', dataNascimento: '2008-09-03', bairro: 'Torre',
  });

  // Consultas de exemplo para o João: uma futura e uma já realizada, com a Dra. Luana.
  const luana = profissionais[0];
  const diasLuana = [1, 3, 5]; // dias em que ela atende na Clínica Santa Helena
  const hoje = agoraEmRecife().data;
  const base = { paciente: joao._id, profissional: luana._id, clinica: clinicas[0]._id, especialidade: luana.especialidade };

  await Agendamento.create({ ...base, data: proximoDiaComAtendimento(hoje, diasLuana, 1), hora: '09:00', observacoes: 'Febre e dores no corpo há dois dias.' });
  await Agendamento.create({ ...base, data: proximoDiaComAtendimento(hoje, diasLuana, -1), hora: '10:30', status: 'concluido' });

  console.log('Dados de demonstração criados com sucesso.');
  console.log(`  administrador: admin@saude-recife.test`);
  console.log(`  paciente:      joao@saude-recife.test (ou CPF 529.982.247-25)`);
  console.log(`  profissional:  luana.martins@saude-recife.test`);
  console.log(`  senha de todos: ${SENHA_PADRAO}`);

  await desconectarBanco();
}

semear().catch(async (erro) => {
  console.error('Falha ao semear o banco:', erro.message);
  await desconectarBanco().catch(() => undefined);
  process.exit(1);
});
