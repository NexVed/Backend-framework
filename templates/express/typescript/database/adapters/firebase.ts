/**
 * Firebase Database Adapter
 * Firestore and Realtime Database support
 */

import { initializeApp, cert, App, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getDatabase, Database } from 'firebase-admin/database';
import { CloudAdapter, DatabaseConfig, CollectionReference } from '../types';

export class FirebaseAdapter implements CloudAdapter {
    readonly name = 'firebase';
    readonly type = 'cloud' as const;

    private app: App | null = null;
    private firestore: Firestore | null = null;
    private realtimeDb: Database | null = null;
    private config: DatabaseConfig['firebase'];
    private connected = false;

    constructor(config: DatabaseConfig['firebase']) {
        if (!config?.projectId) {
            throw new Error('Firebase requires projectId in configuration');
        }
        this.config = config;
    }

    async connect(): Promise<void> {
        if (this.connected) return;

        try {
            // Check if app already exists
            const existingApps = getApps();

            if (existingApps.length > 0) {
                this.app = getApp();
            } else {
                const credential = this.config!.clientEmail && this.config!.privateKey
                    ? cert({
                        projectId: this.config!.projectId,
                        clientEmail: this.config!.clientEmail,
                        privateKey: this.config!.privateKey.replace(/\\n/g, '\n'),
                    })
                    : undefined;

                this.app = initializeApp({
                    credential,
                    projectId: this.config!.projectId,
                    databaseURL: this.config!.databaseURL,
                });
            }

            this.firestore = getFirestore(this.app);

            if (this.config!.databaseURL) {
                this.realtimeDb = getDatabase(this.app);
            }

            this.connected = true;
            console.log('✅ Firebase connected');
        } catch (error: any) {
            console.error('❌ Firebase connection failed:', error.message);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        // Firebase Admin SDK doesn't have explicit disconnect
        this.firestore = null;
        this.realtimeDb = null;
        this.connected = false;
        console.log('🔌 Firebase disconnected');
    }

    isConnected(): boolean {
        return this.connected && this.firestore !== null;
    }

    getClient<T = Firestore>(): T {
        if (!this.firestore) {
            throw new Error('Firebase not initialized. Call connect() first.');
        }
        return this.firestore as T;
    }

    async healthCheck(): Promise<boolean> {
        try {
            if (!this.firestore) return false;
            await this.firestore.listCollections();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get Firestore instance
     */
    db(): Firestore {
        return this.getClient();
    }

    /**
     * Get Realtime Database instance
     */
    realtime(): Database {
        if (!this.realtimeDb) {
            throw new Error('Realtime Database not configured. Add databaseURL to config.');
        }
        return this.realtimeDb;
    }

    /**
     * Get a Firestore collection with typed methods
     */
    collection<T = any>(name: string): FirestoreCollection<T> {
        return new FirestoreCollection<T>(this.db().collection(name));
    }
}

/**
 * Firestore Collection Wrapper
 */
class FirestoreCollection<T = any> implements CollectionReference<T> {
    constructor(private ref: FirebaseFirestore.CollectionReference) { }

    async find(filter?: Record<string, any>): Promise<T[]> {
        let query: FirebaseFirestore.Query = this.ref;

        if (filter) {
            for (const [key, value] of Object.entries(filter)) {
                query = query.where(key, '==', value);
            }
        }

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    }

    async findOne(filter: Record<string, any>): Promise<T | null> {
        const results = await this.find(filter);
        return results[0] || null;
    }

    async insertOne(doc: Partial<T>): Promise<{ insertedId: string }> {
        const docRef = await this.ref.add(doc as any);
        return { insertedId: docRef.id };
    }

    async insertMany(docs: Partial<T>[]): Promise<{ insertedIds: string[] }> {
        const batch = this.ref.firestore.batch();
        const insertedIds: string[] = [];

        for (const doc of docs) {
            const docRef = this.ref.doc();
            batch.set(docRef, doc as any);
            insertedIds.push(docRef.id);
        }

        await batch.commit();
        return { insertedIds };
    }

    async updateOne(filter: Record<string, any>, update: Partial<T>): Promise<{ modifiedCount: number }> {
        const docs = await this.find(filter);
        if (docs.length === 0) return { modifiedCount: 0 };

        const doc = docs[0] as any;
        await this.ref.doc(doc.id).update(update as any);
        return { modifiedCount: 1 };
    }

    async updateMany(filter: Record<string, any>, update: Partial<T>): Promise<{ modifiedCount: number }> {
        const docs = await this.find(filter);
        if (docs.length === 0) return { modifiedCount: 0 };

        const batch = this.ref.firestore.batch();
        for (const doc of docs as any[]) {
            batch.update(this.ref.doc(doc.id), update as any);
        }

        await batch.commit();
        return { modifiedCount: docs.length };
    }

    async deleteOne(filter: Record<string, any>): Promise<{ deletedCount: number }> {
        const docs = await this.find(filter);
        if (docs.length === 0) return { deletedCount: 0 };

        const doc = docs[0] as any;
        await this.ref.doc(doc.id).delete();
        return { deletedCount: 1 };
    }

    async deleteMany(filter: Record<string, any>): Promise<{ deletedCount: number }> {
        const docs = await this.find(filter);
        if (docs.length === 0) return { deletedCount: 0 };

        const batch = this.ref.firestore.batch();
        for (const doc of docs as any[]) {
            batch.delete(this.ref.doc(doc.id));
        }

        await batch.commit();
        return { deletedCount: docs.length };
    }

    async count(filter?: Record<string, any>): Promise<number> {
        const docs = await this.find(filter);
        return docs.length;
    }
}

export function createFirebaseAdapter(config: DatabaseConfig['firebase']): FirebaseAdapter {
    return new FirebaseAdapter(config);
}
