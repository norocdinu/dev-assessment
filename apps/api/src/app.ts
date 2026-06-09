import Fastify, { type FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { env } from './config/env.js';
import { getAllowedOrigins } from './config/cors.js';
import { registerErrorHandler } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { questionRoutes } from './routes/questions.js';
import { testConfigRoutes } from './routes/test-configs.js';
import { technologyRoutes } from './routes/technologies.js';
import { testLinkRoutes } from './routes/test-links.js';
import { candidateRoutes } from './routes/candidate.js';
import { submissionRoutes } from './routes/submissions.js';
import { statsRoutes } from './routes/stats.js';
import { accountRoutes } from './routes/accounts.js';
import { dashboardRoutes } from './routes/dashboard.js';

/**
 * Builds and configures the Fastify instance without starting it. Keeping
 * construction separate from `listen` makes the app importable for tests and
 * keeps server lifecycle concerns in the entrypoint.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  const allowedOrigins = getAllowedOrigins();
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  await app.register(fastifyCookie);
  await app.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024 } });
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: 'token', signed: false },
  });

  // Liveness/readiness probe (wire as Render's healthCheckPath).
  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(questionRoutes, { prefix: '/questions' });
  await app.register(testConfigRoutes, { prefix: '/test-configs' });
  await app.register(technologyRoutes, { prefix: '/technologies' });
  await app.register(testLinkRoutes, { prefix: '/admin/test-links' });
  await app.register(submissionRoutes, { prefix: '/admin/submissions' });
  await app.register(statsRoutes, { prefix: '/admin/stats' });
  await app.register(accountRoutes, { prefix: '/admin/accounts' });
  await app.register(dashboardRoutes, { prefix: '/dashboard' });

  // Candidate endpoints are public and called from the web origin, which the
  // CORS allow-list already covers — no bespoke per-route CORS handling needed.
  await app.register(candidateRoutes, { prefix: '/candidate' });

  registerErrorHandler(app);

  return app;
}
