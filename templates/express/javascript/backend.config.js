/**
 * Backend Configuration
 */

const { defineConfig } = require('./core/config');

module.exports = defineConfig({
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

    database: {
        default: 'supabase',
        providers: {
            supabase: {
                url: process.env.SUPABASE_URL,
                anonKey: process.env.SUPABASE_ANON_KEY,
            },

            // neondb: {
            //   connectionString: process.env.NEON_DATABASE_URL,
            //   pooled: true,
            // },

            // firebase: {
            //   projectId: process.env.FIREBASE_PROJECT_ID,
            //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            //   privateKey: process.env.FIREBASE_PRIVATE_KEY,
            // },

            // mongodb: {
            //   uri: process.env.MONGODB_URI,
            //   dbName: process.env.MONGODB_DB_NAME,
            // },

            // mysql: {
            //   host: process.env.MYSQL_HOST || 'localhost',
            //   port: parseInt(process.env.MYSQL_PORT || '3306'),
            //   user: process.env.MYSQL_USER,
            //   password: process.env.MYSQL_PASSWORD,
            //   database: process.env.MYSQL_DATABASE,
            // },

            // postgresql: {
            //   connectionString: process.env.DATABASE_URL,
            //   ssl: process.env.NODE_ENV === 'production',
            // },
        },
    },

    auth: {
        enabled: true,
        jwt: {
            secret: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
            expiresIn: '7d',
            algorithm: 'HS256',
        },
        bcryptRounds: 10,
    },

    cache: {
        enabled: true,
        driver: 'memory',
        ttl: 3600,
    },

    orm: {
        provider: 'none',
    },

    logging: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
        timestamp: true,
    },
});
