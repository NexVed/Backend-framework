/**
 * Database Manager
 * Central hub for managing multiple database connections
 */

import { BackendConfig } from '../core/config';
import {
    DatabaseAdapter,
    DatabaseProvider,
    AnyDatabaseAdapter,
    DatabaseConfig
} from './types';

// Import adapters
import { createSupabaseAdapter, SupabaseAdapter } from './adapters/supabase';
import { createNeonDBAdapter, NeonDBAdapter } from './adapters/neondb';
import { createFirebaseAdapter, FirebaseAdapter } from './adapters/firebase';
import { createMongoDBAdapter, MongoDBAdapter } from './adapters/mongodb';
import { createMySQLAdapter, MySQLAdapter } from './adapters/mysql';
import { createPostgreSQLAdapter, PostgreSQLAdapter } from './adapters/postgresql';

type AdapterMap = {
    supabase: SupabaseAdapter;
    neondb: NeonDBAdapter;
    firebase: FirebaseAdapter;
    mongodb: MongoDBAdapter;
    mysql: MySQLAdapter;
    postgresql: PostgreSQLAdapter;
};

const adapterFactories: Record<DatabaseProvider, (config: any) => AnyDatabaseAdapter> = {
    supabase: createSupabaseAdapter,
    neondb: createNeonDBAdapter,
    firebase: createFirebaseAdapter,
    mongodb: createMongoDBAdapter,
    mysql: createMySQLAdapter,
    postgresql: createPostgreSQLAdapter,
};

class DatabaseManager {
    private adapters: Map<DatabaseProvider, AnyDatabaseAdapter> = new Map();
    private defaultProvider: DatabaseProvider | null = null;
    private initialized = false;

    /**
     * Initialize database connections from config
     */
    async initialize(config: BackendConfig['database']): Promise<void> {
        if (this.initialized) {
            console.warn('DatabaseManager already initialized');
            return;
        }

        if (!config?.providers) {
            console.warn('No database providers configured');
            return;
        }

        this.defaultProvider = config.default || null;

        const connectionPromises: Promise<void>[] = [];

        for (const [provider, providerConfig] of Object.entries(config.providers)) {
            if (!providerConfig) continue;

            const factory = adapterFactories[provider as DatabaseProvider];
            if (!factory) {
                console.warn(`Unknown database provider: ${provider}`);
                continue;
            }

            try {
                const adapter = factory(providerConfig);
                this.adapters.set(provider as DatabaseProvider, adapter);
                connectionPromises.push(adapter.connect());
            } catch (error: any) {
                console.error(`Failed to create ${provider} adapter:`, error.message);
            }
        }

        await Promise.allSettled(connectionPromises);
        this.initialized = true;

        console.log(`📦 Database Manager initialized with ${this.adapters.size} provider(s)`);
    }

    /**
     * Get a specific database adapter by name
     */
    get<K extends DatabaseProvider>(name: K): AdapterMap[K] {
        const adapter = this.adapters.get(name);
        if (!adapter) {
            throw new Error(`Database adapter '${name}' not found. Available: ${Array.from(this.adapters.keys()).join(', ')}`);
        }
        return adapter as AdapterMap[K];
    }

    /**
     * Get the default database adapter
     */
    default<T extends AnyDatabaseAdapter = AnyDatabaseAdapter>(): T {
        if (!this.defaultProvider) {
            // Return first available adapter if no default set
            const firstAdapter = this.adapters.values().next().value;
            if (!firstAdapter) {
                throw new Error('No database adapters available');
            }
            return firstAdapter as T;
        }
        return this.get(this.defaultProvider) as T;
    }

    /**
     * Shorthand for Supabase
     */
    supabase(): SupabaseAdapter {
        return this.get('supabase');
    }

    /**
     * Shorthand for NeonDB
     */
    neondb(): NeonDBAdapter {
        return this.get('neondb');
    }

    /**
     * Shorthand for Firebase
     */
    firebase(): FirebaseAdapter {
        return this.get('firebase');
    }

    /**
     * Shorthand for MongoDB
     */
    mongodb(): MongoDBAdapter {
        return this.get('mongodb');
    }

    /**
     * Shorthand for MySQL
     */
    mysql(): MySQLAdapter {
        return this.get('mysql');
    }

    /**
     * Shorthand for PostgreSQL
     */
    postgresql(): PostgreSQLAdapter {
        return this.get('postgresql');
    }

    /**
     * Check if a provider is available
     */
    has(name: DatabaseProvider): boolean {
        return this.adapters.has(name);
    }

    /**
     * Get all available provider names
     */
    providers(): DatabaseProvider[] {
        return Array.from(this.adapters.keys());
    }

    /**
     * Health check all connections
     */
    async healthCheck(): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};

        for (const [name, adapter] of this.adapters) {
            results[name] = await adapter.healthCheck();
        }

        return results;
    }

    /**
     * Disconnect all databases
     */
    async disconnect(): Promise<void> {
        const disconnectPromises = Array.from(this.adapters.values()).map(adapter =>
            adapter.disconnect().catch(err => console.error(`Disconnect error:`, err.message))
        );

        await Promise.all(disconnectPromises);
        this.adapters.clear();
        this.initialized = false;

        console.log('📦 All database connections closed');
    }
}

// Singleton instance
export const db = new DatabaseManager();

// Re-export types and adapters
export * from './types';
export { SupabaseAdapter } from './adapters/supabase';
export { NeonDBAdapter } from './adapters/neondb';
export { FirebaseAdapter } from './adapters/firebase';
export { MongoDBAdapter } from './adapters/mongodb';
export { MySQLAdapter } from './adapters/mysql';
export { PostgreSQLAdapter } from './adapters/postgresql';
