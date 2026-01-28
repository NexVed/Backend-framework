/**
 * ORM Module Export
 * Unified access to Prisma and Drizzle ORMs
 */

// Prisma ORM
export {
    prisma,
    connectPrisma,
    disconnectPrisma,
    prismaHealthCheck,
    withTransaction,
    PrismaClient,
} from './prisma';

// Drizzle ORM
export {
    initDrizzle,
    getDrizzle,
    createDrizzleFromEnv,
    DrizzleDB,
    // Drizzle operators
    sql,
    eq,
    ne,
    gt,
    gte,
    lt,
    lte,
    and,
    or,
    not,
    inArray,
    notInArray,
    isNull,
    isNotNull,
} from './drizzle';
