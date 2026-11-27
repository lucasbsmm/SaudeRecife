import { api } from '../api.js';
import { estado } from '../estado.js';
import { irPara } from '../roteador.js';
import { html, desenhar, debounce, enderecoCompleto, linkMapa } from '../utilitarios.js';
import { icone } from '../icones.js';
import { etapasAgendamento } from '../componentes/etapas.js';
import { carregando, vazio } from '../componentes/estados.js';

export async function renderizar({ raiz }) {
  const { especialidade } = estado.agendamento;
  if (!especialidade) return irPara('/agendar', { substituir: true });

  desenhar(
    raiz,
    html`
      ${etapasAgendamento(2)}
      <h1>Onde você quer ser atendido?</h1>
      <p class="texto-suave">Clínicas parceiras com <strong>${especialidade.nome}</strong>.</p>
      <div class="campo campo--busca">
        <label for="busca" class="so-leitor">Buscar clínica por nome ou bairro</label>
        <input id="busca" type="search" placeholder="Buscar por nome ou bairro" autocomplete="off">
      </div>
      <div id="resultado" aria-live="polite"></div>`,
  );

  const resultado = raiz.querySelector('#resultado');
  let clinicas = [];

  async function buscar(termo = '') {
    desenhar(resultado, carregando('Buscando clínicas…'));
    try {
      ({ itens: clinicas } = await api.listar('clinicas', { especialidade: especialidade.id, busca: termo, limite: 50 }));
    } catch (erro) {
      desenhar(resultado, html`<p class="formulario__erro" role="alert">${erro.message}</p>`);
      return;
    }

    if (!clinicas.length) {
      desenhar(resultado, vazio('Nenhuma clínica encontrada', termo ? 'Tente buscar por outro nome ou bairro.' : 'Ainda não há clínicas com esta especialidade.'));
      return;
    }

    desenhar(
      resultado,
      html`<ul class="lista-cartoes">
        ${clinicas.map(
          (c) => html`
            <li class="clinica">
              <h2>${c.nome}</h2>
              <p class="clinica__linha">${icone('local', 18)} <span>${enderecoCompleto(c.endereco)}</span></p>
              ${c.telefone ? html`<p class="clinica__linha">${icone('telefone', 18)} <span>${c.telefone}</span></p>` : ''}
              <div class="acoes-linha">
                <a class="botao botao--secundario botao--pequeno" href="${linkMapa(c)}" target="_blank" rel="noopener noreferrer">Ver no mapa<span class="so-leitor"> (abre em nova aba)</span></a>
                <button type="button" class="botao botao--pequeno" data-escolher="${c.id}">Escolher clínica</button>
              </div>
            </li>`,
        )}
      </ul>`,
    );
  }

  resultado.addEventListener('click', (evento) => {
    const botao = evento.target.closest('[data-escolher]');
    if (!botao) return;
    const clinica = clinicas.find((c) => c.id === botao.dataset.escolher);
    estado.agendamento = { especialidade, clinica };
    irPara('/agendar/profissional');
  });
  raiz.querySelector('#busca').addEventListener('input', debounce((e) => buscar(e.target.value), 350));

  await buscar();
}
