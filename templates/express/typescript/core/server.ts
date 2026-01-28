/**
 * Enhanced Server
 * Main server initialization with all features
 */

import express, { Express } from 'express';
import cors from 'cors';
import { loadConfig, BackendConfig } from './config';
import { loadRoutes } from './router';
import { db } from '../database';
import {
  errorHandler,
  notFoundHandler,
  withLogging,
  withRequestId,
  withSecurityHeaders
} from '../middleware';

let app: Express | null = null;
let server: any = null;

/**
 * Create and configure Express application
 */
export async function createApp(): Promise<Express> {
  const config = await loadConfig();

  app = express();

  // Trust proxy if configured
  if (config.server.trustProxy) {
    app.set('trust proxy', true);
  }

  // Core middleware
  app.use(withRequestId());
  app.use(withSecurityHeaders());

  // Logging
  if (config.logging?.level !== 'error') {
    app.use(withLogging({
      level: config.logging?.level,
      format: config.logging?.format,
    }));
  }

  // CORS
  app.use(cors(config.server.cors));

  // Body parsing
  app.use(express.json({ limit: config.server.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.server.bodyLimit }));

  // Initialize database connections
  if (config.database?.providers) {
    await db.initialize(config.database);
  }

  // Load file-based routes
  loadRoutes(app);

  // Error handlers (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
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

    // Graceful shutdown handlers
    setupGracefulShutdown();

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server?.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Disconnect databases
    await db.disconnect();

    console.log('👋 Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unexpected errors
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  });
}

/**
 * Get the Express app instance
 */
export function getApp(): Express {
  if (!app) {
    throw new Error('App not initialized. Call createApp() or startServer() first.');
  }
  return app;
}

/**
 * Get config for testing
 */
export { loadConfig, BackendConfig };
