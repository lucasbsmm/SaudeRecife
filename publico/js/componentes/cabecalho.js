import { html, desenhar } from '../utilitarios.js';
import { icone } from '../icones.js';

const barra = () => document.getElementById('barra-superior');

/** Desenha a barra superior: botão de voltar (quando houver) e título da tela. */
export function desenharCabecalho({ titulo, voltar }) {
  desenhar(
    barra(),
    html`
      ${voltar
        ? html`<button type="button" class="botao-icone botao-icone--claro" data-voltar aria-label="Voltar">${icone('voltar')}</button>`
        : html`<span></span>`}
      <p class="barra-superior__titulo" id="titulo-tela">${titulo}</p>
      <span></span>`,
  );
  document.title = titulo === 'Saúde Recife' ? titulo : `${titulo} · Saúde Recife`;
}

export function definirTitulo(titulo) {
  const elemento = document.getElementById('titulo-tela');
  if (elemento) elemento.textContent = titulo;
  document.title = `${titulo} · Saúde Recife`;
}
