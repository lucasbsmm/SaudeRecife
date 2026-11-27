import { html } from '../utilitarios.js';

export const carregando = (texto = 'Carregando…') => html`
  <div class="carregando" role="status">
    <span class="carregando__roda" aria-hidden="true"></span>
    <span>${texto}</span>
  </div>`;

export const vazio = (titulo, texto, acao = '') => html`
  <div class="vazio">
    <h2>${titulo}</h2>
    <p>${texto}</p>
    ${acao}
  </div>`;

export const falha = (mensagem) => html`
  <div class="vazio vazio--erro" role="alert">
    <h2>Não foi possível carregar</h2>
    <p>${mensagem}</p>
    <button type="button" class="botao botao--secundario" data-acao="tentar-novamente">Tentar novamente</button>
  </div>`;
