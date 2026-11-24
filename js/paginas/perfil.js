// Perfil: dados do cliente (guardados no login/cadastro) + dados da conta (GET /accounts/client/{cpf}).
import { iniciarPagina } from './comum.js';
import * as api from '../api.js';
import { limparSessao, obterSessao } from '../sessao.js';
import { ICONES } from '../icones.js';
import { $, $$, iniciais, formatarCPF, formatarTelefone, copiar, mensagemDeErro } from '../ui.js';

$$('[data-copiar]').forEach((botao) => {
  botao.innerHTML = ICONES.copiar();
  botao.addEventListener('click', () => copiar($(`#${botao.dataset.copiar}`).textContent, botao.dataset.msg));
});

$('#sair').addEventListener('click', () => {
  limparSessao();
  location.replace('boas-vindas.html');
});

const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '');

// Mostra a linha só se a informação existir (telefone e nascimento a API não devolve no login)
function preencher(id, valor) {
  $(`#${id}`).textContent = valor || '';
  $(`#${id}`).closest('.dados__linha').hidden = !valor;
}

async function carregar() {
  const s = obterSessao();
  $('#nome').textContent = s.nome;
  $('#iniciais').textContent = iniciais(s.nome);
  preencher('d-chave', formatarCPF(s.cpf)); // a chave de transferência é o CPF
  preencher('d-email', s.email);
  preencher('d-telefone', s.telefone && formatarTelefone(s.telefone));
  preencher('d-nascimento', dataBR(s.dataNascimento));
  preencher('d-mae', s.nomeMae);
  try {
    const conta = await api.consultarConta(s.cpf);
    if (conta.status === 'DEACTIVATED') return location.replace('conta-fechada.html');
    preencher('d-conta', conta.numero);
    preencher('d-agencia', conta.agencia);
    $('#status').hidden = true;
  } catch (erro) {
    const { titulo, texto } = mensagemDeErro(erro);
    $('#status').textContent = `${titulo}. ${texto}`;
    preencher('d-conta', '');
    preencher('d-agencia', '');
  }
  $('#dados').hidden = false;
}

if (iniciarPagina({ menu: 'menu' })) carregar();
