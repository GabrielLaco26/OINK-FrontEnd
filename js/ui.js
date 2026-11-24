// =========================================================
// Utilidades de interface compartilhadas por todas as telas
// =========================================================
import { ICONES } from './icones.js';

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

// ---------- PWA ----------
export function registrarServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sem PWA, o app funciona igual */ });
  }
}

// ---------- Formatação ----------
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const formatarMoeda = (valor) => moeda.format(Number(valor) || 0);
export const soDigitos = (texto) => String(texto || '').replace(/\D/g, '');

export function formatarCPF(cpf) {
  const d = soDigitos(cpf).padStart(11, '0');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// CPF parcialmente escondido para mostrar dados de outra pessoa: •••.654.321-••
export function mascararCPF(cpf) {
  const f = formatarCPF(cpf);
  return `•••${f.slice(3, 11)}-••`;
}

export function formatarTelefone(tel) {
  const d = soDigitos(tel);
  if (d.length < 10) return tel || '';
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

const mesmoDia = (a, b) => a.toDateString() === b.toDateString();
export function rotuloDoDia(dataISO) {
  const data = new Date(dataISO);
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
  if (mesmoDia(data, hoje)) return 'Hoje';
  if (mesmoDia(data, ontem)) return 'Ontem';
  return data.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}
export const formatarHora = (dataISO) =>
  new Date(dataISO).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || '';
export const iniciais = (nome) => {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
};

// ---------- Máscaras de digitação ----------
function aplicarMascara(input, formatar) {
  input.addEventListener('input', () => { input.value = formatar(input.value); });
}

export const mascaraCPF = (input) => aplicarMascara(input, (v) => {
  const d = soDigitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
});

export const mascaraTelefone = (input) => aplicarMascara(input, (v) => {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
});

export const mascaraData = (input) => aplicarMascara(input, (v) => {
  const d = soDigitos(v).slice(0, 8);
  return d.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
});

// Valor em reais: a pessoa digita só números e o campo forma "R$ 1.234,56"
export const mascaraMoeda = (input) => aplicarMascara(input, (v) => {
  const d = soDigitos(v).slice(0, 11);
  return d ? formatarMoeda(Number(d) / 100) : '';
});
export const lerMoeda = (texto) => Number(soDigitos(texto)) / 100;

// ---------- Validações (a validação oficial é sempre do back) ----------
export function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digito = (n) => {
    const soma = d.slice(0, n).split('').reduce((s, x, i) => s + Number(x) * (n + 1 - i), 0);
    return ((soma * 10) % 11) % 10;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim());

// "14/05/2003" -> "2003-05-14" (ou null se a data não existir / for no futuro)
export function dataParaISO(dataBR) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBR || '');
  if (!m) return null;
  const [, dia, mes, ano] = m.map(Number);
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  if (data > new Date() || ano < 1900) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Marca/desmarca o erro de um campo: <div class="campo"> ... <span class="erro-campo" id="erro-x">
export function erroNoCampo(input, mensagem) {
  const campo = input.closest('.campo');
  const alvo = campo && campo.querySelector('.erro-campo');
  if (campo) campo.classList.toggle('invalido', Boolean(mensagem));
  if (alvo) alvo.textContent = mensagem || '';
  input.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
  return !mensagem;
}

// ---------- Botões de mostrar/ocultar senha ----------
// <button type="button" class="btn-icone" data-olho="id-do-input">
export function ativarOlhos(raiz = document) {
  $$('[data-olho]', raiz).forEach((botao) => {
    const input = document.getElementById(botao.dataset.olho);
    const atualizar = () => {
      const visivel = input.type === 'text';
      botao.innerHTML = visivel ? ICONES.olho() : ICONES.olhoFechado();
      botao.setAttribute('aria-label', visivel ? 'Ocultar senha' : 'Mostrar senha');
    };
    botao.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      atualizar();
    });
    atualizar();
  });
}

