/**
 * MongoDB Database Adapter
 * NoSQL document database
 */

const { MongoClient } = require('mongodb');

class MongoDBAdapter {
    name = 'mongodb';
    type = 'nosql';

    client = null;
    db = null;
    config;
    connected = false;

    constructor(config) {
        if (!config?.uri) {
            throw new Error('MongoDB requires uri in configuration');
        }
        this.config = config;
    }

    async connect() {
        if (this.connected) return;

        try {
            this.client = new MongoClient(this.config.uri, this.config.options);
            await this.client.connect();

            this.db = this.client.db(this.config.dbName);
            await this.db.command({ ping: 1 });

            this.connected = true;
            console.log('✅ MongoDB connected');
        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            this.connected = false;
            console.log('🔌 MongoDB disconnected');
        }
    }

    isConnected() {
        return this.connected && this.client !== null;
    }

    getClient() {
        if (!this.db) {
            throw new Error('MongoDB not initialized. Call connect() first.');
        }
        return this.db;
    }

    async healthCheck() {
        try {
            if (!this.db) return false;
            await this.db.command({ ping: 1 });
            return true;
        } catch {
            return false;
        }
    }

    collection(name) {
        if (!this.db) {
            throw new Error('MongoDB not connected');
        }
        return new MongoDBCollection(this.db.collection(name));
    }

    rawCollection(name) {
        if (!this.db) {
            throw new Error('MongoDB not connected');
        }
        return this.db.collection(name);
    }

    getMongoClient() {
        if (!this.client) {
            throw new Error('MongoDB not connected');
        }
        return this.client;
    }
}

class MongoDBCollection {
    constructor(collection) {
        this.collection = collection;
    }

    async find(filter) {
        return this.collection.find(filter || {}).toArray();
    }

    async findOne(filter) {
        return this.collection.findOne(filter);
    }

    async insertOne(doc) {
        const result = await this.collection.insertOne(doc);
        return { insertedId: result.insertedId.toString() };
    }

    async insertMany(docs) {
        const result = await this.collection.insertMany(docs);
        return {
            insertedIds: Object.values(result.insertedIds).map(id => id.toString())
        };
    }

    async updateOne(filter, update) {
        const result = await this.collection.updateOne(filter, { $set: update });
        return { modifiedCount: result.modifiedCount };
    }

    async updateMany(filter, update) {
        const result = await this.collection.updateMany(filter, { $set: update });
        return { modifiedCount: result.modifiedCount };
    }

    async deleteOne(filter) {
        const result = await this.collection.deleteOne(filter);
        return { deletedCount: result.deletedCount };
    }

    async deleteMany(filter) {
        const result = await this.collection.deleteMany(filter);
        return { deletedCount: result.deletedCount };
    }

    async count(filter) {
        return this.collection.countDocuments(filter || {});
    }

    aggregate(pipeline) {
        return this.collection.aggregate(pipeline);
    }

    async createIndex(keys, options) {
        return this.collection.createIndex(keys, options);
    }
}

function createMongoDBAdapter(config) {
    return new MongoDBAdapter(config);
}

module.exports = { MongoDBAdapter, createMongoDBAdapter };
