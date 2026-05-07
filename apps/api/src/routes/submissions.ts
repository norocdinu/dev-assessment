import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const listQuerySchema = z.object({
  testConfigId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  difficulty: z.enum(['junior', 'mid', 'senior']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submissionRoutes(app: FastifyInstance) {
  // GET /admin/submissions/export  — MUST be before /:linkId
  app.get('/export', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const queryRaw = request.query as Record<string, string>;
    const testConfigId = queryRaw.testConfigId;

    if (!testConfigId || !UUID_RE.test(testConfigId)) {
      return reply.status(400).send({ error: 'testConfigId (UUID) is required' });
    }

    const rows = await db`
      SELECT
        sr.score_pct,
        sr.pass,
        sr.time_taken_seconds,
        tl.submitted_at,
        tc.name        AS test_name,
        tc.difficulty,
        t.name         AS technology_name
      FROM submission_results sr
      JOIN test_links   tl ON tl.id = sr.link_id
      JOIN test_configs tc ON tc.id = tl.test_config_id
      JOIN technologies t  ON t.id  = tc.technology_id
      WHERE tl.test_config_id = ${testConfigId}
      ORDER BY tl.submitted_at DESC
    `;

    const esc = (v: string | number | boolean) =>
      `"${String(v).replace(/"/g, '""')}"`;

    const headers = ['Test Name', 'Technology', 'Difficulty', 'Score %', 'Pass/Fail', 'Time (seconds)', 'Submitted At'];
    const dataRows = (rows as unknown as Array<{
      test_name: string; technology_name: string; difficulty: string;
      score_pct: number; pass: boolean; time_taken_seconds: number; submitted_at: string;
    }>).map(s => [
      esc(s.test_name),
      esc(s.technology_name),
      esc(s.difficulty),
      esc(s.score_pct),
      esc(s.pass ? 'Pass' : 'Fail'),
      esc(s.time_taken_seconds),
      esc(s.submitted_at),
    ].join(','));

    const csv = [headers.map(h => esc(h)).join(','), ...dataRows].join('\r\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="submissions-${testConfigId}.csv"`);
    return reply.send(csv);
  });

  // GET /admin/submissions/compare  — MUST be before /:linkId
  app.get('/compare', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const queryRaw = request.query as Record<string, string>;
    const idsParam = queryRaw.ids ?? '';
    const ids = idsParam.split(',').map((s: string) => s.trim()).filter(Boolean);

    if (ids.length < 2) {
      return reply.status(400).send({ error: 'At least 2 link IDs required' });
    }
    if (!ids.every((id: string) => UUID_RE.test(id))) {
      return reply.status(400).send({ error: 'All IDs must be valid UUIDs' });
    }

    const results = await Promise.all(ids.map(async (linkId: string) => {
      const [result] = await db`
        SELECT
          sr.score_pct,
          sr.pass,
          sr.skill_area_scores,
          sr.time_taken_seconds,
          sr.graded_at,
          tl.id          AS link_id,
          tl.submitted_at,
          tl.test_config_id,
          tc.pass_threshold_pct,
          tc.name AS test_name,
          t.name  AS technology_name,
          tc.difficulty
        FROM submission_results sr
        JOIN test_links tl      ON tl.id = sr.link_id
        JOIN test_configs tc    ON tc.id = tl.test_config_id
        JOIN technologies t     ON t.id  = tc.technology_id
        WHERE tl.id = ${linkId}
      `;
      return result ?? null;
    }));

    const missingIndex = results.findIndex(r => r === null);
    if (missingIndex !== -1) {
      return reply.status(404).send({ error: `Submission not found: ${ids[missingIndex]}` });
    }

    return reply.status(200).send(results);
  });

  // GET /admin/submissions  — list with optional filters
  app.get('/', { preHandler: [authMiddleware] }, async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query params' });

    const { testConfigId, dateFrom, dateTo, difficulty, page, pageSize } = query.data;
    const offset = (page - 1) * pageSize;

    const [countRow] = await db`
      SELECT COUNT(*) AS count
      FROM submission_results sr
      JOIN test_links   tl ON tl.id = sr.link_id
      JOIN test_configs tc ON tc.id = tl.test_config_id
      JOIN technologies t  ON t.id  = tc.technology_id
      WHERE (${testConfigId ?? null} IS NULL OR tl.test_config_id = ${testConfigId ?? null})
        AND (${dateFrom ?? null} IS NULL OR tl.submitted_at >= ${dateFrom ?? null}::timestamptz)
        AND (${dateTo ?? null} IS NULL OR tl.submitted_at <= ${dateTo ?? null}::timestamptz)
        AND (${difficulty ?? null} IS NULL OR tc.difficulty = ${difficulty ?? null})
    `;

    const rows = await db`
      SELECT
        sr.score_pct,
        sr.pass,
        sr.time_taken_seconds,
        sr.graded_at,
        tl.id          AS link_id,
        tl.submitted_at,
        tl.test_config_id,
        tc.name        AS test_name,
        tc.difficulty,
        tc.pass_threshold_pct,
        t.name         AS technology_name
      FROM submission_results sr
      JOIN test_links   tl ON tl.id = sr.link_id
      JOIN test_configs tc ON tc.id = tl.test_config_id
      JOIN technologies t  ON t.id  = tc.technology_id
      WHERE (${testConfigId ?? null} IS NULL OR tl.test_config_id = ${testConfigId ?? null})
        AND (${dateFrom ?? null} IS NULL OR tl.submitted_at >= ${dateFrom ?? null}::timestamptz)
        AND (${dateTo ?? null} IS NULL OR tl.submitted_at <= ${dateTo ?? null}::timestamptz)
        AND (${difficulty ?? null} IS NULL OR tc.difficulty = ${difficulty ?? null})
      ORDER BY tl.submitted_at DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

    return reply.status(200).send({ data: rows, total: Number(countRow.count), page, pageSize });
  });

  // DELETE /admin/submissions/:linkId  — hard delete (owner-only)
  app.delete('/:linkId', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { linkId } = request.params as { linkId: string };

    // 1. Check submission exists
    const [existing] = await db`
      SELECT id FROM submission_results WHERE link_id = ${linkId}
    `;
    if (!existing) {
      return reply.status(404).send({ error: 'Submission not found' });
    }

    // 2. Write audit log before transaction
    const admin = getAuthUser(request);
    await db`
      INSERT INTO audit_log (admin_id, action, entity_type, entity_id, detail)
      VALUES (
        ${admin.id},
        'submission.delete',
        'submission',
        ${linkId},
        ${JSON.stringify({ deleted_by: admin.email })}::jsonb
      )
    `;

    // 3. Delete in transaction: candidate_answers first (FK), then submission_results
    await db.begin(async sql => {
      await sql`DELETE FROM candidate_answers WHERE link_id = ${linkId}`;
      await sql`DELETE FROM submission_results WHERE link_id = ${linkId}`;
    });

    // test_links row is preserved (D-09)
    return reply.status(204).send();
  });

  // GET /admin/submissions/:linkId  — single submission detail (Phase 3)
  app.get('/:linkId', { preHandler: [authMiddleware] }, async (request, reply) => {
    const { linkId } = request.params as { linkId: string };

    const [result] = await db`
      SELECT
        sr.score_pct,
        sr.pass,
        sr.skill_area_scores,
        sr.time_taken_seconds,
        sr.graded_at,
        tl.id          AS link_id,
        tl.submitted_at,
        tl.test_config_id,
        tc.pass_threshold_pct,
        tc.name AS test_name,
        t.name  AS technology_name,
        tc.difficulty
      FROM submission_results sr
      JOIN test_links tl      ON tl.id = sr.link_id
      JOIN test_configs tc    ON tc.id = tl.test_config_id
      JOIN technologies t     ON t.id  = tc.technology_id
      WHERE tl.id = ${linkId}
    `;

    if (!result) return reply.status(404).send({ error: 'Submission not found' });

    const answerSheet = await db`
      SELECT
        q.family_id,
        q.version,
        q.text             AS question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_option,
        q.skill_area,
        ca.answer          AS candidate_answer,
        (ca.answer = q.correct_option) AS is_correct
      FROM candidate_answers ca
      JOIN questions q ON q.id = ca.question_id
      WHERE ca.link_id = ${linkId}
      ORDER BY q.skill_area, q.id
    `;

    return reply.status(200).send({
      link_id: result.link_id,
      test_config_id: result.test_config_id,
      score_pct: result.score_pct,
      pass: result.pass,
      pass_threshold_pct: result.pass_threshold_pct,
      time_taken_seconds: result.time_taken_seconds,
      submitted_at: result.submitted_at,
      graded_at: result.graded_at,
      test_name: result.test_name,
      technology_name: result.technology_name,
      difficulty: result.difficulty,
      skill_area_scores: result.skill_area_scores,
      answer_sheet: answerSheet,
    });
  });
}
