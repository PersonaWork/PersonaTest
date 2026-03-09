import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

// Cache the client in ALL environments to prevent connection exhaustion
// in serverless (Vercel) where each cold start would otherwise create a new client
globalForPrisma.prisma = prisma;
