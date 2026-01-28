/**
 * Backend Configuration
 * Customize your server, database, and feature settings here
 */

import { defineConfig } from './core/config';

export default defineConfig({
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        host: '0.0.0.0',
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        },
        bodyLimit: '10mb',
        trustProxy: true,
    },

    // Database configuration
    // Uncomment and configure the providers you need
    database: {
        default: 'supabase', // Set your primary database
        providers: {
            // Supabase (Cloud PostgreSQL)
            supabase: {
                url: process.env.SUPABASE_URL!,
                anonKey: process.env.SUPABASE_ANON_KEY!,
                // serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            },

            // NeonDB (Serverless PostgreSQL)
            // neondb: {
            //   connectionString: process.env.NEON_DATABASE_URL!,
            //   pooled: true,
            // },

            // Firebase (Firestore)
            // firebase: {
            //   projectId: process.env.FIREBASE_PROJECT_ID!,
            //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            //   privateKey: process.env.FIREBASE_PRIVATE_KEY,
            //   databaseURL: process.env.FIREBASE_DATABASE_URL,
            // },

            // MongoDB (Local or Atlas)
            // mongodb: {
            //   uri: process.env.MONGODB_URI!,
            //   dbName: process.env.MONGODB_DB_NAME,
            // },

            // MySQL (Local)
            // mysql: {
            //   host: process.env.MYSQL_HOST || 'localhost',
            //   port: parseInt(process.env.MYSQL_PORT || '3306'),
            //   user: process.env.MYSQL_USER!,
            //   password: process.env.MYSQL_PASSWORD!,
            //   database: process.env.MYSQL_DATABASE!,
            // },

            // PostgreSQL (Local)
            // postgresql: {
            //   connectionString: process.env.DATABASE_URL,
            //   // Or use individual settings:
            //   // host: process.env.PG_HOST || 'localhost',
            //   // port: parseInt(process.env.PG_PORT || '5432'),
            //   // user: process.env.PG_USER!,
            //   // password: process.env.PG_PASSWORD!,
            //   // database: process.env.PG_DATABASE!,
            //   ssl: process.env.NODE_ENV === 'production',
            // },
        },
    },

    // Authentication configuration
    auth: {
        enabled: true,
        jwt: {
            secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
            expiresIn: '7d',
            algorithm: 'HS256',
        },
        bcryptRounds: 10,
    },

    // Caching configuration
    cache: {
        enabled: true,
        driver: 'memory', // 'memory' | 'redis'
        ttl: 3600, // 1 hour default
        // redis: {
        //   url: process.env.REDIS_URL!,
        //   prefix: 'app:',
        // },
    },

    // ORM configuration
    orm: {
        provider: 'prisma', // 'prisma' | 'drizzle' | 'none'
        prisma: {
            logLevel: 'warn',
        },
    },

    // Logging configuration
    logging: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
        timestamp: true,
    },
});
