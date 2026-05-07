import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { deriveSeed } from '../lib/rng.js';

const createSchema = z.object({
  test_config_id: z.string().uuid(),
  candidate_name: z.string().optional(),
});

export async function testLinkRoutes(app: FastifyInstance) {
  // POST /admin/test-links — generate a new link (owner or member)
  app.post('/', { preHandler: [authMiddleware, requireRole('owner', 'member')] }, async (request, reply) => {
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { test_config_id, candidate_name } = body.data;

    const [config] = await db`
      SELECT id FROM test_configs WHERE id = ${test_config_id} AND is_active = TRUE
    `;
    if (!config) return reply.status(404).send({ error: 'Test config not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const seed = deriveSeed(test_config_id, token);

    const [link] = await db`
      INSERT INTO test_links (test_config_id, token, seed, expires_at, created_by, candidate_name)
      VALUES (${test_config_id}, ${token}, ${seed}, NULL, ${(request as any).user.id}, ${candidate_name ?? null})
      RETURNING id, token, state, candidate_name, created_at
    `;

    const url = `${process.env.WEB_URL ?? 'http://localhost:3000'}/test/${token}`;

    return reply.status(201).send({ ...link, url });
  });

  // GET /admin/test-links/:testConfigId — list all links for a test config
  app.get('/:testConfigId', { preHandler: authMiddleware }, async (request, reply) => {
    const { testConfigId } = request.params as { testConfigId: string };

    const [config] = await db`
      SELECT id FROM test_configs WHERE id = ${testConfigId} AND is_active = TRUE
    `;
    if (!config) return reply.status(404).send({ error: 'Test config not found' });

    const links = await db`
      SELECT id, token, state, candidate_name, expires_at, started_at, submitted_at, created_at
      FROM test_links
      WHERE test_config_id = ${testConfigId}
      ORDER BY created_at DESC
    `;

    return links;
  });

  // DELETE /admin/test-links/:id — revoke a link (owner only)
  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db`
      UPDATE test_links
      SET state = 'expired'
      WHERE id = ${id} AND state NOT IN ('submitted', 'expired')
      RETURNING id
    `;

    if (!row) return reply.status(404).send({ error: 'Link not found or already in terminal state' });

    return { ok: true };
  });
}
