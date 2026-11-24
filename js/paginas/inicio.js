import { iniciarPagina } from './comum.js';
import * as api from '../api.js';
import { obterNome, obterCpf, limparSessao } from '../sessao.js';
import { ICONES } from '../icones.js';
import { $, formatarMoeda, primeiroNome, iniciais, criarItemTransacao, mensagemDeErro } from '../ui.js';

const PREF_OCULTAR = 'oink_ocultar_saldo';
let saldoAtual = null;

function mostrarNome(nome) {
  $('#primeiro-nome').textContent = primeiroNome(nome);
  $('#iniciais').textContent = iniciais(nome);
}

// ---------- Saldo com botão de ocultar (a preferência fica salva no aparelho) ----------
function saldoOculto() {
  return localStorage.getItem(PREF_OCULTAR) === '1';
}
function desenharSaldo() {
  const oculto = saldoOculto();
  $('#saldo').textContent = oculto || saldoAtual === null ? 'R$ ••••' : formatarMoeda(saldoAtual);
  const botao = $('#olho-saldo');
  botao.innerHTML = oculto ? ICONES.olho() : ICONES.olhoFechado();
  botao.setAttribute('aria-label', oculto ? 'Mostrar saldo' : 'Ocultar saldo');
}
$('#olho-saldo').addEventListener('click', () => {
  localStorage.setItem(PREF_OCULTAR, saldoOculto() ? '0' : '1');
  desenharSaldo();
});

async function carregar() {
  mostrarNome(obterNome());
  desenharSaldo();

  try {
    const cpf = obterCpf();
    const [conta, extrato] = await Promise.all([api.consultarConta(cpf), api.consultarExtrato(cpf)]);

    if (conta.status === 'DEACTIVATED') {
      location.replace('conta-fechada.html');
      return;
    }
    $('#dados-conta').textContent = `Ag. ${conta.agencia} · Conta ${conta.numero}`;
    saldoAtual = conta.saldo;
    desenharSaldo();

    const lista = $('#extrato');
    lista.replaceChildren(...extrato.slice(0, 4).map((t) => criarItemTransacao(t, { mostrarDia: true })));
    lista.setAttribute('aria-busy', 'false');
    $('#extrato-status').textContent = 'Nenhuma movimentação ainda. Que tal fazer a primeira transferência?';
    $('#extrato-status').hidden = extrato.length > 0;
  } catch (erro) {
    if (erro.codigo === 'ACCOUNT_NOT_FOUND') { // conta não existe mais: volta para o login
      limparSessao();
      location.replace('entrar.html');
      return;
    }
    const { titulo, texto } = mensagemDeErro(erro);
    $('#extrato-status').textContent = `${titulo}. ${texto}`;
  }
}

if (iniciarPagina({ menu: 'inicio' })) carregar();
