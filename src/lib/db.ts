import { Pool } from "pg";

// One pool per server process (re-used across hot reloads in dev).
const g = globalThis as unknown as { __pmixPool?: Pool };

export function db(): Pool {
  if (!g.__pmixPool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) throw new Error("DATABASE_URL is not set (see .env.local)");
    // pg v9 / pg-connection-string v3 will change sslmode semantics. We already rely on the
    // current behaviour where require/prefer/verify-ca mean verify-full, so pin it explicitly —
    // identical behaviour today, and it silences the deprecation warning.
    const url = raw.replace(/([?&]sslmode=)(require|prefer|verify-ca)\b/i, "$1verify-full");
    g.__pmixPool = new Pool({ connectionString: url, max: 4, idleTimeoutMillis: 30_000 });
  }
  return g.__pmixPool;
}
