import postgres from 'postgres';
import { env } from '../config/env.js';

export const db = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
});
