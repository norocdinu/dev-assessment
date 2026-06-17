import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware, getAuthUser } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_BYTES = 1024 * 1024; // 1 MB

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function assetRoutes(app: FastifyInstance) {
  // POST /assets — multipart image upload (owner only)
  app.post('/', { preHandler: [authMiddleware, requireRole('owner')] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ error: 'No file uploaded' });
    if (!ALLOWED.has(file.mimetype)) {
      return reply.status(415).send({ error: 'Only PNG, JPEG, WEBP, GIF images are allowed' });
    }
    const buf = await file.toBuffer();
    if (buf.length > MAX_BYTES) {
      return reply.status(413).send({ error: 'Image too large. Maximum size is 1MB.' });
    }
    const [row] = await db`
      INSERT INTO question_assets (mime, bytes, byte_size, created_by)
      VALUES (${file.mimetype}, ${buf}, ${buf.length}, ${getAuthUser(request).id})
      RETURNING id
    `;
    return reply.status(201).send({ assetId: row.id });
  });

  // GET /assets/:id — public; images are embedded in candidate prompts
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.status(400).send({ error: 'Invalid asset id' });
    const [row] = await db`SELECT mime, bytes FROM question_assets WHERE id = ${id}`;
    if (!row) return reply.status(404).send({ error: 'Asset not found' });
    reply.header('Content-Type', row.mime);
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    return reply.send(row.bytes);
  });
}
