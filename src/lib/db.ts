import { Pool } from "pg";

// One pool per server process (re-used across hot reloads in dev).
const g = globalThis as unknown as { __pmixPool?: Pool };

export function db(): Pool {
  if (!g.__pmixPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set (see .env.local)");
    g.__pmixPool = new Pool({ connectionString: url, max: 4, idleTimeoutMillis: 30_000 });
  }
  return g.__pmixPool;
}
