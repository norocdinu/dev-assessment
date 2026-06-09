import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration. Parsed once at startup so
 * a missing/invalid variable fails fast with a clear message instead of
 * surfacing as an obscure runtime crash later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  // Optional comma-separated list of extra allowed CORS origins.
  CORS_ORIGINS: z.string().optional(),
  // Global test duration; the server enforces the hard cutoff and reports it
  // to the candidate UI so the two never drift.
  TEST_DURATION_MINUTES: z.coerce.number().int().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
