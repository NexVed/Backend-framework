/**
 * Database Manager
 * Central hub for managing multiple database connections
 */

const { createSupabaseAdapter } = require('./adapters/supabase');
const { createNeonDBAdapter } = require('./adapters/neondb');
const { createFirebaseAdapter } = require('./adapters/firebase');
const { createMongoDBAdapter } = require('./adapters/mongodb');
const { createMySQLAdapter } = require('./adapters/mysql');
const { createPostgreSQLAdapter } = require('./adapters/postgresql');

const adapterFactories = {
    supabase: createSupabaseAdapter,
    neondb: createNeonDBAdapter,
    firebase: createFirebaseAdapter,
    mongodb: createMongoDBAdapter,
    mysql: createMySQLAdapter,
    postgresql: createPostgreSQLAdapter,
};

class DatabaseManager {
    adapters = new Map();
    defaultProvider = null;
    initialized = false;

    async initialize(config) {
        if (this.initialized) {
            console.warn('DatabaseManager already initialized');
            return;
        }

        if (!config?.providers) {
            console.warn('No database providers configured');
            return;
        }

        this.defaultProvider = config.default || null;

        const connectionPromises = [];

        for (const [provider, providerConfig] of Object.entries(config.providers)) {
            if (!providerConfig) continue;

            const factory = adapterFactories[provider];
            if (!factory) {
                console.warn(`Unknown database provider: ${provider}`);
                continue;
            }

            try {
                const adapter = factory(providerConfig);
                this.adapters.set(provider, adapter);
                connectionPromises.push(adapter.connect());
            } catch (error) {
                console.error(`Failed to create ${provider} adapter:`, error.message);
            }
        }

        await Promise.allSettled(connectionPromises);
        this.initialized = true;

        console.log(`📦 Database Manager initialized with ${this.adapters.size} provider(s)`);
    }

    get(name) {
        const adapter = this.adapters.get(name);
        if (!adapter) {
            throw new Error(`Database adapter '${name}' not found. Available: ${Array.from(this.adapters.keys()).join(', ')}`);
        }
        return adapter;
    }

    default() {
        if (!this.defaultProvider) {
            const firstAdapter = this.adapters.values().next().value;
            if (!firstAdapter) {
                throw new Error('No database adapters available');
            }
            return firstAdapter;
        }
        return this.get(this.defaultProvider);
    }

    supabase() { return this.get('supabase'); }
    neondb() { return this.get('neondb'); }
    firebase() { return this.get('firebase'); }
    mongodb() { return this.get('mongodb'); }
    mysql() { return this.get('mysql'); }
    postgresql() { return this.get('postgresql'); }

    has(name) {
        return this.adapters.has(name);
    }

    providers() {
        return Array.from(this.adapters.keys());
    }

    async healthCheck() {
        const results = {};

        for (const [name, adapter] of this.adapters) {
            results[name] = await adapter.healthCheck();
        }

        return results;
    }

    async disconnect() {
        const disconnectPromises = Array.from(this.adapters.values()).map(adapter =>
            adapter.disconnect().catch(err => console.error(`Disconnect error:`, err.message))
        );

        await Promise.all(disconnectPromises);
        this.adapters.clear();
        this.initialized = false;

        console.log('📦 All database connections closed');
    }
}

const db = new DatabaseManager();

module.exports = {
    db,
    DatabaseManager,
    SupabaseAdapter: require('./adapters/supabase').SupabaseAdapter,
    NeonDBAdapter: require('./adapters/neondb').NeonDBAdapter,
    FirebaseAdapter: require('./adapters/firebase').FirebaseAdapter,
    MongoDBAdapter: require('./adapters/mongodb').MongoDBAdapter,
    MySQLAdapter: require('./adapters/mysql').MySQLAdapter,
    PostgreSQLAdapter: require('./adapters/postgresql').PostgreSQLAdapter,
};