// ---------- Tela de carregamento (porquinho nas moedas) ----------
let overlay;
export function mostrarCarregando(titulo = 'Carregando') {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'carregando';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <img src="assets/img/porquinho-moedas.png" alt="">
      <h2><span class="titulo"></span><span class="pontos" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></h2>
      <p></p>`;
    document.body.appendChild(overlay);
  }
  overlay.querySelector('.titulo').textContent = titulo;
  overlay.hidden = false;
}
export function esconderCarregando() {
  if (overlay) overlay.hidden = true;
}

// Executa uma chamada à API mostrando o carregamento durante a espera
// Se demorar (servidor do Render "acordando"), avisa a pessoa para não desistir.
const TEXTO_PADRAO = 'Só um instante, o porquinho está cuidando disso.';
export async function comCarregando(titulo, acao) {
  mostrarCarregando(titulo);
  const texto = overlay.querySelector('p');
  texto.textContent = TEXTO_PADRAO;
  const aviso = setTimeout(() => {
    texto.textContent = 'O servidor está acordando, isso pode levar até 1 minuto. Não feche o app.';
  }, 5000);
  try {
    return await acao();
  } finally {
    clearTimeout(aviso);
    esconderCarregando();
  }
}

// ---------- Aviso rápido ----------
let toastTimer;
export function avisar(mensagem) {
  let el = $('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = mensagem;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

export async function copiar(texto, mensagem = 'Copiado!') {
  try {
    await navigator.clipboard.writeText(texto);
    avisar(mensagem);
  } catch {
    avisar('Não foi possível copiar.');
  }
}

// ---------- Mensagens de erro da API (o back detecta, o front explica) ----------
// Chave = "code" devolvido pela API (documento "Integração da API").
const MENSAGENS = {
  // Gerais / rede
  ERRO_REDE: ['Sem conexão', 'Não conseguimos falar com o servidor. Confira sua internet e tente de novo.'],
  TEMPO_ESGOTADO: ['O servidor demorou demais', 'Ele pode estar acordando. Espere alguns segundos e tente de novo.'],
  VALIDATION_ERROR: ['Dados inválidos', 'Confira as informações preenchidas e tente de novo.'],
  INVALID_JSON: ['Algo deu errado', 'Não conseguimos enviar os dados. Tente de novo.'],
  DATA_INTEGRITY_VIOLATION: ['Não foi possível salvar', 'Confira os dados e tente de novo.'],
  INTERNAL_SERVER_ERROR: ['Erro no servidor', 'Algo falhou do nosso lado. Tente de novo em instantes.'],
  // Cadastro e login
  CPF_ALREADY_EXISTS: ['CPF já cadastrado', 'Já existe uma conta com esse CPF. Tente entrar.'],
  EMAIL_ALREADY_EXISTS: ['E-mail já cadastrado', 'Esse e-mail já está em uso. Use outro.'],
  INVALID_CREDENTIALS: ['CPF ou senha incorretos', 'Confira os dados e tente de novo.'],
  ACCOUNT_CLOSED: ['Conta encerrada', 'Essa conta foi encerrada e não permite mais acesso.'],
  // Conta
  ACCOUNT_NOT_FOUND: ['Conta não encontrada', 'Não encontramos uma conta para esse CPF.'],
  ACCOUNT_NOT_ACTIVE: ['Conta não está ativa', 'As duas contas precisam estar ativas para transferir.'],
  ACCOUNT_WITH_BALANCE: ['Seu saldo não está zerado', 'Para encerrar a conta, o saldo precisa ser R$ 0,00. Transfira o valor antes.'],
  ACCOUNT_NOT_DEACTIVATED: ['A conta já está ativa', 'Sua conta não está aguardando reativação.'],
  REACTIVATION_PERIOD_EXPIRED: ['Prazo encerrado', 'O prazo de 7 dias para reativar a conta terminou.'],
  INVALID_DEACTIVATION_DATE: ['Não foi possível reativar', 'Encontramos um problema na sua conta. Fale com o suporte.'],
  // Transferência
  SAME_ACCOUNT_TRANSFER: ['Esse CPF é o seu', 'Não dá para transferir para a sua própria conta.'],
  INSUFFICIENT_BALANCE: ['Saldo insuficiente', 'Você não tem saldo suficiente para essa transferência.'],
  PIN_INVALID: ['PIN incorreto', 'O PIN de transferência não confere. Tente de novo.'],
  PIN_NOT_REGISTERED: ['Crie seu PIN', 'Você ainda não tem um PIN de transferência.'],
  ORIGIN_ACCOUNT_NOT_FOUND: ['Conta não encontrada', 'Não encontramos a sua conta. Entre de novo no app.'],
  DESTINATION_ACCOUNT_NOT_FOUND: ['CPF não encontrado', 'Não encontramos nenhuma conta Oink com esse CPF. Confira e tente de novo.'],
  DUPLICATE_TRANSFER_LIMIT: ['Transferência bloqueada', 'Você já fez duas transferências iguais nos últimos 2 minutos. Aguarde um pouco e tente de novo.'],
};
export function mensagemDeErro(erro) {
  const m = MENSAGENS[erro && erro.codigo];
  return m
    ? { titulo: m[0], texto: m[1] }
    : { titulo: 'Algo deu errado', texto: 'Tente de novo em instantes.' };
}

// ---------- Lista de transações ----------
// Montada com textContent (nomes e descrições vêm de outras pessoas: nunca use innerHTML neles)
export function criarItemTransacao(t, { mostrarDia = false } = {}) {
  const entrada = t.tipo === 'ENTRADA';
  const li = document.createElement('li');
  li.className = `transacao transacao--${entrada ? 'entrada' : 'saida'}`;

  const icone = document.createElement('span');
  icone.className = 'transacao__icone';
  icone.innerHTML = entrada ? ICONES.entrada() : ICONES.saida();

  const info = document.createElement('div');
  info.className = 'transacao__info';
  const titulo = document.createElement('span');
  titulo.className = 'transacao__titulo';
  titulo.textContent = entrada ? 'Transferência recebida' : 'Transferência enviada';
  const sub = document.createElement('span');
  sub.className = 'transacao__sub';
  sub.textContent = t.descricao ? `${t.contraparte.nome} · ${t.descricao}` : t.contraparte.nome;
  info.append(titulo, sub);

  const valores = document.createElement('div');
  valores.className = 'transacao__valores';
  const valor = document.createElement('span');
  valor.className = 'transacao__valor';
  valor.textContent = `${entrada ? '+' : '-'} ${formatarMoeda(t.valor)}`;
  const quando = document.createElement('span');
  quando.className = 'transacao__sub';
  const dia = rotuloDoDia(t.dataHora);
  quando.textContent = mostrarDia && dia !== 'Hoje' ? dia : formatarHora(t.dataHora);
  valores.append(valor, quando);

  li.append(icone, info, valores);
  return li;
}

// ---------- Menu inferior (lombada na aba ativa) ----------
// ativo: 'cartao' | 'cofrinho' | 'inicio' | 'pix' | 'menu' | null
export function montarMenuInferior(ativo) {
  const itens = [
    { id: 'cartao', rotulo: 'Cartão', href: 'cartao.html', icone: ICONES.cartao(26) },
    { id: 'cofrinho', rotulo: 'Cofrinho', href: 'cofrinho.html', icone: '<img src="assets/img/rosto-creme.png" alt="">' },
    { id: 'inicio', rotulo: 'Início', href: 'inicio.html', icone: ICONES.inicio(26) },
    { id: 'pix', rotulo: 'PIX', href: 'pix.html', icone: ICONES.pix(26) },
    { id: 'menu', rotulo: 'Menu', href: 'menu.html', icone: ICONES.menu(26) },
  ];
  const nav = document.createElement('nav');
  nav.className = 'menu-inferior';
  nav.setAttribute('aria-label', 'Menu principal');
  nav.innerHTML = itens.map((it) => `
    <a class="menu-inferior__item" href="${it.href}" ${it.id === ativo ? `aria-current="page" aria-label="${it.rotulo}"` : ''}>
      <span class="menu-inferior__icone">${it.icone}</span>
      <span class="menu-inferior__rotulo">${it.rotulo}</span>
    </a>`).join('');
  document.querySelector('.app').appendChild(nav);
}
