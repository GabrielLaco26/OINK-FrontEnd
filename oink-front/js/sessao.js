// Guarda no aparelho quem está logado.
// A API atual NÃO gera token: o login só valida CPF e senha e devolve os dados
// do cliente. As outras rotas recebem o CPF na URL. Por isso a "sessão" do app
// é o CPF + dados básicos do cliente (limitação documentada pelo back).

const CHAVE = 'oink_sessao_v2';

// cliente: { cpf, nome, email, nomeMae, telefone?, dataNascimento? }
export function salvarSessao(cliente) {
  localStorage.setItem(CHAVE, JSON.stringify(cliente));
}

export function obterSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) || null;
  } catch {
    return null;
  }
}

export const obterCpf = () => obterSessao()?.cpf || null;
export const obterNome = () => obterSessao()?.nome || '';
export const estaLogado = () => Boolean(obterCpf());

export function limparSessao() {
  localStorage.removeItem(CHAVE);
}

// Use no topo das telas que exigem login.
export function exigirLogin() {
  if (!estaLogado()) {
    location.replace('entrar.html');
    return false;
  }
  return true;
}

// ---------- Informações que a API não devolve e o app guarda no aparelho ----------

// Se o cliente já criou o PIN de transferência (a API não tem rota para consultar).
export const pinJaCadastrado = (cpf) => localStorage.getItem(`oink_pin_${cpf}`) === '1';
export const marcarPinCadastrado = (cpf) => localStorage.setItem(`oink_pin_${cpf}`, '1');

// Quando a conta foi desativada (a API ainda não devolve essa data).
export const dataDesativacao = (cpf) => localStorage.getItem(`oink_desativada_${cpf}`);
export const marcarDesativacao = (cpf) => localStorage.setItem(`oink_desativada_${cpf}`, new Date().toISOString());
export const limparDesativacao = (cpf) => localStorage.removeItem(`oink_desativada_${cpf}`);
