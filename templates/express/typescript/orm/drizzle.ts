/**
 * Drizzle ORM Integration
 * Lightweight, type-safe ORM
 */

// Note: Drizzle requires different drivers based on your database
// This file provides adapters for all supported databases

import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { Pool as PgPool } from 'pg';
import { createPool as createMySQLPool, Pool as MySQLPool } from 'mysql2/promise';
import { neon } from '@neondatabase/serverless';

export type DrizzleDB = ReturnType<typeof drizzleNeon> | ReturnType<typeof drizzlePostgres> | ReturnType<typeof drizzleMysql>;

let drizzleInstance: DrizzleDB | null = null;

interface DrizzleConfig {
    mode: 'neon' | 'postgres' | 'mysql';
    connectionString?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}

/**
 * Initialize Drizzle with the specified database
 */
export function initDrizzle(config: DrizzleConfig): DrizzleDB {
    if (drizzleInstance) return drizzleInstance;

    switch (config.mode) {
        case 'neon': {
            if (!config.connectionString) {
                throw new Error('Neon mode requires connectionString');
            }
            const sql = neon(config.connectionString);
            drizzleInstance = drizzleNeon(sql);
            console.log('✅ Drizzle (Neon) initialized');
            break;
        }

        case 'postgres': {
            const pool = new PgPool({
                connectionString: config.connectionString,
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
            });
            drizzleInstance = drizzlePostgres(pool);
            console.log('✅ Drizzle (PostgreSQL) initialized');
            break;
        }

        case 'mysql': {
            const pool = createMySQLPool({
                uri: config.connectionString,
                host: config.host,
                port: config.port,
                user: config.user,
                password: config.password,
                database: config.database,
            });
            drizzleInstance = drizzleMysql(pool as unknown as MySQLPool);
            console.log('✅ Drizzle (MySQL) initialized');
            break;
        }

        default:
            throw new Error(`Unsupported Drizzle mode: ${config.mode}`);
    }

    return drizzleInstance;
}

/**
 * Get the Drizzle instance
 */
export function getDrizzle(): DrizzleDB {
    if (!drizzleInstance) {
        throw new Error('Drizzle not initialized. Call initDrizzle() first.');
    }
    return drizzleInstance;
}

/**
 * Helper function to create Drizzle from environment variables
 */
export function createDrizzleFromEnv(): DrizzleDB {
    const mode = (process.env.DRIZZLE_MODE || 'postgres') as DrizzleConfig['mode'];

    return initDrizzle({
        mode,
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
}

// Re-export Drizzle helper utilities
export { sql, eq, ne, gt, gte, lt, lte, and, or, not, inArray, notInArray, isNull, isNotNull } from 'drizzle-orm';
