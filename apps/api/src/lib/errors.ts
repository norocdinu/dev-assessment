import type { FastifyError, FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

/**
 * Intentional, expected error a service/route can throw to map to a specific
 * HTTP status. Routes that currently `reply.status(...).send({ error })`
 * inline can migrate to `throw new AppError(...)` as modules are extracted.
 */
export class AppError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Central error + not-found handling. Normalizes everything to the existing
 * flat `{ error: string }` shape (no frontend changes), but ensures unexpected
 * errors are logged with context and never leak internals in production —
 * closing the "swallowed 500" gap.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: 'Not Found' });
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: error.message });
    }

    // Fastify validation / client errors carry a sub-500 statusCode.
    const status = typeof error.statusCode === 'number' ? error.statusCode : 500;
    if (status < 500) {
      return reply.status(status).send({ error: error.message });
    }

    request.log.error({ err: error }, 'Unhandled error');
    return reply.status(500).send({
      error: env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message,
    });
  });
}
