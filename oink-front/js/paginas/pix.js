// Transferência entre contas Oink usando o CPF de quem recebe (POST /transfers).
// Confirmação com PIN de transferência de 4 dígitos:
//   - 1ª transferência: o app envia SEM PIN; a API responde PIN_NOT_REGISTERED;
//     o cliente cria o PIN e o app reenvia o mesmo pedido COM o PIN.
//   - Depois disso o app já pede o PIN direto (lembra no aparelho que ele existe).
import { iniciarPagina } from './comum.js';
import * as api from '../api.js';
import { REGRAS } from '../config.js';
import { obterCpf, pinJaCadastrado, marcarPinCadastrado } from '../sessao.js';
import {
  $, formatarMoeda, mascaraMoeda, lerMoeda, mascaraCPF, mascararCPF, cpfValido, soDigitos,
  ativarOlhos, erroNoCampo, comCarregando, mensagemDeErro,
} from '../ui.js';

const etapas = ['form', 'confirmar', 'sucesso', 'erro'];
const chave = $('#chave');
const valor = $('#valor');
const descricao = $('#descricao');
const pin = $('#pin');
const novoPin = $('#novo-pin');
const confirmaPin = $('#confirma-pin');

const meuCpf = obterCpf();
let saldo = null;
let pedido = null;          // { destinoCpf, valor, descricao }
let modoPin = 'desconhecido'; // 'desconhecido' (envia sem PIN) | 'pedir' | 'criar'

function mostrarEtapa(nome) {
  etapas.forEach((e) => { $(`#etapa-${e}`).hidden = e !== nome; });
  window.scrollTo(0, 0);
}

// Só números nos campos de PIN
[pin, novoPin, confirmaPin].forEach((input) => {
  input.addEventListener('input', () => { input.value = soDigitos(input.value).slice(0, 4); });
});

function definirModoPin(modo) {
  modoPin = modo;
  $('#bloco-pin').hidden = modo !== 'pedir';
  $('#bloco-criar-pin').hidden = modo !== 'criar';
  if (modo === 'pedir') pin.focus();
  if (modo === 'criar') novoPin.focus();
}

// ---------- 1. Preencher ----------
mascaraMoeda(valor);
mascaraCPF(chave);
ativarOlhos();

function conferirValor() {
  const v = lerMoeda(valor.value);
  let erro = '';
  if (v > REGRAS.LIMITE_TRANSFERENCIA) erro = 'O limite por transferência é de R$ 250.000,00.';
  else if (saldo !== null && v > saldo) erro = 'Valor maior que o seu saldo disponível.';
  erroNoCampo(valor, erro);
  $('#continuar').disabled = Boolean(erro);
  return !erro;
}
valor.addEventListener('input', conferirValor);
chave.addEventListener('input', () => erroNoCampo(chave, ''));

$('#etapa-form').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const destinoCpf = soDigitos(chave.value);
  const v = lerMoeda(valor.value);

  let erroChave = '';
  if (!cpfValido(destinoCpf)) erroChave = 'Digite um CPF válido.';
  else if (destinoCpf === meuCpf) erroChave = 'Esse CPF é o seu. Digite o CPF de outra pessoa.';
  if (!erroNoCampo(chave, erroChave)) return chave.focus();
  const valorOk = v > 0 ? conferirValor() : erroNoCampo(valor, 'Digite o valor da transferência.');
  if (!valorOk) return valor.focus();

  // A API não tem rota para buscar o nome pelo CPF: o nome aparece depois, pelo extrato
  pedido = { destinoCpf, valor: v, descricao: descricao.value.trim() };
  $('#r-para').textContent = `CPF ${mascararCPF(destinoCpf)}`;
  $('#r-valor').textContent = formatarMoeda(v);
  $('#r-descricao').textContent = pedido.descricao || '—';
  [pin, novoPin, confirmaPin].forEach((input) => { input.value = ''; erroNoCampo(input, ''); });
  mostrarEtapa('confirmar');
  definirModoPin(pinJaCadastrado(meuCpf) ? 'pedir' : 'desconhecido');
});

// ---------- 2. Confirmar ----------
$('#editar').addEventListener('click', () => mostrarEtapa('form'));

function pinParaEnviar() {
  if (modoPin === 'pedir') {
    return erroNoCampo(pin, /^\d{4}$/.test(pin.value) ? '' : 'Digite os 4 números do PIN.') ? pin.value : false;
  }
  if (modoPin === 'criar') {
    const ok1 = erroNoCampo(novoPin, /^\d{4}$/.test(novoPin.value) ? '' : 'O PIN precisa ter 4 números.');
    const ok2 = erroNoCampo(confirmaPin, confirmaPin.value === novoPin.value ? '' : 'Os PINs não são iguais.');
    if (!ok1) { novoPin.focus(); return false; }
    if (!ok2) { confirmaPin.focus(); return false; }
    return novoPin.value;
  }
  return null; // desconhecido: envia sem PIN para descobrir se precisa criar
}

