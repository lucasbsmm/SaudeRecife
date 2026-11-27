import { html, desenhar } from '../utilitarios.js';
import { icone } from '../icones.js';

const ITENS = {
  paciente: [
    { rotulo: 'Início', caminho: '/inicio', icone: 'casa' },
    { rotulo: 'Consultas', caminho: '/consultas', icone: 'prancheta' },
    { rotulo: 'Agendar', caminho: '/agendar', icone: 'calendario' },
    { rotulo: 'Perfil', caminho: '/perfil', icone: 'perfil' },
  ],
  profissional: [
    { rotulo: 'Agenda', caminho: '/agenda', icone: 'calendario' },
    { rotulo: 'Disponibilidade', caminho: '/disponibilidade', icone: 'relogio' },
    { rotulo: 'Perfil', caminho: '/perfil', icone: 'perfil' },
  ],
  administrador: [
    { rotulo: 'Painel', caminho: '/admin', icone: 'painel', exato: true },
    { rotulo: 'Clínicas', caminho: '/admin/clinicas', icone: 'clinica' },
    { rotulo: 'Profissionais', caminho: '/admin/profissionais', icone: 'profissional' },
    { rotulo: 'Consultas', caminho: '/admin/agendamentos', icone: 'prancheta' },
    { rotulo: 'Perfil', caminho: '/perfil', icone: 'perfil' },
  ],
};

function itemAtivo(item, caminhoAtual) {
  if (item.exato) return caminhoAtual === item.caminho;
  return caminhoAtual === item.caminho || caminhoAtual.startsWith(`${item.caminho}/`);
}

export function desenharNavegacao(usuario, caminhoAtual) {
  const itens = ITENS[usuario.perfil] ?? [];
  desenhar(
    document.getElementById('navegacao'),
    html`
      <div class="navegacao__marca">
        <img src="/icones/logo.svg" alt="" width="40" height="40">
        <span>Saúde Recife</span>
      </div>
      <ul class="navegacao__lista">
        ${itens.map(
          (item) => html`
            <li>
              <a class="navegacao__link" href="#${item.caminho}" ${itemAtivo(item, caminhoAtual) ? html`aria-current="page"` : ''}>
                ${icone(item.icone)}<span>${item.rotulo}</span>
              </a>
            </li>`,
        )}
      </ul>`,
  );
}
