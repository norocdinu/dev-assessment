import type { FastifyInstance } from 'fastify';
import { db } from '../db/client.js';

export async function technologyRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return db`SELECT id, slug, name, created_at FROM technologies ORDER BY name`;
  });
}
