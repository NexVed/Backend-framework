/**
 * PostgreSQL Database Adapter
 * Using node-postgres (pg) with connection pooling
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { SQLAdapter, DatabaseConfig } from '../types';

export class PostgreSQLAdapter implements SQLAdapter {
    readonly name = 'postgresql';
    readonly type = 'sql' as const;

    private pool: Pool | null = null;
    private config: DatabaseConfig['postgresql'];
    private connected = false;

    constructor(config: DatabaseConfig['postgresql']) {
        if (!config?.connectionString && !config?.host) {
            throw new Error('PostgreSQL requires connectionString or host in configuration');
        }
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            const poolConfig = this.config!.connectionString
                ? { connectionString: this.config!.connectionString, ssl: this.config!.ssl }
                : {
                    host: this.config!.host,
                    port: this.config!.port || 5432,
                    user: this.config!.user,
                    password: this.config!.password,
                    database: this.config!.database,
                    ssl: this.config!.ssl,
                    max: this.config!.max || 10,
                };

            this.pool = new Pool(poolConfig);

            // Test connection
            const client = await this.pool.connect();
            client.release();

            this.connected = true;
            console.log('✅ PostgreSQL connected');
        } catch (error: any) {
            console.error('❌ PostgreSQL connection failed:', error.message);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.connected = false;
            console.log('🔌 PostgreSQL disconnected');
        }
    }

    isConnected(): boolean {
        return this.connected && this.pool !== null;
    }

    getClient<T = Pool>(): T {
        if (!this.pool) {
            throw new Error('PostgreSQL not initialized. Call connect() first.');
        }
        return this.pool as T;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.pool) return false;
            await this.pool.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }

        const result = await this.pool.query(sql, params);
        return result.rows as T[];
    }

    async execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }

        const result = await this.pool.query(sql, params);
        return { affectedRows: result.rowCount || 0 };
    }

    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
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

    /**
     * Get a connection from the pool
     */
    async getConnection(): Promise<PoolClient> {
        if (!this.pool) {
            throw new Error('PostgreSQL not connected');
        }
        return this.pool.connect();
    }

    /**
     * Helper for SELECT queries
     */
    async select<T = any>(table: string, where?: Record<string, any>, columns = '*'): Promise<T[]> {
        let sql = `SELECT ${columns} FROM ${table}`;
        const params: any[] = [];

        if (where && Object.keys(where).length > 0) {
            const conditions = Object.keys(where).map((key, i) => {
                params.push(where[key]);
                return `${key} = $${i + 1}`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        return this.query<T>(sql, params);
    }

    /**
     * Helper for INSERT with RETURNING
     */
    async insert<T = any>(table: string, data: Record<string, any>, returning = '*'): Promise<T> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`;

        const rows = await this.query<T>(sql, values);
        return rows[0];
    }

    /**
     * Helper for UPDATE with RETURNING
     */
    async update<T = any>(
        table: string,
        data: Record<string, any>,
        where: Record<string, any>,
        returning = '*'
    ): Promise<T[]> {
        const dataKeys = Object.keys(data);
        const whereKeys = Object.keys(where);

        let paramIndex = 1;
        const setClause = dataKeys.map(key => `${key} = $${paramIndex++}`).join(', ');
        const whereClause = whereKeys.map(key => `${key} = $${paramIndex++}`).join(' AND ');

        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returning}`;
        const params = [...Object.values(data), ...Object.values(where)];

        return this.query<T>(sql, params);
    }

    /**
     * Helper for DELETE with RETURNING
     */
    async delete<T = any>(table: string, where: Record<string, any>, returning = '*'): Promise<T[]> {
        const whereKeys = Object.keys(where);
        const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');

        const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING ${returning}`;

        return this.query<T>(sql, Object.values(where));
    }

    /**
     * Helper for UPSERT (INSERT ON CONFLICT)
     */
    async upsert<T = any>(
        table: string,
        data: Record<string, any>,
        conflictColumns: string[],
        updateColumns?: string[],
        returning = '*'
    ): Promise<T> {
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

        const rows = await this.query<T>(sql, values);
        return rows[0];
    }
}

export function createPostgreSQLAdapter(config: DatabaseConfig['postgresql']): PostgreSQLAdapter {
    return new PostgreSQLAdapter(config);
}
