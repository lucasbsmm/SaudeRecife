import { api, ErroApi } from '../api.js';
import { estado, reiniciarAgendamento } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar, enderecoCompleto, formatarDataCompleta } from '../utilitarios.js';
import { etapasAgendamento } from '../componentes/etapas.js';
import { avisar } from '../componentes/avisos.js';

export function renderizar({ raiz }) {
  const { especialidade, clinica, profissional, data, hora } = estado.agendamento;
  if (!especialidade || !clinica || !profissional || !data || !hora) return irPara('/agendar', { substituir: true });

  desenhar(
    raiz,
    html`
      ${etapasAgendamento(5)}
      <h1>Confirme sua consulta</h1>

      <dl class="detalhes">
        <div><dt>Data</dt><dd>${formatarDataCompleta(data)}</dd></div>
        <div><dt>Horário</dt><dd>${hora}</dd></div>
        <div><dt>Especialidade</dt><dd>${especialidade.nome}</dd></div>
        <div><dt>Profissional</dt><dd>${profissional.nome}<br><span class="texto-suave">CRM ${profissional.crm}</span></dd></div>
        <div><dt>Clínica</dt><dd>${clinica.nome}<br><span class="texto-suave">${enderecoCompleto(clinica.endereco)}</span></dd></div>
      </dl>

      <form class="formulario" novalidate>
        <p class="formulario__erro" role="alert" hidden></p>
        <div class="campo">
          <label for="observacoes">Quer deixar alguma observação? <span class="campo__opcional">(opcional)</span></label>
          <textarea id="observacoes" name="observacoes" rows="3" maxlength="500" placeholder="Ex.: preciso de atendimento com acompanhante"></textarea>
        </div>
        ${estado.triagem ? html`<p class="texto-suave">O resumo da sua pré-triagem será enviado junto com o agendamento.</p>` : ''}
        <button type="submit" class="botao botao--bloco">Confirmar agendamento</button>
      </form>`,
  );

  const formulario = raiz.querySelector('form');
  const mensagem = formulario.querySelector('.formulario__erro');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mensagem.hidden = true;

    const botao = formulario.querySelector('[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Agendando…';

    try {
      const corpo = {
        profissional: profissional.id,
        clinica: clinica.id,
        data,
        hora,
        observacoes: formulario.elements.observacoes.value.trim() || undefined,
        triagem: estado.triagem?.entrada,
      };
      const consulta = await api.criar('agendamentos', corpo);
      reiniciarAgendamento();
      estado.triagem = null;
      irPara(`/consultas/${consulta.id}?novo=1`);
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      mensagem.textContent = erro.message;
      mensagem.hidden = false;
      botao.disabled = false;
      botao.textContent = 'Confirmar agendamento';
      if (erro.status === 409) {
        avisar('Escolha outro horário.', 'info');
        irPara('/agendar/horario');
      }
    }
  });
}
