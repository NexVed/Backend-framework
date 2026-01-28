/**
 * Backend Configuration
 */

/**
 * @typedef {Object} ServerConfig
 * @property {number|string} port
 * @property {string} [host]
 * @property {Object} [cors]
 * @property {string} [bodyLimit]
 * @property {boolean} [trustProxy]
 */

/**
 * @typedef {Object} BackendConfig
 * @property {ServerConfig} server
 * @property {Object} [database]
 * @property {Object} [auth]
 * @property {Object} [cache]
 * @property {Object} [orm]
 * @property {Object} [logging]
 */

/**
 * Define configuration with defaults
 * @param {BackendConfig} config
 * @returns {BackendConfig}
 */
function defineConfig(config) {
    return {
        server: {
            port: config.server.port || process.env.PORT || 3000,
            host: config.server.host || '0.0.0.0',
            cors: config.server.cors ?? { origin: '*', credentials: true },
            bodyLimit: config.server.bodyLimit || '10mb',
            trustProxy: config.server.trustProxy ?? false,
            ...config.server,
        },
        database: config.database,
        auth: config.auth ? {
            enabled: config.auth.enabled ?? false,
            bcryptRounds: config.auth.bcryptRounds || 10,
            ...config.auth,
        } : undefined,
        cache: config.cache ? {
            enabled: config.cache.enabled ?? false,
            driver: config.cache.driver || 'memory',
            ttl: config.cache.ttl || 3600,
            ...config.cache,
        } : undefined,
        orm: config.orm,
        logging: {
            level: config.logging?.level || 'info',
            format: config.logging?.format || 'pretty',
            timestamp: config.logging?.timestamp ?? true,
        },
    };
}

/**
 * Load configuration from the project root
 * @returns {Promise<BackendConfig>}
 */
async function loadConfig() {
    try {
        const configPath = require.resolve(process.cwd() + '/backend.config');
        const configModule = require(configPath);
        return configModule.default || configModule;
    } catch (error) {
        console.warn('⚠️ No backend.config found, using defaults');
        return defineConfig({
            server: {
                port: process.env.PORT || 3000,
            },
        });
    }
}

module.exports = { defineConfig, loadConfig };
