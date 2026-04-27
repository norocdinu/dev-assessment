import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { seededSample } from '../lib/rng.js';

const submitSchema = z.object({
  answers: z.record(z.string().uuid(), z.enum(['a', 'b', 'c', 'd'])),
});

export async function candidateRoutes(app: FastifyInstance) {
  // GET /candidate/session/:token
  app.get('/session/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const [link] = await db`
      SELECT tl.id, tl.state, tl.seed, tl.started_at, tl.expires_at,
             tc.technology_id, tc.difficulty, tc.num_questions
      FROM test_links tl
      JOIN test_configs tc ON tc.id = tl.test_config_id
      WHERE tl.token = ${token}
    `;

    if (!link) return reply.status(404).send({ error: 'Link not found' });

    // Link-level expiry check (expires_at is NULL in Phase 2 but enforced when set)
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await db`
        UPDATE test_links SET state = 'expired'
        WHERE id = ${link.id} AND state NOT IN ('submitted', 'expired')
      `;
      return reply.status(410).send({ error: 'This link has expired' });
    }

    if (link.state === 'submitted') {
      return reply.status(409).send({ error: 'Test already submitted' });
    }

    if (link.state === 'expired') {
      return reply.status(410).send({ error: 'This link has expired' });
    }

    // Fetch question pool — ORDER BY id is required for deterministic seededSample
    const pool = await db`
      SELECT id, text, option_a, option_b, option_c, option_d, skill_area
      FROM questions
      WHERE technology_id = ${link.technology_id}
        AND difficulty = ${link.difficulty}
        AND is_active = TRUE
        AND is_latest = TRUE
      ORDER BY id
    `;

    if (pool.length === 0) {
      return reply.status(503).send({ error: 'No questions available for this test configuration' });
    }

    const questions = seededSample(pool, link.num_questions, link.seed);
    const serverNow = new Date().toISOString();

    if (link.state === 'created') {
      await db`
        UPDATE test_links
        SET state = 'active', started_at = ${serverNow}
        WHERE id = ${link.id} AND state = 'created'
      `;
      return reply.status(200).send({ started_at: serverNow, server_now: serverNow, questions });
    }

    // state === 'active' — return existing started_at
    return reply.status(200).send({
      started_at: link.started_at,
      server_now: serverNow,
      questions,
    });
  });

  // POST /candidate/submit/:token
  app.post('/submit/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const body = submitSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const [link] = await db`
      SELECT tl.id, tl.state, tl.seed, tl.started_at,
             tc.technology_id, tc.difficulty, tc.num_questions
      FROM test_links tl
      JOIN test_configs tc ON tc.id = tl.test_config_id
      WHERE tl.token = ${token}
    `;

    if (!link) return reply.status(404).send({ error: 'Link not found' });

    if (link.state === 'submitted') {
      return reply.status(409).send({ error: 'Test already submitted' });
    }

    if (link.state !== 'active') {
      return reply.status(410).send({ error: 'Test session is not active' });
    }

    // Server-side hard deadline enforcement
    const [{ past_deadline }] = await db`
      SELECT (NOW() > started_at + INTERVAL '30 minutes') AS past_deadline
      FROM test_links WHERE id = ${link.id}
    `;

    if (past_deadline) {
      return reply.status(410).send({ error: 'Test time has expired' });
    }

    // Validate submitted question IDs against canonical seeded set
    const pool = await db`
      SELECT id
      FROM questions
      WHERE technology_id = ${link.technology_id}
        AND difficulty = ${link.difficulty}
        AND is_active = TRUE
        AND is_latest = TRUE
      ORDER BY id
    `;

    const validIds = new Set<string>(
      seededSample(pool as { id: string }[], link.num_questions, link.seed).map((q) => q.id)
    );

    for (const qid of Object.keys(body.data.answers)) {
      if (!validIds.has(qid)) {
        return reply.status(400).send({ error: `Invalid question ID: ${qid}` });
      }
    }

    // Transactional: upsert answers + atomic state transition
    let submittedAt: string | undefined;
    let alreadySubmitted = false;

    await db.begin(async (sql) => {
      for (const [questionId, answer] of Object.entries(body.data.answers)) {
        await sql`
          INSERT INTO candidate_answers (link_id, question_id, answer)
          VALUES (${link.id}, ${questionId}, ${answer})
          ON CONFLICT (link_id, question_id)
          DO UPDATE SET answer = EXCLUDED.answer, submitted_at = NOW()
        `;
      }

      const [updated] = await sql`
        UPDATE test_links
        SET state = 'submitted', submitted_at = NOW()
        WHERE id = ${link.id} AND state = 'active'
        RETURNING submitted_at
      `;

      if (!updated) {
        alreadySubmitted = true;
      } else {
        submittedAt = updated.submitted_at;
      }
    });

    if (alreadySubmitted) {
      return reply.status(409).send({ error: 'Test already submitted' });
    }

    return reply.status(200).send({ ok: true, submitted_at: submittedAt });
  });
}
