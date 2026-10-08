import { PrismaClient } from '@/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { PoolConfig } from 'mariadb';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * El pool lo crea el driver `mariadb`, no `mysql2`: el adaptador despacha sobre
 * la API de mariadb y con un pool ajeno toda query revienta con
 * "Expected zero or one element". Le pasamos la config y el adaptador queda
 * dueño del pool, así $disconnect() lo cierra en serverless.
 *
 * TiDB Serverless exige TLS: se activa con DATABASE_TLS=true o ?tls=true en la URL.
 */
function buildPoolConfig(): PoolConfig {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL no está definida');
  }

  const url = new URL(raw);
  const database = url.pathname.replace(/^\//, '');
  if (!database) {
    throw new Error('DATABASE_URL no incluye el nombre de la base de datos');
  }

  const useTls =
    process.env.DATABASE_TLS === 'true' || url.searchParams.get('tls') === 'true';

  const config: PoolConfig = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    // Vercel corre varias instancias en paralelo; un pool grande por instancia
    // agota los límites de conexiones del cluster.
    connectionLimit: Number(process.env.DATABASE_POOL_LIMIT ?? 5),
    connectTimeout: 10_000,
  };

  if (useTls) {
    const rejectUnauthorized = process.env.DATABASE_TLS_REJECT_UNAUTHORIZED === 'true';
    if (!rejectUnauthorized) {
      console.warn(
        '[db] TLS activo sin verificar el certificado. Si tu servidor tiene un CA válido, poné DATABASE_TLS_REJECT_UNAUTHORIZED=true.',
      );
    }
    config.ssl = { rejectUnauthorized };
  }

  return config;
}

function createPrisma() {
  const adapter = new PrismaMariaDb(buildPoolConfig());
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
