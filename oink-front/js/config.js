// =========================================================
// Configuração do front
// =========================================================
// USAR_API_REAL = true  → usa a API Spring publicada no Render.
// USAR_API_REAL = false → usa o "back simulado" (js/mock.js), que guarda tudo
//                         no navegador. Útil para testar sem internet.
//
// ATENÇÃO (CORS): a API só aceita chamadas vindas de http://localhost:5173
// e http://localhost:3000. O arquivo .vscode/settings.json já faz o Live
// Server abrir em http://localhost:5173.

export const CONFIG = {
  USAR_API_REAL: true,
  API_URL: 'https://banking-system-4pwt.onrender.com',

  // O plano gratuito do Render "dorme": a 1ª chamada pode levar até ~1 minuto.
  TEMPO_LIMITE_MS: 75000,

  // Só para o back simulado:
  ATRASO_MOCK_MS: 700,
};

// Regras de negócio que o front também mostra/valida (a validação oficial é do back)
export const REGRAS = {
  LIMITE_TRANSFERENCIA: 250000,       // R$ 0,01 a R$ 250.000,00
  DIAS_PARA_REATIVAR: 7,
  SENHA_MINIMA: 8,
  SENHA_MAXIMA: 72,
  DESCRICAO_MAXIMA: 255,
};
