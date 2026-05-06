import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { logAudit } from '../lib/audit.js';

const questionBodySchema = z.object({
  technology_id: z.string().uuid(),
  difficulty: z.enum(['junior', 'mid', 'senior']),
  skill_area: z.string().min(1),
  text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  correct_option: z.enum(['a', 'b', 'c', 'd']),
  explanation: z.string().optional(),
});

const questionUpdateSchema = questionBodySchema.partial();

const listQuerySchema = z.object({
  technology: z.string().optional(),
  difficulty: z.enum(['junior', 'mid', 'senior']).optional(),
  skill_area: z.string().optional(),
  search: z.string().optional(),
  include_archived: z.string().optional(),
});

export async function questionRoutes(app: FastifyInstance) {
  // GET /questions
  app.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query params' });

    const { technology, difficulty, skill_area, search, include_archived } = query.data;
    const showArchived = include_archived === 'true';

    const rows = await db`
      SELECT q.*, t.name AS technology_name
      FROM questions q
      JOIN technologies t ON t.id = q.technology_id
      WHERE q.is_latest = TRUE
        ${showArchived ? db`` : db`AND q.is_active = TRUE`}
        ${technology ? db`AND t.slug = ${technology}` : db``}
        ${difficulty ? db`AND q.difficulty = ${difficulty}` : db``}
        ${skill_area ? db`AND q.skill_area ILIKE ${'%' + skill_area + '%'}` : db``}
        ${search ? db`AND q.text ILIKE ${'%' + search + '%'}` : db``}
      ORDER BY q.created_at DESC
    `;

    return rows;
  });

  // GET /questions/:familyId/versions
  app.get('/:familyId/versions', { preHandler: authMiddleware }, async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const rows = await db`
      SELECT q.*, t.name AS technology_name
      FROM questions q
      JOIN technologies t ON t.id = q.technology_id
      WHERE q.family_id = ${familyId}
      ORDER BY q.version DESC
    `;
    return rows;
  });

  // POST /questions
  app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = questionBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const familyId = uuidv4();
    const [question] = await db`
      INSERT INTO questions (
        family_id, version, technology_id, difficulty, skill_area,
        text, option_a, option_b, option_c, option_d, correct_option,
        explanation, created_by
      ) VALUES (
        ${familyId}, 1, ${body.data.technology_id}, ${body.data.difficulty},
        ${body.data.skill_area}, ${body.data.text}, ${body.data.option_a},
        ${body.data.option_b}, ${body.data.option_c}, ${body.data.option_d},
        ${body.data.correct_option}, ${body.data.explanation ?? null}, ${getAuthUser(request).id}
      )
      RETURNING *
    `;

    await logAudit({
      adminId: getAuthUser(request).id,
      action: 'question.create',
      entityType: 'question',
      entityId: question.id,
    });

    return reply.status(201).send(question);
  });

  // PUT /questions/:familyId
  app.put('/:familyId', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    const body = questionUpdateSchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const [current] = await db`
      SELECT * FROM questions WHERE family_id = ${familyId} AND is_latest = TRUE
    `;
    if (!current) return reply.status(404).send({ error: 'Question not found' });

    const merged: Record<string, any> = {
      ...current,
      ...Object.fromEntries(Object.entries(body.data).filter(([, v]) => v !== undefined)),
    };

    const [newVersion] = await db.begin(async (sql) => {
      await sql`
        UPDATE questions SET is_latest = FALSE
        WHERE family_id = ${familyId} AND is_latest = TRUE
      `;
      return sql`
        INSERT INTO questions (
          family_id, version, technology_id, difficulty, skill_area,
          text, option_a, option_b, option_c, option_d, correct_option,
          explanation, created_by
        ) VALUES (
          ${familyId}, ${current.version + 1}, ${merged.technology_id},
          ${merged.difficulty}, ${merged.skill_area}, ${merged.text},
          ${merged.option_a}, ${merged.option_b}, ${merged.option_c},
          ${merged.option_d}, ${merged.correct_option}, ${merged.explanation ?? null},
          ${getAuthUser(request).id}
        )
        RETURNING *
      `;
    });

    await logAudit({
      adminId: getAuthUser(request).id,
      action: 'question.edit',
      entityType: 'question',
      entityId: newVersion.id,
      detail: { from_version: current.version, to_version: newVersion.version },
    });

    return newVersion;
  });

  // DELETE /questions/:familyId (soft-delete)
  app.delete('/:familyId', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { familyId } = request.params as { familyId: string };

    const [row] = await db`
      UPDATE questions SET is_active = FALSE
      WHERE family_id = ${familyId} AND is_latest = TRUE
      RETURNING id
    `;
    if (!row) return reply.status(404).send({ error: 'Question not found' });

    await logAudit({
      adminId: getAuthUser(request).id,
      action: 'question.archive',
      entityType: 'question',
      entityId: familyId,
    });

    return { ok: true };
  });

  // POST /questions/import — bulk CSV import (owner only)
  app.post('/import', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const buffer = await data.toBuffer();
    const text = buffer.toString('utf-8').replace(/^﻿/, ''); // strip BOM

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return reply.status(400).send({ error: 'CSV must have a header row and at least one data row' });

    // Load all technologies for slug → id lookup
    const technologies = await db`SELECT id, slug FROM technologies`;
    const techMap = new Map<string, string>(
      (technologies as unknown as Array<{ id: string; slug: string }>).map(t => [t.slug, t.id])
    );

    const rowSchema = z.object({
      technology_id: z.string().uuid(),
      difficulty: z.enum(['junior', 'mid', 'senior']),
      skill_area: z.string().min(1),
      text: z.string().min(1),
      option_a: z.string().min(1),
      option_b: z.string().min(1),
      option_c: z.string().min(1),
      option_d: z.string().min(1),
      correct_option: z.enum(['a', 'b', 'c', 'd']),
      explanation: z.string().optional(),
    });

    let imported = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    // Skip header row (index 0), process data rows
    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1; // 1-indexed, header is row 1
      const cols = parseCsvLine(lines[i]);
      // Expected: technology_slug,difficulty,skill_area,text,option_a,option_b,option_c,option_d,correct_option,explanation
      if (cols.length < 9) {
        errors.push({ row: rowNum, reason: `Expected at least 9 columns, got ${cols.length}` });
        continue;
      }

      const [techSlug, difficulty, skill_area, text, option_a, option_b, option_c, option_d, correct_option, explanation] = cols;
      const technology_id = techMap.get(techSlug);
      if (!technology_id) {
        errors.push({ row: rowNum, reason: `Unknown technology slug: '${techSlug}'` });
        continue;
      }

      const validated = rowSchema.safeParse({
        technology_id, difficulty, skill_area, text,
        option_a, option_b, option_c, option_d,
        correct_option: correct_option?.toLowerCase(),
        explanation: explanation || undefined,
      });

      if (!validated.success) {
        const firstError = validated.error.errors[0];
        errors.push({ row: rowNum, reason: `${firstError.path.join('.')}: ${firstError.message}` });
        continue;
      }

      try {
        const familyId = uuidv4();
        await db`
          INSERT INTO questions (
            family_id, version, technology_id, difficulty, skill_area,
            text, option_a, option_b, option_c, option_d, correct_option,
            explanation, created_by
          ) VALUES (
            ${familyId}, 1, ${validated.data.technology_id}, ${validated.data.difficulty},
            ${validated.data.skill_area}, ${validated.data.text}, ${validated.data.option_a},
            ${validated.data.option_b}, ${validated.data.option_c}, ${validated.data.option_d},
            ${validated.data.correct_option}, ${validated.data.explanation ?? null}, ${getAuthUser(request).id}
          )
        `;
        imported++;
      } catch {
        errors.push({ row: rowNum, reason: 'Database insert failed' });
      }
    }

    return reply.status(200).send({ imported, errors });
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
