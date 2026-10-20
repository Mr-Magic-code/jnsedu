// src/lib/db.ts
import mysql from 'mysql2/promise';

declare global {
  var __jnsMysqlPool: mysql.Pool | undefined;
}

function createPool(): mysql.Pool {
  const useSsl = process.env.DATABASE_SSL !== 'false';
  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

  return mysql.createPool({
    host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || process.env.DB_PORT || 3306),
    user: process.env.DATABASE_USER || process.env.DB_USER || 'root',
    password: process.env.DATABASE_PASSWORD ?? process.env.DB_PASSWORD ?? '',
    database: process.env.DATABASE_NAME || process.env.DB_NAME || 'jnseducation-db',
    ssl: useSsl ? { rejectUnauthorized } : undefined,
    waitForConnections: true,
    connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT) || 5,
    maxIdle: 2,
    idleTimeout: 60_000,
    queueLimit: 0,
    enableKeepAlive: true,
  });
}

// Reuse the pool across hot reloads / serverless invocations to avoid
// exhausting the database connection limit.
const pool = globalThis.__jnsMysqlPool ?? createPool();
globalThis.__jnsMysqlPool = pool;

export default pool;
