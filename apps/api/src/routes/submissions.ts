import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

export async function submissionRoutes(app: FastifyInstance) {
  // GET /admin/submissions/:linkId
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
