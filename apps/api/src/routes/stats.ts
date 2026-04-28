import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

const statsParamsSchema = z.object({
  testConfigId: z.string().uuid(),
});

export async function statsRoutes(app: FastifyInstance) {
  // GET /admin/stats/:testConfigId
  app.get('/:testConfigId', { preHandler: [authMiddleware] }, async (request, reply) => {
    const params = statsParamsSchema.safeParse(request.params);
    if (!params.success) return reply.status(400).send({ error: 'Invalid testConfigId' });

    const { testConfigId } = params.data;

    const [stats] = await db`
      SELECT
        COUNT(*)                                                                 AS total_submissions,
        COALESCE(ROUND(AVG(sr.score_pct)), 0)                                   AS avg_score_pct,
        COALESCE(ROUND(COUNT(*) FILTER(WHERE sr.pass) * 100.0
              / NULLIF(COUNT(*), 0)), 0)                                         AS pass_rate_pct,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 0  AND 49)                   AS bucket_0_49,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 50 AND 59)                   AS bucket_50_59,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 60 AND 69)                   AS bucket_60_69,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 70 AND 79)                   AS bucket_70_79,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 80 AND 89)                   AS bucket_80_89,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 90 AND 100)                  AS bucket_90_100
      FROM submission_results sr
      JOIN test_links tl ON tl.id = sr.link_id
      WHERE tl.test_config_id = ${testConfigId}
    `;

    if (!stats || Number(stats.total_submissions) === 0) {
      return reply.status(404).send({ error: 'No submissions found for this test config' });
    }

    return reply.status(200).send({
      total_submissions: Number(stats.total_submissions),
      avg_score_pct: Number(stats.avg_score_pct),
      pass_rate_pct: Number(stats.pass_rate_pct),
      bucket_0_49: Number(stats.bucket_0_49),
      bucket_50_59: Number(stats.bucket_50_59),
      bucket_60_69: Number(stats.bucket_60_69),
      bucket_70_79: Number(stats.bucket_70_79),
      bucket_80_89: Number(stats.bucket_80_89),
      bucket_90_100: Number(stats.bucket_90_100),
    });
  });
}
