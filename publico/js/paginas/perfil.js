import { api } from '../api.js';
import { atualizarUsuario, encerrarSessao } from '../sessao.js';
import { irPara } from '../roteador.js';
import { estado, reiniciarAgendamento } from '../estado.js';
import { html, desenhar, formatarCpf, hojeEmRecife } from '../utilitarios.js';
import { icone } from '../icones.js';
import { avisar } from '../componentes/avisos.js';
import { confirmar } from '../componentes/dialogo.js';
import { htmlCampos, lerValores, limparErros, mostrarErros, ativarMascaras } from '../componentes/formulario.js';

const PERFIS = { paciente: 'Paciente', profissional: 'Profissional de saúde', administrador: 'Administrador' };

const camposPaciente = [
  { nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, autocomplete: 'name' },
  { nome: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, autocomplete: 'email' },
  { nome: 'telefone', rotulo: 'Telefone com DDD', tipo: 'telefone', autocomplete: 'tel-national' },
  { nome: 'dataNascimento', rotulo: 'Data de nascimento', tipo: 'data', obrigatorio: true, maximo: hojeEmRecife() },
  { nome: 'bairro', rotulo: 'Bairro', autocomplete: 'address-level3' },
];

const camposSenha = [
  { nome: 'senhaAtual', rotulo: 'Senha atual', tipo: 'senha', obrigatorio: true, autocomplete: 'current-password' },
  { nome: 'novaSenha', rotulo: 'Nova senha', tipo: 'senha', obrigatorio: true, autocomplete: 'new-password', ajuda: 'Use ao menos 8 caracteres, com letras e números.' },
];

function blocoDadosPaciente(paciente) {
  return html`
    <section class="secao" aria-labelledby="titulo-dados">
      <h2 id="titulo-dados">Meus dados</h2>
      <p class="texto-suave">CPF ${formatarCpf(paciente.cpf)}</p>
      <form class="formulario" id="form-dados" novalidate>
        <p class="formulario__erro" role="alert" hidden></p>
        ${htmlCampos(camposPaciente, paciente, 'perfil')}
        <button type="submit" class="botao botao--bloco">Salvar alterações</button>
      </form>
    </section>`;
}

function blocoDadosProfissional(profissional) {
  return html`
    <section class="secao" aria-labelledby="titulo-dados">
      <h2 id="titulo-dados">Dados profissionais</h2>
      <dl class="detalhes">
        <div><dt>CRM</dt><dd>${profissional?.crm}</dd></div>
        <div><dt>Especialidade</dt><dd>${profissional?.especialidade?.nome}</dd></div>
        <div><dt>Clínicas</dt><dd>${(profissional?.clinicas ?? []).map((c) => c.nome).join(', ') || 'Nenhuma clínica associada'}</dd></div>
      </dl>
    </section>`;
}

export function renderizar({ raiz, usuario, atualizar }) {
  desenhar(
    raiz,
    html`
      <h1>${usuario.nome}</h1>
      <p class="texto-suave">${PERFIS[usuario.perfil]}, ${usuario.email}</p>

      ${usuario.perfil === 'paciente' ? blocoDadosPaciente(usuario.vinculo) : ''}
      ${usuario.perfil === 'profissional' ? blocoDadosProfissional(usuario.vinculo) : ''}

      <section class="secao" aria-labelledby="titulo-senha">
        <h2 id="titulo-senha">Alterar senha</h2>
        <form class="formulario" id="form-senha" novalidate>
          <p class="formulario__erro" role="alert" hidden></p>
          ${htmlCampos(camposSenha, {}, 'senha')}
          <button type="submit" class="botao botao--secundario botao--bloco">Atualizar senha</button>
        </form>
      </section>

      <button type="button" class="botao botao--perigo-contorno botao--bloco" data-sair>${icone('sair', 20)} Sair da conta</button>`,
  );

  const formDados = raiz.querySelector('#form-dados');
  if (formDados) {
    ativarMascaras(formDados);
    formDados.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      limparErros(formDados);
      if (!formDados.reportValidity()) return;

      const botao = formDados.querySelector('[type="submit"]');
      botao.disabled = true;
      try {
        const paciente = await api.atualizar('pacientes', usuario.vinculo.id, lerValores(formDados, camposPaciente));
        atualizarUsuario({ ...usuario, nome: paciente.nome, email: paciente.email, vinculo: paciente });
        avisar('Dados atualizados.', 'sucesso');
        await atualizar();
      } catch (erro) {
        mostrarErros(formDados, erro);
        botao.disabled = false;
      }
    });
  }

  const formSenha = raiz.querySelector('#form-senha');
  formSenha.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limparErros(formSenha);
    if (!formSenha.reportValidity()) return;

    const botao = formSenha.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      await api.alterarSenha(lerValores(formSenha, camposSenha));
      formSenha.reset();
      avisar('Senha alterada com sucesso.', 'sucesso');
    } catch (erro) {
      mostrarErros(formSenha, erro);
    } finally {
      botao.disabled = false;
    }
  });

  raiz.querySelector('[data-sair]').addEventListener('click', async () => {
    if (!(await confirmar({ titulo: 'Sair da conta', mensagem: 'Deseja encerrar sua sessão neste aparelho?', textoConfirmar: 'Sair' }))) return;
    encerrarSessao();
    reiniciarAgendamento();
    estado.triagem = null;
    irPara('/entrar');
  });
}
