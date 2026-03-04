export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static badRequest(message = 'Bad request') {
    return new AppError(message, 400, 'BAD_REQUEST');
  }

  static conflict(message = 'Conflict') {
    return new AppError(message, 409, 'CONFLICT');
  }
}

export default AppError;
