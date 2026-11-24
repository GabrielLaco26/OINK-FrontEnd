// Início comum de toda página: PWA, login exigido e menu inferior.
import { registrarServiceWorker, montarMenuInferior } from '../ui.js';
import { exigirLogin } from '../sessao.js';

// menu: 'cartao' | 'cofrinho' | 'inicio' | 'pix' | 'menu' | null (mostra o menu sem aba ativa) | undefined (sem menu)
export function iniciarPagina({ exigeLogin = true, menu } = {}) {
  registrarServiceWorker();
  if (exigeLogin && !exigirLogin()) return false;
  if (menu !== undefined) montarMenuInferior(menu);
  return true;
}
