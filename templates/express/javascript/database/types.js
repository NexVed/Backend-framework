/**
 * Database Adapter Types
 * Unified interface for all database providers
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {Object} [supabase] - Supabase configuration
 * @property {string} supabase.url - Supabase project URL
 * @property {string} supabase.anonKey - Supabase anon key
 * @property {string} [supabase.serviceRoleKey] - Supabase service role key
 * @property {Object} [neondb] - NeonDB configuration
 * @property {string} neondb.connectionString - Connection string
 * @property {boolean} [neondb.pooled] - Use connection pooling
 * @property {Object} [firebase] - Firebase configuration
 * @property {string} firebase.projectId - Firebase project ID
 * @property {string} [firebase.clientEmail] - Service account email
 * @property {string} [firebase.privateKey] - Service account private key
 * @property {Object} [mongodb] - MongoDB configuration
 * @property {string} mongodb.uri - MongoDB connection URI
 * @property {string} [mongodb.dbName] - Database name
 * @property {Object} [mysql] - MySQL configuration
 * @property {string} mysql.host - MySQL host
 * @property {number} [mysql.port] - MySQL port
 * @property {string} mysql.user - MySQL user
 * @property {string} mysql.password - MySQL password
 * @property {string} mysql.database - MySQL database
 * @property {Object} [postgresql] - PostgreSQL configuration
 * @property {string} [postgresql.connectionString] - Connection string
 * @property {string} [postgresql.host] - PostgreSQL host
 */

/**
 * @typedef {Object} DatabaseAdapter
 * @property {string} name - Adapter name
 * @property {string} type - Adapter type: 'sql' | 'nosql' | 'cloud'
 * @property {function(): Promise<void>} connect - Connect to database
 * @property {function(): Promise<void>} disconnect - Disconnect from database
 * @property {function(): boolean} isConnected - Check connection status
 * @property {function(): any} getClient - Get native client
 * @property {function(): Promise<boolean>} healthCheck - Check database health
 */

/**
 * @typedef {Object} CollectionReference
 * @property {function(Object=): Promise<Array>} find - Find documents
 * @property {function(Object): Promise<Object|null>} findOne - Find one document
 * @property {function(Object): Promise<{insertedId: string}>} insertOne - Insert document
 * @property {function(Array): Promise<{insertedIds: string[]}>} insertMany - Insert many
 * @property {function(Object, Object): Promise<{modifiedCount: number}>} updateOne - Update one
 * @property {function(Object, Object): Promise<{modifiedCount: number}>} updateMany - Update many
 * @property {function(Object): Promise<{deletedCount: number}>} deleteOne - Delete one
 * @property {function(Object): Promise<{deletedCount: number}>} deleteMany - Delete many
 * @property {function(Object=): Promise<number>} count - Count documents
 */

/** @type {Array<string>} */
const DATABASE_PROVIDERS = ['supabase', 'neondb', 'firebase', 'mongodb', 'mysql', 'postgresql'];

module.exports = {
    DATABASE_PROVIDERS,
};
