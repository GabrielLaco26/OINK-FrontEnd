// Erro padrão das chamadas à API.
// Formato da API: { "code": "INSUFFICIENT_BALANCE", "message": "...", "timestamp": "..." }
export class ApiErro extends Error {
  constructor(codigo, mensagem, status = 400) {
    super(mensagem);
    this.name = 'ApiErro';
    this.codigo = codigo;   // = "code" da API
    this.status = status;   // status HTTP
  }
}
