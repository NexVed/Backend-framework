/**
 * Database Adapter Types
 * Unified interface for all database providers
 */

export interface DatabaseConfig {
    // Supabase
    supabase?: {
        url: string;
        anonKey: string;
        serviceRoleKey?: string;
    };
    // NeonDB
    neondb?: {
        connectionString: string;
        pooled?: boolean;
    };
    // Firebase
    firebase?: {
        projectId: string;
        clientEmail?: string;
        privateKey?: string;
        databaseURL?: string;
    };
    // MongoDB
    mongodb?: {
        uri: string;
        dbName?: string;
        options?: Record<string, any>;
    };
    // MySQL
    mysql?: {
        host: string;
        port?: number;
        user: string;
        password: string;
        database: string;
        connectionLimit?: number;
    };
    // PostgreSQL
    postgresql?: {
        connectionString?: string;
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        ssl?: boolean | Record<string, any>;
        max?: number;
    };
}

export interface DatabaseAdapter {
    readonly name: string;
    readonly type: 'sql' | 'nosql' | 'cloud';

    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;

    /**
     * Get the native client for direct access
     */
    getClient<T = any>(): T;

    /**
     * Health check for the database connection
     */
    healthCheck(): Promise<boolean>;
}

export interface SQLAdapter extends DatabaseAdapter {
    type: 'sql';

    /**
     * Execute raw SQL query
     */
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;

    /**
     * Execute SQL and return affected rows
     */
    execute(sql: string, params?: any[]): Promise<{ affectedRows: number }>;

    /**
     * Begin a transaction
     */
    transaction<T>(callback: (trx: any) => Promise<T>): Promise<T>;
}

export interface NoSQLAdapter extends DatabaseAdapter {
    type: 'nosql';

    /**
     * Get a collection/table reference
     */
    collection<T = any>(name: string): CollectionReference<T>;
}

export interface CollectionReference<T = any> {
    find(filter?: Record<string, any>): Promise<T[]>;
    findOne(filter: Record<string, any>): Promise<T | null>;
    insertOne(doc: Partial<T>): Promise<{ insertedId: string }>;
    insertMany(docs: Partial<T>[]): Promise<{ insertedIds: string[] }>;
    updateOne(filter: Record<string, any>, update: Partial<T>): Promise<{ modifiedCount: number }>;
    updateMany(filter: Record<string, any>, update: Partial<T>): Promise<{ modifiedCount: number }>;
    deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }>;
    deleteMany(filter: Record<string, any>): Promise<{ deletedCount: number }>;
    count(filter?: Record<string, any>): Promise<number>;
}

export interface CloudAdapter extends DatabaseAdapter {
    type: 'cloud';
}

export type AnyDatabaseAdapter = SQLAdapter | NoSQLAdapter | CloudAdapter;

/**
 * Database provider names
 */
export type DatabaseProvider =
    | 'supabase'
    | 'neondb'
    | 'firebase'
    | 'mongodb'
    | 'mysql'
    | 'postgresql';

/**
 * Database manager configuration
 */
export interface DatabaseManagerConfig {
    default?: DatabaseProvider;
    providers: Partial<DatabaseConfig>;
}
