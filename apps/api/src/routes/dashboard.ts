import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

export async function dashboardRoutes(app: FastifyInstance) {
  // GET /dashboard/stats — cross-config aggregate KPIs + recent submissions
  app.get('/', { preHandler: [authMiddleware] }, async (_request, reply) => {
    const [stats] = await db`
      SELECT
        COUNT(*)                                                                AS total_candidates,
        COALESCE(ROUND(AVG(sr.score_pct)), 0)                                  AS avg_score_pct,
        COALESCE(ROUND(COUNT(*) FILTER(WHERE sr.pass) * 100.0
              / NULLIF(COUNT(*), 0)), 0)                                        AS pass_rate_pct,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 0  AND 49)                  AS bucket_0_49,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 50 AND 59)                  AS bucket_50_59,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 60 AND 69)                  AS bucket_60_69,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 70 AND 79)                  AS bucket_70_79,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 80 AND 89)                  AS bucket_80_89,
        COUNT(*) FILTER(WHERE sr.score_pct BETWEEN 90 AND 100)                 AS bucket_90_100
      FROM submission_results sr
    `;

    const [weakest] = await db`
      SELECT
        kv.key                                                       AS area,
        ROUND(AVG((kv.value::jsonb->>'pct')::numeric))               AS avg_score
      FROM submission_results sr,
           jsonb_each(sr.skill_area_scores) AS kv(key, value)
      GROUP BY kv.key
      ORDER BY avg_score ASC
      LIMIT 1
    `;

    const recentSubmissions = await db`
      SELECT
        tl.candidate_name,
        sr.score_pct,
        sr.pass,
        tl.submitted_at,
        tc.name AS test_config_name
      FROM submission_results sr
      JOIN test_links   tl ON tl.id = sr.link_id
      JOIN test_configs tc ON tc.id = tl.test_config_id
      ORDER BY tl.submitted_at DESC
      LIMIT 10
    `;

    return reply.status(200).send({
      totalCandidates: Number(stats.total_candidates),
      passRate: Number(stats.pass_rate_pct),
      avgScore: Number(stats.avg_score_pct),
      weakestSkillArea: weakest?.area ?? null,
      bucket0_49: Number(stats.bucket_0_49),
      bucket50_59: Number(stats.bucket_50_59),
      bucket60_69: Number(stats.bucket_60_69),
      bucket70_79: Number(stats.bucket_70_79),
      bucket80_89: Number(stats.bucket_80_89),
      bucket90_100: Number(stats.bucket_90_100),
      recentSubmissions: recentSubmissions.map(r => ({
        candidateName: r.candidate_name ?? null,
        scorePct: Number(r.score_pct),
        pass: r.pass,
        submittedAt: r.submitted_at,
        testConfigName: r.test_config_name,
      })),
    });
  });

  // GET /dashboard/competency — skill area averages (optional testConfigId filter)
  app.get('/competency', { preHandler: [authMiddleware] }, async (request, reply) => {
    const queryRaw = request.query as Record<string, string>;
    const testConfigId = queryRaw.testConfigId ?? null;

    let rows;
    if (testConfigId) {
      rows = await db`
        SELECT
          kv.key                                                       AS area,
          ROUND(AVG((kv.value::jsonb->>'pct')::numeric))               AS avg_score
        FROM submission_results sr
        JOIN test_links tl ON tl.id = sr.link_id,
             jsonb_each(sr.skill_area_scores) AS kv(key, value)
        WHERE tl.test_config_id = ${testConfigId}
        GROUP BY kv.key
        ORDER BY avg_score DESC
      `;
    } else {
      rows = await db`
        SELECT
          kv.key                                                       AS area,
          ROUND(AVG((kv.value::jsonb->>'pct')::numeric))               AS avg_score
        FROM submission_results sr,
             jsonb_each(sr.skill_area_scores) AS kv(key, value)
        GROUP BY kv.key
        ORDER BY avg_score DESC
      `;
    }

    return reply.status(200).send(
      rows.map(r => ({
        area: r.area,
        avgScore: Number(r.avg_score),
      }))
    );
  });
}
