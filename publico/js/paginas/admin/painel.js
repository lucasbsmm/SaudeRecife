import { api } from '../../api.js';
import { html, desenhar } from '../../utilitarios.js';
import { icone } from '../../icones.js';

const CADASTROS = [
  { chave: 'clinicas', titulo: 'Clínicas', icone: 'clinica', total: 'clinicas' },
  { chave: 'profissionais', titulo: 'Profissionais', icone: 'profissional', total: 'profissionais' },
  { chave: 'especialidades', titulo: 'Especialidades', icone: 'especialidade', total: 'especialidades' },
  { chave: 'pacientes', titulo: 'Pacientes', icone: 'pacientes', total: 'pacientes' },
  { chave: 'disponibilidades', titulo: 'Disponibilidades', icone: 'disponibilidade' },
  { chave: 'agendamentos', titulo: 'Consultas', icone: 'prancheta' },
];

export async function renderizar({ raiz }) {
  const resumo = await api.resumoAdministracao();

  desenhar(
    raiz,
    html`
      <h1>Painel administrativo</h1>

      <section class="secao" aria-labelledby="titulo-hoje">
        <h2 id="titulo-hoje">Movimento</h2>
        <dl class="indicadores">
          <div><dt>Consultas hoje</dt><dd>${resumo.consultasHoje}</dd></div>
          <div><dt>Consultas futuras</dt><dd>${resumo.consultasFuturas}</dd></div>
        </dl>
      </section>

      <section class="secao" aria-labelledby="titulo-cadastros">
        <h2 id="titulo-cadastros">Cadastros</h2>
        <ul class="grade-atalhos">
          ${CADASTROS.map(
            (c) => html`
              <li>
                <a class="atalho atalho--lateral" href="#/admin/${c.chave}">
                  ${icone(c.icone, 28)}
                  <span>${c.titulo}${c.total ? html`<small>${resumo[c.total]} ${resumo[c.total] === 1 ? 'registro ativo' : 'registros ativos'}</small>` : ''}</span>
                </a>
              </li>`,
          )}
        </ul>
      </section>`,
  );
}
