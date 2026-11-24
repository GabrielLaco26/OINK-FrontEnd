// =========================================================
// Service worker do Oink (PWA)
// =========================================================
// Guarda as telas, estilos, scripts e imagens no aparelho para o app
// funcionar sem internet. Chamadas à API NUNCA são guardadas.
// Ao adicionar um arquivo novo ao app, coloque-o na lista ARQUIVOS e
// aumente a VERSAO.

const VERSAO = 'oink-v3';

const ARQUIVOS = [
  './', 'index.html', 'boas-vindas.html', 'entrar.html', 'cadastro.html', 'recuperar-senha.html',
  'inicio.html', 'pix.html', 'historico.html', 'perfil.html', 'menu.html', 'cartao.html',
  'cofrinho.html', 'simulacao.html', 'encerrar-conta.html', 'conta-fechada.html', 'em-breve.html',
  'manifest.webmanifest',
  'css/base.css', 'css/componentes.css', 'css/paginas.css',
  'js/config.js', 'js/erros.js', 'js/sessao.js', 'js/mock.js', 'js/api.js', 'js/icones.js', 'js/ui.js',
  'js/paginas/comum.js', 'js/paginas/entrar.js', 'js/paginas/cadastro.js', 'js/paginas/inicio.js',
  'js/paginas/pix.js', 'js/paginas/historico.js', 'js/paginas/perfil.js',
  'assets/img/logo-oink.png', 'assets/img/bem-vindo.png', 'assets/img/fundo-padrao.webp',
  'assets/img/porquinho-espiando.png', 'assets/img/porquinho-moedas.png',
  'assets/img/rosto-creme.png', 'assets/img/rosto-rosa.png',
  'assets/icones/icone-192.png', 'assets/icones/icone-512.png', 'assets/icones/icone-maskable-512.png',
  'assets/icones/apple-touch-icon.png', 'assets/icones/favicon-48.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;

  const url = new URL(pedido.url);

  // Fontes do Google: usa a cópia guardada e atualiza em segundo plano
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    evento.respondWith(
      caches.open(VERSAO).then(async (cache) => {
        const guardado = await cache.match(pedido);
        const daRede = fetch(pedido).then((resposta) => { cache.put(pedido, resposta.clone()); return resposta; }).catch(() => guardado);
        return guardado || daRede;
      }),
    );
    return;
  }

  // Outros domínios (inclusive a API no Render): direto na rede, nunca guardados
  if (url.origin !== location.origin) return;

  // Arquivos do app: rede primeiro (mudanças aparecem na hora) e,
  // sem internet, a cópia guardada.
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido, { ignoreSearch: true })),
  );
});
