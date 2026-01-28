/**
 * PostgreSQL Database Adapter
 * Using node-postgres (pg) with connection pooling
 */

const { Pool } = require('pg');

class PostgreSQLAdapter {
    name = 'postgresql';
    type = 'sql';

    pool = null;
    config;
    connected = false;

    constructor(config) {
        if (!config?.connectionString && !config?.host) {
            throw new Error('PostgreSQL requires connectionString or host in configuration');
        }
        this.config = config;
    }

    async connect() {
        if (this.connected) return;

        try {
            const poolConfig = this.config.connectionString
                ? { connectionString: this.config.connectionString, ssl: this.config.ssl }
                : {
                    host: this.config.host,
                    port: this.config.port || 5432,
                    user: this.config.user,
                    password: this.config.password,
                    database: this.config.database,
                    ssl: this.config.ssl,
                    max: this.config.max || 10,
                };

            this.pool = new Pool(poolConfig);

            const client = await this.pool.connect();
            client.release();

            this.connected = true;
            console.log('✅ PostgreSQL connected');
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.connected = false;
            console.log('🔌 PostgreSQL disconnected');
        }
    }

    isConnected() {
        return this.connected && this.pool !== null;
    }

    getClient() {
        if (!this.pool) {
            throw new Error('PostgreSQL not initialized. Call connect() first.');
        }
        return this.pool;
    }

    async healthCheck() {
        try {
            if (!this.pool) return false;
            await this.pool.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    async query(sql, params) {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }

        const result = await this.pool.query(sql, params);
        return result.rows;
    }

    async execute(sql, params) {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }

        const result = await this.pool.query(sql, params);
        return { affectedRows: result.rowCount || 0 };
    }

    async transaction(callback) {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getConnection() {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }
        return this.pool.connect();
    }

    async select(table, where, columns = '*') {
        let sql = `SELECT ${columns} FROM ${table}`;
        const params = [];

        if (where && Object.keys(where).length > 0) {
            const conditions = Object.keys(where).map((key, i) => {
                params.push(where[key]);
                return `${key} = $${i + 1}`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        return this.query(sql, params);
    }

    async insert(table, data, returning = '*') {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`;

        const rows = await this.query(sql, values);
        return rows[0];
    }

    async update(table, data, where, returning = '*') {
        const dataKeys = Object.keys(data);
        const whereKeys = Object.keys(where);

        let paramIndex = 1;
        const setClause = dataKeys.map(key => `${key} = $${paramIndex++}`).join(', ');
        const whereClause = whereKeys.map(key => `${key} = $${paramIndex++}`).join(' AND ');

        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returning}`;
        const params = [...Object.values(data), ...Object.values(where)];

        return this.query(sql, params);
    }

    async delete(table, where, returning = '*') {
        const whereKeys = Object.keys(where);
        const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

        const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING ${returning}`;

        return this.query(sql, Object.values(where));
    }

    async upsert(table, data, conflictColumns, updateColumns, returning = '*') {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const updateCols = updateColumns || keys.filter(k => !conflictColumns.includes(k));
        const updateClause = updateCols.map(key => `${key} = EXCLUDED.${key}`).join(', ');

        const sql = `
      INSERT INTO ${table} (${keys.join(', ')}) 
      VALUES (${placeholders})
      ON CONFLICT (${conflictColumns.join(', ')}) 
      DO UPDATE SET ${updateClause}
      RETURNING ${returning}
    `;

        const rows = await this.query(sql, values);
        return rows[0];
    }
}

function createPostgreSQLAdapter(config) {
    return new PostgreSQLAdapter(config);
}

module.exports = { PostgreSQLAdapter, createPostgreSQLAdapter };
