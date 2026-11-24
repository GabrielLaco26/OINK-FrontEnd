import { iniciarPagina } from './comum.js';
import * as api from '../api.js';
import { REGRAS } from '../config.js';
import { salvarSessao, estaLogado } from '../sessao.js';
import {
  $, soDigitos, mascaraCPF, mascaraData, mascaraTelefone, cpfValido, emailValido, dataParaISO,
  ativarOlhos, erroNoCampo, comCarregando, mensagemDeErro,
} from '../ui.js';

iniciarPagina({ exigeLogin: false });
if (estaLogado()) location.replace('inicio.html');

const form1 = $('#form-1');
const form2 = $('#form-2');
const aviso = $('#aviso');
const campos = {
  nome: $('#nome'), nomeMae: $('#nome-mae'), cpf: $('#cpf'), nascimento: $('#nascimento'),
  telefone: $('#telefone'), email: $('#email'), senha: $('#senha'), confirmacao: $('#confirmacao'),
};

mascaraCPF(campos.cpf);
mascaraData(campos.nascimento);
mascaraTelefone(campos.telefone);
ativarOlhos();

// ---------- Troca de etapa ----------
function irParaEtapa(numero) {
  const segunda = numero === 2;
  form1.hidden = segunda;
  form2.hidden = !segunda;
  $('#ja-tem-conta').hidden = segunda;
  $('#etapa-texto').textContent = `Etapa ${numero} de 2`;
  $('#etapa-barra-2').classList.toggle('feita', segunda);
  $('#titulo').textContent = segunda ? 'Contato e senha' : 'Seus dados pessoais';
  aviso.hidden = true;
  (segunda ? campos.telefone : campos.nome).focus();
}

$('#voltar').addEventListener('click', (evento) => {
  if (!form2.hidden) {
    evento.preventDefault();
    irParaEtapa(1);
  }
});

// Valida uma lista de [campo, mensagem de erro ou ''] e foca o primeiro com erro
function validar(regras) {
  let primeiroErro = null;
  regras.forEach(([input, erro]) => {
    if (!erroNoCampo(input, erro) && !primeiroErro) primeiroErro = input;
  });
  if (primeiroErro) primeiroErro.focus();
  return !primeiroErro;
}

const nomeCompleto = (texto) => texto.trim().split(/\s+/).length >= 2;

// ---------- Etapa 1 ----------
form1.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const ok = validar([
    [campos.nome, nomeCompleto(campos.nome.value) ? '' : 'Digite nome e sobrenome.'],
    [campos.nomeMae, nomeCompleto(campos.nomeMae.value) ? '' : 'Digite o nome completo da mãe.'],
    [campos.cpf, cpfValido(campos.cpf.value) ? '' : 'CPF inválido.'],
    [campos.nascimento, dataParaISO(campos.nascimento.value) ? '' : 'Data inválida.'],
  ]);
  if (ok) irParaEtapa(2);
});

// ---------- Etapa 2 ----------
form2.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  aviso.hidden = true;
  const telefone = soDigitos(campos.telefone.value);
  const ok = validar([
    [campos.telefone, telefone.length >= 10 ? '' : 'Digite o telefone com DDD.'],
    [campos.email, emailValido(campos.email.value) ? '' : 'Digite um e-mail válido.'],
    [campos.senha, campos.senha.value.length < REGRAS.SENHA_MINIMA ? `A senha precisa de pelo menos ${REGRAS.SENHA_MINIMA} caracteres.`
      : campos.senha.value.length > REGRAS.SENHA_MAXIMA ? `A senha pode ter no máximo ${REGRAS.SENHA_MAXIMA} caracteres.` : ''],
    [campos.confirmacao, campos.confirmacao.value === campos.senha.value ? '' : 'As senhas não são iguais.'],
  ]);
  if (!ok) return;

  // Os nomes dos campos da API são traduzidos em js/api.js
  const dados = {
    nome: campos.nome.value.trim(),
    nomeMae: campos.nomeMae.value.trim(),
    cpf: soDigitos(campos.cpf.value),
    dataNascimento: dataParaISO(campos.nascimento.value),
    telefone,
    email: campos.email.value.trim(),
    senha: campos.senha.value,
  };

  try {
    // O cadastro já devolve os dados do cliente e da conta: entra direto
    const cliente = await comCarregando('Criando sua conta', () => api.cadastrar(dados));
    salvarSessao({
      cpf: cliente.cpf, nome: cliente.nome, email: cliente.email, nomeMae: cliente.nomeMae,
      telefone: dados.telefone, dataNascimento: dados.dataNascimento, // a API não devolve esses dois
    });
    location.replace('inicio.html');
  } catch (erro) {
    if (erro.codigo === 'CPF_ALREADY_EXISTS') {
      irParaEtapa(1);
      erroNoCampo(campos.cpf, 'CPF já cadastrado.');
      campos.cpf.focus();
      return;
    }
    if (erro.codigo === 'EMAIL_ALREADY_EXISTS') {
      erroNoCampo(campos.email, 'E-mail já cadastrado.');
      campos.email.focus();
      return;
    }
    const { titulo, texto } = mensagemDeErro(erro);
    $('#aviso-texto').textContent = `${titulo}. ${texto}`;
    aviso.hidden = false;
  }
});
