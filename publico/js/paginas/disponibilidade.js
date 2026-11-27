import { api } from '../api.js';
import { atualizarUsuario } from '../sessao.js';
import { html, desenhar, nomesDiasSemana } from '../utilitarios.js';
import { avisar } from '../componentes/avisos.js';
import { confirmar } from '../componentes/dialogo.js';
import { htmlCampos, lerValores, limparErros, mostrarErros } from '../componentes/formulario.js';
import { vazio } from '../componentes/estados.js';

const DIAS = nomesDiasSemana.map((nome, valor) => ({ valor, rotulo: nome }));

export async function renderizar({ raiz, usuario, atualizar }) {
  // Busca o cadastro atualizado: a administração pode ter mudado as clínicas do profissional.
  const { usuario: atual } = await api.usuarioAtual();
  atualizarUsuario(atual);
  const profissional = atual.vinculo;

  if (!profissional) {
    desenhar(raiz, vazio('Cadastro profissional não encontrado', 'Fale com a administração para vincular sua conta a um profissional.'));
    return;
  }

  const { itens } = await api.listar('disponibilidades', { profissional: profissional.id });
  const clinicas = profissional.clinicas.map((c) => ({ valor: c.id, rotulo: c.nome }));

  const campos = [
    { nome: 'clinica', rotulo: 'Clínica', tipo: 'selecao', obrigatorio: true, opcoes: clinicas },
    { nome: 'diaSemana', rotulo: 'Dia da semana', tipo: 'selecao', obrigatorio: true, opcoes: DIAS, converter: 'numero' },
    { nome: 'horaInicio', rotulo: 'Início do atendimento', tipo: 'hora', obrigatorio: true },
    { nome: 'horaFim', rotulo: 'Fim do atendimento', tipo: 'hora', obrigatorio: true },
    { nome: 'duracaoMinutos', rotulo: 'Duração de cada consulta (minutos)', tipo: 'numero', obrigatorio: true, minimo: 10, maximo: 240, passo: 5 },
  ];

  const porDia = DIAS.map((dia) => ({ ...dia, periodos: itens.filter((i) => i.diaSemana === dia.valor) })).filter((d) => d.periodos.length);

  desenhar(
    raiz,
    html`
      <h1>Disponibilidade</h1>
      <p class="texto-suave">Defina os dias e horários em que você atende. Os pacientes só conseguem agendar dentro desses períodos.</p>

      ${porDia.length
        ? porDia.map(
            (dia) => html`
              <section class="secao" aria-labelledby="dia-${dia.valor}">
                <h2 id="dia-${dia.valor}">${dia.rotulo}</h2>
                <ul class="lista-registros">
                  ${dia.periodos.map(
                    (p) => html`
                      <li class="registro">
                        <div class="registro__texto">
                          <p class="registro__titulo">${p.horaInicio} às ${p.horaFim}</p>
                          <p class="texto-suave">${p.clinica?.nome}, consultas de ${p.duracaoMinutos} min</p>
                        </div>
                        <button type="button" class="botao botao--perigo-contorno botao--pequeno" data-remover="${p.id}">Remover<span class="so-leitor"> período de ${dia.rotulo} às ${p.horaInicio}</span></button>
                      </li>`,
                  )}
                </ul>
              </section>`,
          )
        : vazio('Nenhum horário cadastrado', 'Adicione abaixo o seu primeiro período de atendimento.')}

      <section class="secao" aria-labelledby="titulo-novo">
        <h2 id="titulo-novo">Adicionar período</h2>
        ${clinicas.length
          ? html`
              <form class="formulario" novalidate>
                <p class="formulario__erro" role="alert" hidden></p>
                ${htmlCampos(campos, { duracaoMinutos: 30 }, 'disp')}
                <button type="submit" class="botao botao--bloco">Adicionar período</button>
              </form>`
          : html`<p class="texto-suave">Você ainda não está associado a nenhuma clínica. Peça à administração para fazer a associação.</p>`}
      </section>`,
  );

  const formulario = raiz.querySelector('form');
  formulario?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);
    if (!formulario.reportValidity()) return;

    const botao = formulario.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      await api.criar('disponibilidades', lerValores(formulario, campos));
      avisar('Período adicionado.', 'sucesso');
      await atualizar();
    } catch (erro) {
      mostrarErros(formulario, erro);
      botao.disabled = false;
    }
  });

  raiz.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('[data-remover]');
    if (!botao) return;
    if (!(await confirmar({ titulo: 'Remover período', mensagem: 'Os horários deste período deixam de aparecer para novos agendamentos. Consultas já marcadas não são afetadas.', textoConfirmar: 'Remover', perigo: true }))) return;
    try {
      await api.remover('disponibilidades', botao.dataset.remover);
      avisar('Período removido.', 'sucesso');
      await atualizar();
    } catch (erro) {
      avisar(erro.message, 'erro');
    }
  });
}
