// Histórico com filtros retroativos (RF07): período e tipo.
// A API devolve o extrato completo (GET /accounts/client/{cpf}/statement);
// os filtros são aplicados aqui no front, sem novas chamadas.
import { iniciarPagina } from './comum.js';
import * as api from '../api.js';
import { obterCpf } from '../sessao.js';
import { $, $$, rotuloDoDia, criarItemTransacao, mensagemDeErro } from '../ui.js';

const DIA = 24 * 60 * 60 * 1000;
const filtros = { dias: 30, tipo: 'todas' };
let todas = null; // extrato completo, carregado uma vez

function marcarChips(atributo, valor) {
  $$(`[data-${atributo}]`).forEach((chip) => {
    chip.setAttribute('aria-pressed', String(chip.dataset[atributo] === String(valor)));
  });
}

$$('[data-dias]').forEach((chip) => chip.addEventListener('click', () => {
  filtros.dias = Number(chip.dataset.dias);
  marcarChips('dias', filtros.dias);
  desenhar();
}));
$$('[data-tipo]').forEach((chip) => chip.addEventListener('click', () => {
  filtros.tipo = chip.dataset.tipo;
  marcarChips('tipo', filtros.tipo);
  desenhar();
}));

function filtrar() {
  const limite = Date.now() - filtros.dias * DIA;
  return todas.filter((t) =>
    new Date(t.dataHora).getTime() >= limite
    && (filtros.tipo === 'todas' || (filtros.tipo === 'recebidas' ? t.tipo === 'ENTRADA' : t.tipo === 'SAIDA')));
}

// Agrupa por dia: "Hoje", "Ontem", "15 de novembro"...
function desenhar() {
  if (!todas) return;
  const transacoes = filtrar();
  const lista = $('#lista');
  lista.replaceChildren();
  let diaAtual = null;
  let ul = null;
  transacoes.forEach((t) => {
    const dia = rotuloDoDia(t.dataHora);
    if (dia !== diaAtual) {
      diaAtual = dia;
      const h2 = document.createElement('h2');
      h2.className = 'transacoes__dia';
      h2.textContent = dia;
      ul = document.createElement('ul');
      ul.className = 'transacoes';
      lista.append(h2, ul);
    }
    ul.append(criarItemTransacao(t));
  });
  $('#vazio').hidden = transacoes.length > 0;
}

async function carregar() {
  const status = $('#status');
  try {
    todas = await api.consultarExtrato(obterCpf());
    status.hidden = true;
    desenhar();
  } catch (erro) {
    const { titulo, texto } = mensagemDeErro(erro);
    status.textContent = `${titulo}. ${texto}`;
  }
}

if (iniciarPagina({ menu: null })) carregar();
