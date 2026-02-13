import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy initialization: PrismaClient is only created when first accessed.
// This avoids Prisma trying to validate the connection at module load time
// during next build (when DATABASE_URL may not be set).
function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

// Use a Proxy so that `prisma.post.findMany(...)` etc. work transparently
// but the actual PrismaClient is only created on first property access.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});
