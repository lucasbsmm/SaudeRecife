import { api } from '../api.js';
import { estado } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar } from '../utilitarios.js';
import { icone } from '../icones.js';
import { avisar } from '../componentes/avisos.js';

const SINTOMAS = [
  ['dor-de-cabeca', 'Dor de cabeça'],
  ['tosse', 'Tosse'],
  ['febre', 'Febre'],
  ['dor-no-corpo', 'Dor no corpo'],
  ['dificuldade-para-respirar', 'Dificuldade para respirar'],
  ['nariz-entupido', 'Nariz entupido'],
  ['outro', 'Outro'],
];

const INTENSIDADES = [
  ['leve', 'Leve', 'Dá para fazer as atividades normalmente'],
  ['moderada', 'Moderada', 'Atrapalha as atividades do dia'],
  ['intensa', 'Intensa', 'Difícil de suportar'],
];

export function renderizar({ raiz }) {
  const anterior = estado.triagem?.entrada;
  const selecionados = new Set(anterior?.sintomas ?? []);

  desenhar(
    raiz,
    html`
      <form class="triagem" novalidate>
        <label class="triagem__progresso">
          <span id="rotulo-etapa">Etapa 1 de 2</span>
          <progress max="2" value="1" aria-labelledby="rotulo-etapa"></progress>
        </label>

        <section data-etapa="1">
          <h1>Quais sintomas você está sentindo?</h1>
          <fieldset class="sintomas">
            <legend class="so-leitor">Sintomas</legend>
            ${SINTOMAS.map(
              ([id, rotulo]) => html`
                <label class="sintoma">
                  <input type="checkbox" name="sintomas" value="${id}" ${selecionados.has(id) ? html`checked` : ''}>
                  <span class="sintoma__corpo">${icone(id, 36)}<span>${rotulo}</span></span>
                </label>`,
            )}
          </fieldset>
          <p class="campo__erro" data-erro-etapa="1" role="alert"></p>
          <button type="button" class="botao botao--bloco" data-avancar>Continuar</button>
        </section>

        <section data-etapa="2" hidden>
          <h1>Conte um pouco mais</h1>

          <fieldset class="campo campo--grupo">
            <legend>Como estão os sintomas?</legend>
            ${INTENSIDADES.map(
              ([valor, rotulo, descricao]) => html`
                <label class="opcao-radio">
                  <input type="radio" name="intensidade" value="${valor}" ${(anterior?.intensidade ?? 'leve') === valor ? html`checked` : ''}>
                  <span><strong>${rotulo}</strong><small>${descricao}</small></span>
                </label>`,
            )}
          </fieldset>

          <div class="campo">
            <label for="dias">Há quantos dias começaram?</label>
            <input id="dias" name="diasDeSintomas" type="number" inputmode="numeric" min="0" max="90" value="${anterior?.diasDeSintomas ?? 1}" required>
          </div>

          <div class="campo">
            <label for="temperatura">Temperatura medida em °C <span class="campo__opcional">(opcional)</span></label>
            <input id="temperatura" name="temperatura" type="number" inputmode="decimal" min="34" max="43" step="0.1" value="${anterior?.temperatura ?? ''}" aria-describedby="ajuda-temperatura">
            <p class="campo__ajuda" id="ajuda-temperatura">Informe apenas se você mediu com termômetro.</p>
          </div>

          <p class="campo__erro" data-erro-etapa="2" role="alert"></p>
          <div class="acoes-linha">
            <button type="button" class="botao botao--secundario" data-recuar>Voltar</button>
            <button type="submit" class="botao">Ver resultado</button>
          </div>
        </section>
      </form>`,
  );

  const formulario = raiz.querySelector('form');
  const etapa1 = formulario.querySelector('[data-etapa="1"]');
  const etapa2 = formulario.querySelector('[data-etapa="2"]');
  const barra = formulario.querySelector('progress');
  const rotulo = formulario.querySelector('#rotulo-etapa');

  function mostrarEtapa(numero) {
    etapa1.hidden = numero !== 1;
    etapa2.hidden = numero !== 2;
    barra.value = numero;
    rotulo.textContent = `Etapa ${numero} de 2`;
    (numero === 1 ? etapa1 : etapa2).querySelector('h1').focus();
    window.scrollTo(0, 0);
  }
  etapa1.querySelector('h1').tabIndex = -1;
  etapa2.querySelector('h1').tabIndex = -1;

  formulario.querySelector('[data-avancar]').addEventListener('click', () => {
    const erro = formulario.querySelector('[data-erro-etapa="1"]');
    if (!formulario.querySelector('input[name="sintomas"]:checked')) {
      erro.textContent = 'Selecione ao menos um sintoma para continuar.';
      return;
    }
    erro.textContent = '';
    mostrarEtapa(2);
  });
  formulario.querySelector('[data-recuar]').addEventListener('click', () => mostrarEtapa(1));

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formulario.reportValidity()) return;

    const entrada = {
      sintomas: [...formulario.querySelectorAll('input[name="sintomas"]:checked')].map((e) => e.value),
      intensidade: formulario.elements.intensidade.value,
      diasDeSintomas: Number(formulario.elements.diasDeSintomas.value),
    };
    if (formulario.elements.temperatura.value) entrada.temperatura = Number(formulario.elements.temperatura.value);

    const botao = formulario.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      const resultado = await api.triagem(entrada);
      estado.triagem = { entrada, resultado };
      irPara('/triagem/resultado');
    } catch (erro) {
      avisar(erro.message, 'erro');
      botao.disabled = false;
    }
  });
}
