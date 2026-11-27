import { api } from '../api.js';
import { html, desenhar, hojeEmRecife, somarDias, formatarDataCompleta } from '../utilitarios.js';
import { icone } from '../icones.js';
import { cartaoConsulta } from '../componentes/cartaoConsulta.js';
import { vazio } from '../componentes/estados.js';

export async function renderizar({ raiz, consulta }) {
  const hoje = hojeEmRecife();
  const dataParam = consulta.get('data');
  const data = /^\d{4}-\d{2}-\d{2}$/.test(dataParam ?? '') ? dataParam : hoje;
  const { itens } = await api.listar('agendamentos', { data, limite: 100 });
  const ativas = itens.filter((c) => c.status === 'agendado').length;

  desenhar(
    raiz,
    html`
      <h1>Minha agenda</h1>
      <div class="seletor-data">
        <a class="botao-icone" href="#/agenda?data=${somarDias(data, -1)}" aria-label="Dia anterior">${icone('voltar')}</a>
        <div class="seletor-data__atual">
          <label for="data" class="so-leitor">Escolher data</label>
          <input id="data" type="date" value="${data}">
          <p>${formatarDataCompleta(data)}${data === hoje ? ' (hoje)' : ''}</p>
        </div>
        <a class="botao-icone botao-icone--inverso" href="#/agenda?data=${somarDias(data, 1)}" aria-label="Próximo dia">${icone('voltar')}</a>
      </div>
      ${data !== hoje ? html`<a class="botao botao--secundario botao--pequeno" href="#/agenda">Voltar para hoje</a>` : ''}

      ${itens.length
        ? html`
            <p class="texto-suave">${ativas} ${ativas === 1 ? 'consulta agendada' : 'consultas agendadas'} neste dia.</p>
            <ul class="lista-consultas">${itens.map((c) => cartaoConsulta(c, 'profissional'))}</ul>`
        : vazio('Nenhuma consulta neste dia', 'Quando pacientes agendarem horários com você, eles aparecem aqui.')}`,
  );

  raiz.querySelector('#data').addEventListener('change', (evento) => {
    if (evento.target.value) window.location.hash = `#/agenda?data=${evento.target.value}`;
  });
}
