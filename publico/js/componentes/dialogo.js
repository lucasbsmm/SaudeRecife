import { html, desenhar } from '../utilitarios.js';
import { ErroApi } from '../api.js';
import { htmlCampos, lerValores, limparErros, mostrarErros, ativarMascaras, ativarDependencias } from './formulario.js';

let contador = 0;

/** Abre um <dialog> nativo (com foco preso e Esc para fechar) e o remove do DOM ao fechar. */
export function abrirDialogo({ titulo, corpo }) {
  const id = `dialogo-${++contador}`;
  const dialogo = document.createElement('dialog');
  dialogo.className = 'dialogo';
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  desenhar(
    dialogo,
    html`
      <div class="dialogo__cabecalho">
        <h2 id="${id}-titulo">${titulo}</h2>
        <button type="button" class="botao-icone" data-fechar aria-label="Fechar">✕</button>
      </div>
      <div class="dialogo__corpo">${corpo}</div>`,
  );

  dialogo.addEventListener('close', () => dialogo.remove());
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo || evento.target.closest('[data-fechar]')) dialogo.close();
  });

  document.body.append(dialogo);
  dialogo.showModal();
  return dialogo;
}

export function confirmar({ titulo, mensagem, textoConfirmar = 'Confirmar', perigo = false }) {
  return new Promise((resolver) => {
    const dialogo = abrirDialogo({
      titulo,
      corpo: html`
        <p>${mensagem}</p>
        <div class="dialogo__acoes">
          <button type="button" class="botao botao--secundario" data-fechar>Voltar</button>
          <button type="button" class="botao ${perigo ? 'botao--perigo' : ''}" data-confirmar>${textoConfirmar}</button>
        </div>`,
    });
    let confirmado = false;
    dialogo.querySelector('[data-confirmar]').addEventListener('click', () => {
      confirmado = true;
      dialogo.close();
    });
    dialogo.addEventListener('close', () => resolver(confirmado));
  });
}

async function resolverOpcoes(campos, valores) {
  return Promise.all(campos.map(async (campo) => (campo.carregarOpcoes ? { ...campo, opcoes: await campo.carregarOpcoes(valores) } : campo)));
}

/**
 * Formulário em diálogo. `aoEnviar(valores)` deve lançar ErroApi em caso de falha;
 * os erros por campo são exibidos junto aos campos correspondentes.
 */
export async function abrirFormulario({ titulo, campos, valores = {}, textoEnviar = 'Salvar', aoEnviar }) {
  const camposProntos = await resolverOpcoes(campos, valores);
  const dialogo = abrirDialogo({
    titulo,
    corpo: html`
      <form class="formulario" novalidate>
        <p class="formulario__erro" role="alert" hidden></p>
        ${htmlCampos(camposProntos, valores, 'dlg')}
        <div class="dialogo__acoes">
          <button type="button" class="botao botao--secundario" data-fechar>Cancelar</button>
          <button type="submit" class="botao">${textoEnviar}</button>
        </div>
      </form>`,
  });

  const formulario = dialogo.querySelector('form');
  ativarMascaras(formulario);
  ativarDependencias(formulario, camposProntos);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);
    if (!formulario.reportValidity()) return;

    const botao = formulario.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      await aoEnviar(lerValores(formulario, camposProntos));
      dialogo.close();
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      mostrarErros(formulario, erro);
      botao.disabled = false;
    }
  });
  return dialogo;
}
