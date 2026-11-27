import { encerrarSessao, obterToken } from './sessao.js';

const BASE = '/api';

export class ErroApi extends Error {
  constructor(mensagem, status = 0, detalhes = []) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.detalhes = detalhes ?? [];
  }
}

function montarUrl(caminho, consulta) {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(consulta ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(chave, valor);
  }
  const texto = parametros.toString();
  return `${BASE}${caminho}${texto ? `?${texto}` : ''}`;
}

async function requisitar(metodo, caminho, { corpo, consulta, publica = false } = {}) {
  const cabecalhos = { Accept: 'application/json' };
  if (corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  const token = obterToken();
  if (token && !publica) cabecalhos.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(montarUrl(caminho, consulta), {
      method: metodo,
      headers: cabecalhos,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.');
  }

  if (resposta.status === 204) return null;

  let dados = null;
  try {
    dados = await resposta.json();
  } catch {
    /* resposta sem corpo JSON */
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && !publica) {
      encerrarSessao();
      window.location.hash = '#/entrar';
    }
    throw new ErroApi(dados?.mensagem ?? 'Não foi possível concluir a operação.', resposta.status, dados?.detalhes);
  }
  return dados;
}

export const api = {
  // autenticação
  entrar: (corpo) => requisitar('POST', '/autenticacao/entrar', { corpo, publica: true }),
  cadastrar: (corpo) => requisitar('POST', '/autenticacao/cadastrar', { corpo, publica: true }),
  usuarioAtual: () => requisitar('GET', '/autenticacao/eu'),
  alterarSenha: (corpo) => requisitar('PUT', '/autenticacao/senha', { corpo }),

  // CRUD genérico: especialidades, clinicas, profissionais, pacientes, disponibilidades
  listar: (recurso, consulta) => requisitar('GET', `/${recurso}`, { consulta }),
  obter: (recurso, id) => requisitar('GET', `/${recurso}/${id}`),
  criar: (recurso, corpo) => requisitar('POST', `/${recurso}`, { corpo }),
  atualizar: (recurso, id, corpo) => requisitar('PUT', `/${recurso}/${id}`, { corpo }),
  remover: (recurso, id) => requisitar('DELETE', `/${recurso}/${id}`),

  // operações específicas
  triagem: (corpo) => requisitar('POST', '/triagem', { corpo }),
  agenda: (profissionalId, consulta) => requisitar('GET', `/profissionais/${profissionalId}/agenda`, { consulta }),
  cancelarConsulta: (id, motivo) => requisitar('PATCH', `/agendamentos/${id}/cancelar`, { corpo: { motivo } }),
  concluirConsulta: (id) => requisitar('PATCH', `/agendamentos/${id}/concluir`, { corpo: {} }),
  resumoAdministracao: () => requisitar('GET', '/administracao/resumo'),
};
