// =========================================================
// Back simulado (só quando CONFIG.USAR_API_REAL = false)
// =========================================================
// Imita a API do back (mesmas rotas, campos e códigos de erro do documento
// "Integração da API") guardando os dados no localStorage do navegador.
// Para zerar: no console do navegador, rode  localStorage.removeItem('oink_mock_db_v3')
//
// Usuários de teste (senha de todos: oink1234):
//   Gabriel Laço    CPF 123.456.789-09   saldo R$ 1.500,00   ainda SEM PIN (testa a criação do PIN)
//   Adrian Breno    CPF 987.654.321-00   saldo R$ 2.000,00   PIN 1234
//   Esley Bertoldo  CPF 321.654.987-91   saldo R$ 0,00       PIN 1234 (pode ser desativada)

import { CONFIG, REGRAS } from './config.js';
import { ApiErro } from './erros.js';

const CHAVE_DB = 'oink_mock_db_v3';
const DIA = 24 * 60 * 60 * 1000;
const DOIS_MINUTOS = 2 * 60 * 1000;

const esperar = () => new Promise((r) => setTimeout(r, CONFIG.ATRASO_MOCK_MS));
const falhar = (code, message, status) => { throw new ApiErro(code, message, status); };
const centavos = (v) => Math.round(Number(v) * 100) / 100;
// Datas no formato da API: sem fuso, horário local
const dataLocal = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function semente() {
  const agora = Date.now();
  const atras = (dias, horas = 0) => dataLocal(agora - dias * DIA - horas * 3600 * 1000);
  const clientes = [
    { id: 1, name: 'Gabriel Laço', motherName: 'Fulana Laço', email: 'gabriel@exemplo.com', cpf: '12345678909', birthDate: '2003-05-14', mobileNumber: '11900000001', password: 'oink1234' },
    { id: 2, name: 'Adrian Breno', motherName: 'Fulana Breno', email: 'adrian@exemplo.com', cpf: '98765432100', birthDate: '2002-09-02', mobileNumber: '11900000002', password: 'oink1234' },
    { id: 3, name: 'Esley Bertoldo', motherName: 'Fulana Bertoldo', email: 'esley@exemplo.com', cpf: '32165498791', birthDate: '2001-12-20', mobileNumber: '11900000003', password: 'oink1234' },
  ];
  const contas = [
    { id: 1, cpf: '12345678909', accountNumber: '00000001-8', agency: '0001', balance: 1500, status: 'ACTIVE', openingDate: atras(90), pin: null, deactivatedAt: null },
    { id: 2, cpf: '98765432100', accountNumber: '00000002-6', agency: '0001', balance: 2000, status: 'ACTIVE', openingDate: atras(90), pin: '1234', deactivatedAt: null },
    { id: 3, cpf: '32165498791', accountNumber: '00000003-4', agency: '0001', balance: 0, status: 'ACTIVE', openingDate: atras(90), pin: '1234', deactivatedAt: null },
  ];
  const t = (id, de, para, amount, horasAtras, description = null) =>
    ({ id, from: de, to: para, amount, description, transferDate: dataLocal(agora - horasAtras * 3600 * 1000) });
  const transferencias = [
    t(1, '32165498791', '12345678909', 60, 73 * 24 + 3, 'Lanche'),
    t(2, '98765432100', '12345678909', 300, 45 * 24 + 5, 'Divisão do aluguel'),
    t(3, '12345678909', '32165498791', 120, 20 * 24 + 2, 'Ingresso do show'),
    t(4, '12345678909', '98765432100', 15.5, 2 * 24 + 6),
    t(5, '32165498791', '12345678909', 40, 2 * 24 + 1, 'Pizza'),
    t(6, '12345678909', '98765432100', 25, 24 + 8),
    t(7, '98765432100', '12345678909', 10, 24 + 2),
    t(8, '12345678909', '32165498791', 10, 3, 'Café'),
  ];
  return { clientes, contas, transferencias, proximoId: { cliente: 4, conta: 4, transferencia: 9 } };
}

function carregar() {
  let db;
  try { db = JSON.parse(localStorage.getItem(CHAVE_DB)); } catch { db = null; }
  if (!db || !db.clientes) db = semente();
  // Contas desativadas há mais de 7 dias viram CLOSED (rotina automática do back)
  db.contas.forEach((c) => {
    if (c.status === 'DEACTIVATED' && Date.now() - new Date(c.deactivatedAt).getTime() > REGRAS.DIAS_PARA_REATIVAR * DIA) c.status = 'CLOSED';
  });
  salvar(db);
  return db;
}
const salvar = (db) => localStorage.setItem(CHAVE_DB, JSON.stringify(db));

