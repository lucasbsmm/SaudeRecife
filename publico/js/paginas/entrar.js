import { api } from '../api.js';
import { salvarSessao } from '../sessao.js';
import { irPara, rotaInicial } from '../roteador.js';
import { html, desenhar } from '../utilitarios.js';
import { icone } from '../icones.js';
import { limparErros, mostrarErros } from '../componentes/formulario.js';

export function renderizar({ raiz, consulta }) {
  desenhar(
    raiz,
    html`
      <section class="acesso">
        <div class="acesso__marca">
          <img src="/icones/logo.svg" alt="" width="44" height="44">
          <span>Saúde Recife</span>
        </div>
        <h1>Bem-vindo!<br>Faça seu login</h1>

        <form class="formulario" novalidate>
          <p class="formulario__erro" role="alert" hidden></p>

          <div class="campo" data-campo="identificador">
            <label for="identificador">CPF ou e-mail</label>
            <input id="identificador" name="identificador" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required aria-describedby="identificador-erro">
            <p class="campo__erro" id="identificador-erro" role="alert"></p>
          </div>

          <div class="campo" data-campo="senha">
            <label for="senha">Senha</label>
            <div class="campo__senha">
              <input id="senha" name="senha" type="password" autocomplete="current-password" required aria-describedby="senha-erro">
              <button type="button" class="botao-icone" data-alternar-senha aria-label="Mostrar senha" aria-pressed="false">${icone('olho')}</button>
            </div>
            <p class="campo__erro" id="senha-erro" role="alert"></p>
          </div>

          <label class="caixa"><input type="checkbox" name="lembrar"><span>Lembrar-me neste aparelho</span></label>
          <button type="submit" class="botao botao--bloco">Entrar</button>
        </form>

        <p class="acesso__alternativa">Ainda não tem conta? <a href="#/cadastro">Criar conta</a></p>
      </section>`,
  );

  const formulario = raiz.querySelector('form');
  const campoSenha = formulario.elements.senha;
  const botaoOlho = formulario.querySelector('[data-alternar-senha]');

  botaoOlho.addEventListener('click', () => {
    const mostrar = campoSenha.type === 'password';
    campoSenha.type = mostrar ? 'text' : 'password';
    botaoOlho.setAttribute('aria-pressed', String(mostrar));
    botaoOlho.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    botaoOlho.innerHTML = String(icone(mostrar ? 'olhoFechado' : 'olho'));
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);
    if (!formulario.reportValidity()) return;

    const botao = formulario.querySelector('[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Entrando…';

    try {
      const { token, usuario } = await api.entrar({
        identificador: formulario.elements.identificador.value.trim(),
        senha: campoSenha.value,
      });
      salvarSessao({ token, usuario }, formulario.elements.lembrar.checked);

      const retorno = consulta.get('retorno');
      irPara(retorno && retorno.startsWith('/') && !retorno.startsWith('//') ? retorno : rotaInicial(usuario));
    } catch (erro) {
      mostrarErros(formulario, erro);
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });
}