$('#etapa-confirmar').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const pinEnviado = pinParaEnviar();
  if (pinEnviado === false) return;

  const botao = $('#confirmar');
  botao.disabled = true; // evita clique duplo
  try {
    await comCarregando('Enviando seu Pix', () => api.transferir({
      origemCpf: meuCpf,
      destinoCpf: pedido.destinoCpf,
      valor: pedido.valor,
      descricao: pedido.descricao,
      pin: pinEnviado || undefined,
    }));
    marcarPinCadastrado(meuCpf);
    await mostrarSucesso();
  } catch (erro) {
    // Quando o PIN é enviado no modo "criar", a API já o cadastra antes de transferir
    if (modoPin === 'criar' && erro.codigo !== 'PIN_NOT_REGISTERED' && erro.codigo !== 'VALIDATION_ERROR') marcarPinCadastrado(meuCpf);

    if (erro.codigo === 'PIN_NOT_REGISTERED') {
      definirModoPin('criar');
    } else if (erro.codigo === 'PIN_INVALID' && modoPin === 'desconhecido') {
      // A conta já tem PIN (criado em outro aparelho): pede o PIN
      marcarPinCadastrado(meuCpf);
      definirModoPin('pedir');
    } else if (erro.codigo === 'PIN_INVALID') {
      pin.value = '';
      erroNoCampo(pin, 'PIN incorreto. Tente de novo.');
      definirModoPin('pedir');
    } else {
      mostrarErro(erro);
    }
  } finally {
    botao.disabled = false;
  }
});

// ---------- 3. Sucesso ----------
// A API responde 201 sem corpo: buscamos a transferência no extrato para mostrar o nome e o código.
async function mostrarSucesso() {
  if (saldo !== null) saldo -= pedido.valor;
  let feita = null;
  try {
    const extrato = await api.consultarExtrato(meuCpf);
    feita = extrato.find((t) => t.tipo === 'SAIDA' && Math.abs(t.valor - pedido.valor) < 0.005);
  } catch { /* sem extrato, mostra o que já sabemos */ }

  const para = feita ? feita.contraparte.nome : `CPF ${mascararCPF(pedido.destinoCpf)}`;
  $('#s-resumo').textContent = `${formatarMoeda(pedido.valor)} para ${para}. O comprovante fica salvo no seu histórico.`;
  $('#s-data').textContent = new Date(feita ? feita.dataHora : Date.now())
    .toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  $('#s-codigo').textContent = feita ? String(feita.id) : '—';
  mostrarEtapa('sucesso');
}

$('#nova').addEventListener('click', () => {
  chave.value = '';
  valor.value = '';
  descricao.value = '';
  atualizarDicaSaldo();
  mostrarEtapa('form');
  chave.focus();
});

// ---------- 4. Erro ----------
function mostrarErro(erro) {
  const { titulo, texto } = mensagemDeErro(erro);
  // Se a MINHA conta não está ativa, oferece a reativação
  const minhaContaInativa = erro.codigo === 'ACCOUNT_NOT_ACTIVE' && contaDesativada;
  $('#e-titulo').textContent = minhaContaInativa ? 'Sua conta está desativada' : titulo;
  $('#e-texto').textContent = minhaContaInativa ? 'Contas desativadas não podem fazer transferências. Reative a conta para voltar a usar.' : texto;
  $('#e-reativar').hidden = !minhaContaInativa;
  $('#e-tentar').hidden = minhaContaInativa;
  mostrarEtapa('erro');
}
$('#e-tentar').addEventListener('click', () => mostrarEtapa('form'));

// ---------- Saldo e status da conta ----------
let contaDesativada = false;

function atualizarDicaSaldo() {
  $('#dica-valor').textContent =
    `Saldo disponível: ${saldo === null ? '…' : formatarMoeda(saldo)} · Limite por transferência: R$ 250.000,00`;
}

async function carregarConta() {
  try {
    const conta = await api.consultarConta(meuCpf);
    saldo = conta.saldo;
    contaDesativada = conta.status !== 'ACTIVE';
  } catch {
    saldo = null; // sem saldo na tela, o back continua validando
  }
  atualizarDicaSaldo();
  if (valor.value) conferirValor();
}

if (iniciarPagina({ menu: 'pix' })) carregarConta();
