import { html, desenhar } from '../utilitarios.js';

export function renderizar({ raiz }) {
  desenhar(
    raiz,
    html`
      <section class="boas-vindas">
        <img src="/icones/logo.svg" alt="Logotipo do Saúde Recife" width="168" height="168">
        <h1>Olá, seja bem-vindo!</h1>
        <p>Descreva o que está sentindo, descubra a especialidade indicada e marque sua consulta em poucos toques.</p>
        <a class="botao botao--bloco" href="#/entrar">Entrar</a>
        <a class="botao botao--secundario botao--bloco" href="#/cadastro">Criar conta</a>
      </section>`,
  );
}
