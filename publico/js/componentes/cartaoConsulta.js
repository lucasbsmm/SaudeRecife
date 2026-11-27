import { html, diaDoMes, mesCurto, rotulosStatus } from '../utilitarios.js';
import { icone } from '../icones.js';

/** Item de lista que resume uma consulta e leva aos detalhes. */
export function cartaoConsulta(consulta, papel = 'paciente') {
  const titulo = papel === 'paciente' ? consulta.profissional?.nome : consulta.paciente?.nome;
  return html`
    <li>
      <a class="consulta" href="#/consultas/${consulta.id}">
        <span class="consulta__data" aria-hidden="true">
          <span class="consulta__dia">${diaDoMes(consulta.data)}</span>
          <span class="consulta__mes">${mesCurto(consulta.data)}</span>
        </span>
        <span class="consulta__info">
          <span class="consulta__titulo">${titulo}</span>
          <span class="consulta__detalhe">${consulta.especialidade?.nome}, ${consulta.clinica?.nome}</span>
          <span class="consulta__hora">${icone('relogio', 16)} ${consulta.hora}</span>
        </span>
        <span class="selo selo--${consulta.status}">${rotulosStatus[consulta.status]}</span>
      </a>
    </li>`;
}
