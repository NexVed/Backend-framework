/**
 * NeonDB Database Adapter
 * Serverless PostgreSQL
 */

import { neon, Pool } from '@neondatabase/serverless';
import { SQLAdapter, DatabaseConfig } from '../types';

type NeonQueryFunction = ReturnType<typeof neon>;

export class NeonDBAdapter implements SQLAdapter {
    readonly name = 'neondb';
    readonly type = 'sql' as const;

    private sql: NeonQueryFunction | null = null;
    private pool: Pool | null = null;
    private config: DatabaseConfig['neondb'];
    private connected = false;

    constructor(config: DatabaseConfig['neondb']) {
        if (!config?.connectionString) {
            throw new Error('NeonDB requires connectionString in configuration');
        }
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            this.sql = neon(this.config!.connectionString);

            if (this.config!.pooled) {
                this.pool = new Pool({ connectionString: this.config!.connectionString });
            }

            // Test connection
            await this.sql`SELECT 1 as connected`;

            this.connected = true;
            console.log('✅ NeonDB connected');
        } catch (error: any) {
            console.error('❌ NeonDB connection failed:', error.message);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
        }
        this.sql = null;
        this.pool = null;
        this.connected = false;
        console.log('🔌 NeonDB disconnected');
    }

    isConnected(): boolean {
        return this.connected && this.sql !== null;
    }

    getClient<T = NeonQueryFunction>(): T {
        if (!this.sql) {
            throw new Error('NeonDB client not initialized. Call connect() first.');
        }
        return this.sql as T;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.sql) return false;
            await this.sql`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }

    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        if (!this.sql) {
            throw new Error('NeonDB not connected');
        }

        // Use tagged template for parameterized queries
        const result = await this.sql(sql as any, params as any);
        return result as T[];
    }

    async execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
        const result = await this.query(sql, params);
        return { affectedRows: Array.isArray(result) ? result.length : 0 };
    }

    async transaction<T>(callback: (trx: Pool) => Promise<T>): Promise<T> {
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

    /**
     * Execute SQL using tagged template literals (recommended)
     */
    sql$(strings: TemplateStringsArray, ...values: any[]) {
        if (!this.sql) {
            throw new Error('NeonDB not connected');
        }
        return this.sql(strings, ...values);
    }
}

export function createNeonDBAdapter(config: DatabaseConfig['neondb']): NeonDBAdapter {
    return new NeonDBAdapter(config);
}
