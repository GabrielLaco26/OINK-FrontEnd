# Oink — Front-end (PWA)

Front-end do **Sistema Bancário Web** (projeto acadêmico, sem movimentação financeira real).
Feito só com **HTML5, CSS3 e JavaScript** (sem framework), pensado **apenas para celular** e instalável como **PWA**.
Já está **ligado na API do back** publicada no Render: `https://banking-system-4pwt.onrender.com`.

---

## 1. Como rodar (VS Code + Live Server)

1. Abra a **pasta `oink-front`** no VS Code (**File › Open Folder**).
2. Clique em **Go Live** (extensão Live Server).
3. O navegador abre em **`http://localhost:5173`**. Use o modo celular do navegador (F12 › ícone de celular).

> ⚠️ **Por que porta 5173?** O back só aceita chamadas (CORS) vindas de `http://localhost:5173` e `http://localhost:3000`.
> O arquivo `.vscode/settings.json` já configura o Live Server para abrir nesse endereço.
> Se abrir em `127.0.0.1` ou em outra porta (ex.: 5500), **as chamadas à API são bloqueadas** pelo navegador.

> ⏳ **Primeira chamada demorada:** o plano gratuito do Render "dorme" quando fica parado. A 1ª requisição pode levar até ~1 minuto. O app avisa na tela de carregamento.

### Testar sem internet (back simulado)

Em `js/config.js`, mude `USAR_API_REAL` para `false`. O app passa a usar o `js/mock.js`, que imita a API (mesmas rotas, regras e códigos de erro) e guarda tudo no navegador.

| Usuário (só no back simulado) | CPF | Senha | Situação |
|---|---|---|---|
| Gabriel Laço | 123.456.789-09 | oink1234 | R$ 1.500,00, **sem PIN** (testa a criação do PIN) |
| Adrian Breno | 987.654.321-00 | oink1234 | R$ 2.000,00, PIN 1234 |
| Esley Bertoldo | 321.654.987-91 | oink1234 | R$ 0,00, PIN 1234 (pode ser desativada) |

Para zerar os dados simulados, rode no console: `localStorage.removeItem('oink_mock_db_v3')`.

---

## 2. Estrutura

```
oink-front/
├── index.html              Abertura (vai para Boas-vindas ou Início)
├── boas-vindas.html        Entrar / Criar conta
├── entrar.html             Login por CPF e senha
├── cadastro.html           Cadastro em 2 etapas (cria cliente + conta)
├── recuperar-senha.html    "Em breve"
├── inicio.html             Saldo + extrato recente
├── pix.html                Transferência pelo CPF, confirmada com PIN de 4 dígitos
├── historico.html          Histórico com filtros (período e tipo)
├── perfil.html             Dados do cliente e da conta
├── menu.html               Central com todas as páginas
├── encerrar-conta.html     Desativar a conta (só com saldo zero)
├── conta-fechada.html      Reativar em até 7 dias
├── cartao.html             Cartão (simulação)
├── simulacao.html          Saque e depósito (simulação)
├── cofrinho.html           Só visual
├── em-breve.html           Páginas que ainda não existem
├── manifest.webmanifest    Dados do PWA
├── sw.js                   Service worker (funciona sem internet; a API nunca é guardada)
├── .vscode/settings.json   Live Server em localhost:5173 (exigência do CORS)
├── css/                    base.css (paleta), componentes.css, paginas.css
├── js/
│   ├── config.js           ★ URL da API e liga/desliga a API real
│   ├── api.js              ★ Único arquivo que conversa com o back (traduz os campos)
│   ├── mock.js             Back simulado com as mesmas regras da API
│   ├── sessao.js           Quem está logado (CPF + dados), PIN e data de desativação
│   ├── ui.js               Máscaras, validações, carregamento, mensagens de erro, menu
│   └── paginas/            Um JS por tela com lógica
└── assets/                 Imagens do mascote e ícones do PWA
```

**Divisão sugerida (documentação):**
- **Gabriel:** entrar, cadastro, recuperar-senha, inicio (saldo e extrato) e `js/api.js`.
- **Adrian:** pix, historico, encerrar-conta e conta-fechada.

---

## 3. Como o front usa a API

| Tela | Método e rota | Observação |
|---|---|---|
| Cadastro | `POST /clients/register` | Devolve cliente + conta. O app já entra logado. |
| Entrar | `POST /auth/login` | Não há token: o app guarda o CPF e os dados do cliente no aparelho. |
| Início, Pix, Perfil, Menu, Simulação | `GET /accounts/client/{cpf}` | Saldo, número, agência e status. |
| Início, Histórico, Pix (sucesso) | `GET /accounts/client/{cpf}/statement` | O histórico filtra por período e tipo no próprio front. |
| Pix | `POST /transfers` | 201 sem corpo. O nome de quem recebeu é buscado no extrato logo depois. |
| Encerrar conta | `PATCH /accounts/client/{cpf}/deactivate` | Só com saldo zero. O front avisa antes. |
| Conta fechada | `PATCH /accounts/client/{cpf}/reactivate` | Até 7 dias depois. |

**Status da conta:**
- `ACTIVE`: app normal.
- `DEACTIVATED`: entra, mas vai direto para a tela de reativação.
- `CLOSED`: o login mostra "Conta encerrada".

**PIN de transferência (fluxo do back):**
1. Na primeira transferência, o app envia **sem PIN**.
2. Se a API responder `PIN_NOT_REGISTERED`, o app mostra **"Crie seu PIN"** (4 números, com confirmação) e reenvia o mesmo pedido com o PIN.
3. Depois disso, o app lembra que o PIN existe e já pede o PIN direto.
4. Se o PIN foi criado em outro aparelho, a API responde `PIN_INVALID` e o app passa a pedir o PIN.

**Erros:** a API responde `{ code, message, timestamp }`. Cada `code` tem uma mensagem amigável em `js/ui.js` (`MENSAGENS`).

---

## 4. Pontos para combinar com o back

1. **Saldo inicial R$ 0,00 e sem depósito:** ninguém consegue transferir de verdade. Sugestão: dar um saldo fictício no cadastro (pendência 4 da documentação técnica) ou criar uma rota de depósito de teste.
2. **Ordem das validações:** a API confere o saldo **antes** do PIN. Com saldo insuficiente, o fluxo de criar PIN nunca começa (o front já bloqueia valor maior que o saldo, então não atrapalha).
3. **Data de desativação:** `GET /accounts/client/{cpf}` não devolve quando a conta foi desativada. O front guarda essa data no aparelho ao desativar. Se a pessoa entrar por outro aparelho, aparece só "até 7 dias". Sugestão: incluir `deactivationDate` na resposta.
4. **CORS na hora de publicar o front:** incluir a URL pública (ex.: Netlify) e, se quiserem testar no celular pela rede, o IP do notebook.
5. **Telefone e nascimento:** não voltam no login. O Perfil só mostra esses dados no aparelho onde a pessoa se cadastrou.

---

## 5. PWA (instalar no celular)

- A instalação no celular exige **HTTPS**. Para apresentar, publique a pasta (Netlify Drop, GitHub Pages ou Vercel) e peça ao back para liberar essa URL no CORS.
- O service worker usa **"rede primeiro"**: mudanças no código aparecem na hora. Ao criar um arquivo novo, inclua-o em `ARQUIVOS` no `sw.js` e aumente a `VERSAO`.
