import { api } from '../../api.js';
import { irPara } from '../../roteador.js';
import { html, desenhar, debounce } from '../../utilitarios.js';
import { icone } from '../../icones.js';
import { avisar } from '../../componentes/avisos.js';
import { abrirFormulario, confirmar } from '../../componentes/dialogo.js';
import { vazio } from '../../componentes/estados.js';
import { recursos } from './recursos.js';

const LIMITE = 20;

function itemDaLista(recurso, item) {
  const { titulo, linhas = [], selo } = recurso.descrever(item);
  const corpo = html`
    <span class="registro__titulo">${titulo}</span>
    ${linhas.filter(Boolean).map((linha) => html`<span class="registro__linha">${linha}</span>`)}`;

  const seloHtml = selo ? html`<span class="selo selo--${selo.classe}">${selo.texto}</span>` : '';

  if (recurso.ligacao) {
    return html`<li><a class="registro registro--link" href="${recurso.ligacao(item)}"><span class="registro__texto">${corpo}</span>${seloHtml}</a></li>`;
  }

  const podeRemover = !(recurso.remocaoDesativa && item.ativo === false);
  return html`
    <li class="registro">
      <div class="registro__texto">${corpo}${seloHtml}</div>
      <div class="registro__acoes">
        <button type="button" class="botao botao--secundario botao--pequeno" data-editar="${item.id}">${icone('editar', 16)} Editar<span class="so-leitor"> ${titulo}</span></button>
        ${podeRemover
          ? html`<button type="button" class="botao botao--perigo-contorno botao--pequeno" data-remover="${item.id}">${icone('lixeira', 16)} ${recurso.rotuloRemover}<span class="so-leitor"> ${titulo}</span></button>`
          : ''}
      </div>
    </li>`;
}

