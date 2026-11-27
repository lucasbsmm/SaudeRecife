import { api } from '../api.js';
import { estado } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar, bruto, iniciais, diaDoMes, diaSemanaCurto, mesCurto, formatarDataCompleta } from '../utilitarios.js';
import { etapasAgendamento } from '../componentes/etapas.js';
import { vazio } from '../componentes/estados.js';

export async function renderizar({ raiz }) {
  const { especialidade, clinica, profissional } = estado.agendamento;
  if (!especialidade || !clinica || !profissional) return irPara('/agendar', { substituir: true });

  const { itens: agenda } = await api.agenda(profissional.id, { clinica: clinica.id, dias: 14 });
  const dias = agenda.filter((dia) => dia.horarios.some((h) => h.disponivel));

  const cabecalho = html`
    ${etapasAgendamento(4)}
    <section class="perfil-profissional">
      <span class="avatar avatar--grande" aria-hidden="true">${iniciais(profissional.nome)}</span>
      <h1>${profissional.nome}</h1>
      <p class="texto-suave">${especialidade.nome}, CRM ${profissional.crm}</p>
      <p class="texto-suave">${clinica.nome}</p>
    </section>`;

  if (!dias.length) {
    desenhar(
      raiz,
      html`${cabecalho}${vazio('Sem horários nos próximos 14 dias', 'Escolha outro profissional ou volte em alguns dias.', html`<a class="botao botao--secundario" href="#/agendar/profissional">Escolher outro profissional</a>`)}`,
    );
    return;
  }

  let diaSelecionado = estado.agendamento.data && dias.some((d) => d.data === estado.agendamento.data) ? estado.agendamento.data : dias[0].data;
  let horaSelecionada = estado.agendamento.hora ?? null;

  desenhar(
    raiz,
    html`
      ${cabecalho}
      <section class="horarios" aria-labelledby="titulo-horarios">
        <h2 id="titulo-horarios">Selecione o horário</h2>
        <fieldset class="dias">
          <legend class="so-leitor">Dia da consulta</legend>
          ${dias.map(
            (dia) => html`
              <label class="dia">
                <input type="radio" name="dia" value="${dia.data}" ${dia.data === diaSelecionado ? bruto('checked') : ''}>
                <span class="dia__corpo">
                  <span class="dia__semana">${diaSemanaCurto(dia.data)}</span>
                  <span class="dia__numero">${diaDoMes(dia.data)}</span>
                  <span class="dia__mes">${mesCurto(dia.data)}</span>
                </span>
              </label>`,
          )}
        </fieldset>
        <p class="texto-suave" id="data-escolhida"></p>
        <fieldset class="horas" id="horas"></fieldset>
        <p class="campo__erro" id="erro-horario" role="alert"></p>
      </section>
      <div class="barra-acao">
        <button type="button" class="botao botao--bloco" id="continuar">Continuar</button>
      </div>`,
  );

  const grade = raiz.querySelector('#horas');
  const dataEscolhida = raiz.querySelector('#data-escolhida');
  const erro = raiz.querySelector('#erro-horario');

  function mostrarHoras() {
    const dia = agenda.find((d) => d.data === diaSelecionado);
    dataEscolhida.textContent = formatarDataCompleta(diaSelecionado);
    grade.innerHTML = String(html`
      <legend class="so-leitor">Horários de ${formatarDataCompleta(diaSelecionado)}</legend>
      ${dia.horarios.map(
        (h) => html`
          <label class="hora ${h.disponivel ? '' : 'hora--indisponivel'}">
            <input type="radio" name="hora" value="${h.hora}" ${h.disponivel ? '' : bruto('disabled')} ${h.hora === horaSelecionada && h.disponivel ? bruto('checked') : ''}>
            <span>${h.hora}${h.disponivel ? '' : html`<span class="so-leitor"> (indisponível)</span>`}</span>
          </label>`,
      )}`);
  }
  mostrarHoras();

  raiz.addEventListener('change', (evento) => {
    erro.textContent = '';
    if (evento.target.name === 'dia') {
      diaSelecionado = evento.target.value;
      horaSelecionada = null;
      mostrarHoras();
    } else if (evento.target.name === 'hora') {
      horaSelecionada = evento.target.value;
    }
  });

  raiz.querySelector('#continuar').addEventListener('click', () => {
    if (!horaSelecionada) {
      erro.textContent = 'Escolha um horário para continuar.';
      return;
    }
    estado.agendamento = { ...estado.agendamento, data: diaSelecionado, hora: horaSelecionada };
    irPara('/agendar/confirmar');
  });
}
