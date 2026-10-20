import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as mysql from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: mysql.Pool;

  onModuleInit() {
    if (this.pool) return;

    const host = process.env.DATABASE_HOST || process.env.DB_HOST;
    const user = process.env.DATABASE_USER || process.env.DB_USER;
    const database = process.env.DATABASE_NAME || process.env.DB_NAME;
    const password =
      process.env.DATABASE_PASSWORD ?? process.env.DB_PASSWORD ?? '';
    const port = Number(
      process.env.DATABASE_PORT || process.env.DB_PORT || 3306,
    );

    const missing = [
      ['DATABASE_HOST', host],
      ['DATABASE_USER', user],
      ['DATABASE_NAME', database],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Missing database environment variables: ${missing.join(', ')}`,
      );
    }

    if (!Number.isFinite(port) || port <= 0) {
      throw new InternalServerErrorException(
        'DATABASE_PORT must be a valid port number.',
      );
    }

    // Most managed MySQL providers require TLS. Set DATABASE_SSL=false for a
    // local MySQL server that does not support SSL.
    const useSsl = process.env.DATABASE_SSL !== 'false';
    const rejectUnauthorized =
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true';

    this.pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      ssl: useSsl ? { rejectUnauthorized } : undefined,
      waitForConnections: true,
      connectionLimit: Number(process.env.DATABASE_CONNECTION_LIMIT) || 5,
      maxIdle: Number(process.env.DATABASE_MAX_IDLE) || 2,
      idleTimeout: 60_000,
      queueLimit: 0,
      enableKeepAlive: true,
    });

    this.logger.log(
      `MySQL pool created for ${host}:${port}/${database} (SSL: ${useSsl ? 'on' : 'off'})`,
    );
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end().catch(() => undefined);
      this.pool = undefined;
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<any> {
    if (!this.pool) {
      this.onModuleInit();
    }

    if (!this.pool) {
      throw new InternalServerErrorException('Database is not initialized.');
    }

    // mysql2 rejects `undefined` as a bound value.
    const safeParams: any[] = params.map((value) =>
      value === undefined ? null : value,
    );

    try {
      const [results] = await this.pool.execute(sql, safeParams);
      return results;
    } catch (error: any) {
      this.logger.error(`Database query failed: ${error?.message ?? error}`);
      throw error;
    }
  }
}
