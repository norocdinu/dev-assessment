import 'dotenv/config';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { authRoutes } from './routes/auth.js';
import { questionRoutes } from './routes/questions.js';
import { testConfigRoutes } from './routes/test-configs.js';
import { technologyRoutes } from './routes/technologies.js';

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

app.listen({ port: Number(process.env.PORT ?? 3001), host: '0.0.0.0' });
