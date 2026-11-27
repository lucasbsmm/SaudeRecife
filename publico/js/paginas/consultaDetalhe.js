import { api } from '../api.js';
import { abrirFormulario, confirmar } from '../componentes/dialogo.js';
import { avisar } from '../componentes/avisos.js';
import { html, desenhar, consultaJaPassou, enderecoCompleto, formatarDataCompleta, formatarTelefone, linkMapa, rotulosStatus } from '../utilitarios.js';
import { icone } from '../icones.js';

const CLASSIFICACOES = { rotina: 'Rotina', prioritario: 'Prioritário', urgente: 'Urgente' };
const QUEM_CANCELOU = { paciente: 'pelo paciente', profissional: 'pelo profissional', administrador: 'pela administração' };

export async function renderizar({ raiz, parametros, consulta: parametrosUrl, usuario, atualizar }) {
  const consulta = await api.obter('agendamentos', parametros.id);
  const ativa = consulta.status === 'agendado';
  const podeCancelar = ativa && (usuario.perfil !== 'paciente' || !consultaJaPassou(consulta));
  const podeConcluir = ativa && usuario.perfil !== 'paciente';
  const { clinica, profissional, paciente, triagem } = consulta;

  desenhar(
    raiz,
    html`
      ${parametrosUrl.get('novo') ? html`<p class="aviso-destaque" role="status">${icone('check', 20)} Consulta agendada com sucesso!</p>` : ''}

      <header class="consulta-cabecalho">
        <h1>${formatarDataCompleta(consulta.data)}, ${consulta.hora}</h1>
        <span class="selo selo--${consulta.status}">${rotulosStatus[consulta.status]}</span>
      </header>

      <dl class="detalhes">
        <div><dt>Especialidade</dt><dd>${consulta.especialidade?.nome}</dd></div>
        <div><dt>Profissional</dt><dd>${profissional?.nome}<br><span class="texto-suave">CRM ${profissional?.crm}</span></dd></div>
        <div>
          <dt>Clínica</dt>
          <dd>
            ${clinica?.nome}<br>
            <span class="texto-suave">${enderecoCompleto(clinica?.endereco)}</span>
            ${clinica?.telefone ? html`<br><a href="tel:${clinica.telefone.replace(/\D/g, '')}">${clinica.telefone}</a>` : ''}
            <br><a href="${linkMapa(clinica)}" target="_blank" rel="noopener noreferrer">Ver no mapa<span class="so-leitor"> (abre em nova aba)</span></a>
          </dd>
        </div>
        ${usuario.perfil !== 'paciente'
          ? html`<div><dt>Paciente</dt><dd>${paciente?.nome}${paciente?.telefone ? html`<br><a href="tel:${paciente.telefone}">${formatarTelefone(paciente.telefone)}</a>` : ''}</dd></div>`
          : ''}
        ${consulta.observacoes ? html`<div><dt>Observações</dt><dd>${consulta.observacoes}</dd></div>` : ''}
        ${triagem?.classificacao
          ? html`<div><dt>Pré-triagem</dt><dd>Classificação: ${CLASSIFICACOES[triagem.classificacao]}<br><span class="texto-suave">Sintomas: ${triagem.sintomas.join(', ').replaceAll('-', ' ')}</span></dd></div>`
          : ''}
        ${consulta.status === 'cancelado'
          ? html`<div><dt>Cancelamento</dt><dd>Cancelada ${QUEM_CANCELOU[consulta.canceladoPor] ?? ''}${consulta.motivoCancelamento ? html`<br><span class="texto-suave">Motivo: ${consulta.motivoCancelamento}</span>` : ''}</dd></div>`
          : ''}
      </dl>

      <div class="acoes-coluna">
        ${podeConcluir ? html`<button type="button" class="botao" data-acao="concluir">Marcar como concluída</button>` : ''}
        ${podeCancelar ? html`<button type="button" class="botao botao--perigo-contorno" data-acao="cancelar">Cancelar consulta</button>` : ''}
        ${ativa && !podeCancelar ? html`<p class="texto-suave">Esta consulta já começou e não pode mais ser cancelada pelo aplicativo.</p>` : ''}
      </div>`,
  );

  raiz.querySelector('[data-acao="cancelar"]')?.addEventListener('click', () =>
    abrirFormulario({
      titulo: 'Cancelar consulta',
      campos: [{ nome: 'motivo', rotulo: 'Motivo do cancelamento', tipo: 'area', maximo: 300 }],
      textoEnviar: 'Cancelar consulta',
      aoEnviar: async ({ motivo }) => {
        await api.cancelarConsulta(consulta.id, motivo);
        avisar('Consulta cancelada.', 'sucesso');
        await atualizar();
      },
    }),
  );

  raiz.querySelector('[data-acao="concluir"]')?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: 'Concluir consulta', mensagem: 'Confirma que esta consulta foi realizada?', textoConfirmar: 'Concluir' }))) return;
    try {
      await api.concluirConsulta(consulta.id);
      avisar('Consulta marcada como concluída.', 'sucesso');
      await atualizar();
    } catch (erro) {
      avisar(erro.message, 'erro');
    }
  });
}
