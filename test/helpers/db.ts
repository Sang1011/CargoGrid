import { PrismaClient } from '@prisma/client';

/** Tests that need a real PostgreSQL run only when TEST_DATABASE_URL points at a migrated, disposable database. */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export function createPrisma(): PrismaClient {
  const url = TEST_DATABASE_URL!;
  // Only used by the Claude sandbox, whose Prisma build has no query engine and needs a driver adapter.
  const adapterDir = process.env.CG_PG_ADAPTER_DIR;
  if (adapterDir) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require(`${adapterDir}/node_modules/@prisma/adapter-pg`);
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) } as any);
  }
  return new PrismaClient({ datasources: { db: { url } } });
}
