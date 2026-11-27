import { html } from '../utilitarios.js';

const ETAPAS_AGENDAMENTO = ['Especialidade', 'Clínica', 'Profissional', 'Horário', 'Confirmar'];

/** Indicador de progresso do agendamento. `atual` começa em 1. */
export function etapasAgendamento(atual) {
  return html`
    <ol class="etapas" aria-label="Etapas do agendamento">
      ${ETAPAS_AGENDAMENTO.map(
        (nome, i) => html`
          <li class="etapas__item ${i + 1 < atual ? 'etapas__item--feita' : ''}" ${i + 1 === atual ? html`aria-current="step"` : ''}>
            <span class="etapas__marcador" aria-hidden="true">${i + 1 < atual ? '✓' : i + 1}</span>
            <span class="etapas__nome">${nome}</span>
          </li>`,
      )}
    </ol>`;
}
