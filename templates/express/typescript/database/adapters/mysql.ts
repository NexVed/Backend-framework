/**
 * MySQL Database Adapter
 * Using mysql2 with connection pooling
 */

import mysql, { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { SQLAdapter, DatabaseConfig } from '../types';

export class MySQLAdapter implements SQLAdapter {
    readonly name = 'mysql';
    readonly type = 'sql' as const;

    private pool: Pool | null = null;
    private config: DatabaseConfig['mysql'];
    private connected = false;

    constructor(config: DatabaseConfig['mysql']) {
        if (!config?.host || !config?.user || !config?.database) {
            throw new Error('MySQL requires host, user, and database in configuration');
        }
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            this.pool = mysql.createPool({
                host: this.config!.host,
                port: this.config!.port || 3306,
                user: this.config!.user,
                password: this.config!.password,
                database: this.config!.database,
                connectionLimit: this.config!.connectionLimit || 10,
                waitForConnections: true,
                queueLimit: 0,
            });

            // Test connection
            const connection = await this.pool.getConnection();
            connection.release();

            this.connected = true;
            console.log('✅ MySQL connected');
        } catch (error: any) {
            console.error('❌ MySQL connection failed:', error.message);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.connected = false;
            console.log('🔌 MySQL disconnected');
        }
    }

    isConnected(): boolean {
        return this.connected && this.pool !== null;
    }

    getClient<T = Pool>(): T {
        if (!this.pool) {
            throw new Error('MySQL not initialized. Call connect() first.');
        }
        return this.pool as T;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.pool) return false;
            const [rows] = await this.pool.query('SELECT 1');
            return true;
        } catch {
            return false;
        }
    }

    async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        if (!this.pool) {
            throw new Error('MySQL not connected');
        }

        const [rows] = await this.pool.query<RowDataPacket[]>(sql, params);
        return rows as T[];
    }

    async execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
        if (!this.pool) {
            throw new Error('MySQL not connected');
        }

        const [result] = await this.pool.execute<ResultSetHeader>(sql, params);
        return { affectedRows: result.affectedRows };
    }

    async transaction<T>(callback: (connection: PoolConnection) => Promise<T>): Promise<T> {
        if (!this.pool) {
            throw new Error('MySQL not connected');
        }

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get a connection from the pool
     */
    async getConnection(): Promise<PoolConnection> {
        if (!this.pool) {
            throw new Error('MySQL not connected');
        }
        return this.pool.getConnection();
    }

    /**
     * Helper for SELECT queries
     */
    async select<T = any>(table: string, where?: Record<string, any>, columns = '*'): Promise<T[]> {
        let sql = `SELECT ${columns} FROM ${table}`;
        const params: any[] = [];

        if (where && Object.keys(where).length > 0) {
            const conditions = Object.keys(where).map(key => {
                params.push(where[key]);
                return `${key} = ?`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        return this.query<T>(sql, params);
    }

    /**
     * Helper for INSERT
     */
    async insert(table: string, data: Record<string, any>): Promise<{ insertId: number }> {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

        if (!this.pool) throw new Error('MySQL not connected');
        const [result] = await this.pool.execute<ResultSetHeader>(sql, values);

        return { insertId: result.insertId };
    }

    /**
     * Helper for UPDATE
     */
    async update(table: string, data: Record<string, any>, where: Record<string, any>): Promise<{ affectedRows: number }> {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const params = [...Object.values(data), ...Object.values(where)];

        return this.execute(sql, params);
    }

    /**
     * Helper for DELETE
     */
    async delete(table: string, where: Record<string, any>): Promise<{ affectedRows: number }> {
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;

        return this.execute(sql, Object.values(where));
    }
}

export function createMySQLAdapter(config: DatabaseConfig['mysql']): MySQLAdapter {
    return new MySQLAdapter(config);
}