export async function renderizar({ raiz, parametros, definirTitulo }) {
  const recurso = recursos[parametros.recurso];
  if (!recurso) return irPara('/admin', { substituir: true });
  definirTitulo(recurso.titulo);

  const paginado = recurso.paginado !== false;
  const consulta = { pagina: 1, busca: '', filtros: {} };
  let itens = [];

  desenhar(
    raiz,
    html`
      <header class="cabecalho-pagina">
        <h1>${recurso.titulo}</h1>
        ${recurso.somenteLeitura ? '' : html`<button type="button" class="botao botao--pequeno" data-novo>${icone('mais', 18)} Novo<span class="so-leitor"> ${recurso.singular}</span></button>`}
      </header>

      ${recurso.busca || recurso.filtros
        ? html`
            <form class="filtros" role="search" novalidate>
              ${recurso.busca
                ? html`<div class="campo campo--busca"><label for="busca" class="so-leitor">${recurso.rotuloBusca ?? 'Buscar por nome'}</label><input id="busca" type="search" placeholder="${recurso.rotuloBusca ?? 'Buscar por nome'}" autocomplete="off"></div>`
                : ''}
              ${(recurso.filtros ?? []).map((f) =>
                f.opcoes
                  ? html`<div class="campo"><label for="filtro-${f.nome}">${f.rotulo}</label><select id="filtro-${f.nome}" data-filtro="${f.nome}"><option value="">Todas</option>${f.opcoes.map((o) => html`<option value="${o.valor}">${o.rotulo}</option>`)}</select></div>`
                  : html`<div class="campo"><label for="filtro-${f.nome}">${f.rotulo}</label><input id="filtro-${f.nome}" type="date" data-filtro="${f.nome}"></div>`,
              )}
            </form>`
        : ''}

      <p class="texto-suave" id="contagem" aria-live="polite"></p>
      <ul class="lista-registros" id="lista"></ul>
      <div id="area-vazia"></div>
      <div class="paginacao" id="paginacao"></div>`,
  );

  const lista = raiz.querySelector('#lista');
  const contagem = raiz.querySelector('#contagem');
  const paginacao = raiz.querySelector('#paginacao');
  const areaVazia = raiz.querySelector('#area-vazia');

  async function carregar() {
    const parametrosApi = { ...consulta.filtros, [recurso.parametroBusca ?? 'busca']: consulta.busca };
    if (paginado) Object.assign(parametrosApi, { pagina: consulta.pagina, limite: LIMITE });

    const resposta = await api.listar(recurso.endpoint, parametrosApi);
    itens = resposta.itens;

    if (!itens.length) {
      const filtrando = consulta.busca || Object.values(consulta.filtros).some(Boolean);
      desenhar(lista, '');
      desenhar(paginacao, '');
      contagem.textContent = '';
      desenhar(areaVazia, vazio('Nada por aqui', filtrando ? 'Nenhum registro corresponde à busca.' : `Ainda não há registros de ${recurso.titulo.toLowerCase()}.`));
      return;
    }
    desenhar(areaVazia, '');

    contagem.textContent = `${resposta.total} ${resposta.total === 1 ? 'registro' : 'registros'}`;
    desenhar(lista, itens.map((item) => itemDaLista(recurso, item)));

    const totalPaginas = Math.ceil(resposta.total / LIMITE);
    desenhar(
      paginacao,
      paginado && totalPaginas > 1
        ? html`
            <button type="button" class="botao botao--secundario botao--pequeno" data-pagina="-1" ${consulta.pagina <= 1 ? html`disabled` : ''}>Anterior</button>
            <span>Página ${consulta.pagina} de ${totalPaginas}</span>
            <button type="button" class="botao botao--secundario botao--pequeno" data-pagina="1" ${consulta.pagina >= totalPaginas ? html`disabled` : ''}>Próxima</button>`
        : '',
    );
  }

  async function recarregar() {
    try {
      await carregar();
    } catch (erro) {
      avisar(erro.message, 'erro');
    }
  }

  const abrirEdicao = (item) => {
    const valoresIniciais = recurso.deItem ? recurso.deItem(item) : item;
    return abrirFormulario({
      titulo: `Editar ${recurso.singular}`,
      campos: recurso.campos.filter((c) => !c.somenteCriacao),
      valores: valoresIniciais,
      aoEnviar: async (valores) => {
        await api.atualizar(recurso.endpoint, item.id, valores);
        avisar('Alterações salvas.', 'sucesso');
        await recarregar();
      },
    });
  };

  raiz.querySelector('[data-novo]')?.addEventListener('click', () =>
    abrirFormulario({
      titulo: `Nov${recurso.singular.endsWith('a') ? 'a' : 'o'} ${recurso.singular}`,
      campos: recurso.campos.filter((c) => !c.somenteEdicao),
      valores: structuredClone(recurso.valoresPadrao ?? {}),
      textoEnviar: 'Cadastrar',
      aoEnviar: async (valores) => {
        await api.criar(recurso.endpoint, valores);
        avisar('Cadastro realizado.', 'sucesso');
        consulta.pagina = 1;
        await recarregar();
      },
    }),
  );

  raiz.addEventListener('click', async (evento) => {
    const editar = evento.target.closest('[data-editar]');
    if (editar) return abrirEdicao(itens.find((i) => i.id === editar.dataset.editar));

    const remover = evento.target.closest('[data-remover]');
    if (remover) {
      const item = itens.find((i) => i.id === remover.dataset.remover);
      const nome = recurso.descrever(item).titulo;
      const ok = await confirmar({
        titulo: `${recurso.rotuloRemover} ${recurso.singular}`,
        mensagem: recurso.remocaoDesativa
          ? `${nome} deixará de aparecer para novos agendamentos. O histórico é mantido e o cadastro pode ser reativado depois.`
          : `Tem certeza de que deseja excluir "${nome}"? Esta ação não pode ser desfeita.`,
        textoConfirmar: recurso.rotuloRemover,
        perigo: true,
      });
      if (!ok) return;
      try {
        await api.remover(recurso.endpoint, item.id);
        avisar(recurso.remocaoDesativa ? 'Cadastro desativado.' : 'Registro excluído.', 'sucesso');
        await recarregar();
      } catch (erro) {
        avisar(erro.message, 'erro');
      }
      return;
    }

    const pagina = evento.target.closest('[data-pagina]');
    if (pagina) {
      consulta.pagina += Number(pagina.dataset.pagina);
      await recarregar();
    }
  });

  raiz.querySelector('#busca')?.addEventListener(
    'input',
    debounce(async (evento) => {
      consulta.busca = evento.target.value.trim();
      consulta.pagina = 1;
      await recarregar();
    }, 350),
  );
  raiz.querySelectorAll('[data-filtro]').forEach((campo) =>
    campo.addEventListener('change', async () => {
      consulta.filtros[campo.dataset.filtro] = campo.value;
      consulta.pagina = 1;
      await recarregar();
    }),
  );

  await carregar();
}
