const CHAVE = 'saude-recife:sessao';

function ler(armazenamento) {
  try {
    return JSON.parse(armazenamento.getItem(CHAVE));
  } catch {
    return null;
  }
}

let sessao = ler(localStorage) ?? ler(sessionStorage);

/** Com "lembrar-me" a sessão fica no localStorage; sem ele, só até fechar a aba. */
export function salvarSessao({ token, usuario }, lembrar = false) {
  sessao = { token, usuario };
  localStorage.removeItem(CHAVE);
  sessionStorage.removeItem(CHAVE);
  (lembrar ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify(sessao));
}

export function atualizarUsuario(usuario) {
  if (!sessao) return;
  sessao = { ...sessao, usuario };
  const armazenamento = localStorage.getItem(CHAVE) ? localStorage : sessionStorage;
  armazenamento.setItem(CHAVE, JSON.stringify(sessao));
}

export function encerrarSessao() {
  sessao = null;
  localStorage.removeItem(CHAVE);
  sessionStorage.removeItem(CHAVE);
}

export const obterToken = () => sessao?.token ?? null;
export const obterUsuario = () => sessao?.usuario ?? null;
export const estaAutenticado = () => Boolean(sessao?.token);
