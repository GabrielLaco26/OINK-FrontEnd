// Ícones (traço) usados pelo JavaScript. Nas páginas HTML os ícones já vêm escritos no próprio arquivo.
const svg = (d, tamanho = 24, traco = 1.8) =>
  `<svg aria-hidden="true" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${traco}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"></path></svg>`;

export const ICONES = {
  cartao: (t) => svg('M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18', t),
  inicio: (t) => svg('M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', t),
  pix: (t) => svg('M12 2.5l3.5 3.5-3.5 3.5L8.5 6zM12 14.5l3.5 3.5-3.5 3.5-3.5-3.5zM2.5 12L6 8.5 9.5 12 6 15.5zM14.5 12L18 8.5l3.5 3.5-3.5 3.5z', t, 1.6),
  menu: (t) => svg('M4 6h16M4 12h16M4 18h16', t),
  entrada: () => svg('M18 6L6 18M6 8v10h10', 18, 2),
  saida: () => svg('M6 18L18 6M8 6h10v10', 18, 2),
  olho: () => svg('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 20, 2),
  olhoFechado: () => svg('M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2', 20, 2),
  copiar: () => svg('M10 7h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM16 7V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h2', 20),
  check: () => svg('M20 6L9 17l-5-5', 20, 2.2),
};
