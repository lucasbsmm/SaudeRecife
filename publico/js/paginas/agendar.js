import { api } from '../api.js';
import { estado, reiniciarAgendamento } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar } from '../utilitarios.js';
import { etapasAgendamento } from '../componentes/etapas.js';
import { vazio } from '../componentes/estados.js';

function itemEspecialidade(especialidade, texto = especialidade.descricao) {
  return html`
    <li>
      <button type="button" class="opcao" data-id="${especialidade.id}" data-nome="${especialidade.nome}">
        <span class="opcao__titulo">${especialidade.nome}</span>
        ${texto ? html`<span class="opcao__texto">${texto}</span>` : ''}
      </button>
    </li>`;
}

export async function renderizar({ raiz }) {
  const { itens: especialidades } = await api.listar('especialidades', { disponiveis: true });
  const recomendadas = estado.triagem?.resultado.especialidades ?? [];

  desenhar(
    raiz,
    html`
      ${etapasAgendamento(1)}
      <h1>Qual especialidade você procura?</h1>

      ${recomendadas.length
        ? html`
            <section class="secao" aria-labelledby="titulo-recomendadas">
              <h2 id="titulo-recomendadas">Indicadas pela sua pré-triagem</h2>
              <ul class="lista-opcoes">${recomendadas.map((e) => itemEspecialidade(e, e.motivo))}</ul>
            </section>`
        : ''}

      <section class="secao" aria-labelledby="titulo-todas">
        <h2 id="titulo-todas">${recomendadas.length ? 'Todas as especialidades' : 'Especialidades disponíveis'}</h2>
        <div class="campo campo--busca">
          <label for="filtro" class="so-leitor">Filtrar especialidades</label>
          <input id="filtro" type="search" placeholder="Filtrar por nome" autocomplete="off">
        </div>
        <ul class="lista-opcoes" id="lista-especialidades"></ul>
        <p class="texto-suave" id="sem-resultado" hidden>Nenhuma especialidade encontrada com esse nome.</p>
      </section>`,
  );

  if (!especialidades.length) {
    desenhar(raiz, vazio('Ainda não há especialidades disponíveis', 'Volte mais tarde ou fale com a administração do serviço.'));
    return;
  }

  const lista = raiz.querySelector('#lista-especialidades');
  const semResultado = raiz.querySelector('#sem-resultado');
  const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function mostrar(filtro = '') {
    const termo = semAcento(filtro.trim());
    const visiveis = especialidades.filter((e) => semAcento(e.nome).includes(termo));
    lista.innerHTML = visiveis.map((e) => String(itemEspecialidade(e))).join('');
    semResultado.hidden = visiveis.length > 0;
  }
  mostrar();

  raiz.querySelector('#filtro').addEventListener('input', (evento) => mostrar(evento.target.value));
  raiz.addEventListener('click', (evento) => {
    const botao = evento.target.closest('.opcao');
    if (!botao) return;
    reiniciarAgendamento();
    estado.agendamento = { especialidade: { id: botao.dataset.id, nome: botao.dataset.nome } };
    irPara('/agendar/clinica');
  });
}
