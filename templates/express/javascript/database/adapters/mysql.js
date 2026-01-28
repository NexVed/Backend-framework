/**
 * MySQL Database Adapter
 * Using mysql2 with connection pooling
 */

const mysql = require('mysql2/promise');

class MySQLAdapter {
    name = 'mysql';
    type = 'sql';

    pool = null;
    config;
    connected = false;

    constructor(config) {
        if (!config?.host || !config?.user || !config?.database) {
            throw new Error('MySQL requires host, user, and database in configuration');
        }
        this.config = config;
    }

    async connect() {
        if (this.connected) return;

        try {
            this.pool = mysql.createPool({
                host: this.config.host,
                port: this.config.port || 3306,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                connectionLimit: this.config.connectionLimit || 10,
                waitForConnections: true,
                queueLimit: 0,
            });

            const connection = await this.pool.getConnection();
            connection.release();

            this.connected = true;
            console.log('✅ MySQL connected');
        } catch (error) {
            console.error('❌ MySQL connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.connected = false;
            console.log('🔌 MySQL disconnected');
        }
    }

    isConnected() {
        return this.connected && this.pool !== null;
    }

    getClient() {
        if (!this.pool) {
            throw new Error('MySQL not initialized. Call connect() first.');
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
            throw new Error('MySQL not connected');
        }

        const [rows] = await this.pool.query(sql, params);
        return rows;
    }

    async execute(sql, params) {
        if (!this.pool) {
            throw new Error('MySQL not connected');
        }

        const [result] = await this.pool.execute(sql, params);
        return { affectedRows: result.affectedRows };
    }

    async transaction(callback) {
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

    async getConnection() {
        if (!this.pool) {
            throw new Error('MySQL not connected');
        }
        return this.pool.getConnection();
    }

    async select(table, where, columns = '*') {
        let sql = `SELECT ${columns} FROM ${table}`;
        const params = [];

        if (where && Object.keys(where).length > 0) {
            const conditions = Object.keys(where).map(key => {
                params.push(where[key]);
                return `${key} = ?`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }

        return this.query(sql, params);
    }

    async insert(table, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

        if (!this.pool) throw new Error('MySQL not connected');
        const [result] = await this.pool.execute(sql, values);

        return { insertId: result.insertId };
    }

    async update(table, data, where) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');

        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const params = [...Object.values(data), ...Object.values(where)];

        return this.execute(sql, params);
    }

    async delete(table, where) {
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;

        return this.execute(sql, Object.values(where));
    }
}

function createMySQLAdapter(config) {
    return new MySQLAdapter(config);
}

module.exports = { MySQLAdapter, createMySQLAdapter };
