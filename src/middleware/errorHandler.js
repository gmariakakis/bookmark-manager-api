import { ZodError } from 'zod';
import AppError from '../utils/AppError.js';

function isUniqueConstraintError(err) {
  return (
    typeof err?.code === 'string' &&
    err.code.startsWith('SQLITE_CONSTRAINT') &&
    typeof err?.message === 'string' &&
    err.message.includes('UNIQUE constraint failed')
  );
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
  }

  if (isUniqueConstraintError(err)) {
    return res.status(409).json({
      error: {
        message: 'Resource already exists',
        code: 'CONFLICT',
      },
    });
  }

  console.error(err);

  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}

export default errorHandler;
