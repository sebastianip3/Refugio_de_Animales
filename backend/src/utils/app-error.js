// Error de negocio lanzado por los services; el controller lo traduce a una respuesta HTTP
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
