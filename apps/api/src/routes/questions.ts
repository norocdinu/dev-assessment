import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { logAudit } from '../lib/audit.js';
import { pageSizeSchema, parseExportIds } from '../lib/question-query.js';
import { mapImportHeaders, fieldValue } from '../lib/question-import.js';
import { validateQuestionContent } from '../lib/question-schema.js';
import type { QuestionType } from '@dev-assessment/shared';

const questionBodySchema = z.object({
  technology_id: z.string().uuid(),
  difficulty: z.enum(['junior', 'mid', 'senior']),
  skill_area: z.string().min(1),
  type: z.enum(['single_choice', 'multi_select', 'true_false', 'matching', 'ordering', 'fill_blank']),
  content: z.record(z.string(), z.unknown()),
  answer_key: z.record(z.string(), z.unknown()),
  explanation: z.string().optional(),
});

const listQuerySchema = z.object({
  technology: z.string().optional(),
  difficulty: z.enum(['junior', 'mid', 'senior']).optional(),
  skill_area: z.string().optional(),
  search: z.string().optional(),
  include_archived: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: pageSizeSchema,
});

export async function questionRoutes(app: FastifyInstance) {
  // GET /questions
  app.get('/', { preHandler: authMiddleware }, async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query params' });

    const { technology, difficulty, skill_area, search, include_archived, page, pageSize } = query.data;
    const showArchived = include_archived === 'true';
    const isAll = pageSize === 'all';
    const effectivePage = isAll ? 1 : page;
    const offset = isAll ? 0 : (effectivePage - 1) * (pageSize as number);

    const [countRow] = await db`
      SELECT COUNT(*) AS count
      FROM questions q
      JOIN technologies t ON t.id = q.technology_id
      WHERE q.is_latest = TRUE
        ${showArchived ? db`` : db`AND q.is_active = TRUE`}
        ${technology ? db`AND t.slug = ${technology}` : db``}
        ${difficulty ? db`AND q.difficulty = ${difficulty}` : db``}
        ${skill_area ? db`AND q.skill_area ILIKE ${'%' + skill_area + '%'}` : db``}
        ${search ? db`AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(q.content->'prompt') b
          WHERE b->>'type' = 'text' AND b->>'text' ILIKE ${'%' + search + '%'}
        )` : db``}
    `;

    const rows = await db`
      SELECT q.*, t.name AS technology_name
      FROM questions q
      JOIN technologies t ON t.id = q.technology_id
      WHERE q.is_latest = TRUE
        ${showArchived ? db`` : db`AND q.is_active = TRUE`}
        ${technology ? db`AND t.slug = ${technology}` : db``}
        ${difficulty ? db`AND q.difficulty = ${difficulty}` : db``}
        ${skill_area ? db`AND q.skill_area ILIKE ${'%' + skill_area + '%'}` : db``}
        ${search ? db`AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(q.content->'prompt') b
          WHERE b->>'type' = 'text' AND b->>'text' ILIKE ${'%' + search + '%'}
        )` : db``}
      ORDER BY q.created_at DESC
      ${isAll ? db`` : db`LIMIT ${pageSize as number} OFFSET ${offset}`}
    `;

    return reply.status(200).send({ data: rows, total: Number(countRow.count), page: effectivePage, pageSize });
  });

  // GET /questions/export — CSV export (owner only, no pagination, same filters as list)
  app.get('/export', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);
    if (!query.success) return reply.status(400).send({ error: 'Invalid query params' });

    const { technology, difficulty, skill_area, search, include_archived, page, pageSize } = query.data;
    const showArchived = include_archived === 'true';

    let exportIds: string[] | null;
    try {
      exportIds = parseExportIds((request.query as { ids?: string }).ids);
    } catch {
      return reply.status(400).send({ error: 'Invalid ids param' });
    }
    const pageMode = !exportIds && pageSize !== 'all' && (request.query as { page?: string }).page !== undefined;
    const pSize = pageSize === 'all' ? 0 : (pageSize as number);
    const pOffset = (page - 1) * pSize;

    const rows = await db`
      SELECT q.*, t.slug AS tech_slug, t.name AS technology_name
      FROM questions q
      JOIN technologies t ON t.id = q.technology_id
      WHERE q.is_latest = TRUE
        ${exportIds ? db`AND q.family_id = ANY(${exportIds}::uuid[])` : db`
          ${showArchived ? db`` : db`AND q.is_active = TRUE`}
          ${technology ? db`AND t.slug = ${technology}` : db``}
          ${difficulty ? db`AND q.difficulty = ${difficulty}` : db``}
          ${skill_area ? db`AND q.skill_area ILIKE ${'%' + skill_area + '%'}` : db``}
          ${search ? db`AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(q.content->'prompt') b
            WHERE b->>'type' = 'text' AND b->>'text' ILIKE ${'%' + search + '%'}
          )` : db``}
        `}
      ORDER BY q.created_at DESC
      ${pageMode ? db`LIMIT ${pSize} OFFSET ${pOffset}` : db``}
    `;

    const esc = (v: string | number | boolean | null | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;

    // Export covers single_choice questions only. The import endpoint maps
    // columns by header name (see question-import.ts), so the human-readable
    // "Type" column is informative and round-trips cleanly back through import.
    const headers = ['Technology', 'Difficulty', 'Skill Area', 'Type', 'Question Text', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Option', 'Explanation'];
    const firstText = (content: any) =>
      (content?.prompt ?? []).find((b: any) => b.type === 'text')?.text ?? '';
    const dataRows = (rows as unknown as Array<{
      tech_slug: string; technology_name: string; difficulty: string; skill_area: string;
      type: string; content: any; answer_key: any; explanation: string | null;
    }>)
      .filter(q => q.type === 'single_choice')
      .map(q => {
        const opts = q.content?.options ?? [];
        const ci = q.answer_key?.correctIndex ?? 0;
        return [
          esc(q.tech_slug), esc(q.difficulty), esc(q.skill_area), esc(q.type),
          esc(firstText(q.content)),
          esc(opts[0] ?? ''), esc(opts[1] ?? ''), esc(opts[2] ?? ''), esc(opts[3] ?? ''),
          esc(['a', 'b', 'c', 'd'][ci] ?? 'a'),
          esc(q.explanation ?? ''),
        ].join(',');
      });

    const csv = [headers.map(h => esc(h)).join(','), ...dataRows].join('\r\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="questions-export.csv"');
    return reply.send(csv);
  });

  // PATCH /questions/bulk-archive — set is_active = false for all is_latest rows in given family IDs (owner only)
  app.patch('/bulk-archive', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { ids } = body.data;

    const result = await db`
      UPDATE questions
      SET is_active = FALSE
      WHERE family_id = ANY(${ids}::uuid[]) AND is_latest = TRUE
    `;

    await logAudit({
      adminId: getAuthUser(request).id,
      action: 'question.archive',
      entityType: 'question',
      entityId: ids.join(','),
      detail: { bulk: true, count: result.count },
    });

    return reply.status(200).send({ archived: result.count });
  });

  // POST /questions/bulk-delete — hard delete families with no submission refs, return blocked list (owner only)
  app.post('/bulk-delete', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const body = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { ids } = body.data;
    let deleted = 0;

    const referenced = await db`
      SELECT DISTINCT q.family_id
      FROM candidate_answers ca
      JOIN questions q ON q.id = ca.question_id
      WHERE q.family_id = ANY(${ids}::uuid[])
    `;
    const referencedSet = new Set((referenced as unknown as Array<{ family_id: string }>).map(r => r.family_id));
    const deletable = ids.filter(id => !referencedSet.has(id));
    const blocked = ids.filter(id => referencedSet.has(id)).map(id => ({ id, count: -1 }));

    if (deletable.length > 0) {
      await db`DELETE FROM questions WHERE family_id = ANY(${deletable}::uuid[])`;
      deleted = deletable.length;
    }

    if (deleted > 0) {
      await logAudit({
        adminId: getAuthUser(request).id,
        action: 'question.delete',
        entityType: 'question',
        entityId: ids.join(','),
        detail: { bulk: true, deleted, blocked: blocked.length },
      });
    }

    return reply.status(200).send({ deleted, blocked });
  });

  // GET /questions/:familyId/versions
  app.get('/:familyId/versions', { preHandler: authMiddleware }, async (request, reply) => {
    const { familyId } = request.params as { familyId: string };
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(familyId)) {
      return reply.status(400).send({ error: 'Invalid familyId format' });
    }
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

    const check = validateQuestionContent(body.data.type as QuestionType, body.data.content, body.data.answer_key);
    if (!check.ok) return reply.status(400).send({ error: check.error });

    const familyId = uuidv4();
    const [question] = await db`
      INSERT INTO questions (
        family_id, version, technology_id, difficulty, skill_area,
        type, content, answer_key, explanation, created_by
      ) VALUES (
        ${familyId}, 1, ${body.data.technology_id}, ${body.data.difficulty},
        ${body.data.skill_area}, ${body.data.type}, ${db.json(body.data.content as any)},
        ${db.json(body.data.answer_key as any)}, ${body.data.explanation ?? null}, ${getAuthUser(request).id}
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
    const body = questionBodySchema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const check = validateQuestionContent(body.data.type as QuestionType, body.data.content, body.data.answer_key);
    if (!check.ok) return reply.status(400).send({ error: check.error });

    const [current] = await db`
      SELECT version FROM questions WHERE family_id = ${familyId} AND is_latest = TRUE
    `;
    if (!current) return reply.status(404).send({ error: 'Question not found' });

    const [newVersion] = await db.begin(async (sql) => {
      await sql`UPDATE questions SET is_latest = FALSE WHERE family_id = ${familyId} AND is_latest = TRUE`;
      return sql`
        INSERT INTO questions (
          family_id, version, technology_id, difficulty, skill_area,
          type, content, answer_key, explanation, created_by
        ) VALUES (
          ${familyId}, ${current.version + 1}, ${body.data.technology_id}, ${body.data.difficulty},
          ${body.data.skill_area}, ${body.data.type}, ${sql.json(body.data.content as any)},
          ${sql.json(body.data.answer_key as any)}, ${body.data.explanation ?? null}, ${getAuthUser(request).id}
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

    return reply.status(200).send(newVersion);
  });

  // DELETE /questions/:familyId/hard — permanent delete, blocked if referenced in candidate_answers (owner only)
  app.delete('/:familyId/hard', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const { familyId } = request.params as { familyId: string };

    const [refCheck] = await db`
      SELECT COUNT(*) AS count
      FROM candidate_answers ca
      JOIN questions q ON q.id = ca.question_id
      WHERE q.family_id = ${familyId}
    `;
    const refCount = Number(refCheck.count);

    if (refCount > 0) {
      return reply.status(409).send({
        error: 'used_in_submissions',
        count: refCount,
        message: `This question was used in ${refCount} past submission${refCount !== 1 ? 's' : ''} and cannot be deleted. Archive it to hide it from future tests.`,
      });
    }

    await db`DELETE FROM questions WHERE family_id = ${familyId}`;

    await logAudit({
      adminId: getAuthUser(request).id,
      action: 'question.delete',
      entityType: 'question',
      entityId: familyId,
    });

    return reply.status(200).send({ ok: true });
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

    const buf = await data.toBuffer();
    if (buf.length > 5 * 1024 * 1024) {
      return reply.status(413).send({ error: 'File too large. Maximum size is 5MB.' });
    }
    const buffer = buf;
    const text = buffer.toString('utf-8').replace(/^﻿/, ''); // strip BOM

    const allRows = parseCsvText(text);
    if (allRows.length < 2) return reply.status(400).send({ error: 'CSV must have a header row and at least one data row' });

    // Map columns by header name so the importer accepts the exact format the
    // export produces (Title Case, with a Type column) as well as the legacy
    // snake_case headers — and tolerates reordered/extra columns.
    const { index: headerIndex, missing } = mapImportHeaders(allRows[0]);
    if (missing.length > 0) {
      return reply.status(400).send({
        error: `CSV is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      });
    }

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
    for (let i = 1; i < allRows.length; i++) {
      const rowNum = i + 1; // 1-indexed, header is row 1
      const cols = allRows[i];

      const techSlug = fieldValue(cols, headerIndex, 'technology');
      const difficulty = fieldValue(cols, headerIndex, 'difficulty');
      const skill_area = fieldValue(cols, headerIndex, 'skill_area');
      const text = fieldValue(cols, headerIndex, 'text');
      const option_a = fieldValue(cols, headerIndex, 'option_a');
      const option_b = fieldValue(cols, headerIndex, 'option_b');
      const option_c = fieldValue(cols, headerIndex, 'option_c');
      const option_d = fieldValue(cols, headerIndex, 'option_d');
      const correct_option = fieldValue(cols, headerIndex, 'correct_option');
      const explanation = fieldValue(cols, headerIndex, 'explanation');

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
        const content = {
          prompt: [{ type: 'text', text: validated.data.text }],
          options: [validated.data.option_a, validated.data.option_b, validated.data.option_c, validated.data.option_d],
        };
        const answer_key = { correctIndex: { a: 0, b: 1, c: 2, d: 3 }[validated.data.correct_option] };
        const familyId = uuidv4();
        await db`
          INSERT INTO questions (
            family_id, version, technology_id, difficulty, skill_area,
            type, content, answer_key, explanation, created_by
          ) VALUES (
            ${familyId}, 1, ${validated.data.technology_id}, ${validated.data.difficulty},
            ${validated.data.skill_area}, 'single_choice', ${db.json(content)}, ${db.json(answer_key)},
            ${validated.data.explanation ?? null}, ${getAuthUser(request).id}
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

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // Escaped quote inside quoted field
        cell += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      i++;
      continue;
    }

    if ((ch === '\r' || ch === '\n') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i++; // consume \r in \r\n pair
      row.push(cell.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }

    cell += ch;
    i++;
  }

  // Handle final row with no trailing newline
  const lastCell = cell.trim();
  if (lastCell || row.length > 0) {
    row.push(lastCell);
    if (row.some(c => c !== '')) rows.push(row);
  }

  return rows;
}
