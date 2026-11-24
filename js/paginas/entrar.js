import { iniciarPagina } from './comum.js';
import * as api from '../api.js';
import { CONFIG } from '../config.js';
import { salvarSessao, estaLogado } from '../sessao.js';
import {
  $, mascaraCPF, cpfValido, soDigitos, ativarOlhos, comCarregando, mensagemDeErro, erroNoCampo,
} from '../ui.js';

iniciarPagina({ exigeLogin: false });
if (estaLogado()) location.replace('inicio.html');

const form = $('#form');
const cpf = $('#cpf');
const senha = $('#senha');
const aviso = $('#aviso');

mascaraCPF(cpf);
ativarOlhos();
if (!CONFIG.USAR_API_REAL) $('#modo-teste').hidden = false;

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  aviso.hidden = true;

  const cpfOk = erroNoCampo(cpf, cpfValido(cpf.value) ? '' : 'Digite um CPF válido.');
  const senhaOk = erroNoCampo(senha, senha.value ? '' : 'Digite sua senha.');
  if (!cpfOk) return cpf.focus();
  if (!senhaOk) return senha.focus();

  try {
    const cliente = await comCarregando('Entrando na sua conta', () => api.entrar(soDigitos(cpf.value), senha.value));
    salvarSessao({ cpf: cliente.cpf, nome: cliente.nome, email: cliente.email, nomeMae: cliente.nomeMae });
    // Conta DEACTIVATED pode entrar, mas vai direto para a tela de reativação
    location.replace(cliente.conta.status === 'DEACTIVATED' ? 'conta-fechada.html' : 'inicio.html');
  } catch (erro) {
    const { titulo, texto } = mensagemDeErro(erro);
    $('#aviso-texto').textContent = `${titulo}. ${texto}`;
    aviso.hidden = false;
    senha.value = '';
    senha.focus();
  }
});
