// =========================================================
// Camada de API — o ÚNICO lugar que conversa com o back
// =========================================================
// Segue o documento "Integração da API" do back (API Spring no Render).
// As telas usam só estas funções e recebem os dados já "traduzidos" para
// o formato do front (português). Se a API mudar um nome de campo, ajuste
// apenas as funções "...DaApi" abaixo.

import { CONFIG } from './config.js';
import { ApiErro } from './erros.js';
import * as mock from './mock.js';

export { ApiErro };

// ---------- Requisição HTTP ----------
// Só envia Content-Type: a API não usa token e o CORS do back só libera esse cabeçalho.
async function requisicao(metodo, rota, corpo) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), CONFIG.TEMPO_LIMITE_MS);
  let resposta;
  try {
    resposta = await fetch(CONFIG.API_URL + rota, {
      method: metodo,
      headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controle.signal,
    });
  } catch (erro) {
    if (erro.name === 'AbortError') throw new ApiErro('TEMPO_ESGOTADO', 'O servidor demorou para responder.', 0);
    throw new ApiErro('ERRO_REDE', 'Não foi possível conectar ao servidor.', 0);
  } finally {
    clearTimeout(timer);
  }

  // 201 da transferência e 204 de desativar/reativar vêm sem corpo
  const texto = await resposta.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = null; }

  if (!resposta.ok) {
    const codigo = (dados && dados.code) || `HTTP_${resposta.status}`;
    throw new ApiErro(codigo, (dados && dados.message) || 'Algo deu errado.', resposta.status);
  }
  return dados;
}

const chamar = (real, simulado) => (CONFIG.USAR_API_REAL ? real() : simulado());
const cpfNaUrl = (cpf) => encodeURIComponent(String(cpf).replace(/\D/g, ''));

// As datas da API vêm sem fuso (horário local) e às vezes com 9 casas nos segundos.
const dataDaApi = (texto) => (texto ? String(texto).replace(/(\.\d{3})\d+/, '$1') : null);

// ---------- Tradução API -> front ----------
function contaDaApi(d) {
  return {
    numero: d.accountNumber,
    agencia: d.agency,
    saldo: Number(d.balance) || 0,
    status: d.status,                   // ACTIVE | DEACTIVATED | CLOSED
    abertaEm: dataDaApi(d.openingDate),
  };
}

function clienteDaApi(d) {
  return { id: d.id, nome: d.name, nomeMae: d.motherName, email: d.email, cpf: d.cpf, conta: contaDaApi(d) };
}

function transacaoDaApi(t) {
  return {
    id: t.id,
    tipo: t.type === 'RECEIVED' ? 'ENTRADA' : 'SAIDA',
    valor: Number(t.amount) || 0,
    descricao: t.description || '',
    dataHora: dataDaApi(t.transferDate),
    contraparte: { nome: t.otherClientName || 'Cliente Oink' },
  };
}

// ---------- Cliente ----------

// POST /clients/register  — dados: { nome, nomeMae, cpf, dataNascimento (AAAA-MM-DD), telefone, email, senha }
export async function cadastrar(dados) {
  const corpo = {
    name: dados.nome,
    email: dados.email,
    cpf: dados.cpf,
    birthDate: dados.dataNascimento,
    motherName: dados.nomeMae,
    mobileNumber: dados.telefone,
    password: dados.senha,
  };
  const r = await chamar(() => requisicao('POST', '/clients/register', corpo), () => mock.register(corpo));
  return clienteDaApi(r);
}

// POST /auth/login
export async function entrar(cpf, senha) {
  const corpo = { cpf, password: senha };
  const r = await chamar(() => requisicao('POST', '/auth/login', corpo), () => mock.login(corpo));
  return clienteDaApi(r);
}

// ---------- Conta ----------

// GET /accounts/client/{cpf}
export async function consultarConta(cpf) {
  const r = await chamar(() => requisicao('GET', `/accounts/client/${cpfNaUrl(cpf)}`), () => mock.getAccount(cpf));
  return contaDaApi(r);
}

// GET /accounts/client/{cpf}/statement  (da mais recente para a mais antiga)
export async function consultarExtrato(cpf) {
  const r = await chamar(() => requisicao('GET', `/accounts/client/${cpfNaUrl(cpf)}/statement`), () => mock.getStatement(cpf));
  return (r || []).map(transacaoDaApi);
}

// PATCH /accounts/client/{cpf}/deactivate  (só com status ACTIVE e saldo zero)
export async function desativarConta(cpf) {
  await chamar(() => requisicao('PATCH', `/accounts/client/${cpfNaUrl(cpf)}/deactivate`), () => mock.deactivate(cpf));
}

// PATCH /accounts/client/{cpf}/reactivate  (até 7 dias depois de desativar)
export async function reativarConta(cpf) {
  await chamar(() => requisicao('PATCH', `/accounts/client/${cpfNaUrl(cpf)}/reactivate`), () => mock.reactivate(cpf));
}

// ---------- Transferência ----------

// POST /transfers — dados: { origemCpf, destinoCpf, valor (número em reais), descricao, pin }
// Sucesso = HTTP 201 sem corpo. Sem PIN na 1ª vez, a API responde PIN_NOT_REGISTERED.
export async function transferir({ origemCpf, destinoCpf, valor, descricao, pin }) {
  const corpo = {
    originCpf: origemCpf,
    destinationCpf: destinoCpf,
    amount: Math.round(valor * 100) / 100,
  };
  if (descricao) corpo.description = descricao;
  if (pin) corpo.transactionPin = pin;
  await chamar(() => requisicao('POST', '/transfers', corpo), () => mock.transfer(corpo));
}
