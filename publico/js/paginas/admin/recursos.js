import { api } from '../../api.js';
import { enderecoCompleto, formatarCpf, formatarDataCurta, formatarTelefone, hojeEmRecife, nomesDiasSemana, rotulosStatus } from '../../utilitarios.js';

const opcoesDe = (recurso, rotulo = (item) => item.nome) => async () => {
  const { itens } = await api.listar(recurso, { limite: 100 });
  return itens.map((item) => ({ valor: item.id, rotulo: rotulo(item) }));
};

const opcoesDeClinicasDoProfissional = async (valores) => {
  if (!valores.profissional) return [];
  const profissional = await api.obter('profissionais', valores.profissional);
  return profissional.clinicas.map((c) => ({ valor: c.id, rotulo: c.nome }));
};

const seloInativo = (item) => (item.ativo === false ? { texto: 'Inativo', classe: 'cancelado' } : null);

/**
 * Cada cadastro da área administrativa é descrito aqui; a tela (recurso.js) é genérica.
 * - campos: formulário de criação/edição (somenteCriacao / somenteEdicao filtram por modo)
 * - descrever: como cada registro aparece na lista
 */
export const recursos = {
  especialidades: {
    titulo: 'Especialidades',
    singular: 'especialidade',
    endpoint: 'especialidades',
    paginado: false,
    busca: true,
    rotuloRemover: 'Excluir',
    descrever: (e) => ({ titulo: e.nome, linhas: [e.descricao] }),
    campos: [
      { nome: 'nome', rotulo: 'Nome', obrigatorio: true },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'area', maximo: 300 },
    ],
  },

  clinicas: {
    titulo: 'Clínicas',
    singular: 'clínica',
    endpoint: 'clinicas',
    busca: true,
    rotuloRemover: 'Excluir',
    valoresPadrao: { ativo: true, endereco: { cidade: 'Recife', uf: 'PE' } },
    descrever: (c) => ({ titulo: c.nome, linhas: [enderecoCompleto(c.endereco), c.telefone], selo: seloInativo(c) }),
    campos: [
      { nome: 'nome', rotulo: 'Nome da clínica', obrigatorio: true },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'telefone' },
      { nome: 'endereco.logradouro', rotulo: 'Rua ou avenida', obrigatorio: true, autocomplete: 'off' },
      { nome: 'endereco.numero', rotulo: 'Número' },
      { nome: 'endereco.bairro', rotulo: 'Bairro', obrigatorio: true },
      { nome: 'endereco.cidade', rotulo: 'Cidade', obrigatorio: true },
      { nome: 'endereco.uf', rotulo: 'UF', obrigatorio: true },
      { nome: 'endereco.cep', rotulo: 'CEP', tipo: 'cep' },
      { nome: 'ativo', rotulo: 'Clínica ativa (aparece para agendamento)', tipo: 'caixa' },
    ],
  },

  profissionais: {
    titulo: 'Profissionais',
    singular: 'profissional',
    endpoint: 'profissionais',
    busca: true,
    rotuloBusca: 'Buscar por nome',
    parametroBusca: 'nome',
    rotuloRemover: 'Desativar',
    remocaoDesativa: true,
    valoresPadrao: { ativo: true, clinicas: [] },
    descrever: (p) => ({
      titulo: p.nome,
      linhas: [`${p.especialidade?.nome ?? ''}, CRM ${p.crm}`, (p.clinicas ?? []).map((c) => c.nome).join(', ') || 'Sem clínica associada'],
      selo: seloInativo(p),
    }),
    deItem: (p) => ({ nome: p.nome, crm: p.crm, especialidade: p.especialidade?.id, clinicas: (p.clinicas ?? []).map((c) => c.id), ativo: p.ativo }),
    campos: [
      { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
      { nome: 'crm', rotulo: 'CRM', obrigatorio: true },
      { nome: 'especialidade', rotulo: 'Especialidade', tipo: 'selecao', obrigatorio: true, carregarOpcoes: opcoesDe('especialidades') },
      { nome: 'clinicas', rotulo: 'Clínicas onde atende', tipo: 'multipla', carregarOpcoes: opcoesDe('clinicas') },
      { nome: 'email', rotulo: 'E-mail de acesso', tipo: 'email', somenteCriacao: true, ajuda: 'Preencha e-mail e senha para criar o login do profissional.' },
      { nome: 'senha', rotulo: 'Senha inicial', tipo: 'senha', somenteCriacao: true },
      { nome: 'ativo', rotulo: 'Profissional ativo', tipo: 'caixa' },
    ],
  },

  pacientes: {
    titulo: 'Pacientes',
    singular: 'paciente',
    endpoint: 'pacientes',
    busca: true,
    rotuloBusca: 'Buscar por nome, CPF ou e-mail',
    rotuloRemover: 'Desativar',
    remocaoDesativa: true,
    descrever: (p) => ({ titulo: p.nome, linhas: [`CPF ${formatarCpf(p.cpf)}`, p.telefone ? formatarTelefone(p.telefone) : p.email], selo: seloInativo(p) }),
    campos: [
      { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true },
      { nome: 'cpf', rotulo: 'CPF', tipo: 'cpf', obrigatorio: true, somenteCriacao: true },
      { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true },
      { nome: 'telefone', rotulo: 'Telefone com DDD', tipo: 'telefone' },
      { nome: 'dataNascimento', rotulo: 'Data de nascimento', tipo: 'data', obrigatorio: true, maximo: hojeEmRecife() },
      { nome: 'bairro', rotulo: 'Bairro' },
      { nome: 'senha', rotulo: 'Senha inicial', tipo: 'senha', obrigatorio: true, somenteCriacao: true },
      { nome: 'ativo', rotulo: 'Cadastro ativo', tipo: 'caixa', somenteEdicao: true },
    ],
  },

  disponibilidades: {
    titulo: 'Disponibilidades',
    singular: 'disponibilidade',
    endpoint: 'disponibilidades',
    paginado: false,
    rotuloRemover: 'Excluir',
    valoresPadrao: { duracaoMinutos: 30 },
    descrever: (d) => ({
      titulo: d.profissional?.nome ?? 'Profissional',
      linhas: [`${nomesDiasSemana[d.diaSemana]}, ${d.horaInicio} às ${d.horaFim}`, `${d.clinica?.nome ?? ''}, consultas de ${d.duracaoMinutos} min`],
    }),
    deItem: (d) => ({ profissional: d.profissional?.id, clinica: d.clinica?.id, diaSemana: d.diaSemana, horaInicio: d.horaInicio, horaFim: d.horaFim, duracaoMinutos: d.duracaoMinutos }),
    campos: [
      { nome: 'profissional', rotulo: 'Profissional', tipo: 'selecao', obrigatorio: true, somenteCriacao: true, carregarOpcoes: opcoesDe('profissionais') },
      { nome: 'clinica', rotulo: 'Clínica', tipo: 'selecao', obrigatorio: true, dependeDe: 'profissional', carregarOpcoes: opcoesDeClinicasDoProfissional },
      { nome: 'diaSemana', rotulo: 'Dia da semana', tipo: 'selecao', obrigatorio: true, converter: 'numero', opcoes: nomesDiasSemana.map((rotulo, valor) => ({ valor, rotulo })) },
      { nome: 'horaInicio', rotulo: 'Início', tipo: 'hora', obrigatorio: true },
      { nome: 'horaFim', rotulo: 'Fim', tipo: 'hora', obrigatorio: true },
      { nome: 'duracaoMinutos', rotulo: 'Duração da consulta (minutos)', tipo: 'numero', obrigatorio: true, minimo: 10, maximo: 240, passo: 5 },
    ],
  },

  agendamentos: {
    titulo: 'Consultas',
    singular: 'consulta',
    endpoint: 'agendamentos',
    somenteLeitura: true,
    ligacao: (a) => `#/consultas/${a.id}`,
    filtros: [
      { nome: 'status', rotulo: 'Situação', opcoes: Object.entries(rotulosStatus).map(([valor, rotulo]) => ({ valor, rotulo })) },
      { nome: 'data', rotulo: 'Data', tipo: 'data' },
    ],
    descrever: (a) => ({
      titulo: `${formatarDataCurta(a.data)} às ${a.hora}`,
      linhas: [`${a.paciente?.nome} com ${a.profissional?.nome}`, `${a.especialidade?.nome}, ${a.clinica?.nome}`],
      selo: { texto: rotulosStatus[a.status], classe: a.status },
    }),
  },
};
