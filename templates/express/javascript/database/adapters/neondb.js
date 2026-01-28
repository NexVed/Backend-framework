/**
 * NeonDB Database Adapter
 * Serverless PostgreSQL
 */

const { neon, Pool } = require('@neondatabase/serverless');

class NeonDBAdapter {
    name = 'neondb';
    type = 'sql';

    sql = null;
    pool = null;
    config;
    connected = false;

    constructor(config) {
        if (!config?.connectionString) {
            throw new Error('NeonDB requires connectionString in configuration');
        }
        this.config = config;
    }

    async connect() {
        if (this.connected) return;

        try {
            this.sql = neon(this.config.connectionString);

            if (this.config.pooled) {
                this.pool = new Pool({ connectionString: this.config.connectionString });
            }

            await this.sql`SELECT 1 as connected`;

            this.connected = true;
            console.log('✅ NeonDB connected');
        } catch (error) {
            console.error('❌ NeonDB connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
        }
        this.sql = null;
        this.pool = null;
        this.connected = false;
        console.log('🔌 NeonDB disconnected');
    }

    isConnected() {
        return this.connected && this.sql !== null;
    }

    getClient() {
        if (!this.sql) {
            throw new Error('NeonDB client not initialized. Call connect() first.');
        }
        return this.sql;
    }

    async healthCheck() {
        try {
            if (!this.sql) return false;
            await this.sql`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }

    async query(sql, params) {
        if (!this.sql) {
            throw new Error('NeonDB not connected');
        }
        return this.sql(sql, params);
    }

    async execute(sql, params) {
        const result = await this.query(sql, params);
        return { affectedRows: Array.isArray(result) ? result.length : 0 };
    }

    async transaction(callback) {
        if (!this.pool) {
            throw new Error('Transactions require pooled connection. Set pooled: true in config.');
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(this.pool);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

function createNeonDBAdapter(config) {
    return new NeonDBAdapter(config);
}

module.exports = { NeonDBAdapter, createNeonDBAdapter };
