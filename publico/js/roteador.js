import { estaAutenticado, obterUsuario } from './sessao.js';
import { desenharCabecalho, definirTitulo } from './componentes/cabecalho.js';
import { desenharNavegacao } from './componentes/navegacao.js';
import { carregando, falha } from './componentes/estados.js';
import { desenhar } from './utilitarios.js';

const TODOS = ['paciente', 'profissional', 'administrador'];

const rotas = [
  { caminho: '/bem-vindo', pagina: 'bemVindo', publica: true },
  { caminho: '/entrar', pagina: 'entrar', publica: true },
  { caminho: '/cadastro', pagina: 'cadastro', publica: true },

  { caminho: '/inicio', pagina: 'inicio', perfis: ['paciente'], titulo: 'Saúde Recife' },
  { caminho: '/triagem', pagina: 'triagem', perfis: ['paciente'], titulo: 'Pré-triagem', voltar: '/inicio' },
  { caminho: '/triagem/resultado', pagina: 'triagemResultado', perfis: ['paciente'], titulo: 'Resultado', voltar: '/triagem' },
  { caminho: '/agendar', pagina: 'agendar', perfis: ['paciente'], titulo: 'Agendar consulta', voltar: '/inicio' },
  { caminho: '/agendar/clinica', pagina: 'agendarClinica', perfis: ['paciente'], titulo: 'Escolha a clínica', voltar: '/agendar' },
  { caminho: '/agendar/profissional', pagina: 'agendarProfissional', perfis: ['paciente'], titulo: 'Escolha o profissional', voltar: '/agendar/clinica' },
  { caminho: '/agendar/horario', pagina: 'agendarHorario', perfis: ['paciente'], titulo: 'Escolha o horário', voltar: '/agendar/profissional' },
  { caminho: '/agendar/confirmar', pagina: 'agendarConfirmar', perfis: ['paciente'], titulo: 'Confirmar consulta', voltar: '/agendar/horario' },
  { caminho: '/consultas', pagina: 'consultas', perfis: ['paciente'], titulo: 'Minhas consultas' },
  { caminho: '/consultas/:id', pagina: 'consultaDetalhe', perfis: TODOS, titulo: 'Detalhes da consulta', voltar: true },

  { caminho: '/agenda', pagina: 'agendaProfissional', perfis: ['profissional'], titulo: 'Minha agenda' },
  { caminho: '/disponibilidade', pagina: 'disponibilidade', perfis: ['profissional'], titulo: 'Disponibilidade' },

  { caminho: '/admin', pagina: 'admin/painel', perfis: ['administrador'], titulo: 'Painel administrativo' },
  { caminho: '/admin/:recurso', pagina: 'admin/recurso', perfis: ['administrador'], titulo: 'Cadastros', voltar: '/admin' },

  { caminho: '/perfil', pagina: 'perfil', perfis: TODOS, titulo: 'Meu perfil' },
];

const INICIAL_POR_PERFIL = { paciente: '/inicio', profissional: '/agenda', administrador: '/admin' };

export const rotaInicial = (usuario) => (usuario ? INICIAL_POR_PERFIL[usuario.perfil] : '/bem-vindo');

export function irPara(caminho, { substituir = false } = {}) {
  const destino = `#${caminho}`;
  if (substituir) window.location.replace(destino);
  else window.location.hash = destino;
}

function lerLocalizacao() {
  const [caminhoBruto, consultaBruta = ''] = window.location.hash.slice(1).split('?');
  return { caminho: caminhoBruto.replace(/\/+$/, '') || '/', consulta: new URLSearchParams(consultaBruta) };
}

function encontrarRota(caminho) {
  for (const rota of rotas) {
    const nomes = [];
    const padrao = new RegExp(`^${rota.caminho.replace(/:(\w+)/g, (_, nome) => (nomes.push(nome), '([^/]+)'))}$`);
    const resultado = caminho.match(padrao);
    if (resultado) {
      const parametros = Object.fromEntries(nomes.map((nome, i) => [nome, decodeURIComponent(resultado[i + 1])]));
      return { rota, parametros };
    }
  }
  return null;
}

const aplicativo = () => document.getElementById('aplicativo');
const raiz = () => document.getElementById('conteudo');
let numeroNavegacao = 0;

async function navegar() {
  const numero = ++numeroNavegacao;
  const { caminho, consulta } = lerLocalizacao();
  const usuario = estaAutenticado() ? obterUsuario() : null;
  const encontrada = encontrarRota(caminho);

  // Redirecionamentos de acesso
  if (!encontrada) return irPara(rotaInicial(usuario), { substituir: true });
  const { rota, parametros } = encontrada;

  if (!rota.publica && !usuario) {
    const retorno = caminho !== '/' ? `?retorno=${encodeURIComponent(caminho)}` : '';
    return irPara(`/entrar${retorno}`, { substituir: true });
  }
  if (rota.publica && usuario) return irPara(rotaInicial(usuario), { substituir: true });
  if (rota.perfis && !rota.perfis.includes(usuario.perfil)) return irPara(rotaInicial(usuario), { substituir: true });

  // Layout
  aplicativo().dataset.modo = rota.publica ? 'publico' : 'interno';
  if (!rota.publica) {
    desenharCabecalho({ titulo: rota.titulo, voltar: rota.voltar });
    desenharNavegacao(usuario, caminho);
  } else {
    document.title = 'Saúde Recife';
  }

  const principal = raiz();

  const carregarPagina = async () => {
    // Cada renderização usa um contêiner novo, para que os eventos da tela anterior sejam descartados.
    const area = document.createElement('div');
    area.className = 'pagina';
    desenhar(area, carregando());
    principal.replaceChildren(area);

    try {
      const modulo = await import(`./paginas/${rota.pagina}.js`);
      if (numero !== numeroNavegacao) return;
      await modulo.renderizar({
        raiz: area,
        parametros,
        consulta,
        usuario: obterUsuario(),
        definirTitulo,
        atualizar: carregarPagina,
      });
    } catch (erro) {
      if (numero !== numeroNavegacao) return;
      console.error(erro);
      desenhar(area, falha(erro.message || 'Ocorreu um erro inesperado.'));
      area.querySelector('[data-acao="tentar-novamente"]')?.addEventListener('click', carregarPagina);
    }
    if (numero !== numeroNavegacao) return;
    window.scrollTo(0, 0);
    const titulo = area.querySelector('h1');
    titulo?.setAttribute('tabindex', '-1');
    (titulo ?? principal).focus({ preventScroll: true });
  };

  await carregarPagina();
}

export function iniciarRoteador() {
  document.getElementById('barra-superior').addEventListener('click', (evento) => {
    if (!evento.target.closest('[data-voltar]')) return;
    const { caminho } = lerLocalizacao();
    const rota = encontrarRota(caminho)?.rota;
    if (typeof rota?.voltar === 'string') irPara(rota.voltar);
    else if (window.history.length > 1) window.history.back();
    else irPara(rotaInicial(obterUsuario()));
  });

  window.addEventListener('hashchange', navegar);
  if (!window.location.hash || window.location.hash === '#/') {
    irPara(rotaInicial(estaAutenticado() ? obterUsuario() : null), { substituir: true });
  } else {
    navegar();
  }
}
