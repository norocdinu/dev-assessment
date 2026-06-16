import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { logAudit } from '../lib/audit.js';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric + hyphens'),
});

export async function technologyRoutes(app: FastifyInstance) {
  // GET / — active only by default; ?include_archived=true returns all. Each row has question_count + is_active.
  app.get('/', { preHandler: authMiddleware }, async (request) => {
    const includeArchived = (request.query as { include_archived?: string }).include_archived === 'true';
    return db`
      SELECT t.id, t.slug, t.name, t.is_active, t.created_at,
             COUNT(q.id) FILTER (WHERE q.is_latest = TRUE) AS question_count
      FROM technologies t
      LEFT JOIN questions q ON q.technology_id = t.id
      ${includeArchived ? db`` : db`WHERE t.is_active = TRUE`}
      GROUP BY t.id
      ORDER BY t.name
    `;
  });

  // POST / — create a technology (owner only)
  app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = createSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const [existing] = await db`SELECT id FROM technologies WHERE slug = ${body.data.slug}`;
    if (existing) return reply.status(409).send({ error: 'duplicate_slug' });

    const [tech] = await db`
      INSERT INTO technologies (slug, name) VALUES (${body.data.slug}, ${body.data.name})
      RETURNING id, slug, name, is_active, created_at
    `;
    await logAudit({ adminId: getAuthUser(request).id, action: 'technology.create', entityType: 'technology', entityId: tech.id });
    return reply.status(201).send(tech);
  });

  // GET /:id/usage — counts driving the delete dialog (owner only)
  app.get('/:id/usage', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [qc] = await db`
      SELECT
        COUNT(*) FILTER (WHERE is_latest = TRUE) AS question_count,
        COUNT(*) FILTER (WHERE is_latest = TRUE AND is_active = TRUE) AS active_question_count
      FROM questions WHERE technology_id = ${id}
    `;
    const [cc] = await db`SELECT COUNT(*) AS config_count FROM test_configs WHERE technology_id = ${id}`;
    const blocking = await db`
      SELECT DISTINCT tc.id, tc.name
      FROM test_configs tc
      JOIN test_links tl ON tl.test_config_id = tc.id
      WHERE tc.technology_id = ${id} AND tl.state IN ('created', 'active')
    `;
    const [lc] = await db`
      SELECT COUNT(*) AS live_link_count
      FROM test_links tl JOIN test_configs tc ON tc.id = tl.test_config_id
      WHERE tc.technology_id = ${id} AND tl.state IN ('created', 'active')
    `;

    return reply.status(200).send({
      questionCount: Number(qc.question_count),
      activeQuestionCount: Number(qc.active_question_count),
      configCount: Number(cc.config_count),
      liveLinkCount: Number(lc.live_link_count),
      blockingConfigs: (blocking as unknown as Array<{ id: string; name: string }>),
    });
  });

  // DELETE /:id?mode=archive|delete — guarded transaction (owner only)
  app.delete('/:id', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const mode = (request.query as { mode?: string }).mode === 'delete' ? 'delete' : 'archive';

    // Guard: block if any config for this tech has a live link.
    const blocking = await db`
      SELECT DISTINCT tc.id, tc.name
      FROM test_configs tc
      JOIN test_links tl ON tl.test_config_id = tc.id
      WHERE tc.technology_id = ${id} AND tl.state IN ('created', 'active')
    `;
    if ((blocking as unknown as unknown[]).length > 0) {
      return reply.status(409).send({ error: 'live_links', blockingConfigs: blocking });
    }

    const result = await db.begin(async (sql) => {
      // Archive all link-free configs for this tech.
      const cfg = await sql`UPDATE test_configs SET is_active = FALSE WHERE technology_id = ${id} AND is_active = TRUE`;
      let archivedQuestions = 0;
      let deletedQuestions = 0;

      if (mode === 'delete') {
        // Questions referenced by candidate_answers cannot be deleted — archive them; delete the rest.
        const referenced = await sql`
          SELECT DISTINCT q.family_id FROM candidate_answers ca
          JOIN questions q ON q.id = ca.question_id
          WHERE q.technology_id = ${id}
        `;
        const refSet = new Set((referenced as unknown as Array<{ family_id: string }>).map((r) => r.family_id));
        if (refSet.size > 0) {
          const refArr = Array.from(refSet);
          const arch = await sql`
            UPDATE questions SET is_active = FALSE
            WHERE technology_id = ${id} AND is_latest = TRUE AND family_id = ANY(${refArr}::uuid[])
          `;
          archivedQuestions = arch.count;
          // Delete only families with no submission references.
          const del = await sql`
            DELETE FROM questions
            WHERE technology_id = ${id} AND family_id <> ALL(${refArr}::uuid[])
          `;
          deletedQuestions = del.count;
        } else {
          const del = await sql`DELETE FROM questions WHERE technology_id = ${id}`;
          deletedQuestions = del.count;
        }
        // If every question was deletable, the tech row can go; otherwise archive the tech (FK still held by archived questions).
        const [{ remaining }] = await sql`SELECT COUNT(*) AS remaining FROM questions WHERE technology_id = ${id}`;
        if (Number(remaining) === 0) {
          await sql`DELETE FROM technologies WHERE id = ${id}`;
        } else {
          await sql`UPDATE technologies SET is_active = FALSE WHERE id = ${id}`;
        }
      } else {
        // archive mode: hide tech + archive its latest questions.
        const arch = await sql`UPDATE questions SET is_active = FALSE WHERE technology_id = ${id} AND is_latest = TRUE AND is_active = TRUE`;
        archivedQuestions = arch.count;
        await sql`UPDATE technologies SET is_active = FALSE WHERE id = ${id}`;
      }

      return { archivedQuestions, deletedQuestions, archivedConfigs: cfg.count };
    });

    await logAudit({
      adminId: getAuthUser(request).id,
      action: mode === 'delete' ? 'technology.delete' : 'technology.archive',
      entityType: 'technology',
      entityId: id,
      detail: result,
    });
    return reply.status(200).send(result);
  });

  // POST /:id/restore — un-hide a technology (questions stay archived) (owner only)
  app.post('/:id/restore', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [row] = await db`UPDATE technologies SET is_active = TRUE WHERE id = ${id} RETURNING id`;
    if (!row) return reply.status(404).send({ error: 'Technology not found' });
    await logAudit({ adminId: getAuthUser(request).id, action: 'technology.restore', entityType: 'technology', entityId: id });
    return reply.status(200).send({ ok: true });
  });
}
