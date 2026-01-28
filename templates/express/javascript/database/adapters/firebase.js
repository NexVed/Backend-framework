/**
 * Firebase Database Adapter
 * Firestore and Realtime Database support
 */

const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getDatabase } = require('firebase-admin/database');

class FirebaseAdapter {
    name = 'firebase';
    type = 'cloud';

    app = null;
    firestore = null;
    realtimeDb = null;
    config;
    connected = false;

    constructor(config) {
        if (!config?.projectId) {
            throw new Error('Firebase requires projectId in configuration');
        }
        this.config = config;
    }

    async connect() {
        if (this.connected) return;

        try {
            const existingApps = getApps();

            if (existingApps.length > 0) {
                this.app = getApp();
            } else {
                const credential = this.config.clientEmail && this.config.privateKey
                    ? cert({
                        projectId: this.config.projectId,
                        clientEmail: this.config.clientEmail,
                        privateKey: this.config.privateKey.replace(/\\n/g, '\n'),
                    })
                    : undefined;

                this.app = initializeApp({
                    credential,
                    projectId: this.config.projectId,
                    databaseURL: this.config.databaseURL,
                });
            }

            this.firestore = getFirestore(this.app);

            if (this.config.databaseURL) {
                this.realtimeDb = getDatabase(this.app);
            }

            this.connected = true;
            console.log('✅ Firebase connected');
        } catch (error) {
            console.error('❌ Firebase connection failed:', error.message);
            throw error;
        }
    }

    async disconnect() {
        this.firestore = null;
        this.realtimeDb = null;
        this.connected = false;
        console.log('🔌 Firebase disconnected');
    }

    isConnected() {
        return this.connected && this.firestore !== null;
    }

    getClient() {
        if (!this.firestore) {
            throw new Error('Firebase not initialized. Call connect() first.');
        }
        return this.firestore;
    }

    async healthCheck() {
        try {
            if (!this.firestore) return false;
            await this.firestore.listCollections();
            return true;
        } catch {
            return false;
        }
    }

    db() {
        return this.getClient();
    }

    realtime() {
        if (!this.realtimeDb) {
            throw new Error('Realtime Database not configured. Add databaseURL to config.');
        }
        return this.realtimeDb;
    }

    collection(name) {
        return new FirestoreCollection(this.db().collection(name));
    }
}

class FirestoreCollection {
    constructor(ref) {
        this.ref = ref;
    }

    async find(filter) {
        let query = this.ref;

        if (filter) {
            for (const [key, value] of Object.entries(filter)) {
                query = query.where(key, '==', value);
            }
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async findOne(filter) {
        const results = await this.find(filter);
        return results[0] || null;
    }

    async insertOne(doc) {
        const docRef = await this.ref.add(doc);
        return { insertedId: docRef.id };
    }

    async insertMany(docs) {
        const batch = this.ref.firestore.batch();
        const insertedIds = [];

        for (const doc of docs) {
            const docRef = this.ref.doc();
            batch.set(docRef, doc);
            insertedIds.push(docRef.id);
        }

        await batch.commit();
        return { insertedIds };
    }

    async updateOne(filter, update) {
        const docs = await this.find(filter);
        if (docs.length === 0) return { modifiedCount: 0 };

        await this.ref.doc(docs[0].id).update(update);
        return { modifiedCount: 1 };
    }

    async updateMany(filter, update) {
        const docs = await this.find(filter);
        if (docs.length === 0) return { modifiedCount: 0 };

        const batch = this.ref.firestore.batch();
        for (const doc of docs) {
            batch.update(this.ref.doc(doc.id), update);
        }

        await batch.commit();
        return { modifiedCount: docs.length };
    }

    async deleteOne(filter) {
        const docs = await this.find(filter);
        if (docs.length === 0) return { deletedCount: 0 };

        await this.ref.doc(docs[0].id).delete();
        return { deletedCount: 1 };
    }

    async deleteMany(filter) {
        const docs = await this.find(filter);
        if (docs.length === 0) return { deletedCount: 0 };

        const batch = this.ref.firestore.batch();
        for (const doc of docs) {
            batch.delete(this.ref.doc(doc.id));
        }

        await batch.commit();
        return { deletedCount: docs.length };
    }

    async count(filter) {
        const docs = await this.find(filter);
        return docs.length;
    }
}

function createFirebaseAdapter(config) {
    return new FirebaseAdapter(config);
}

module.exports = { FirebaseAdapter, createFirebaseAdapter };
