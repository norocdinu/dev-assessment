import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const createSchema = z.object({
  name: z.string().min(1),
  technology_id: z.string().uuid(),
  difficulty: z.enum(['junior', 'mid', 'senior']),
  num_questions: z.number().int().min(1).max(100),
  pass_threshold_pct: z.number().int().min(1).max(100).default(70),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  num_questions: z.number().int().min(1).max(100).optional(),
  pass_threshold_pct: z.number().int().min(1).max(100).optional(),
});

export async function testConfigRoutes(app: FastifyInstance) {
  // GET /test-configs
  app.get('/', { preHandler: authMiddleware }, async () => {
    return db`
      SELECT tc.*, t.name AS technology_name
      FROM test_configs tc
      JOIN technologies t ON t.id = tc.technology_id
      WHERE tc.is_active = TRUE
      ORDER BY tc.created_at DESC
    `;
  });

  // POST /test-configs
  app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { name, technology_id, difficulty, num_questions, pass_threshold_pct } = body.data;

    // Check pool size (warn only)
    const [poolCount] = await db`
      SELECT COUNT(*) AS count FROM questions
      WHERE technology_id = ${technology_id}
        AND difficulty = ${difficulty}
        AND is_active = TRUE AND is_latest = TRUE
    `;
    const poolWarning =
      Number(poolCount.count) < num_questions * 2
        ? `Warning: only ${poolCount.count} questions available; pool may be too small for good randomisation`
        : null;

    const [config] = await db`
      INSERT INTO test_configs (name, technology_id, difficulty, num_questions, pass_threshold_pct, created_by)
      VALUES (${name}, ${technology_id}, ${difficulty}, ${num_questions}, ${pass_threshold_pct}, ${getAuthUser(request).id})
      RETURNING *
    `;

    const [withTech] = await db`
      SELECT tc.*, t.name AS technology_name
      FROM test_configs tc JOIN technologies t ON t.id = tc.technology_id
      WHERE tc.id = ${config.id}
    `;

    return reply.status(201).send({ ...withTech, ...(poolWarning ? { warning: poolWarning } : {}) });
  });

  // PUT /test-configs/:id
  app.put('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const [existing] = await db`SELECT id FROM test_configs WHERE id = ${id} AND is_active = TRUE`;
    if (!existing) return reply.status(404).send({ error: 'Test config not found' });

    const [updated] = await db`
      UPDATE test_configs SET
        name = COALESCE(${body.data.name ?? null}, name),
        num_questions = COALESCE(${body.data.num_questions ?? null}, num_questions),
        pass_threshold_pct = COALESCE(${body.data.pass_threshold_pct ?? null}, pass_threshold_pct)
      WHERE id = ${id}
      RETURNING *
    `;

    const [withTech] = await db`
      SELECT tc.*, t.name AS technology_name
      FROM test_configs tc JOIN technologies t ON t.id = tc.technology_id
      WHERE tc.id = ${updated.id}
    `;

    return withTech;
  });

  // DELETE /test-configs/:id (soft-delete)
  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [row] = await db`
      UPDATE test_configs SET is_active = FALSE WHERE id = ${id} RETURNING id
    `;
    if (!row) return reply.status(404).send({ error: 'Test config not found' });
    return { ok: true };
  });
}
