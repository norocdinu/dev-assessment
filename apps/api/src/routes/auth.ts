import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).optional(),
  name: z.string().optional(),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid request body' });
    }
    const { email, password } = body.data;

    const rows = await db`SELECT * FROM admin_users WHERE email = ${email}`;
    const user = rows[0];
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    await db`UPDATE admin_users SET last_login_at = NOW() WHERE id = ${user.id}`;

    const token = app.jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '8h' }
    );

    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });

  app.post('/logout', { preHandler: authMiddleware }, async (request, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { ok: true };
  });

  app.get('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const userId = (request as any).user.id;
    const [user] = await db`SELECT id, email, name, role FROM admin_users WHERE id = ${userId}`;
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return { user };
  });

  app.put('/me', { preHandler: authMiddleware }, async (request, reply) => {
    const body = updateMeSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid request body' });

    const { current_password, new_password, name } = body.data;
    const userId = (request as any).user.id;

    const [user] = await db`SELECT password_hash FROM admin_users WHERE id = ${userId}`;
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return reply.status(401).send({ error: 'Current password is incorrect' });

    if (new_password) {
      const newHash = await bcrypt.hash(new_password, 10);
      await db`UPDATE admin_users SET password_hash = ${newHash} WHERE id = ${userId}`;
    }

    if (name !== undefined) {
      await db`UPDATE admin_users SET name = ${name} WHERE id = ${userId}`;
    }

    return { ok: true };
  });
}
