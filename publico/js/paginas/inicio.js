import { api } from '../api.js';
import { html, desenhar, primeiroNome } from '../utilitarios.js';
import { icone } from '../icones.js';
import { cartaoConsulta } from '../componentes/cartaoConsulta.js';

export async function renderizar({ raiz, usuario }) {
  const { itens: proximas } = await api.listar('agendamentos', { periodo: 'proximas', limite: 3 });

  desenhar(
    raiz,
    html`
      <section class="chamada">
        <h1>Olá, ${primeiroNome(usuario.nome)}.</h1>
        <p>Vamos descobrir o que você está sentindo? A pré-triagem ajuda a agilizar o atendimento e a escolher a especialidade certa.</p>
        <a class="botao botao--bloco" href="#/triagem">Iniciar pré-triagem</a>
      </section>

      <nav class="atalhos" aria-label="Atalhos">
        <a class="atalho" href="#/consultas?aba=historico">${icone('relogio', 28)}<span>Histórico de atendimento</span></a>
        <a class="atalho" href="#/consultas">${icone('prancheta', 28)}<span>Próximas consultas</span></a>
        <a class="atalho" href="#/agendar">${icone('calendario', 28)}<span>Agendar sem pré-triagem</span></a>
      </nav>

      <section class="secao" aria-labelledby="titulo-proximas">
        <h2 id="titulo-proximas">Suas próximas consultas</h2>
        ${proximas.length
          ? html`<ul class="lista-consultas">${proximas.map((c) => cartaoConsulta(c))}</ul>`
          : html`<p class="texto-suave">Você não tem consultas marcadas. Faça a pré-triagem ou escolha uma especialidade para agendar.</p>`}
      </section>`,
  );
}
