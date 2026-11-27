import { estado } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar } from '../utilitarios.js';
import { icone } from '../icones.js';

const TITULOS = {
  rotina: 'Atendimento de rotina',
  prioritario: 'Atendimento prioritário',
  urgente: 'Atendimento urgente',
};
const ROTULOS_INTENSIDADE = { leve: 'leve', moderada: 'moderada', intensa: 'intensa' };

export function renderizar({ raiz }) {
  if (!estado.triagem) return irPara('/triagem', { substituir: true });
  const { resultado, entrada } = estado.triagem;
  const { classificacao, observacao, resumo, especialidades } = resultado;

  desenhar(
    raiz,
    html`
      <h1>Classificação e resultado</h1>

      <section class="resultado" aria-labelledby="titulo-classificacao">
        <div class="classificacao classificacao--${classificacao}">
          <p class="classificacao__titulo" id="titulo-classificacao">${TITULOS[classificacao]}</p>
        </div>

        ${resumo.paciente
          ? html`<p class="resultado__paciente">${resumo.paciente.nome}, ${resumo.paciente.idade} anos</p>`
          : ''}

        <h2>Sintomas informados</h2>
        <ul class="resultado__sintomas">
          ${resumo.sintomas.map((s) => html`<li>${icone(s.id, 28)}<span>${s.rotulo}</span></li>`)}
        </ul>
        <p class="texto-suave">
          Intensidade ${ROTULOS_INTENSIDADE[resumo.intensidade]}, há ${resumo.diasDeSintomas} ${resumo.diasDeSintomas === 1 ? 'dia' : 'dias'}${resumo.temperatura ? `, temperatura de ${String(resumo.temperatura).replace('.', ',')} °C` : ''}.
        </p>

        <p class="resultado__observacao"><strong>Observação:</strong> ${observacao}</p>

        ${classificacao === 'urgente'
          ? html`<a class="botao botao--perigo botao--bloco" href="tel:192">${icone('telefone', 20)} Ligar para o SAMU (192)</a>`
          : ''}
        <p class="aviso-legal">Esta orientação não é um diagnóstico e não substitui a avaliação de um profissional de saúde.</p>
      </section>

      <section class="secao" aria-labelledby="titulo-recomendacoes">
        <h2 id="titulo-recomendacoes">Especialidades indicadas para você</h2>
        ${especialidades.length
          ? html`<ul class="lista-opcoes">
              ${especialidades.map(
                (e) => html`
                  <li>
                    <button type="button" class="opcao" data-id="${e.id}" data-nome="${e.nome}">
                      <span class="opcao__titulo">${e.nome}</span>
                      <span class="opcao__texto">${e.motivo}</span>
                    </button>
                  </li>`,
              )}
            </ul>`
          : html`<p class="texto-suave">Nenhuma especialidade com profissionais disponíveis foi encontrada para estes sintomas.</p>`}
        <a class="botao botao--secundario botao--bloco" href="#/agendar">Ver todas as especialidades</a>
      </section>`,
  );

  raiz.querySelectorAll('.opcao').forEach((botao) =>
    botao.addEventListener('click', () => {
      estado.agendamento = { especialidade: { id: botao.dataset.id, nome: botao.dataset.nome } };
      irPara('/agendar/clinica');
    }),
  );
}
