/**
 * Enhanced Server
 */

const express = require('express');
const cors = require('cors');
const { loadConfig } = require('./config');
const { loadRoutes } = require('./router');
const { db } = require('../database');
const {
    errorHandler,
    notFoundHandler,
    withLogging,
    withRequestId,
    withSecurityHeaders
} = require('../middleware');

let app = null;
let server = null;

/**
 * Create and configure Express application
 */
async function createApp() {
    const config = await loadConfig();

    app = express();

    if (config.server.trustProxy) {
        app.set('trust proxy', true);
    }

    app.use(withRequestId());
    app.use(withSecurityHeaders());

    if (config.logging?.level !== 'error') {
        app.use(withLogging({
            level: config.logging?.level,
            format: config.logging?.format,
        }));
    }

    app.use(cors(config.server.cors));
    app.use(express.json({ limit: config.server.bodyLimit }));
    app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

    if (config.database?.providers) {
        await db.initialize(config.database);
    }

    loadRoutes(app);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}

/**
 * Start the server
 */
async function startServer() {
    try {
        const config = await loadConfig();

        if (!app) {
            app = await createApp();
        }

        const port = config.server.port;
        const host = config.server.host || '0.0.0.0';

        server = app.listen(port, () => {
            console.log(`
┌────────────────────────────────────────────────────┐
│                                                    │
│   🚀 Server running on http://${host}:${port}           │
│                                                    │
│   Environment: ${process.env.NODE_ENV || 'development'}                       │
│   Database providers: ${db.providers().join(', ') || 'none'}          │
│                                                    │
└────────────────────────────────────────────────────┘
      `);
        });

        setupGracefulShutdown();

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        console.log(`\n${signal} received. Starting graceful shutdown...`);

        server?.close(() => {
            console.log('✅ HTTP server closed');
        });

        await db.disconnect();

        console.log('👋 Shutdown complete');
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
}

function getApp() {
    if (!app) {
        throw new Error('App not initialized. Call createApp() or startServer() first.');
    }
    return app;
}

module.exports = { createApp, startServer, getApp, loadConfig };
