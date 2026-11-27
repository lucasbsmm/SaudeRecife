import { bruto } from './utilitarios.js';

const tracos = {
  casa: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  prancheta: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 12h6M12 9v6"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  local: '<path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  lixeira: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  sair: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
  painel: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  clinica: '<path d="M4 21V6l8-3 8 3v15M3 21h18"/><path d="M12 8v6M9 11h6"/>',
  profissional: '<path d="M6 3v6a4 4 0 008 0V3M10 13v3a4 4 0 008 0v-1"/><circle cx="18" cy="13" r="2"/>',
  especialidade: '<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8z"/>',
  pacientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/><path d="M16 4.7a3.5 3.5 0 010 6.6M18 14.8c2.2.6 3.5 2.3 3.5 5.2"/>',
  disponibilidade: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/><path d="M3 4l3 2M21 4l-3 2" />',
  check: '<path d="M5 12l5 5 9-10"/>',
  alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  telefone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A15 15 0 013 6a2 2 0 012-2z"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4M6.3 6.4A17 17 0 002 12s3.5 7 10 7a9.6 9.6 0 004-.9"/>',
  // sintomas
  'dor-de-cabeca': '<path d="M9 21v-4c-2-1-4-3-4-6a7 7 0 0114 0c0 1.5-.5 2.5-1 3.5V21z"/><path d="M4 3l1.5 2M2 8h2.5M19 3l-1.5 2"/>',
  tosse: '<path d="M3 9h7M3 13h5M3 17h7"/><path d="M14 6c4 0 7 2.5 7 6s-3 6-7 6c-1 0-1.8-.2-2.5-.5"/><circle cx="15" cy="12" r="1.5"/>',
  febre: '<path d="M10 14.5V5a2 2 0 014 0v9.5a4 4 0 11-4 0z"/><path d="M12 9v7"/>',
  'dor-no-corpo': '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 11h10M12 15l-3 6M12 15l3 6"/><path d="M3 8l2 1M21 8l-2 1M3 15l2-1M21 15l-2-1"/>',
  'dificuldade-para-respirar': '<path d="M9 4v8c0 3-1 6-4 7-1-4 0-10 4-15zM15 4v8c0 3 1 6 4 7 1-4 0-10-4-15z"/><path d="M12 3v7"/>',
  'nariz-entupido': '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 15a2.5 2.5 0 002.5 2.5"/>',
  outro: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
};

export function icone(nome, tamanho = 24) {
  return bruto(
    `<svg class="icone" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${tracos[nome] ?? ''}</svg>`,
  );
}
