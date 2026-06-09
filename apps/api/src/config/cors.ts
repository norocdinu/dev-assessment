import { env } from './env.js';

/**
 * Builds the CORS allow-list from configuration. Always permits local dev;
 * the deployed web origin comes from WEB_URL, plus any extra origins in
 * CORS_ORIGINS (comma-separated). No hardcoded deployment URLs.
 */
export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>(['http://localhost:3000', env.WEB_URL]);

  if (env.CORS_ORIGINS) {
    for (const origin of env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)) {
      origins.add(origin);
    }
  }

  return origins;
}
