import type { FastifyRequest, FastifyReply } from 'fastify';
import { getAuthUser } from './auth.js';

export function requireRole(...roles: string[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const user = getAuthUser(request);
    if (!user || !roles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  };
}
