import { api } from '../api.js';
import { estado } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar, debounce, iniciais } from '../utilitarios.js';
import { etapasAgendamento } from '../componentes/etapas.js';
import { carregando, vazio } from '../componentes/estados.js';

export async function renderizar({ raiz }) {
  const { especialidade, clinica } = estado.agendamento;
  if (!especialidade || !clinica) return irPara('/agendar', { substituir: true });

  desenhar(
    raiz,
    html`
      ${etapasAgendamento(3)}
      <h1>Com quem você quer se consultar?</h1>
      <p class="texto-suave">${especialidade.nome} na <strong>${clinica.nome}</strong>.</p>
      <div class="campo campo--busca">
        <label for="busca" class="so-leitor">Buscar profissional pelo nome</label>
        <input id="busca" type="search" placeholder="Buscar pelo nome" autocomplete="off">
      </div>
      <div id="resultado" aria-live="polite"></div>`,
  );

  const resultado = raiz.querySelector('#resultado');
  let profissionais = [];

  async function buscar(nome = '') {
    desenhar(resultado, carregando('Buscando profissionais…'));
    try {
      ({ itens: profissionais } = await api.listar('profissionais', { clinica: clinica.id, especialidade: especialidade.id, nome, limite: 50 }));
    } catch (erro) {
      desenhar(resultado, html`<p class="formulario__erro" role="alert">${erro.message}</p>`);
      return;
    }

    if (!profissionais.length) {
      desenhar(resultado, vazio('Nenhum profissional encontrado', nome ? 'Tente outro nome.' : 'Não há profissionais desta especialidade nesta clínica.'));
      return;
    }

    desenhar(
      resultado,
      html`<ul class="lista-cartoes">
        ${profissionais.map(
          (p) => html`
            <li class="profissional">
              <span class="avatar" aria-hidden="true">${iniciais(p.nome)}</span>
              <div class="profissional__dados">
                <h2>${p.nome}</h2>
                <p class="texto-suave">${p.especialidade?.nome}, CRM ${p.crm}</p>
              </div>
              <button type="button" class="botao botao--pequeno" data-escolher="${p.id}">Ver horários</button>
            </li>`,
        )}
      </ul>`,
    );
  }

  resultado.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-escolher]');
    if (!botao) return;
    estado.agendamento = { especialidade, clinica, profissional: profissionais.find((p) => p.id === botao.dataset.escolher) };
    irPara('/agendar/horario');
  });
  raiz.querySelector('#busca').addEventListener('input', debounce((e) => buscar(e.target.value), 350));

  await buscar();
}
