/** Mensagens rápidas, anunciadas por leitores de tela através da região aria-live. */
export function avisar(mensagem, tipo = 'info') {
  const regiao = document.getElementById('avisos');
  const aviso = document.createElement('p');
  aviso.className = `aviso aviso--${tipo}`;
  aviso.textContent = mensagem;
  regiao.append(aviso);
  setTimeout(() => aviso.remove(), tipo === 'erro' ? 6500 : 4000);
}
