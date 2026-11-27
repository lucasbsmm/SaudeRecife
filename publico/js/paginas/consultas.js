import { api } from '../api.js';
import { html, desenhar } from '../utilitarios.js';
import { cartaoConsulta } from '../componentes/cartaoConsulta.js';
import { vazio } from '../componentes/estados.js';

const LIMITE = 10;

export async function renderizar({ raiz, consulta }) {
  const historico = consulta.get('aba') === 'historico';
  const periodo = historico ? 'historico' : 'proximas';

  desenhar(
    raiz,
    html`
      <h1>Minhas consultas</h1>
      <nav class="abas" aria-label="Tipo de consulta">
        <a href="#/consultas" ${!historico ? html`aria-current="true"` : ''}>Próximas</a>
        <a href="#/consultas?aba=historico" ${historico ? html`aria-current="true"` : ''}>Histórico</a>
      </nav>
      <ul class="lista-consultas" id="lista"></ul>
      <div id="rodape-lista"></div>`,
  );

  const lista = raiz.querySelector('#lista');
  const rodape = raiz.querySelector('#rodape-lista');
  let pagina = 1;

  async function carregar() {
    const { itens, total } = await api.listar('agendamentos', { periodo, pagina, limite: LIMITE });

    if (pagina === 1 && !itens.length) {
      desenhar(
        rodape,
        historico
          ? vazio('Nenhum atendimento no histórico', 'Suas consultas realizadas ou canceladas aparecem aqui.')
          : vazio('Você não tem consultas marcadas', 'Faça a pré-triagem ou escolha uma especialidade para agendar.', html`<a class="botao" href="#/agendar">Agendar consulta</a>`),
      );
      return;
    }

    lista.insertAdjacentHTML('beforeend', itens.map((c) => String(cartaoConsulta(c))).join(''));
    const restantes = total - pagina * LIMITE;
    desenhar(rodape, restantes > 0 ? html`<button type="button" class="botao botao--secundario botao--bloco" id="mais">Carregar mais (${restantes})</button>` : '');
    rodape.querySelector('#mais')?.addEventListener('click', async (evento) => {
      evento.currentTarget.disabled = true;
      pagina += 1;
      await carregar();
    });
  }

  await carregar();
}
