/**
 * Prisma ORM Integration
 * Provides type-safe database access
 */

import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development
declare global {
    var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
    });
};

/**
 * Prisma client instance
 * Use this for all Prisma operations
 */
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

/**
 * Connect to database
 */
export async function connectPrisma(): Promise<void> {
    try {
        await prisma.$connect();
        console.log('✅ Prisma connected');
    } catch (error: any) {
        console.error('❌ Prisma connection failed:', error.message);
        throw error;
    }
}

/**
 * Disconnect from database
 */
export async function disconnectPrisma(): Promise<void> {
    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected');
}

/**
 * Health check for Prisma connection
 */
export async function prismaHealthCheck(): Promise<boolean> {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch {
        return false;
    }
}

/**
 * Transaction helper
 */
export async function withTransaction<T>(
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
    return prisma.$transaction(callback);
}

// Re-export Prisma types for convenience
export { PrismaClient } from '@prisma/client';
