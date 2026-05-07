import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
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

const app = Fastify({ logger: true });

const allowedOrigins = new Set(
  [
    'http://localhost:3000',
    'https://dev-assessmentweb-production.up.railway.app',
    process.env.WEB_URL,
  ].filter(Boolean) as string[]
);

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
  secret: process.env.JWT_SECRET!,
  cookie: { cookieName: 'token', signed: false },
});

await app.register(authRoutes, { prefix: '/auth' });
await app.register(questionRoutes, { prefix: '/questions' });
await app.register(testConfigRoutes, { prefix: '/test-configs' });
await app.register(technologyRoutes, { prefix: '/technologies' });
await app.register(testLinkRoutes, { prefix: '/admin/test-links' });
await app.register(submissionRoutes, { prefix: '/admin/submissions' });
await app.register(statsRoutes, { prefix: '/admin/stats' });
await app.register(accountRoutes, { prefix: '/admin/accounts' });
await app.register(dashboardRoutes, { prefix: '/dashboard' });

await app.register(async (candidateApp) => {
  candidateApp.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin ?? '';
    if (allowedOrigins.has(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
    }
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
  });
  candidateApp.addHook('preHandler', async (request, reply) => {
    if (request.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });
  await candidateApp.register(candidateRoutes, { prefix: '/candidate' });
});

app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
