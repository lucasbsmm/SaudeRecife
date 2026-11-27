/* Service worker do Saúde Recife.
 * - Arquivos do aplicativo (HTML, CSS, JS, ícones): ficam em cache para abrir mesmo sem rede.
 * - Chamadas à API (/api): sempre vão à rede e nunca são guardadas, pois contêm dados de saúde.
 * Ao adicionar ou renomear arquivos em publico/, atualize ARQUIVOS e aumente VERSAO. */

const VERSAO = 'v1';
const CACHE = `saude-recife-${VERSAO}`;

const ARQUIVOS = [
  '/',
  '/css/base.css',
  '/css/componentes.css',
  '/css/layout.css',
  '/css/paginas.css',
  '/icones/icone-180.png',
  '/icones/icone-192.png',
  '/icones/icone-512.png',
  '/icones/icone-mascara-512.png',
  '/icones/logo.svg',
  '/index.html',
  '/js/api.js',
  '/js/componentes/avisos.js',
  '/js/componentes/cabecalho.js',
  '/js/componentes/cartaoConsulta.js',
  '/js/componentes/dialogo.js',
  '/js/componentes/estados.js',
  '/js/componentes/etapas.js',
  '/js/componentes/formulario.js',
  '/js/componentes/navegacao.js',
  '/js/estado.js',
  '/js/icones.js',
  '/js/paginas/admin/painel.js',
  '/js/paginas/admin/recurso.js',
  '/js/paginas/admin/recursos.js',
  '/js/paginas/agendaProfissional.js',
  '/js/paginas/agendar.js',
  '/js/paginas/agendarClinica.js',
  '/js/paginas/agendarConfirmar.js',
  '/js/paginas/agendarHorario.js',
  '/js/paginas/agendarProfissional.js',
  '/js/paginas/bemVindo.js',
  '/js/paginas/cadastro.js',
  '/js/paginas/consultaDetalhe.js',
  '/js/paginas/consultas.js',
  '/js/paginas/disponibilidade.js',
  '/js/paginas/entrar.js',
  '/js/paginas/inicio.js',
  '/js/paginas/perfil.js',
  '/js/paginas/triagem.js',
  '/js/paginas/triagemResultado.js',
  '/js/principal.js',
  '/js/roteador.js',
  '/js/sessao.js',
  '/js/utilitarios.js',
  '/manifest.webmanifest',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c.startsWith('saude-recife-') && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Navegação: tenta a rede e, sem conexão, entrega a casca do aplicativo.
  if (request.mode === 'navigate') {
    evento.respondWith(fetch(request).catch(() => caches.match('/index.html')));
    return;
  }

  // Demais arquivos: responde do cache e atualiza em segundo plano.
  evento.respondWith(
    caches.match(request).then((guardado) => {
      const daRede = fetch(request)
        .then((resposta) => {
          if (resposta.ok) {
            const copia = resposta.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copia));
          }
          return resposta;
        })
        .catch(() => guardado);
      return guardado || daRede;
    }),
  );
});
