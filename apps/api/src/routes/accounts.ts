import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const createAccountSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'reviewer', 'member']),
  password: z.string().min(8),
});

const updateAccountSchema = z.object({
  name: z.string().min(1),
  role: z.enum(['owner', 'reviewer', 'member']),
});

export async function accountRoutes(app: FastifyInstance) {
  // GET /admin/accounts — list all accounts (owner only)
  app.get('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const accounts = await db`
      SELECT id, email, name, role, created_at, last_login_at
      FROM admin_users
      ORDER BY created_at ASC
    `;
    return accounts;
  });

  // POST /admin/accounts — create a new account (owner only)
  app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = createAccountSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { name, email, role, password } = body.data;
    const password_hash = await bcrypt.hash(password, 10);

    const [existing] = await db`SELECT id FROM admin_users WHERE email = ${email}`;
    if (existing) return reply.status(409).send({ error: 'Email already in use' });

    const [account] = await db`
      INSERT INTO admin_users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${password_hash}, ${role})
      RETURNING id, email, name, role, created_at, last_login_at
    `;

    return reply.status(201).send(account);
  });

  // PUT /admin/accounts/:id — update name and role (owner only)
  app.put('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = updateAccountSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { id } = request.params as { id: string };
    const { name, role } = body.data;

    const [updated] = await db`
      UPDATE admin_users
      SET name = ${name}, role = ${role}
      WHERE id = ${id}
      RETURNING id, email, name, role, created_at, last_login_at
    `;

    if (!updated) return reply.status(404).send({ error: 'Account not found' });

    return updated;
  });

  // DELETE /admin/accounts/:id — delete account, protect last owner (owner only)
  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [target] = await db`SELECT id, role FROM admin_users WHERE id = ${id}`;
    if (!target) return reply.status(404).send({ error: 'Account not found' });

    if (target.role === 'owner') {
      const [{ count }] = await db`
        SELECT COUNT(*)::int AS count FROM admin_users WHERE role = 'owner'
      `;
      if (count === 1) {
        return reply.status(409).send({ error: 'Cannot delete the last owner account' });
      }
    }

    await db`DELETE FROM admin_users WHERE id = ${id}`;

    return { ok: true };
  });
}
