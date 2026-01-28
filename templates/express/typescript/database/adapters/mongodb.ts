/**
 * MongoDB Database Adapter
 * NoSQL document database
 */

import { MongoClient, Db, Collection, Document } from 'mongodb';
import { NoSQLAdapter, DatabaseConfig, CollectionReference } from '../types';

export class MongoDBAdapter implements NoSQLAdapter {
    readonly name = 'mongodb';
    readonly type = 'nosql' as const;

    private client: MongoClient | null = null;
    private db: Db | null = null;
    private config: DatabaseConfig['mongodb'];
    private connected = false;

    constructor(config: DatabaseConfig['mongodb']) {
        if (!config?.uri) {
            throw new Error('MongoDB requires uri in configuration');
        }
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            this.client = new MongoClient(this.config!.uri, this.config!.options);
            await this.client.connect();

            this.db = this.client.db(this.config!.dbName);

            // Test connection
            await this.db.command({ ping: 1 });

            this.connected = true;
            console.log('✅ MongoDB connected');
        } catch (error: any) {
            console.error('❌ MongoDB connection failed:', error.message);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.connected = false;
            console.log('🔌 MongoDB disconnected');
        }
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    getClient<T = Db>(): T {
        if (!this.db) {
            throw new Error('MongoDB not initialized. Call connect() first.');
        }
        return this.db as T;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.db) return false;
            await this.db.command({ ping: 1 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get a MongoDB collection with unified interface
     */
    collection<T = any>(name: string): MongoDBCollection<T> {
        if (!this.db) {
            throw new Error('MongoDB not connected');
        }
        return new MongoDBCollection<T>(this.db.collection(name));
    }

    /**
     * Get raw MongoDB collection
     */
    rawCollection<T extends Document = Document>(name: string): Collection<T> {
        if (!this.db) {
            throw new Error('MongoDB not connected');
        }
        return this.db.collection<T>(name);
    }

    /**
     * Get the native MongoClient
     */
    getMongoClient(): MongoClient {
        if (!this.client) {
            throw new Error('MongoDB not connected');
        }
        return this.client;
    }
}

/**
 * MongoDB Collection Wrapper
 */
class MongoDBCollection<T = any> implements CollectionReference<T> {
    constructor(private collection: Collection) { }

    async find(filter?: Record<string, any>): Promise<T[]> {
        return this.collection.find(filter || {}).toArray() as Promise<T[]>;
    }

    async findOne(filter: Record<string, any>): Promise<T | null> {
        return this.collection.findOne(filter) as Promise<T | null>;
    }

    async insertOne(doc: Partial<T>): Promise<{ insertedId: string }> {
        const result = await this.collection.insertOne(doc as any);
        return { insertedId: result.insertedId.toString() };
    }

    async insertMany(docs: Partial<T>[]): Promise<{ insertedIds: string[] }> {
        const result = await this.collection.insertMany(docs as any[]);
        return {
            insertedIds: Object.values(result.insertedIds).map(id => id.toString())
        };
    }

    async updateOne(filter: Record<string, any>, update: Partial<T>): Promise<{ modifiedCount: number }> {
        const result = await this.collection.updateOne(filter, { $set: update });
        return { modifiedCount: result.modifiedCount };
    }

    async updateMany(filter: Record<string, any>, update: Partial<T>): Promise<{ modifiedCount: number }> {
        const result = await this.collection.updateMany(filter, { $set: update });
        return { modifiedCount: result.modifiedCount };
    }

    async deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }> {
        const result = await this.collection.deleteOne(filter);
        return { deletedCount: result.deletedCount };
    }

    async deleteMany(filter: Record<string, any>): Promise<{ deletedCount: number }> {
        const result = await this.collection.deleteMany(filter);
        return { deletedCount: result.deletedCount };
    }

    async count(filter?: Record<string, any>): Promise<number> {
        return this.collection.countDocuments(filter || {});
    }

    /**
     * MongoDB-specific aggregation
     */
    aggregate(pipeline: any[]) {
        return this.collection.aggregate(pipeline);
    }

    /**
     * Create an index
     */
    async createIndex(keys: Record<string, 1 | -1>, options?: any) {
        return this.collection.createIndex(keys, options);
    }
}

export function createMongoDBAdapter(config: DatabaseConfig['mongodb']): MongoDBAdapter {
    return new MongoDBAdapter(config);
}
