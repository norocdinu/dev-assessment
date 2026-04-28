import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { authRoutes } from './routes/auth.js';
import { questionRoutes } from './routes/questions.js';
import { testConfigRoutes } from './routes/test-configs.js';
import { technologyRoutes } from './routes/technologies.js';
import { testLinkRoutes } from './routes/test-links.js';
import { candidateRoutes } from './routes/candidate.js';
import { submissionRoutes } from './routes/submissions.js';

const app = Fastify({ logger: true });

await app.register(fastifyCors, {
  origin: process.env.WEB_URL ?? 'http://localhost:3000',
  credentials: true,
});

await app.register(fastifyCookie);

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

await app.register(async (candidateApp) => {
  const allowedOrigin = process.env.WEB_URL ?? 'http://localhost:3000';
  candidateApp.addHook('onRequest', async (_request, reply) => {
    reply.header('Access-Control-Allow-Origin', allowedOrigin);
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
