import type { FastifyRequest, FastifyReply } from 'fastify';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: { id: string; email: string; role: string };
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify({ onlyCookie: true });
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
