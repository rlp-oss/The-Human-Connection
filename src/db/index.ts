import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const isCloudSqlConfigured = (): boolean => {
  return Boolean(process.env.SQL_HOST && process.env.SQL_DB_NAME);
};

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

let _dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export const getDb = () => {
  if (!isCloudSqlConfigured()) {
    throw new Error('Cloud SQL is not configured (SQL_HOST / SQL_DB_NAME missing).');
  }
  if (!_dbInstance) {
    _dbInstance = drizzle(createPool(), { schema });
  }
  return _dbInstance;
};