const contaPorCpf = (db, cpf) => db.contas.find((c) => c.cpf === String(cpf).replace(/\D/g, ''));
const clientePorCpf = (db, cpf) => db.clientes.find((c) => c.cpf === String(cpf).replace(/\D/g, ''));
const respostaCliente = (cli, conta) => ({
  id: cli.id, name: cli.name, motherName: cli.motherName, email: cli.email, cpf: cli.cpf,
  accountNumber: conta.accountNumber, agency: conta.agency, balance: conta.balance, status: conta.status,
});
const validar = (erros) => { if (erros.length) falhar('VALIDATION_ERROR', erros.join('; '), 400); };

// POST /clients/register
export async function register(b) {
  await esperar();
  const db = carregar();
  validar([
    !b.name?.trim() && 'name: must not be blank',
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || '') && 'email: must be a well-formed email address',
    !/^\d{11}$/.test(b.cpf || '') && 'cpf: CPF deve conter 11 dígitos',
    !(b.birthDate && new Date(b.birthDate) < new Date()) && 'birthDate: must be a past date',
    !b.motherName?.trim() && 'motherName: must not be blank',
    !/^\d{10,11}$/.test(b.mobileNumber || '') && 'mobileNumber: inválido',
    !(b.password && b.password.length >= 8 && b.password.length <= 72) && 'password: size must be between 8 and 72',
  ].filter(Boolean));
  if (clientePorCpf(db, b.cpf)) falhar('CPF_ALREADY_EXISTS', 'CPF já cadastrado.', 409);
  if (db.clientes.some((c) => c.email.toLowerCase() === b.email.toLowerCase())) falhar('EMAIL_ALREADY_EXISTS', 'E-mail já cadastrado.', 409);
  const id = db.proximoId.cliente++;
  const cliente = { id, ...b };
  const numero = String(db.proximoId.conta++).padStart(8, '0');
  const conta = { id, cpf: b.cpf, accountNumber: `${numero}-${(Number(numero) * 7) % 10}`, agency: '0001', balance: 0, status: 'ACTIVE', openingDate: dataLocal(Date.now()), pin: null, deactivatedAt: null };
  db.clientes.push(cliente);
  db.contas.push(conta);
  salvar(db);
  return respostaCliente(cliente, conta);
}

// POST /auth/login
export async function login({ cpf, password }) {
  await esperar();
  const db = carregar();
  validar([!/^\d{11}$/.test(cpf || '') && 'cpf: CPF deve conter 11 dígitos', !password && 'password: must not be blank'].filter(Boolean));
  const cliente = clientePorCpf(db, cpf);
  if (!cliente || cliente.password !== password) falhar('INVALID_CREDENTIALS', 'CPF ou senha inválidos.', 401);
  const conta = contaPorCpf(db, cpf);
  if (conta.status === 'CLOSED') falhar('ACCOUNT_CLOSED', 'Conta encerrada.', 403);
  return respostaCliente(cliente, conta);
}

// GET /accounts/client/{cpf}
export async function getAccount(cpf) {
  await esperar();
  const conta = contaPorCpf(carregar(), cpf);
  if (!conta) falhar('ACCOUNT_NOT_FOUND', 'Conta não encontrada.', 404);
  const { id, accountNumber, agency, balance, status, openingDate } = conta;
  return { id, accountNumber, agency, balance, status, openingDate };
}

// GET /accounts/client/{cpf}/statement
export async function getStatement(cpf) {
  await esperar();
  const db = carregar();
  const conta = contaPorCpf(db, cpf);
  if (!conta) falhar('ACCOUNT_NOT_FOUND', 'Conta não encontrada.', 404);
  const nome = (c) => clientePorCpf(db, c)?.name || 'Cliente Oink';
  return db.transferencias
    .filter((t) => t.from === conta.cpf || t.to === conta.cpf)
    .sort((a, b) => b.transferDate.localeCompare(a.transferDate))
    .map((t) => {
      const enviada = t.from === conta.cpf;
      return { id: t.id, type: enviada ? 'SENT' : 'RECEIVED', amount: t.amount, description: t.description, transferDate: t.transferDate, otherClientName: nome(enviada ? t.to : t.from) };
    });
}

