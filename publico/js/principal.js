import { iniciarRoteador } from './roteador.js';

function acompanharConexao() {
  const aviso = document.getElementById('aviso-offline');
  const atualizar = () => {
    aviso.hidden = navigator.onLine;
  };
  window.addEventListener('online', atualizar);
  window.addEventListener('offline', atualizar);
  atualizar();
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((erro) => {
      console.warn('Não foi possível registrar o service worker:', erro);
    });
  });
}

// O link "pular" não pode mudar o hash (isso dispararia o roteador), então só move o foco.
document.querySelector('.pular-conteudo').addEventListener('click', (evento) => {
  evento.preventDefault();
  document.getElementById('conteudo').focus();
});

acompanharConexao();
registrarServiceWorker();
iniciarRoteador();
