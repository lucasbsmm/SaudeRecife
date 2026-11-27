import { api } from '../api.js';
import { salvarSessao } from '../sessao.js';
import { irPara, rotaInicial } from '../roteador.js';
import { html, desenhar, hojeEmRecife } from '../utilitarios.js';
import { htmlCampos, lerValores, limparErros, mostrarErros, ativarMascaras } from '../componentes/formulario.js';

const campos = [
  { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, autocomplete: 'name' },
  { nome: 'cpf', rotulo: 'CPF', tipo: 'cpf', obrigatorio: true },
  { nome: 'dataNascimento', rotulo: 'Data de nascimento', tipo: 'data', obrigatorio: true, autocomplete: 'bday' },
  { nome: 'telefone', rotulo: 'Telefone com DDD', tipo: 'telefone', autocomplete: 'tel-national' },
  { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, autocomplete: 'email' },
  { nome: 'senha', rotulo: 'Senha', tipo: 'senha', obrigatorio: true, autocomplete: 'new-password', ajuda: 'Use ao menos 8 caracteres, com letras e números.' },
  { nome: 'confirmarSenha', rotulo: 'Confirme a senha', tipo: 'senha', obrigatorio: true, autocomplete: 'new-password' },
];
campos.find((c) => c.nome === 'dataNascimento').maximo = hojeEmRecife();

export function renderizar({ raiz }) {
  desenhar(
    raiz,
    html`
      <section class="acesso">
        <div class="acesso__marca">
          <img src="/icones/logo.svg" alt="" width="44" height="44">
          <span>Saúde Recife</span>
        </div>
        <h1>Crie sua conta</h1>
        <form class="formulario" novalidate>
          <p class="formulario__erro" role="alert" hidden></p>
          ${htmlCampos(campos, {}, 'cadastro')}
          <button type="submit" class="botao botao--bloco">Criar conta</button>
        </form>
        <p class="acesso__alternativa">Já tem conta? <a href="#/entrar">Entrar</a></p>
      </section>`,
  );

  const formulario = raiz.querySelector('form');
  ativarMascaras(formulario);

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formulario);
    if (!formulario.reportValidity()) return;

    const { confirmarSenha, ...dados } = lerValores(formulario, campos);
    if (dados.senha !== confirmarSenha) {
      mostrarErros(formulario, { message: 'As senhas não conferem.', detalhes: [{ campo: 'confirmarSenha', mensagem: 'As senhas não conferem.' }] });
      return;
    }

    const botao = formulario.querySelector('[type="submit"]');
    botao.disabled = true;
    botao.textContent = 'Criando conta…';
    try {
      const { token, usuario } = await api.cadastrar(dados);
      salvarSessao({ token, usuario }, false);
      irPara(rotaInicial(usuario));
    } catch (erro) {
      mostrarErros(formulario, erro);
      botao.disabled = false;
      botao.textContent = 'Criar conta';
    }
  });
}