// PATCH /accounts/client/{cpf}/deactivate
export async function deactivate(cpf) {
  await esperar();
  const db = carregar();
  const conta = contaPorCpf(db, cpf);
  if (!conta) falhar('ACCOUNT_NOT_FOUND', 'Conta não encontrada.', 404);
  if (conta.status !== 'ACTIVE') falhar('ACCOUNT_NOT_ACTIVE', 'A conta não está ativa.', 400);
  if (conta.balance !== 0) falhar('ACCOUNT_WITH_BALANCE', 'O saldo precisa ser zero.', 400);
  conta.status = 'DEACTIVATED';
  conta.deactivatedAt = new Date().toISOString();
  salvar(db);
  return null;
}

// PATCH /accounts/client/{cpf}/reactivate
export async function reactivate(cpf) {
  await esperar();
  const db = carregar();
  const conta = contaPorCpf(db, cpf);
  if (!conta) falhar('ACCOUNT_NOT_FOUND', 'Conta não encontrada.', 404);
  if (conta.status === 'CLOSED') falhar('REACTIVATION_PERIOD_EXPIRED', 'Prazo de reativação expirado.', 409);
  if (conta.status !== 'DEACTIVATED') falhar('ACCOUNT_NOT_DEACTIVATED', 'A conta não está desativada.', 400);
  conta.status = 'ACTIVE';
  conta.deactivatedAt = null;
  salvar(db);
  return null;
}

// POST /transfers
export async function transfer(b) {
  await esperar();
  const db = carregar();
  const valor = centavos(b.amount);
  validar([
    !/^\d{11}$/.test(b.originCpf || '') && 'originCpf: CPF deve conter 11 dígitos',
    !/^\d{11}$/.test(b.destinationCpf || '') && 'destinationCpf: CPF deve conter 11 dígitos',
    !(valor >= 0.01 && valor <= REGRAS.LIMITE_TRANSFERENCIA) && 'amount: fora do limite',
    b.transactionPin !== undefined && !/^\d{4}$/.test(b.transactionPin) && 'transactionPin: deve ter 4 dígitos',
    (b.description || '').length > REGRAS.DESCRICAO_MAXIMA && 'description: máximo de 255 caracteres',
  ].filter(Boolean));
  const origem = contaPorCpf(db, b.originCpf);
  const destino = contaPorCpf(db, b.destinationCpf);
  if (!origem) falhar('ORIGIN_ACCOUNT_NOT_FOUND', 'Conta de origem não encontrada.', 404);
  if (!destino) falhar('DESTINATION_ACCOUNT_NOT_FOUND', 'Conta de destino não encontrada.', 404);
  if (origem.cpf === destino.cpf) falhar('SAME_ACCOUNT_TRANSFER', 'Mesma conta.', 400);
  if (origem.status !== 'ACTIVE' || destino.status !== 'ACTIVE') falhar('ACCOUNT_NOT_ACTIVE', 'Conta não ativa.', 400);
  // PIN: cadastrado na 1ª transferência, em transação separada (fica salvo mesmo se a transferência falhar depois)
  if (!origem.pin) {
    if (!b.transactionPin) falhar('PIN_NOT_REGISTERED', 'Esta conta ainda não possui PIN cadastrado.', 409);
    origem.pin = b.transactionPin;
    salvar(db);
  } else if (b.transactionPin !== origem.pin) {
    falhar('PIN_INVALID', 'PIN inválido.', 400);
  }
  if (origem.balance < valor) falhar('INSUFFICIENT_BALANCE', 'Saldo insuficiente.', 400);
  const agora = Date.now();
  const iguais = db.transferencias.filter((t) => t.from === origem.cpf && t.amount === valor && agora - new Date(t.transferDate).getTime() < DOIS_MINUTOS);
  if (iguais.length >= 2) falhar('DUPLICATE_TRANSFER_LIMIT', 'Limite de transferências repetidas.', 429);
  origem.balance = centavos(origem.balance - valor);
  destino.balance = centavos(destino.balance + valor);
  db.transferencias.push({ id: db.proximoId.transferencia++, from: origem.cpf, to: destino.cpf, amount: valor, description: b.description || null, transferDate: dataLocal(agora) });
  salvar(db);
  return null; // HTTP 201 sem corpo
}
