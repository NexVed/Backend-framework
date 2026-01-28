/**
 * Backend Configuration Types and Loader
 */

import { DatabaseConfig, DatabaseProvider } from '../database/types';

export interface ServerConfig {
    port: number | string;
    host?: string;
    cors?: {
        origin: string | string[] | boolean;
        credentials?: boolean;
        methods?: string[];
        allowedHeaders?: string[];
    };
    bodyLimit?: string;
    trustProxy?: boolean;
}

export interface AuthConfig {
    enabled: boolean;
    jwt?: {
        secret: string;
        expiresIn: string;
        algorithm?: 'HS256' | 'HS384' | 'HS512' | 'RS256';
    };
    session?: {
        secret: string;
        maxAge: number;
        secure?: boolean;
    };
    bcryptRounds?: number;
}

export interface CacheConfig {
    enabled: boolean;
    driver: 'memory' | 'redis';
    ttl?: number; // Default TTL in seconds
    redis?: {
        url: string;
        prefix?: string;
    };
}

export interface ORMConfig {
    provider?: 'prisma' | 'drizzle' | 'none';
    prisma?: {
        // Prisma-specific options
        logLevel?: 'query' | 'info' | 'warn' | 'error';
    };
    drizzle?: {
        // Drizzle-specific options
        mode?: 'postgres' | 'mysql' | 'sqlite';
    };
}

export interface LoggingConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'pretty';
    timestamp?: boolean;
}

export interface BackendConfig {
    server: ServerConfig;
    database?: {
        default?: DatabaseProvider;
        providers: Partial<DatabaseConfig>;
    };
    auth?: AuthConfig;
    cache?: CacheConfig;
    orm?: ORMConfig;
    logging?: LoggingConfig;
}

/**
 * Define configuration with type safety
 */
export function defineConfig(config: BackendConfig): BackendConfig {
    return {
        server: {
            port: config.server.port || process.env.PORT || 3000,
            host: config.server.host || '0.0.0.0',
            cors: config.server.cors ?? { origin: '*', credentials: true },
            bodyLimit: config.server.bodyLimit || '10mb',
            trustProxy: config.server.trustProxy ?? false,
            ...config.server,
        },
        database: config.database,
        auth: config.auth ? {
            enabled: config.auth.enabled ?? false,
            bcryptRounds: config.auth.bcryptRounds || 10,
            ...config.auth,
        } : undefined,
        cache: config.cache ? {
            enabled: config.cache.enabled ?? false,
            driver: config.cache.driver || 'memory',
            ttl: config.cache.ttl || 3600,
            ...config.cache,
        } : undefined,
        orm: config.orm,
        logging: {
            level: config.logging?.level || 'info',
            format: config.logging?.format || 'pretty',
            timestamp: config.logging?.timestamp ?? true,
        },
    };
}

/**
 * Load configuration from the project root
 */
export async function loadConfig(): Promise<BackendConfig> {
    try {
        // Try to load from backend.config.ts
        const configPath = require.resolve(process.cwd() + '/backend.config');
        const configModule = require(configPath);
        return configModule.default || configModule;
    } catch (error) {
        console.warn('⚠️ No backend.config found, using defaults');
        return defineConfig({
            server: {
                port: process.env.PORT || 3000,
            },
        });
    }
}

// Re-export for convenience
export { DatabaseConfig, DatabaseProvider };
